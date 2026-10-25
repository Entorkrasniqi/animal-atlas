<script lang="ts">
  import { untrack } from 'svelte';
  import { animalById, animals } from './data';
  import Sidebar from './components/Sidebar.svelte';
  import Timeline from './components/Timeline.svelte';
  import WorldMap from './components/WorldMap.svelte';
  import DetailPanel from './components/DetailPanel.svelte';
  import Logo from './components/Logo.svelte';
  import { countryName } from './lib/geo';
  import { animalsIn, countByCountry, isExtinctAt, rangeAt } from './lib/state';
  import { MAX_YEAR, MIN_YEAR, clampYear, formatYear, posToYear, yearToPos } from './lib/time';
  import { GROUP_LABEL, type Animal, type Group, type StateFilter } from './lib/types';

  const PLAY_SECONDS = 40;
  const extinctAnimals = animals.filter((a) => a.extinctYear !== undefined);

  // --- URL hash: #animal=tiger&year=1936 (or #overview&year=1936) -------------
  function readHash(): { id: string | null; year: number } {
    const params = new URLSearchParams(location.hash.slice(1));
    const rawId = params.get('animal');
    const rawYear = Number(params.get('year'));
    return {
      id: rawId && animalById.has(rawId) ? rawId : params.has('overview') ? null : 'tiger',
      year: params.has('year') && Number.isFinite(rawYear) ? clampYear(rawYear) : MAX_YEAR,
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

  // Back/forward and pasted links.
  $effect(() => {
    const onHashChange = () => {
      const next = readHash();
      selectedId = next.id;
      year = next.year;
      playing = false;
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  });

  $effect(() => {
    const parts = [selectedId ? `animal=${selectedId}` : 'overview', `year=${year}`];
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

  const present = $derived<Set<string>>(
    selected && !isExtinctAt(selected, year) ? new Set(rangeAt(selected, year)) : new Set(),
  );
  const former = $derived<Set<string>>(
    selected && isExtinctAt(selected, year) ? new Set(rangeAt(selected, year)) : new Set(),
  );
  const fitCodes = $derived(selected ? rangeAt(selected, year) : []);

  /** Overview mode: how many atlas animals live in each country. */
  const heat = $derived.by<Map<string, number> | null>(() => {
    if (selected) return null;
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
      if (stateFilter === 'alive' && gone) return false;
      if (stateFilter === 'extinct' && !gone) return false;
      if (country && !rangeAt(a, year).includes(country)) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.scientific.toLowerCase().includes(q) ||
        GROUP_LABEL[a.group].toLowerCase().includes(q)
      );
    });
  });

  function mapLabel(code: string | null): string[] {
    if (!code) return ['Territory not in the atlas data'];
    if (selected) {
      if (present.has(code)) return [`${selected.name} lives here in ${formatYear(year)}`, 'Click to list animals here'];
      if (former.has(code)) return [`Former range of ${selected.name}`, 'Click to list animals here'];
      return [`${selected.name}: no record here`, 'Click to list animals here'];
    }
    const here = animalsIn(animals, code, year);
    if (here.length === 0) return ['No atlas animals recorded here'];
    const names = here.slice(0, 5).map((a) => a.name).join(', ') + (here.length > 5 ? '…' : '');
    return [`${here.length} atlas ${here.length === 1 ? 'animal' : 'animals'} alive in ${formatYear(year)}`, names];
  }

  function pickExtinct(a: Animal) {
    selectedId = a.id;
    year = a.extinctYear as number;
  }

  function pickCountry(code: string | null) {
    country = code;
  }
</script>

<div class="app" class:has-detail={selected}>
  <p class="mobile-title"><Logo size={18} />Animal Atlas</p>

  <div class="side">
    <Sidebar
      animals={visible}
      total={animals.length}
      {year}
      {selectedId}
      bind:query
      bind:group
      bind:stateFilter
      countryName={country ? countryName(country) : null}
      onselect={(id) => (selectedId = id)}
      onclearcountry={() => (country = null)}
    />
  </div>

  <main class="stage">
    <WorldMap {present} {former} {heat} focus={country} label={mapLabel} onpick={pickCountry} {fitCodes} fitKey={selectedId} />

    <div class="legend" aria-hidden="true">
      {#if selected}
        {#if isExtinctAt(selected, year)}
          <span><i class="sw hatch"></i>Former range</span>
        {:else}
          <span><i class="sw on"></i>Lives here</span>
        {/if}
        <span><i class="sw off"></i>No record</span>
      {:else}
        <span>Fewer animals</span><i class="ramp"></i><span>More</span>
      {/if}
    </div>

    {#if !selected}
      <div class="overview">
        <strong>{aliveNow} animals alive in {formatYear(year)}</strong>
        <span>Choose an animal from the list, or click a country to see who lives there.</span>
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
      />
    </div>
  {/if}

  <div class="time">
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
    align-items: center;
    gap: 14px;
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
  .sw.on {
    background: var(--map-present);
    border-color: var(--map-present);
  }
  .sw.off {
    background: var(--map-land);
  }
  .sw.hatch {
    background: repeating-linear-gradient(135deg, var(--map-land) 0 3px, var(--map-extinct) 3px 4px);
    border-color: var(--map-extinct);
  }
  .ramp {
    width: 90px;
    height: 8px;
    border-radius: 1px;
    background: linear-gradient(90deg, color-mix(in srgb, var(--map-present) 22%, var(--map-land)), var(--map-present));
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
