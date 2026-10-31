<script lang="ts">
  import { GROUP_LABEL, type Animal, type Group, type Mode, type StateFilter } from '../lib/types';
  import { flip } from 'svelte/animate';
  import { toneOf, type Assessment } from '../lib/scenario';
  import { isExtinctAt } from '../lib/state';
  import { formatYear } from '../lib/time';
  import Icon from './Icon.svelte';
  import Logo from './Logo.svelte';
  import MethodNote from './MethodNote.svelte';
  import RiskMark from './RiskMark.svelte';
  import Silhouette from './Silhouette.svelte';
  import StatusMark from './StatusMark.svelte';

  interface Props {
    animals: Animal[];
    total: number;
    year: number;
    selectedId: string | null;
    query: string;
    group: 'all' | Group;
    stateFilter: StateFilter;
    countryName: string | null;
    mode: Mode;
    /** Scenario scores by animal id; set in what-if mode, when the list is ranked by them. */
    assessments: Map<string, Assessment> | null;
    onmode: (mode: Mode) => void;
    onselect: (id: string) => void;
    onclearcountry: () => void;
  }

  let {
    animals,
    total,
    year,
    selectedId,
    query = $bindable(),
    group = $bindable(),
    stateFilter = $bindable(),
    countryName,
    mode,
    assessments,
    onmode,
    onselect,
    onclearcountry,
  }: Props = $props();

  const groups: ('all' | Group)[] = ['all', 'mammal', 'bird', 'reptile', 'amphibian', 'fish', 'invertebrate'];
  const states: { id: StateFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'alive', label: 'Alive' },
    { id: 'extinct', label: 'Extinct' },
  ];

  const modes: { id: Mode; label: string }[] = [
    { id: 'explore', label: 'Explore' },
    { id: 'whatif', label: 'What if…' },
  ];

  // What-if mode ranks by how much the scenario lifts a score, or by the score itself.
  type Rank = 'rise' | 'risk';
  const ranks: { id: Rank; label: string }[] = [
    { id: 'rise', label: 'Most affected' },
    { id: 'risk', label: 'Highest risk' },
  ];
  let rank = $state<Rank>('rise');

  const ranked = $derived.by(() => {
    if (!assessments) return [];
    const score = (a: Animal) => assessments.get(a.id)?.score ?? 0;
    const rise = (a: Animal) => assessments.get(a.id)?.rise ?? 0;
    return [...animals].sort((a, b) =>
      rank === 'rise' ? rise(b) - rise(a) || score(b) - score(a) : score(b) - score(a) || rise(b) - rise(a),
    );
  });

  // Where each animal stood in today's order (by today's score), to show how far the scenario moves it.
  const todayOrder = $derived.by(() => {
    const order = new Map<string, number>();
    if (!assessments) return order;
    const today = (a: Animal) => assessments.get(a.id)?.baseline ?? 0;
    [...animals].sort((a, b) => today(b) - today(a) || a.name.localeCompare(b.name)).forEach((a, i) => order.set(a.id, i));
    return order;
  });
  // Rows slide to their new place as the sliders move, unless the person asked for less motion.
  const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The IUCN Red List started in 1964; only show its categories for modern years.
  const showIucn = $derived(year >= 1990);

  const sections = $derived.by(() => {
    const out: { group: Group; items: Animal[] }[] = [];
    for (const a of animals) {
      let s = out.find((x) => x.group === a.group);
      if (!s) out.push((s = { group: a.group, items: [] }));
      s.items.push(a);
    }
    const order = groups.slice(1) as Group[];
    return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  });

  let listEl = $state<HTMLDivElement>();

  // Keep the selected row visible by scrolling the list only (not the page).
  $effect(() => {
    if (!selectedId || !listEl) return;
    const row = listEl.querySelector<HTMLElement>(`#animal-${selectedId}`);
    if (!row) return;
    const r = row.getBoundingClientRect();
    const box = listEl.getBoundingClientRect();
    const header = 36; // sticky group heading
    if (r.top < box.top + header) listEl.scrollTop -= box.top + header - r.top;
    else if (r.bottom > box.bottom) listEl.scrollTop += r.bottom - box.bottom;
  });
</script>

