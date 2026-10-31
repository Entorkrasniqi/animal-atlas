<script lang="ts">
  import type { Summary } from '../lib/scenario';
  import BandStrip from './BandStrip.svelte';
  import DriverBars from './DriverBars.svelte';
  import GroupBars from './GroupBars.svelte';
  import RiskMark from './RiskMark.svelte';
  import Silhouette from './Silhouette.svelte';

  interface Props {
    summary: Summary;
    /** The sliders in words. */
    headline: string;
    onpick: (id: string) => void;
  }
  let { summary, headline, onpick }: Props = $props();

  const rise = $derived(summary.averageNow - summary.averageToday);
</script>

<section class="panel" aria-label="Scenario summary">
  <header>
    <p class="eyebrow">This scenario</p>
    <h2>{headline}</h2>
    <p class="avg">
      Average score <strong>{summary.averageNow}</strong>
      {#if rise > 0}<span class="up">+{rise}</span> from today's {summary.averageToday}{:else}(today's){/if}
      across {summary.count} living animals.
    </p>
  </header>

  <BandStrip bands={summary.bands} />

  {#if summary.top.length}
    <section aria-label="Most affected animals">
      <h3>Most affected</h3>
      <ul class="top">
        {#each summary.top as t (t.animal.id)}
          <li>
            <button type="button" onclick={() => onpick(t.animal.id)}>
              <span class="art" style="--w: 38px; --h: 26px"><Silhouette src={t.animal.silhouette?.file} /></span>
              <span class="name">{t.animal.name}</span>
              <RiskMark score={t.assessment.score} rise={t.assessment.rise} />
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <DriverBars drivers={summary.drivers} />
  <GroupBars groups={summary.groups} />

  <p class="fine">
    Scores compare animals under a what-if world; they are not forecasts. Choose an animal to see what is hitting it.
  </p>
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 22px;
    height: 100%;
    overflow-y: auto;
    padding: 22px 24px 20px;
    background: var(--panel);
    border-left: 1px solid var(--line);
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
    font-size: 24px;
    font-weight: 500;
    letter-spacing: -0.015em;
    line-height: 1.15;
  }
  .avg {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--muted);
  }
  .avg strong {
    font-family: var(--serif);
    font-size: 20px;
    font-weight: 500;
    color: var(--ink);
  }
  .avg .up {
    font-weight: 600;
    color: var(--accent-ink);
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
  .top {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .top li + li button {
    border-top: 1px solid var(--line);
  }
  .top button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 0;
    border: 0;
    background: transparent;
    text-align: left;
  }
  .top button:hover .name {
    color: var(--accent-ink);
  }
  .art {
    flex: none;
    display: grid;
    place-items: center;
    width: 38px;
    color: var(--ink-2);
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 13.5px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fine {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--muted);
  }
</style>
