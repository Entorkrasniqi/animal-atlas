<script lang="ts">
  import { toneOf } from '../lib/scenario';

  interface Props {
    /** Today's score (0–100): the dark part of the bar. */
    today: number;
    /** The score under the scenario: the lighter part is what the scenario adds. */
    now: number;
    height?: number;
  }
  let { today, now, height = 4 }: Props = $props();

  const tone = $derived(toneOf(now));
</script>

<span class="bar" style="--c: var(--s-{tone}); height: {height}px" aria-hidden="true">
  <i class="base" style="width: {Math.min(today, now)}%"></i>
  {#if now > today}<i class="add" style="left: {today}%; width: {now - today}%"></i>{/if}
</span>

<style>
  .bar {
    position: relative;
    display: block;
    overflow: hidden;
    border-radius: 2px;
    background: var(--line);
  }
  i {
    position: absolute;
    top: 0;
    bottom: 0;
    transition: width 0.12s ease-out, left 0.12s ease-out;
  }
  .base {
    left: 0;
    background: color-mix(in srgb, var(--c) 62%, var(--ink));
  }
  .add {
    background: var(--c);
  }
</style>