{#snippet row(a: Animal, move: number = 0)}
  {@const gone = isExtinctAt(a, year)}
  {@const result = assessments?.get(a.id)}
  <button
    type="button"
    id="animal-{a.id}"
    class="item"
    class:sel={a.id === selectedId}
    class:gone={!result && gone}
    class:scored={!!result}
    style:--tone={result ? `var(--s-${toneOf(result.score)})` : undefined}
    aria-pressed={a.id === selectedId}
    onclick={() => onselect(a.id)}
  >
    <span class="art" style="--w: 38px; --h: 26px"><Silhouette src={a.silhouette?.file} /></span>
    <span class="names">
      <span class="head">
        <span class="name">{a.name}</span>
        {#if move !== 0}
          <span class="move" class:up={move > 0} title="{move > 0 ? 'Up' : 'Down'} {Math.abs(move)} {Math.abs(move) === 1 ? 'place' : 'places'} from today's order">
            <span aria-hidden="true">{move > 0 ? '▲' : '▼'}{Math.abs(move)}</span>
            <span class="sr">{move > 0 ? 'up' : 'down'} {Math.abs(move)} from today</span>
          </span>
        {/if}
      </span>
      <span class="sci">{a.scientific}</span>
    </span>
    {#if result}
      <RiskMark score={result.score} rise={result.rise} />
    {:else if gone}
      <StatusMark kind="EX" text="Extinct" />
    {:else if a.status !== 'EX' && showIucn}
      <StatusMark kind={a.status} />
    {:else}
      <StatusMark kind="ALIVE" text="Alive" />
    {/if}
  </button>
{/snippet}

<aside class="side">
  <header class="brand">
    <h1><Logo size={20} />Animal Atlas</h1>
    <p>Where animals live, how many remain, and where they are gone.</p>
  </header>

  <div class="modes" role="group" aria-label="Mode">
    {#each modes as m (m.id)}
      <button type="button" class:on={mode === m.id} aria-pressed={mode === m.id} onclick={() => onmode(m.id)}>{m.label}</button>
    {/each}
  </div>

  <div class="filters">
    {#if mode === 'whatif'}
      <p class="intro">
        Raise the pressures under the map. Each score shows how hard that world would hit an animal, starting from its status today.
      </p>
      <MethodNote />
    {/if}

    <label class="search">
      <span class="sr">Search animals</span>
      <Icon name="search" size={15} />
      <input type="search" placeholder="Search {total} animals" bind:value={query} autocomplete="off" />
    </label>

    <div class="tabs" role="group" aria-label="Animal group">
      {#each groups as g}
        <button type="button" class:on={group === g} aria-pressed={group === g} onclick={() => (group = g)}>
          {g === 'all' ? 'All' : GROUP_LABEL[g]}
        </button>
      {/each}
    </div>

    {#if mode === 'whatif'}
      <div class="seg two" role="group" aria-label="Rank by">
        {#each ranks as r (r.id)}
          <button type="button" class:on={rank === r.id} aria-pressed={rank === r.id} onclick={() => (rank = r.id)}>{r.label}</button>
        {/each}
      </div>
    {:else}
      <div class="seg" role="group" aria-label="Status in {formatYear(year)}">
        {#each states as s}
          <button type="button" class:on={stateFilter === s.id} aria-pressed={stateFilter === s.id} onclick={() => (stateFilter = s.id)}>
            {s.label}
          </button>
        {/each}
      </div>
    {/if}

    {#if countryName}
      <button type="button" class="country" onclick={onclearcountry}>
        <span>Found in <strong>{countryName}</strong></span>
        <Icon name="close" size={12} />
        <span class="sr">Clear country filter</span>
      </button>
    {/if}

    <p class="count" aria-live="polite">
      {#if mode === 'whatif'}
        {animals.length} of {total} living animals, {rank === 'rise' ? 'most affected first' : 'highest score first'}
      {:else}
        {animals.length} of {total} animals
        {#if stateFilter === 'alive'}alive in {formatYear(year)}{:else if stateFilter === 'extinct'}extinct by {formatYear(year)}{/if}
      {/if}
    </p>
  </div>

  <div class="list" bind:this={listEl}>
    {#if mode === 'whatif'}
      {#if ranked.length}
        <ul>
          {#each ranked as a, i (a.id)}
            <li animate:flip={{ duration: reduceMotion ? 0 : 220 }}>{@render row(a, (todayOrder.get(a.id) ?? i) - i)}</li>
          {/each}
        </ul>
      {:else}
        <p class="empty">No animals match. Try clearing the search or filters.</p>
      {/if}
    {:else}
      {#each sections as section (section.group)}
        {#if group === 'all'}
          <h2>{GROUP_LABEL[section.group]}<span>{section.items.length}</span></h2>
        {/if}
        <ul>
          {#each section.items as a (a.id)}
            <li>{@render row(a)}</li>
          {/each}
        </ul>
      {:else}
        <p class="empty">No animals match. Try clearing the search or filters.</p>
      {/each}
    {/if}
  </div>
</aside>

<style>
  .side {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: var(--panel);
    border-right: 1px solid var(--line);
  }

  .brand {
    padding: 22px 20px 16px;
  }
  .brand h1 {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0;
    font-family: var(--serif);
    font-size: 25px;
    font-weight: 500;
    letter-spacing: -0.015em;
    line-height: 1.1;
  }
  .brand h1 :global(svg) {
    color: var(--ink);
  }
  .brand p {
    margin: 8px 0 0;
    max-width: 30ch;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--muted);
  }

  .modes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin: 0 20px 14px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .modes button {
    height: 32px;
    border: 0;
    border-left: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink-2);
    font-size: 13px;
  }
  .modes button:first-child {
    border-left: 0;
  }
  .modes button:hover {
    background: var(--hover);
  }
  .modes button.on {
    background: var(--ink);
    color: var(--bg);
    font-weight: 500;
  }

  .intro {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--muted);
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 0 20px 14px;
    border-bottom: 1px solid var(--line);
  }

  .search {
    position: relative;
    display: block;
    color: var(--muted);
  }
  .search :global(svg) {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .search input {
    width: 100%;
    height: 36px;
    padding: 0 12px 0 33px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--ink);
    font-size: 13.5px;
  }
  .search input::placeholder {
    color: var(--muted);
  }
  .search input:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
  }
  .tabs button {
    padding: 2px 0 4px;
    border: 0;
    border-bottom: 1.5px solid transparent;
    background: none;
    color: var(--muted);
    font-size: 12.5px;
  }
  .tabs button:hover {
    color: var(--ink);
  }
  .tabs button.on {
    color: var(--ink);
    font-weight: 600;
    border-bottom-color: var(--accent);
  }

  .seg {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .seg.two {
    grid-template-columns: repeat(2, 1fr);
  }
  .seg button {
    height: 30px;
    border: 0;
    border-left: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink-2);
    font-size: 12.5px;
  }
  .seg button:first-child {
    border-left: 0;
  }
  .seg button:hover {
    background: var(--hover);
  }
  .seg button.on {
    background: var(--ink);
    color: var(--bg);
    font-weight: 500;
  }

  .country {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    align-self: flex-start;
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    color: var(--accent-ink);
    font-size: 12.5px;
  }
  .country:hover {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .count {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .list h2 {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    margin: 0;
    padding: 14px 20px 8px;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .list h2 span {
    font-weight: 400;
    font-variant-numeric: tabular-nums;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li + li .item {
    border-top: 1px solid var(--line);
  }
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 9px 20px;
    border: 0;
    background: transparent;
    text-align: left;
    box-shadow: inset 2px 0 0 transparent;
  }
  .item:hover {
    background: var(--hover);
  }
  .item.sel {
    background: var(--sel);
    box-shadow: inset 2px 0 0 var(--accent);
  }
  .item.sel .name {
    font-weight: 600;
  }
  .art {
    flex: none;
    display: grid;
    place-items: center;
    width: 38px;
    color: var(--ink-2);
  }
  .item.gone .art {
    color: var(--muted);
    opacity: 0.55;
  }
  .item.sel .art {
    color: var(--accent-ink);
  }
  .names {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }
  .move {
    flex: none;
    font-size: 10.5px;
    font-weight: 600;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .move.up {
    color: var(--accent-ink);
  }
  .item.scored .art,
  .item.scored.sel .art {
    /* The silhouette takes the colour of the animal's score. */
    color: color-mix(in srgb, var(--tone) 80%, var(--ink));
  }
  .name {
    font-size: 13.5px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sci {
    font-family: var(--serif);
    font-size: 13px;
    font-style: italic;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item.gone .name {
    color: var(--muted);
    font-weight: 400;
  }
  .empty {
    padding: 28px 20px;
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }
</style>
