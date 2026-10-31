<script lang="ts">
  import type { Summary } from '../lib/scenario';

  interface Props {
    bands: Summary['bands'];
  }
  let { bands }: Props = $props();

  // Worst band first, so the rows read from the top down as the scenario bites.
  const rows = $derived([...bands].reverse());
  const describe = (key: 'today' | 'now') => bands.map((b) => `${b[key]} ${b.label.toLowerCase()}`).join(', ');
</script>

<section aria-label="Animals by score band">
  <h3>Animals by score</h3>

  {#each [{ key: 'today', label: 'Today' }, { key: 'now', label: 'Scenario' }] as const as row (row.key)}
    <div class="line">
      <span class="when">{row.label}</span>
      <div class="stack" role="img" aria-label="{row.label}: {describe(row.key)}">
        {#each bands as b (b.tone)}
          {#if b[row.key] > 0}<i style="flex: {b[row.key]}; background: var(--s-{b.tone})"></i>{/if}
        {/each}
      </div>
    </div>
  {/each}

  <ul>
    {#each rows as b (b.tone)}
      <li class:moved={b.now !== b.today}>
        <i class="dot" style="background: var(--s-{b.tone})"></i>
        <span class="name">{b.label}</span>
        <span class="range">{b.range}</span>
        <span class="num">
          {#if b.now !== b.today}{b.today} <span class="arrow">→</span> <b>{b.now}</b>{:else}{b.now}{/if}
        </span>
      </li>
    {/each}
  </ul>
</section>

<style>
  h3 {
    margin: 0 0 8px;
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .line {
    display: grid;
    grid-template-columns: 62px 1fr;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .when {
    font-size: 12px;
    color: var(--muted);
  }
  .stack {
    display: flex;
    height: 12px;
    overflow: hidden;
    border-radius: 3px;
    background: var(--line);
  }
  .stack i {
    min-width: 0;
    transition: flex-grow 0.15s ease-out;
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    grid-template-columns: 10px 1fr auto auto;
    align-items: baseline;
    gap: 8px;
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .dot {
    align-self: center;
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
  .range {
    font-size: 11.5px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .num {
    min-width: 7ch;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .arrow {
    color: var(--muted);
  }
  li.moved .num b {
    color: var(--accent-ink);
  }
</style>
