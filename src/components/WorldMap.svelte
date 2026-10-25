<script lang="ts">
  import { untrack } from 'svelte';
  import { interpolateZoom } from 'd3-interpolate';
  import { select } from 'd3-selection';
  import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
  import { buildWorld, loadCountries, type Shape, type World } from '../lib/geo';
  import Icon from './Icon.svelte';

  interface Props {
    /** Countries where the selected animal currently lives. */
    present: Set<string>;
    /** Last known range of an extinct animal. */
    former: Set<string>;
    /** Overview mode: 0..1 intensity per country. */
    heat: Map<string, number> | null;
    /** Country the sidebar is filtered to. */
    focus: string | null;
    /** Extra tooltip lines for a hovered country. */
    label: (code: string | null) => string[];
    onpick: (code: string | null) => void;
    /** Countries the "Zoom to range" button (and fly-to on selection) frames. */
    fitCodes: string[];
    /** When this changes, the view flies to `fitCodes` (or back to the world if null). */
    fitKey: string | null;
  }

  let { present, former, heat, focus, label, onpick, fitCodes, fitKey }: Props = $props();

  let host = $state<HTMLDivElement>();
  let canvas = $state<HTMLCanvasElement>();
  let size = $state({ w: 0, h: 0 });
  let collection = $state.raw<Awaited<ReturnType<typeof loadCountries>> | null>(null);
  let world = $state.raw<World | null>(null);
  let loadFailed = $state(false);
  let tip = $state<{ x: number; y: number; shape: Shape } | null>(null);

  let transform: ZoomTransform = zoomIdentity;
  let tween = 0;
  let flownTo: string | null | undefined;
  let zoomBehavior: ZoomBehavior<HTMLCanvasElement, unknown> | undefined;
  let frame = 0;

  const TINY_PX = 7;

  // --- data + sizing --------------------------------------------------------

  $effect(() => {
    loadCountries().then(
      (c) => (collection = c),
      () => (loadFailed = true),
    );
  });

  $effect(() => {
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      size = { w: Math.round(width), h: Math.round(height) };
    });
    ro.observe(host);
    return () => ro.disconnect();
  });

  $effect(() => {
    if (!collection || !canvas || size.w < 10 || size.h < 10) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    world = buildWorld(collection, size.w, size.h);
    if (zoomBehavior) {
      zoomBehavior
        .extent([
          [0, 0],
          [size.w, size.h],
        ])
        .translateExtent([
          [0, 0],
          [size.w, size.h],
        ]);
      // The projection changed with the size, so the old pan/zoom no longer means anything.
      cancelAnimationFrame(tween);
      select(canvas).call(zoomBehavior.transform, zoomIdentity);
    }
    flownTo = undefined; // re-frame the current animal in the new size
  });

  $effect(() => {
    if (!canvas) return;
    zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([1, 60])
      .on('zoom', (event) => {
        transform = event.transform;
        tip = null;
        scheduleDraw();
      });
    select(canvas).call(zoomBehavior);
    return () => {
      select(canvas as HTMLCanvasElement).on('.zoom', null);
    };
  });

  // --- colours --------------------------------------------------------------

  interface Palette {
    ocean: string;
    land: string;
    border: string;
    present: string;
    extinct: string;
    grid: string;
    halo: string;
    ink: string;
  }
  let palette: Palette | null = null;
  let hatch: { pattern: CanvasPattern; dpr: number } | null = null;

  function readPalette(): Palette {
    const css = getComputedStyle(host as HTMLElement);
    const get = (name: string) => css.getPropertyValue(name).trim();
    return {
      ocean: get('--map-ocean'),
      land: get('--map-land'),
      border: get('--map-border'),
      present: get('--map-present'),
      extinct: get('--map-extinct'),
      grid: get('--map-grid'),
      halo: get('--panel'),
      ink: get('--ink'),
    };
  }

  $effect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      palette = null;
      hatch = null;
      scheduleDraw();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mix(a: string, b: string, t: number): string {
    const [r1, g1, b1] = hexToRgb(a);
    const [r2, g2, b2] = hexToRgb(b);
    const m = (x: number, y: number) => Math.round(x + (y - x) * t);
    return `rgb(${m(r1, r2)}, ${m(g1, g2)}, ${m(b1, b2)})`;
  }

  function getHatch(ctx: CanvasRenderingContext2D, p: Palette, dpr: number): CanvasPattern {
    if (hatch && hatch.dpr === dpr) return hatch.pattern;
    const s = Math.round(7 * dpr);
    const tile = document.createElement('canvas');
    tile.width = tile.height = s;
    const t = tile.getContext('2d') as CanvasRenderingContext2D;
    t.fillStyle = p.land;
    t.fillRect(0, 0, s, s);
    t.strokeStyle = p.extinct;
    t.lineWidth = 1.3 * dpr;
    t.beginPath();
    t.moveTo(-s, s);
    t.lineTo(s, -s);
    t.moveTo(0, s * 2);
    t.lineTo(s * 2, 0);
    t.moveTo(-s, s * 2);
    t.lineTo(s * 2, -s);
    t.stroke();
    const pattern = ctx.createPattern(tile, 'repeat') as CanvasPattern;
    hatch = { pattern, dpr };
    return pattern;
  }

  // --- drawing --------------------------------------------------------------

  function scheduleDraw() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }

  $effect(() => {
    // Track everything the picture depends on.
    void [present, former, heat, focus, world];
    scheduleDraw();
  });

  function isTiny(s: Shape, k: number): boolean {
    const [x0, y0, x1, y1] = s.bounds;
    return Math.max(x1 - x0, y1 - y0) * k < TINY_PX;
  }

  function draw() {
    if (!canvas || !world || !host) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const dpr = window.devicePixelRatio || 1;
    palette ??= readPalette();
    const p = palette;
    const { x, y, k } = transform;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * x, dpr * y);

    ctx.fillStyle = p.ocean;
    ctx.fill(world.sphere);

    ctx.lineWidth = 0.5 / k;
    ctx.strokeStyle = p.grid;
    ctx.stroke(world.graticule);

    const stripes = former.size > 0 ? getHatch(ctx, p, dpr) : null;
    stripes?.setTransform(new DOMMatrix([1 / (dpr * k), 0, 0, 1 / (dpr * k), 0, 0]));

    const markers: { s: Shape; color: string }[] = [];

    ctx.lineWidth = 0.6 / k;
    ctx.strokeStyle = p.border;
    for (const s of world.shapes) {
      let fill: string | CanvasPattern = p.land;
      const code = s.code;
      if (code) {
        if (heat) {
          const t = heat.get(code);
          if (t !== undefined) fill = mix(p.land, p.present, 0.22 + 0.78 * t);
        } else if (present.has(code)) fill = p.present;
        else if (former.has(code) && stripes) fill = stripes;
      }
      ctx.fillStyle = fill;
      ctx.fill(s.path);
      ctx.stroke(s.path);

      if (fill !== p.land && isTiny(s, k) && code && world.byCode.get(code) === s) {
        markers.push({ s, color: typeof fill === 'string' ? fill : p.extinct });
      }
    }

    // Small countries and islands would be invisible; give them a dot.
    for (const { s, color } of markers) {
      ctx.beginPath();
      ctx.arc(s.centroid[0], s.centroid[1], 4.5 / k, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5 / k;
      ctx.strokeStyle = p.halo;
      ctx.stroke();
    }

    if (focus) {
      const s = world.byCode.get(focus);
      if (s) {
        ctx.lineWidth = 4 / k;
        ctx.strokeStyle = p.halo;
        ctx.stroke(s.path);
        ctx.lineWidth = 2 / k;
        ctx.strokeStyle = p.ink;
        ctx.stroke(s.path);
      }
    }
  }

  // --- interaction ----------------------------------------------------------

  let hitCtx: CanvasRenderingContext2D | null = null;

  function pick(mx: number, my: number): Shape | null {
    if (!world) return null;
    hitCtx ??= document.createElement('canvas').getContext('2d');
    if (!hitCtx) return null;
    const { x, y, k } = transform;
    const px = (mx - x) / k;
    const py = (my - y) / k;
    const pad = 5 / k;
    let best: Shape | null = null;
    for (const s of world.shapes) {
      const [x0, y0, x1, y1] = s.bounds;
      if (px < x0 - pad || px > x1 + pad || py < y0 - pad || py > y1 + pad) continue;
      const hit = isTiny(s, k)
        ? Math.hypot(px - s.centroid[0], py - s.centroid[1]) < 7 / k
        : hitCtx.isPointInPath(s.path, px, py);
      if (hit && (!best || s.area < best.area)) best = s;
    }
    return best;
  }

  function onmove(e: PointerEvent) {
    if (e.buttons) return;
    const r = (canvas as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const shape = pick(mx, my);
    tip = shape ? { x: mx, y: my, shape } : null;
    (canvas as HTMLCanvasElement).style.cursor = shape?.code ? 'pointer' : 'grab';
  }

  function onclick(e: MouseEvent) {
    const r = (canvas as HTMLCanvasElement).getBoundingClientRect();
    const shape = pick(e.clientX - r.left, e.clientY - r.top);
    onpick(shape?.code && shape.code !== focus ? shape.code : null);
  }

  function zoomBy(factor: number) {
    if (canvas && zoomBehavior) select(canvas).call(zoomBehavior.scaleBy, factor);
  }

  function viewFor(codes: string[]): ZoomTransform {
    if (!world) return zoomIdentity;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const code of codes) {
      const s = world.byCode.get(code);
      if (!s) continue;
      x0 = Math.min(x0, s.bounds[0]);
      y0 = Math.min(y0, s.bounds[1]);
      x1 = Math.max(x1, s.bounds[2]);
      y1 = Math.max(y1, s.bounds[3]);
    }
    if (!isFinite(x0)) return zoomIdentity;
    const pad = 48;
    const k = Math.min(14, Math.max(1, Math.min(size.w / (x1 - x0 + pad), size.h / (y1 - y0 + pad))));
    return zoomIdentity
      .translate(size.w / 2, size.h / 2)
      .scale(k)
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  }

  /** Smooth van Wijk zoom/pan to `target`. */
  function flyTo(target: ZoomTransform) {
    if (!canvas || !zoomBehavior) return;
    cancelAnimationFrame(tween);
    const { w, h } = size;
    const view = (t: ZoomTransform): [number, number, number] => [(w / 2 - t.x) / t.k, (h / 2 - t.y) / t.k, w / t.k];
    const interpolate = interpolateZoom(view(transform), view(target));
    const duration = Math.min(900, Math.max(350, interpolate.duration));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const step = (now: number) => {
      const raw = reduced ? 1 : Math.min(1, (now - t0) / duration);
      const u = raw < 0.5 ? 2 * raw * raw : 1 - (-2 * raw + 2) ** 2 / 2;
      const [cx, cy, width] = interpolate(u);
      const k = w / width;
      select(canvas as HTMLCanvasElement).call(
        (zoomBehavior as ZoomBehavior<HTMLCanvasElement, unknown>).transform,
        zoomIdentity.translate(w / 2 - cx * k, h / 2 - cy * k).scale(k),
      );
      if (raw < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  }

  // Fly to a newly selected animal's range (or back out when none is selected).
  $effect(() => {
    const key = fitKey;
    if (!world || key === flownTo) return;
    flownTo = key;
    untrack(() => flyTo(key ? viewFor(fitCodes) : zoomIdentity));
  });

  const tipLines = $derived(tip ? label(tip.shape.code) : []);
</script>

<div class="map" bind:this={host}>
  <canvas
    bind:this={canvas}
    style="width:{size.w}px;height:{size.h}px"
    onpointermove={onmove}
    onpointerdown={() => cancelAnimationFrame(tween)}
    onwheel={() => cancelAnimationFrame(tween)}
    onpointerleave={() => (tip = null)}
    {onclick}
  >
    World map highlighting the countries where the selected animal lives. The same countries are listed in the details panel.
  </canvas>

  {#if !world}
    <div class="status" role="status">{loadFailed ? 'Could not load the map data.' : 'Loading map…'}</div>
  {/if}

  <div class="controls" role="group" aria-label="Map view">
    <button type="button" onclick={() => zoomBy(1.6)} aria-label="Zoom in" title="Zoom in"><Icon name="plus" /></button>
    <button type="button" onclick={() => zoomBy(1 / 1.6)} aria-label="Zoom out" title="Zoom out"><Icon name="minus" /></button>
    <button type="button" onclick={() => flyTo(zoomIdentity)} aria-label="Reset view" title="Show whole world"><Icon name="reset" /></button>
    {#if fitCodes.length}
      <button type="button" onclick={() => flyTo(viewFor(fitCodes))} aria-label="Zoom to range" title="Zoom to this animal's range"><Icon name="target" /></button>
    {/if}
  </div>

  {#if tip}
    <div
      class="tip"
      class:flip={tip.x > size.w - 230}
      class:up={tip.y > size.h - 110}
      style="left:{tip.x}px;top:{tip.y}px"
    >
      <strong>{tip.shape.name}</strong>
      {#each tipLines as line}
        <span>{line}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .map {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--map-ocean);
  }
  canvas {
    display: block;
    touch-action: none;
    cursor: grab;
  }
  canvas:active {
    cursor: grabbing;
  }
  .status {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--muted);
    font-size: 13px;
  }

  .controls {
    position: absolute;
    right: 16px;
    bottom: 16px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--panel);
    overflow: hidden;
  }
  .controls button {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 0;
    border-top: 1px solid var(--line);
    background: transparent;
    color: var(--ink-2);
  }
  .controls button:first-child {
    border-top: 0;
  }
  .controls button:hover {
    background: var(--hover);
    color: var(--ink);
  }

  .tip {
    position: absolute;
    z-index: 5;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 250px;
    padding: 8px 11px;
    border-radius: 4px;
    background: var(--ink);
    color: var(--bg);
    font-size: 12px;
    line-height: 1.4;
    transform: translate(14px, 14px);
  }
  .tip.flip {
    transform: translate(calc(-100% - 14px), 14px);
  }
  .tip.up {
    transform: translate(14px, calc(-100% - 14px));
  }
  .tip.flip.up {
    transform: translate(calc(-100% - 14px), calc(-100% - 14px));
  }
  .tip strong {
    font-size: 13px;
    font-weight: 600;
  }
  .tip span {
    opacity: 0.78;
  }
</style>
