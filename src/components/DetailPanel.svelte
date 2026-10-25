<script lang="ts">
  import { countryName } from '../lib/geo';
  import { isExtinctAt, populationAt, rangeAt } from '../lib/state';
  import { MAX_YEAR, formatCount, formatYear, roundSig, yearsAgo } from '../lib/time';
  import { GROUP_LABEL, STATUS_LABEL, type Animal } from '../lib/types';
  import Icon from './Icon.svelte';
  import PopulationChart from './PopulationChart.svelte';
  import StatusMark from './StatusMark.svelte';

  interface Props {
    animal: Animal;
    year: number;
    onclose: () => void;
    onjump: (year: number) => void;
    onpickcountry: (code: string) => void;
  }
  let { animal, year, onclose, onjump, onpickcountry }: Props = $props();

  const LIMIT = 16;

  const extinct = $derived(isExtinctAt(animal, year));
  const codes = $derived(rangeAt(animal, year));
  const names = $derived(
    codes.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name)),
  );
  let showAll = $state(false);
  const shown = $derived(showAll ? names : names.slice(0, LIMIT));

  const reading = $derived(populationAt(animal, year));
  const unit = $derived(animal.popUnit ?? 'individuals');
  const yearsLeft = $derived(animal.extinctYear !== undefined ? animal.extinctYear - year : null);

  const popValue = $derived.by(() => {
    if (!reading) return '–';
    if (reading.kind === 'extinct') return '0';
    const v = reading.kind === 'interpolated' ? roundSig(reading.value) : reading.value;
    return `≈ ${formatCount(v)}`;
  });

  const popNote = $derived.by(() => {
    if (!animal.population) return 'No reliable population estimates exist for this species.';
    if (!reading) return `No reliable count before ${formatYear(animal.population[0][0])}.`;
    switch (reading.kind) {
      case 'extinct':
        return 'No individuals remain.';
      case 'estimate':
        return `Estimate for ${formatYear(year)}, in ${unit}.`;
      case 'interpolated':
        return `Between the ${reading.fromYear} and ${reading.toYear} estimates, in ${unit}.`;
      case 'latest':
        return `Latest estimate (${reading.toYear}), in ${unit}.`;
    }
  });
</script>

