<script lang="ts">
  import { GROUP_LABEL } from '../lib/types';
  import type { Summary } from '../lib/scenario';
  import ScoreBar from './ScoreBar.svelte';

  interface Props {
    groups: Summary['groups'];
  }
  let { groups }: Props = $props();

  const sorted = $derived([...groups].sort((a, b) => b.now - a.now || b.today - a.today));
</script>

<section aria-label="Average score by animal group">
  <h3>By animal group</h3>
  <ul>
    {#each sorted as g (g.group)}
      <li>
        <span class="name">{GROUP_LABEL[g.group]} <small>{g.count}</small></span>
        <ScoreBar today={g.today} now={g.now} height={6} />
        <span class="num">{g.now}{#if g.now > g.today}<small class="up">+{g.now - g.today}</small>{/if}</span>
      </li>
    {/each}
  </ul>
  <p>Average score of the animals in each group.</p>
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
  ul {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    grid-template-columns: 112px 1fr 52px;
    align-items: center;
    gap: 10px;
    font-size: 12.5px;
  }
  .name small {
    margin-left: 3px;
    color: var(--muted);
    font-size: 11px;
  }
  .num {
    text-align: right;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .num .up {
    margin-left: 4px;
    font-size: 11px;
    color: var(--accent-ink);
  }
  p {
    margin: 8px 0 0;
    font-size: 11.5px;
    color: var(--muted);
  }
</style>
