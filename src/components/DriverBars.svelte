<script lang="ts">
  import { DRIVER_BY_ID, type Summary } from '../lib/scenario';

  interface Props {
    drivers: Summary['drivers'];
  }
  let { drivers }: Props = $props();

  const active = $derived(drivers.filter((d) => d.points >= 0.5).sort((a, b) => b.points - a.points));
  const most = $derived(Math.max(1, ...active.map((d) => d.points)));
</script>

<section aria-label="Which pressure matters most">
  <h3>What matters most</h3>
  {#if active.length}
    <ul>
      {#each active as d (d.id)}
        <li>
          <span class="name">{DRIVER_BY_ID.get(d.id)?.label}</span>
          <span class="track" aria-hidden="true"><i style="width: {(d.points / most) * 100}%"></i></span>
          <span class="num">{d.animals}<small>{d.animals === 1 ? 'animal' : 'animals'}</small></span>
        </li>
      {/each}
    </ul>
    <p>Bars show total points added across all animals; the number is how many animals it lifts by 5 points or more.</p>
  {:else}
    <p class="idle">Raise a pressure to see which one moves the most animals.</p>
  {/if}
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
    grid-template-columns: 112px 1fr 74px;
    align-items: center;
    gap: 10px;
    font-size: 12.5px;
  }
  .track {
    height: 6px;
    border-radius: 2px;
    background: var(--line);
  }
  .track i {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
    transition: width 0.12s ease-out;
  }
  .num {
    text-align: right;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .num small {
    margin-left: 3px;
    font-size: 11px;
    font-weight: 400;
    color: var(--muted);
  }
  p {
    margin: 8px 0 0;
    font-size: 11.5px;
    line-height: 1.45;
    color: var(--muted);
  }
  p.idle {
    margin: 0;
    font-size: 12.5px;
  }
</style>