<section class="detail" aria-label="{animal.name} details">
  <header>
    <p class="eyebrow">{GROUP_LABEL[animal.group].replace(/s$/, '')}</p>
    <button type="button" class="close" onclick={onclose} aria-label="Close details"><Icon name="close" size={16} /></button>
    <h2>{animal.name}</h2>
    <p class="sci">{animal.scientific}</p>
  </header>

  <div class="state">
    <span class="yr">{formatYear(year)}</span>
    <div class="what">
      {#if extinct}
        <StatusMark kind="EX" text="Extinct since {formatYear(animal.extinctYear as number)}" />
        <span>{yearsAgo(animal.extinctYear as number)}</span>
      {:else if yearsLeft !== null}
        <StatusMark kind="ALIVE" text="Alive" />
        <span>
          Extinct in {yearsLeft === 1 ? '1 year' : `${yearsLeft.toLocaleString('en-US')} years`}{yearsLeft > 1000
            ? ` (about ${formatYear(animal.extinctYear as number)})`
            : ''}
        </span>
      {:else}
        <StatusMark kind="ALIVE" text="Alive" />
        <span>Living today</span>
      {/if}
    </div>
  </div>

  <dl class="stats">
    <div>
      <dt>Population</dt>
      <dd>{popValue}</dd>
    </div>
    <div>
      <dt>{extinct ? 'Last range' : 'Range'}</dt>
      <dd>{codes.length}<small>{codes.length === 1 ? 'country' : 'countries'}</small></dd>
    </div>
    <div>
      <dt>IUCN today</dt>
      <dd class="iucn"><StatusMark kind={animal.status} /><small>{STATUS_LABEL[animal.status]}</small></dd>
    </div>
  </dl>
  <p class="note">{popNote}</p>

  <PopulationChart {animal} {year} />

  <p class="about">{animal.about}</p>

  <div class="threats">
    <h3>{animal.extinctYear !== undefined ? 'Cause of extinction' : 'Main threats'}</h3>
    <p>{animal.threats}</p>
  </div>

  <div class="where">
    <h3>{extinct ? 'Last known range' : `Where it lives in ${formatYear(year)}`}</h3>
    <p class="countries">
      {#each shown as c, i (c.code)}<button type="button" onclick={() => onpickcountry(c.code)} title="Show animals found in {c.name}">{c.name}</button>{i < shown.length - 1 ? ', ' : ''}{/each}{#if names.length > LIMIT && !showAll}
        <span class="more-sep">…</span>{/if}
    </p>
    {#if names.length > LIMIT}
      <button type="button" class="link" onclick={() => (showAll = !showAll)}>
        {showAll ? 'Show fewer' : `Show all ${names.length}`}
      </button>
    {/if}
  </div>

  <div class="actions">
    {#if animal.extinctYear !== undefined}
      <button type="button" onclick={() => onjump(animal.extinctYear as number)}>Go to extinction</button>
      <button type="button" onclick={() => onjump((animal.extinctYear as number) - 1)}>Last year alive</button>
    {:else if year !== MAX_YEAR}
      <button type="button" onclick={() => onjump(MAX_YEAR)}>Go to today</button>
    {/if}
  </div>

  <p class="fine">
    Figures are rounded estimates compiled from IUCN, WWF and published studies. Ranges are simplified to modern-day countries.
  </p>
</section>

<style>
  .detail {
    display: flex;
    flex-direction: column;
    gap: 18px;
    height: 100%;
    overflow-y: auto;
    padding: 22px 24px 20px;
    background: var(--panel);
    border-left: 1px solid var(--line);
  }

  header {
    position: relative;
    padding-right: 32px;
  }
  .eyebrow {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  h2 {
    margin: 0;
    font-family: var(--serif);
    font-size: 30px;
    font-weight: 500;
    letter-spacing: -0.015em;
    line-height: 1.08;
  }
  .sci {
    margin: 6px 0 0;
    font-family: var(--serif);
    font-size: 16px;
    font-style: italic;
    color: var(--muted);
  }
  .close {
    position: absolute;
    top: -4px;
    right: -6px;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: var(--radius);
    background: transparent;
    color: var(--muted);
  }
  .close:hover {
    background: var(--hover);
    color: var(--ink);
  }

  .state {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 0;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .yr {
    min-width: 5.2ch;
    font-family: var(--serif);
    font-size: 26px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.01em;
    font-variant-numeric: lining-nums tabular-nums;
  }
  .what {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-left: 16px;
    border-left: 1px solid var(--line);
    font-size: 12.5px;
    color: var(--muted);
  }
  .what :global(.mark) {
    font-size: 13px;
    color: var(--ink);
    letter-spacing: 0;
  }

  .stats {
    display: grid;
    grid-template-columns: 1.2fr 1.1fr 1fr;
    margin: 0;
  }
  .stats > div {
    padding: 0 12px;
    border-left: 1px solid var(--line);
  }
  .stats > div:first-child {
    padding-left: 0;
    border-left: 0;
  }
  dt {
    white-space: nowrap;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
  }
  dd {
    display: flex;
    flex-direction: column;
    margin: 4px 0 0;
    font-family: var(--serif);
    font-size: 24px;
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: -0.01em;
    font-variant-numeric: lining-nums tabular-nums;
  }
  dd small {
    margin-top: 3px;
    font-family: var(--sans);
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
    color: var(--muted);
  }
  dd.iucn {
    padding-top: 6px;
  }
  dd.iucn :global(.mark) {
    font-family: var(--sans);
    font-size: 14px;
  }
  .note {
    margin: -8px 0 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--muted);
  }

  .about {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink);
  }

  h3 {
    margin: 0 0 6px;
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .threats p {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--ink-2);
  }

  .countries {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--ink-2);
  }
  .countries button {
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink);
    text-decoration: underline;
    text-decoration-color: var(--line-strong);
    text-underline-offset: 3px;
  }
  .countries button:hover {
    color: var(--accent-ink);
    text-decoration-color: var(--accent);
  }
  .link {
    margin-top: 6px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent-ink);
    font-size: 12.5px;
    font-weight: 500;
  }
  .link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .actions {
    display: flex;
    gap: 8px;
  }
  .actions button {
    flex: 1;
    height: 34px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink);
    font-size: 13px;
    font-weight: 500;
  }
  .actions button:hover {
    background: var(--hover);
    border-color: var(--ink-2);
  }

  .fine {
    margin: auto 0 0;
    padding-top: 6px;
    font-size: 11.5px;
    line-height: 1.45;
    color: var(--muted);
  }
</style>
