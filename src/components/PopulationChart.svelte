<script lang="ts">
  import type { Animal } from '../lib/types';
  import { populationAt } from '../lib/state';
  import { MAX_YEAR, formatYear } from '../lib/time';

  interface Props {
    animal: Animal;
    year: number;
  }
  let { animal, year }: Props = $props();

  const W = 340;
  const H = 128;
  const m = { l: 34, r: 8, t: 8, b: 22 };

  const pts = $derived(animal.population ?? []);
  const x0 = $derived(pts[0]?.[0] ?? 0);
  const x1 = $derived(Math.max(animal.extinctYear ?? MAX_YEAR, pts[pts.length - 1]?.[0] ?? 0));

  const lo = $derived(Math.floor(Math.log10(Math.min(...pts.map((p) => p[1])))));
  const hi = $derived(Math.max(lo + 1, Math.ceil(Math.log10(Math.max(...pts.map((p) => p[1]))))));

  const px = (y: number) => m.l + ((y - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const py = (v: number) => m.t + (1 - (Math.log10(Math.max(v, 1)) - lo) / (hi - lo)) * (H - m.t - m.b);

  const line = $derived(pts.map(([y, v], i) => `${i ? 'L' : 'M'}${px(y).toFixed(1)},${py(v).toFixed(1)}`).join(''));

  const ticks = $derived(
    Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((_, i, a) => a.length <= 5 || i % 2 === 0),
  );

  function label(exp: number): string {
    const v = 10 ** exp;
    if (v >= 1e12) return `${v / 1e12}T`;
    if (v >= 1e9) return `${v / 1e9}B`;
    if (v >= 1e6) return `${v / 1e6}M`;
    if (v >= 1e3) return `${v / 1e3}K`;
    return String(v);
  }

  const reading = $derived(populationAt(animal, year));
  const cursor = $derived(
    year >= x0 && year <= x1 && reading && reading.value > 0 ? { x: px(year), y: py(reading.value) } : null,
  );
  const gone = $derived(animal.extinctYear !== undefined);
  const caption = $derived(
    `Population over time on a log scale, from ${formatYear(x0)} to ${formatYear(x1)}.` +
      (gone ? ' The species goes extinct at the end of the line.' : ''),
  );
</script>

{#if pts.length >= 2}
  <figure>
    <figcaption>Population over time <span>log scale</span></figcaption>
    <svg viewBox="0 0 {W} {H}" role="img" aria-label={caption}>
      {#each ticks as t}
        <line class="grid" x1={m.l} x2={W - m.r} y1={py(10 ** t)} y2={py(10 ** t)} />
        <text class="axis" x={m.l - 6} y={py(10 ** t) + 3.5} text-anchor="end">{label(t)}</text>
      {/each}
      <path class="line" d={line} />
      {#each pts as [y, v]}
        <circle class="pt" cx={px(y)} cy={py(v)} r="2.5" />
      {/each}
      {#if gone}
        {@const ex = px(x1)}
        {@const ey = py(10 ** lo)}
        <path class="drop" d="M{ex},{py(pts[pts.length - 1][1])}V{ey}" />
        <path class="cross" d="M{ex - 4},{ey - 8}l8,8M{ex + 4},{ey - 8}l-8,8" />
      {/if}
      {#if cursor}
        <line class="cursor" x1={cursor.x} x2={cursor.x} y1={m.t} y2={H - m.b} />
        <circle class="now" cx={cursor.x} cy={cursor.y} r="4.5" />
      {/if}
      <text class="axis" x={m.l} y={H - 5} text-anchor="start">{formatYear(x0)}</text>
      <text class="axis" x={W - m.r} y={H - 5} text-anchor="end">{formatYear(x1)}</text>
    </svg>
  </figure>
{/if}

<style>
  figure {
    margin: 0;
  }
  figcaption {
    margin-bottom: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }
  figcaption span {
    margin-left: 6px;
    font-weight: 400;
    letter-spacing: 0.02em;
    text-transform: none;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .grid {
    stroke: var(--line);
    stroke-width: 1;
  }
  .axis {
    fill: var(--muted);
    font-size: 10px;
    font-family: var(--sans);
    font-variant-numeric: tabular-nums;
  }
  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.75;
    stroke-linejoin: round;
  }
  .pt {
    fill: var(--panel);
    stroke: var(--accent);
    stroke-width: 1.5;
  }
  .drop {
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.25;
    stroke-dasharray: 3 3;
  }
  .cross {
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.5;
    stroke-linecap: round;
  }
  .cursor {
    stroke: var(--ink);
    stroke-width: 1;
    stroke-dasharray: 2 3;
    opacity: 0.55;
  }
  .now {
    fill: var(--ink);
    stroke: var(--panel);
    stroke-width: 2;
  }
</style>
