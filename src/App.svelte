<script lang="ts">
  import { untrack } from 'svelte';
  import { animalById, animals } from './data';
  import { loadRange } from './data/ranges';
  import ScenarioBar from './components/ScenarioBar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import SummaryPanel from './components/SummaryPanel.svelte';
  import Timeline from './components/Timeline.svelte';
  import WorldMap from './components/WorldMap.svelte';
  import DetailPanel from './components/DetailPanel.svelte';
  import Logo from './components/Logo.svelte';
  import type { Hover } from './lib/basemap';
  import { countryName } from './lib/geo';
  import { MIN_VISIBLE, WARM_FULL, commonness, densityAt, makeDensity, rampGradient, type Density, type RangeTint, type RangeView } from './lib/heat';
  import {
    BANDS,
    assess,
    describeScenario,
    readScenario,
    riskByCountry,
    scenarioParts,
    summarize,
    toneOf,
    warmingFactorAt,
    type Assessment,
    type Scenario,
  } from './lib/scenario';
  import { animalsIn, countByCountry, isExtinctAt, rangeAt, stageIndexAt } from './lib/state';
  import { MAX_YEAR, MIN_YEAR, clampYear, formatCount, formatYear, posToYear, yearToPos } from './lib/time';
  import { GROUP_LABEL, type Animal, type Group, type Mode, type RangeData, type RangeLayer, type StateFilter } from './lib/types';

  const PLAY_SECONDS = 40;
  const extinctAnimals = animals.filter((a) => a.extinctYear !== undefined);

  const living = animals.filter((a) => a.extinctYear === undefined);

  // --- URL hash: #animal=tiger&year=1936 (or #overview&year=1936), and in what-if mode
  //     #whatif&animal=tiger&warming=2.5&habitat=30 ------------------------------------
  function readHash(): { id: string | null; year: number; mode: Mode; scenario: Scenario } {
    const params = new URLSearchParams(location.hash.slice(1));
    const mode: Mode = params.has('whatif') ? 'whatif' : 'explore';
    const rawId = params.get('animal');
    const rawYear = Number(params.get('year'));
    const found = rawId ? animalById.get(rawId) : undefined;
    // What-if mode is about living animals only.
    const usable = !!found && (mode === 'explore' || found.extinctYear === undefined);
    return {
      mode,
      scenario: readScenario(params),
      id: usable ? (rawId as string) : params.has('overview') || mode === 'whatif' ? null : 'tiger',
      year: mode === 'explore' && params.has('year') && Number.isFinite(rawYear) ? clampYear(rawYear) : MAX_YEAR,
    };
  }
  const initial = readHash();

  let year = $state(initial.year);
  let selectedId = $state<string | null>(initial.id);
  let query = $state('');
  let group = $state<'all' | Group>('all');
  let stateFilter = $state<StateFilter>('all');
  let country = $state<string | null>(null);
  let playing = $state(false);
  let mode = $state<Mode>(initial.mode);
  // What colours the selected animal's range in what-if mode.
  type Lens = 'score' | 'warming' | 'sightings';
  const LENSES: { id: Lens; label: string }[] = [
    { id: 'score', label: 'Scenario score' },
    { id: 'warming', label: 'Local warming' },
    { id: 'sightings', label: 'Sightings' },
  ];
  let lens = $state<Lens>('score');
  let scenario = $state<Scenario>(initial.scenario);
  // What Explore mode was showing, so leaving What-if puts it back.
  let explore = { id: initial.mode === 'explore' ? initial.id : 'tiger', year: initial.mode === 'explore' ? initial.year : MAX_YEAR };

  function setMode(next: Mode) {
    if (next === mode) return;
    playing = false;
    if (next === 'whatif') {
      explore = { id: selectedId, year };
      mode = 'whatif';
      year = MAX_YEAR;
      selectedId = null;
    } else {
      mode = 'explore';
      selectedId = explore.id;
      year = explore.year;
    }
  }

  // Back/forward and pasted links.
  $effect(() => {
    const onHashChange = () => {
      const next = readHash();
      mode = next.mode;
      scenario = next.scenario;
      selectedId = next.id;
      year = next.year;
      playing = false;
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  });

  $effect(() => {
    const parts =
      mode === 'whatif'
        ? ['whatif', ...(selectedId ? [`animal=${selectedId}`] : []), ...scenarioParts(scenario)]
        : [selectedId ? `animal=${selectedId}` : 'overview', `year=${year}`];
    const hash = `#${parts.join('&')}`;
    const t = setTimeout(() => history.replaceState(null, '', hash), 250);
    return () => clearTimeout(t);
  });

  // --- playback ---------------------------------------------------------------
  $effect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let pos = yearToPos(untrack(() => year));
    let expected = untrack(() => year);

    const tick = (now: number) => {
      // If something else moved the year (drag, key, jump), stop playing.
      if (untrack(() => year) !== expected) {
        playing = false;
        return;
      }
      pos += (now - last) / 1000 / PLAY_SECONDS;
      last = now;
      if (pos >= 1) {
        year = MAX_YEAR;
        playing = false;
        return;
      }
      expected = clampYear(posToYear(pos));
      year = expected;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  function togglePlay() {
    if (playing) {
      playing = false;
      return;
    }
    if (year >= MAX_YEAR) year = MIN_YEAR;
    playing = true;
  }

  // --- derived state ----------------------------------------------------------
  const selected = $derived<Animal | null>(selectedId ? (animalById.get(selectedId) ?? null) : null);

  const fitCodes = $derived(selected ? rangeAt(selected, year) : []);

  // Where in those countries the animal is recorded: one file per animal, loaded when it is selected.
  let loaded = $state.raw<{ id: string; data: RangeData | null } | null>(null);
  $effect(() => {
    const id = selectedId;
    if (!id) return;
    let stale = false;
    loadRange(id).then((data) => {
      if (!stale) loaded = { id, data };
    });
    return () => {
      stale = true;
    };
  });
  const rangeReady = $derived(!selected || loaded?.id === selected.id);

  // Primitives, so the map only repaints its range when the stage (not every year) changes.
  const stageIndex = $derived(selected ? stageIndexAt(selected, year) : -1);
  const extinctNow = $derived(selected ? isExtinctAt(selected, year) : false);
  const layer = $derived<RangeLayer | null>(
    selected && loaded?.id === selected.id ? (loaded.data?.layers[stageIndex] ?? null) : null,
  );

  const densities = new WeakMap<RangeLayer, Density | null>();
  function densityOf(l: RangeLayer): Density | null {
    if (!densities.has(l)) densities.set(l, makeDensity(l));
    return densities.get(l) ?? null;
  }

  const rangeView = $derived.by<RangeView | null>(() => {
    // Draw nothing until the file arrives, rather than flashing the countries first.
    if (!selected || !rangeReady) return null;
    return {
      density: layer ? densityOf(layer) : null,
      basis: layer?.basis ?? 'countries',
      habitat: selected.habitat ?? 'land',
      countries: selected.range[stageIndex].countries,
      clip: layer?.clip !== false,
      extinct: extinctNow,
    };
  });
  const rangeNote = $derived(
    layer
      ? {
          source: `${layer.source}${layer.records >= 1 ? ` (${formatCount(layer.records)} records)` : ''}`,
          heat: layer.basis === 'records' || layer.basis === 'all-time',
        }
      : null,
  );
  /** Whether the colour ramp means anything for this period (hand-drawn areas and country outlines don't). */
  const hasSightings = $derived(!!rangeView?.density && !rangeView.density.uniform);

  // --- what-if: a score for every living animal under the sliders --------------------
  const assessments = $derived.by<Map<string, Assessment> | null>(() =>
    mode === 'whatif' ? new Map(living.map((a) => [a.id, assess(a, scenario)])) : null,
  );
  const assessment = $derived(selected && assessments ? (assessments.get(selected.id) ?? null) : null);
  const countryRisk = $derived(assessments ? riskByCountry(living, assessments) : null);
  const summary = $derived(assessments ? summarize(living, assessments) : null);
  // The selected animal's range, recoloured by the scenario: by its score, or by how much its latitudes warm.
  const tint = $derived.by<RangeTint | null>(() => {
    if (mode !== 'whatif' || !selected || !assessment || !rangeView?.density) return null;
    if (lens === 'score') return { kind: 'score', tone: toneOf(assessment.score) };
    if (lens === 'warming') return { kind: 'warming', delta: scenario.warming, factorAt: warmingFactorAt(selected) };
    return null;
  });
  const bandLabel = (tone: string) => BANDS.find((b) => b.tone === tone)?.label ?? '';
  const averageScore = $derived(
    assessments ? Math.round([...assessments.values()].reduce((sum, r) => sum + r.score, 0) / Math.max(1, assessments.size)) : 0,
  );

  /** Overview mode: how many atlas animals live in each country, or in what-if mode how hard the scenario hits them. */
  const heat = $derived.by<Map<string, number> | null>(() => {
    if (selected) return null;
    if (countryRisk) {
      // Country averages run from about 10 (calm) to 85 (everything at its worst): darker means more pressure.
      return new Map([...countryRisk].map(([code, r]) => [code, Math.min(1, Math.max(0, (r.mean - 10) / 75))]));
    }
    const counts = countByCountry(animals, year);
    const max = Math.max(1, ...counts.values());
    return new Map([...counts].map(([code, n]) => [code, Math.log1p(n) / Math.log1p(max)]));
  });
  const extinctCount = $derived(extinctAnimals.filter((a) => isExtinctAt(a, year)).length);
  const aliveNow = $derived(animals.length - extinctCount);

  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return animals.filter((a) => {
      if (group !== 'all' && a.group !== group) return false;
      const gone = isExtinctAt(a, year);
      if (mode === 'whatif') {
        if (gone) return false;
      } else {
        if (stateFilter === 'alive' && gone) return false;
        if (stateFilter === 'extinct' && !gone) return false;
      }
      if (country && !rangeAt(a, year).includes(country)) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.scientific.toLowerCase().includes(q) ||
        GROUP_LABEL[a.group].toLowerCase().includes(q)
      );
    });
  });

  function animalLines(code: string | null, lon: number, lat: number): string[] {
    const click = code ? ['Click to list animals here'] : [];
    if (selected && rangeView) {
      const gone = rangeView.extinct;
      if (hasSightings && rangeView.density) {
        const v = densityAt(rangeView.density, lon, lat);
        const level = commonness(v);
        const lines = v < MIN_VISIBLE ? [`No ${selected.name} sightings recorded nearby`] : [gone ? `Was ${level.toLowerCase()}` : level];
        return [...lines, ...click];
      }
      if (rangeView.density?.uniform) return [`${gone ? 'Last known' : 'Approximate'} area of ${selected.name}`, 'No sighting data to say how common', ...click];
      if (code && rangeView.countries.includes(code)) return [`${gone ? 'Last known range' : 'Range'} of ${selected.name}`, 'Country level only: no sighting data', ...click];
      return [`${selected.name}: no record here`, ...click];
    }
    if (!code) return ['Territory not in the atlas data'];
    if (countryRisk) {
      const r = countryRisk.get(code);
      if (!r) return ['No atlas animals recorded here'];
      return [
        `${r.count} living atlas ${r.count === 1 ? 'animal' : 'animals'}, average score ${Math.round(r.mean)}`,
        `Highest: ${r.top.animal.name} (${r.top.score})`,
      ];
    }
    const here = animalsIn(animals, code, year);
    if (here.length === 0) return ['No atlas animals recorded here'];
    const names = here.slice(0, 5).map((a) => a.name).join(', ') + (here.length > 5 ? '…' : '');
    return [`${here.length} atlas ${here.length === 1 ? 'animal' : 'animals'} alive in ${formatYear(year)}`, names];
  }

  /** The tooltip: what is there (city, state, country), then what the selected animal makes of it. */
  function mapLabel(h: Hover): { title: string; lines: string[] } {
    const where = [h.region, h.country].filter(Boolean).join(', ');
    const title = h.place?.name ?? (where || 'Open water');
    const about = h.place
      ? [`${countryName(h.place.code)}${h.place.pop >= 1 ? ` · ${formatCount(h.place.pop * 1000)} people` : ''}`]
      : [];
    return { title, lines: [...about, ...animalLines(h.code, h.lon, h.lat)] };
  }

  function pickExtinct(a: Animal) {
    selectedId = a.id;
    year = a.extinctYear as number;
  }

  function pickCountry(code: string | null) {
    country = code;
  }
