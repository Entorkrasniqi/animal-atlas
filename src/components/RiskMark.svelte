<script lang="ts">
  import ScoreBar from './ScoreBar.svelte';

  interface Props {
    /** 0–100. */
    score: number;
    /** Points above today's score; shown when positive. */
    rise?: number;
  }
  let { score, rise = 0 }: Props = $props();
</script>

<span class="risk" title="Scenario score {score} of 100{rise > 0 ? `, up ${rise} from today` : ''}">
  <span class="top">
    <b>{score}</b>
    {#if rise > 0}<small>+{rise}</small>{/if}
  </span>
  <ScoreBar today={score - rise} now={score} />
</span>

<style>
  .risk {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 58px;
  }
  .top {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 5px;
    font-variant-numeric: tabular-nums;
  }
  b {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--ink);
  }
  small {
    min-width: 2.4ch;
    font-size: 11px;
    font-weight: 600;
    color: var(--accent-ink);
    text-align: right;
  }
</style>
