<script lang="ts">
  import type { Animal } from '../lib/types';
  import Icon from './Icon.svelte';
  import {
    JUMPS,
    MARKS,
    MAX_YEAR,
    MIN_YEAR,
    clampYear,
    formatYear,
    posToYear,
    snapYear,
    stepFor,
    yearToPos,
  } from '../lib/time';

  interface Props {
    year: number;
    playing: boolean;
    /** Every extinct animal, for the tick marks. */
    extinct: Animal[];
    selected: Animal | null;
    extinctCount: number;
    total: number;
    onplay: () => void;
    onpickextinct: (animal: Animal) => void;
  }

  let { year = $bindable(), playing, extinct, selected, extinctCount, total, onplay, onpickextinct }: Props = $props();

  let rail = $state<HTMLDivElement>();
  let dragging = $state(false);

  const pos = $derived(yearToPos(year));
  const eventYears = $derived([...new Set(extinct.map((a) => a.extinctYear as number))].sort((a, b) => a - b));

  function yearAt(e: PointerEvent): number {
    const r = (rail as HTMLElement).getBoundingClientRect();
    return snapYear(posToYear((e.clientX - r.left) / r.width));
  }

  function onpointerdown(e: PointerEvent) {
    if (e.button !== 0) return;
    dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    year = yearAt(e);
  }
  function onpointermove(e: PointerEvent) {
    if (dragging) year = yearAt(e);
  }
  function onpointerup(e: PointerEvent) {
    dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  function onkeydown(e: KeyboardEvent) {
    const big = e.shiftKey ? 10 : 1;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = year + stepFor(year) * big;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = year - stepFor(year - 1) * big;
        break;
      case 'PageUp':
        next = eventYears.find((y) => y > year) ?? MAX_YEAR;
        break;
      case 'PageDown':
        next = [...eventYears].reverse().find((y) => y < year) ?? MIN_YEAR;
        break;
      case 'Home':
        next = MIN_YEAR;
        break;
      case 'End':
        next = MAX_YEAR;
        break;
    }
    if (next === null) return;
    e.preventDefault();
    year = clampYear(next);
  }

  function labelAlign(i: number): string {
    return i === 0 ? '0%' : i === MARKS.length - 1 ? '-100%' : '-50%';
  }
</script>