</script>

<div class="app" class:has-detail={selected || mode === 'whatif'}>
  <p class="mobile-title"><Logo size={18} />Animal Atlas</p>

  <div class="side">
    <Sidebar
      animals={visible}
      total={mode === 'whatif' ? living.length : animals.length}
      {year}
      {selectedId}
      bind:query
      bind:group
      bind:stateFilter
      countryName={country ? countryName(country) : null}
      {mode}
      {assessments}
      onmode={setMode}
      onselect={(id) => (selectedId = id)}
      onclearcountry={() => (country = null)}
    />
  </div>

  <main class="stage">
    <WorldMap range={rangeView} {tint} {heat} focus={country} label={mapLabel} onpick={pickCountry} {fitCodes} fitKey={selectedId} fitReady={rangeReady} />

    {#if selected && mode === 'whatif' && rangeView?.density}
      <div class="lens" role="group" aria-label="Colour the range by">
        <span>Colour range by</span>
        {#each LENSES as l (l.id)}
          <button type="button" class:on={lens === l.id} aria-pressed={lens === l.id} onclick={() => (lens = l.id)}>{l.label}</button>
        {/each}
      </div>
    {/if}

    <div class="legend" aria-hidden="true">
      {#if selected}
        {#if !rangeReady}
          <span>Loading range…</span>
        {:else if tint?.kind === 'warming'}
          <span class="key">
            Local warming{scenario.warming > 0 ? ` at +${scenario.warming.toFixed(1)} °C worldwide` : ': raise Warming to see it'}
            <span>0</span><i class="ramp" style:background={rampGradient('warming')}></i><span>+{WARM_FULL} °C</span>
          </span>
        {:else if tint?.kind === 'score'}
          <span class="key">
            Score {assessment?.score} ({bandLabel(tint.tone)})
            <span>Rarely recorded</span><i class="ramp" style:background={rampGradient(`score-${tint.tone}`)}></i><span>Often recorded</span>
          </span>
        {:else if hasSightings}
          <span class="key">
            {extinctNow ? 'Last known range' : 'Recorded sightings'}
            <span>Rare</span><i class="ramp" style:background={rampGradient(extinctNow ? 'extinct' : 'living')}></i><span>Very common</span>
          </span>
        {:else}
          <span><i class="sw est"></i>{extinctNow ? 'Last known range' : 'Range'} (approximate, no sighting data)</span>
        {/if}
        <span><i class="sw off"></i>No records</span>
      {:else if mode === 'whatif'}
        <span>Lower average score</span><i class="ramp"></i><span>Higher</span>
      {:else}
        <span>Fewer animals</span><i class="ramp"></i><span>More</span>
      {/if}
    </div>

    {#if !selected}
      <div class="overview">
        {#if mode === 'whatif'}
          <strong>Average score {averageScore} across {living.length} living animals</strong>
          <span>Darker countries hold animals under more pressure in this scenario.</span>
        {:else}
          <strong>{aliveNow} animals alive in {formatYear(year)}</strong>
          <span>Choose an animal from the list, or click a country to see who lives there.</span>
        {/if}
      </div>
    {/if}
  </main>

  {#if selected}
    <div class="detail">
      <DetailPanel
        animal={selected}
        {year}
        onclose={() => (selectedId = null)}
        onjump={(y) => (year = y)}
        onpickcountry={pickCountry}
        {rangeNote}
        {assessment}
        scenario={mode === 'whatif' ? scenario : null}
      />
    </div>
  {:else if mode === 'whatif' && summary}
    <div class="detail">
      <SummaryPanel {summary} headline={describeScenario(scenario)} onpick={(id) => (selectedId = id)} />
    </div>
  {/if}

  <div class="time">
    {#if mode === 'whatif'}
      <ScenarioBar bind:scenario />
    {:else}
      <Timeline
        bind:year
        {playing}
        extinct={extinctAnimals}
        {selected}
        {extinctCount}
        total={animals.length}
        onplay={togglePlay}
        onpickextinct={pickExtinct}
      />
    {/if}
  </div>
</div>

<style>
  .app {
    display: grid;
    height: 100dvh;
    grid-template-columns: 330px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas:
      'side stage'
      'side time';
  }
  .app.has-detail {
    grid-template-columns: 330px minmax(0, 1fr) 380px;
    grid-template-areas:
      'side stage detail'
      'side time time';
  }
  .mobile-title {
    display: none;
  }
  .side {
    grid-area: side;
    min-height: 0;
  }
  .stage {
    grid-area: stage;
    position: relative;
    min-width: 0;
    min-height: 0;
  }
  .detail {
    grid-area: detail;
    min-height: 0;
  }
  .time {
    grid-area: time;
    min-width: 0;
  }

  .legend {
    position: absolute;
    left: 16px;
    bottom: 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    /* Leave room for the zoom buttons at the right edge. */
    max-width: calc(100% - 82px);
    padding: 8px 12px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--panel);
    font-size: 12px;
    color: var(--ink-2);
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .sw {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    border: 1px solid var(--map-border);
  }
  .sw.est {
    background: color-mix(in srgb, #8c93a8 50%, var(--map-land));
    border-color: #8c93a8;
  }
  .sw.off {
    background: var(--map-land);
  }
  .key {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 7px;
  }
  .key > :first-child {
    margin-right: 4px;
  }
  .ramp {
    width: 90px;
    height: 8px;
    border-radius: 1px;
    background: linear-gradient(90deg, color-mix(in srgb, var(--map-present) 22%, var(--map-land)), var(--map-present));
  }

  .lens {
    position: absolute;
    left: 16px;
    top: 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    max-width: calc(100% - 82px);
    padding: 7px 12px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--panel);
    font-size: 12px;
    color: var(--muted);
  }
  .lens button {
    padding: 2px 0 3px;
    border: 0;
    border-bottom: 1.5px solid transparent;
    background: none;
    color: var(--muted);
    font-size: 12.5px;
  }
  .lens button:hover {
    color: var(--ink);
  }
  .lens button.on {
    color: var(--ink);
    font-weight: 600;
    border-bottom-color: var(--accent);
  }

  .overview {
    position: absolute;
    left: 16px;
    top: 16px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-width: min(340px, calc(100% - 32px));
    padding: 12px 16px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--panel);
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--muted);
  }
  .overview strong {
    font-family: var(--serif);
    font-size: 19px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--ink);
  }

  @media (max-width: 1100px) {
    .app,
    .app.has-detail {
      grid-template-columns: 310px minmax(0, 1fr);
    }
    .app.has-detail {
      grid-template-rows: minmax(240px, 1fr) auto minmax(0, 38vh);
      grid-template-areas:
        'side stage'
        'side time'
        'side detail';
    }
    .detail {
      border-top: 1px solid var(--line);
    }
  }

  @media (max-width: 720px) {
    .app,
    .app.has-detail {
      display: flex;
      flex-direction: column;
      height: auto;
    }
    .mobile-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 13px 20px;
      font-family: var(--serif);
      font-size: 21px;
      font-weight: 500;
      background: var(--panel);
      border-bottom: 1px solid var(--line);
    }
    .mobile-title :global(svg) {
      color: var(--accent);
    }
    .stage {
      order: 1;
      height: 46vh;
      min-height: 260px;
    }
    .time {
      order: 2;
    }
    .detail {
      order: 3;
      border-left: 0;
    }
    .side {
      order: 4;
      height: 80vh;
    }
    .overview {
      display: none;
    }
  }
</style>
