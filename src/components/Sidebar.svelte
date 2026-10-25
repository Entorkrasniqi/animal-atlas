<script lang="ts">
  import { GROUP_LABEL, type Animal, type Group, type StateFilter } from '../lib/types';
  import { isExtinctAt } from '../lib/state';
  import { formatYear } from '../lib/time';
  import Icon from './Icon.svelte';
  import Logo from './Logo.svelte';
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
    onselect,
    onclearcountry,
  }: Props = $props();

  const groups: ('all' | Group)[] = ['all', 'mammal', 'bird', 'reptile', 'amphibian', 'fish', 'invertebrate'];
  const states: { id: StateFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'alive', label: 'Alive' },
    { id: 'extinct', label: 'Extinct' },
  ];

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

<aside class="side">
  <header class="brand">
    <h1><Logo size={20} />Animal Atlas</h1>
    <p>Where animals live, how many remain, and where they are gone.</p>
  </header>

  <div class="filters">
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

    <div class="seg" role="group" aria-label="Status in {formatYear(year)}">
      {#each states as s}
        <button type="button" class:on={stateFilter === s.id} aria-pressed={stateFilter === s.id} onclick={() => (stateFilter = s.id)}>
          {s.label}
        </button>
      {/each}
    </div>

    {#if countryName}
      <button type="button" class="country" onclick={onclearcountry}>
        <span>Found in <strong>{countryName}</strong></span>
        <Icon name="close" size={12} />
        <span class="sr">Clear country filter</span>
      </button>
    {/if}

    <p class="count" aria-live="polite">
      {animals.length} of {total} animals
      {#if stateFilter === 'alive'}alive in {formatYear(year)}{:else if stateFilter === 'extinct'}extinct by {formatYear(year)}{/if}
    </p>
  </div>

  <div class="list" bind:this={listEl}>
    {#each sections as section (section.group)}
      {#if group === 'all'}
        <h2>{GROUP_LABEL[section.group]}<span>{section.items.length}</span></h2>
      {/if}
      <ul>
        {#each section.items as a (a.id)}
          {@const gone = isExtinctAt(a, year)}
          <li>
            <button
              type="button"
              id="animal-{a.id}"
              class="item"
              class:sel={a.id === selectedId}
              class:gone
              aria-pressed={a.id === selectedId}
              onclick={() => onselect(a.id)}
            >
              <span class="art" style="--w: 38px; --h: 26px"><Silhouette src={a.silhouette?.file} /></span>
              <span class="names">
                <span class="name">{a.name}</span>
                <span class="sci">{a.scientific}</span>
              </span>
              {#if gone}
                <StatusMark kind="EX" text="Extinct" />
              {:else if a.status !== 'EX' && showIucn}
                <StatusMark kind={a.status} />
              {:else}
                <StatusMark kind="ALIVE" text="Alive" />
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">No animals match. Try clearing the search or filters.</p>
    {/each}
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
    color: var(--accent);
  }
  .brand p {
    margin: 8px 0 0;
    max-width: 30ch;
    font-size: 12.5px;
    line-height: 1.45;
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