<section class="timeline" aria-label="Timeline">
  <div class="top">
    <button type="button" class="play" onclick={onplay} aria-label={playing ? 'Pause' : 'Play through time'}>
      <Icon name={playing ? 'pause' : 'play'} size={18} />
    </button>

    <div class="year" aria-hidden="true">{formatYear(year)}</div>

    <p class="summary"><strong>{extinctCount}</strong> of {total} animals extinct by this year</p>

    <div class="jumps">
      {#each JUMPS as j}
        <button type="button" class:on={year === j.year} onclick={() => (year = j.year)}>{j.label}</button>
      {/each}
    </div>
  </div>

  <div class="track-wrap">
    <div
      class="track"
      bind:this={rail}
      role="presentation"
      {onpointerdown}
      {onpointermove}
      {onpointerup}
      onpointercancel={onpointerup}
    >
      <div class="rail"></div>
      <div class="fill" style="width:{pos * 100}%"></div>

      {#each extinct as a (a.id)}
        <button
          type="button"
          class="tick"
          class:sel={selected?.id === a.id}
          style="left:{yearToPos(a.extinctYear as number) * 100}%"
          title="{a.name} — extinct {formatYear(a.extinctYear as number)}"
          aria-label="{a.name}, extinct {formatYear(a.extinctYear as number)}"
          onpointerdown={(e) => e.stopPropagation()}
          onclick={() => onpickextinct(a)}
        ></button>
      {/each}

      <div
        class="handle"
        class:dragging
        style="left:{pos * 100}%"
        role="slider"
        tabindex="0"
        aria-label="Year"
        aria-orientation="horizontal"
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={year}
        aria-valuetext={formatYear(year)}
        {onkeydown}
      >
        <span class="bubble">{formatYear(year)}</span>
      </div>

      {#each MARKS as m, i}
        <span class="mark" class:minor={m.minor} style="left:{yearToPos(m.year) * 100}%">
          <b style="transform:translateX({labelAlign(i)})">{m.label}</b>
        </span>
      {/each}
    </div>
  </div>

  <p class="hint">
    Drag the handle, or use the arrow keys (Shift for ×10, Page Up and Page Down to hop between extinctions). Ticks mark extinctions;
    the scale gives the last 500 years more room.
  </p>
</section>

<style>
  .timeline {
    padding: 14px 32px 12px;
    background: var(--panel);
    border-top: 1px solid var(--line);
    user-select: none;
    container-type: inline-size;
  }
  .top {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 18px;
  }
  .play {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--on-accent);
  }
  .play:hover {
    background: var(--accent-ink);
  }
  .year {
    min-width: 7ch;
    font-family: var(--serif);
    font-size: 38px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.02em;
    font-variant-numeric: lining-nums tabular-nums;
  }
  .summary {
    flex: 1;
    min-width: 170px;
    margin: 0;
    font-size: 13px;
    color: var(--muted);
  }
  .summary strong {
    font-family: var(--serif);
    font-size: 18px;
    font-weight: 500;
    color: var(--ink);
    font-variant-numeric: lining-nums;
  }
  .jumps {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 4px;
  }
  .jumps button {
    padding: 4px 8px;
    border: 0;
    border-bottom: 1.5px solid transparent;
    border-radius: 0;
    background: none;
    color: var(--muted);
    font-size: 12.5px;
  }
  .jumps button:hover {
    color: var(--ink);
  }
  .jumps button.on {
    color: var(--ink);
    font-weight: 600;
    border-bottom-color: var(--accent);
  }

  .track-wrap {
    padding: 0 8px;
  }
  .track {
    position: relative;
    height: 60px;
    margin-top: 12px;
    cursor: pointer;
    touch-action: none;
  }
  .rail,
  .fill {
    position: absolute;
    top: 29px;
    height: 2px;
  }
  .rail {
    left: 0;
    right: 0;
    background: var(--line-strong);
  }
  .fill {
    left: 0;
    background: var(--accent);
  }

  .tick {
    position: absolute;
    top: 13px;
    width: 9px;
    height: 14px;
    margin-left: -4.5px;
    padding: 0;
    border: 0;
    background: transparent;
  }
  .tick::after {
    content: '';
    position: absolute;
    left: 4px;
    bottom: 0;
    width: 1px;
    height: 9px;
    background: var(--ink);
    opacity: 0.4;
  }
  .tick:hover::after {
    opacity: 1;
    height: 14px;
  }
  .tick.sel::after {
    left: 3.5px;
    width: 2px;
    height: 20px;
    bottom: -3px;
    background: var(--accent);
    opacity: 1;
  }

  .handle {
    position: absolute;
    top: 21px;
    z-index: 2;
    width: 18px;
    height: 18px;
    margin-left: -9px;
    border-radius: 50%;
    background: var(--panel);
    border: 2px solid var(--accent);
    cursor: grab;
    transition: background 0.12s;
  }
  .handle:hover,
  .handle.dragging {
    background: var(--accent);
  }
  .handle.dragging {
    cursor: grabbing;
  }
  .handle:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
  }
  .bubble {
    position: absolute;
    bottom: 28px;
    left: 50%;
    padding: 3px 8px;
    border-radius: 4px;
    background: var(--ink);
    color: var(--bg);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    transform: translateX(-50%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.12s;
    font-variant-numeric: tabular-nums;
  }
  .handle.dragging .bubble,
  .handle:focus-visible .bubble {
    opacity: 1;
  }

  .mark {
    position: absolute;
    top: 38px;
    width: 0;
    height: 0;
    pointer-events: none;
  }
  .mark::before {
    content: '';
    position: absolute;
    left: 0;
    top: -2px;
    width: 1px;
    height: 7px;
    background: var(--line-strong);
  }
  .mark b {
    position: absolute;
    top: 10px;
    left: 0;
    font-size: 11.5px;
    font-weight: 400;
    color: var(--muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .hint {
    margin: 2px 0 0;
    font-size: 11.5px;
    color: var(--muted);
  }
  @media (max-height: 760px) {
    .hint {
      display: none;
    }
  }
  /* Thin out the axis labels by the timeline's own width, not the window's. */
  @container (max-width: 900px) {
    .mark.minor b {
      display: none;
    }
  }
  @media (max-width: 720px) {
    .timeline {
      padding: 12px 20px 8px;
    }
    .hint {
      display: none;
    }
    .year {
      font-size: 30px;
    }
  }
</style>
