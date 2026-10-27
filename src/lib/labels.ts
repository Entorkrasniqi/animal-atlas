import type { Basemap, Place, Region } from './basemap';
import type { Shape, World } from './geo';

/** Zoom in the web-map sense (a 256 px world is zoom 0), which is how Natural Earth rates its features. */
export function webZoom(world: World, k: number): number {
  return Math.log2(((world.width - 12) * k) / 256);
}

export interface LabelStyle {
  ink: string;
  muted: string;
  halo: string;
  /** CSS font family, e.g. the app's sans stack. */
  family: string;
}

/** A city dot that was drawn, in screen pixels, so the pointer can find it. */
export interface DrawnPlace {
  place: Place;
  x: number;
  y: number;
}

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Remembers the boxes already used so later labels can avoid them. */
class Placer {
  private static SIZE = 64;
  private cells = new Map<number, Rect[]>();

  private keys(r: Rect): number[] {
    const out: number[] = [];
    for (let cx = Math.floor(r.x0 / Placer.SIZE); cx <= Math.floor(r.x1 / Placer.SIZE); cx++) {
      for (let cy = Math.floor(r.y0 / Placer.SIZE); cy <= Math.floor(r.y1 / Placer.SIZE); cy++) out.push(cx * 100_003 + cy);
    }
    return out;
  }

  free(r: Rect): boolean {
    for (const key of this.keys(r)) {
      for (const o of this.cells.get(key) ?? []) {
        if (r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0) return false;
      }
    }
    return true;
  }

  add(r: Rect): void {
    for (const key of this.keys(r)) {
      const list = this.cells.get(key);
      if (list) list.push(r);
      else this.cells.set(key, [r]);
    }
  }
}

const widths = new Map<string, number>();

function measure(ctx: CanvasRenderingContext2D, text: string): number {
  const key = `${ctx.font}|${text}`;
  let w = widths.get(key);
  if (w === undefined) {
    w = ctx.measureText(text).width;
    widths.set(key, w);
  }
  return w;
}

// Importance orders, worked out once per data set.
const placeOrder = new WeakMap<Basemap, Place[]>();
const regionOrder = new WeakMap<Basemap, Region[]>();
const countryOrder = new WeakMap<World, Shape[]>();

function placesByImportance(bm: Basemap): Place[] {
  let list = placeOrder.get(bm);
  if (!list) {
    // Country capitals first, then everything by population.
    list = [...bm.places].sort((a, b) => (b.capital === 1 ? 1e9 : 0) + b.pop - ((a.capital === 1 ? 1e9 : 0) + a.pop));
    placeOrder.set(bm, list);
  }
  return list;
}

function regionsBySize(bm: Basemap): Region[] {
  let list = regionOrder.get(bm);
  if (!list) {
    const area = (r: Region) => (r.bounds[2] - r.bounds[0]) * (r.bounds[3] - r.bounds[1]);
    list = [...bm.regions].sort((a, b) => area(b) - area(a));
    regionOrder.set(bm, list);
  }
  return list;
}

function countriesBySize(world: World): Shape[] {
  let list = countryOrder.get(world);
  if (!list) {
    list = world.shapes
      .filter((s) => s.code && world.byCode.get(s.code) === s)
      .sort((a, b) => b.mainSize[0] * b.mainSize[1] - a.mainSize[0] * a.mainSize[1]);
    countryOrder.set(world, list);
  }
  return list;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface LabelArgs {
  world: World;
  basemap: Basemap | null;
  /** The map's pan and zoom. */
  tx: number;
  ty: number;
  k: number;
  /** Size of the map in CSS pixels. */
  w: number;
  h: number;
  style: LabelStyle;
}

/** Draws a label with a pale outline so it reads over colour. Coordinates are CSS pixels. */
function write(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, style: LabelStyle, color: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = style.halo;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

/**
 * Names countries, then cities, then states, most important first, skipping any that would overlap one
 * already placed. Which appear depends on zoom and on whether the name fits inside its country or state.
 * The context must be set to CSS pixels. Returns the city dots, for hit-testing.
 */
export function drawLabels(ctx: CanvasRenderingContext2D, a: LabelArgs): DrawnPlace[] {
  const { world, basemap, tx, ty, k, w, h, style } = a;
  const wz = webZoom(world, k);
  const placer = new Placer();
  const margin = 40;
  const on = (x: number, y: number) => x > -margin && x < w + margin && y > -margin && y < h + margin;
  const drawn: DrawnPlace[] = [];

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // Countries: spaced capitals, in the middle of their biggest piece, fading out once states take over.
  const countryAlpha = clamp01((7 - wz) / 1.2);
  if (countryAlpha > 0) {
    ctx.font = `600 10px ${style.family}`;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = '1.2px';
    ctx.textAlign = 'center';
    for (const s of countriesBySize(world)) {
      const x = s.anchor[0] * k + tx;
      const y = s.anchor[1] * k + ty;
      if (!on(x, y)) continue;
      const text = s.name.toUpperCase();
      const tw = measure(ctx, text);
      if (s.mainSize[0] * k < tw * 0.85) continue;
      const box = { x0: x - tw / 2 - 4, y0: y - 8, x1: x + tw / 2 + 4, y1: y + 8 };
      if (!placer.free(box)) continue;
      placer.add(box);
      write(ctx, text, x, y, style, style.muted, 0.85 * countryAlpha);
    }
    (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
  }

  if (basemap) {
    // Cities: a dot, and a name where there is room. Capitals get a ring and a heavier name.
    const placeAlpha = clamp01((wz - 2.2) / 0.8);
    let labelled = 0;
    if (placeAlpha > 0) {
      ctx.textAlign = 'left';
      for (const p of placesByImportance(basemap)) {
        if (wz + 0.9 < p.zoom) continue;
        const x = p.x * k + tx;
        const y = p.y * k + ty;
        if (!on(x, y)) continue;
        const dot = p.capital === 1 ? 3.4 : p.pop >= 1000 ? 2.8 : 2.2;
        const dotBox = { x0: x - dot - 1, y0: y - dot - 1, x1: x + dot + 1, y1: y + dot + 1 };
        if (!placer.free(dotBox)) continue;
        placer.add(dotBox);

        ctx.globalAlpha = placeAlpha;
        ctx.beginPath();
        ctx.arc(x, y, dot, 0, Math.PI * 2);
        ctx.fillStyle = p.capital === 1 ? style.halo : style.ink;
        ctx.fill();
        ctx.lineWidth = p.capital === 1 ? 1.6 : 1;
        ctx.strokeStyle = p.capital === 1 ? style.ink : style.halo;
        ctx.stroke();
        if (p.capital === 1) {
          ctx.beginPath();
          ctx.arc(x, y, 1.1, 0, Math.PI * 2);
          ctx.fillStyle = style.ink;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        drawn.push({ place: p, x, y });

        if (labelled >= 260) continue;
        ctx.font = `${p.capital === 1 ? 600 : 500} ${p.capital === 1 ? 12 : 11}px ${style.family}`;
        const tw = measure(ctx, p.name);
        for (const side of [1, -1]) {
          const x0 = side === 1 ? x + dot + 4 : x - dot - 4 - tw;
          const box = { x0: x0 - 2, y0: y - 8, x1: x0 + tw + 2, y1: y + 8 };
          if (!placer.free(box)) continue;
          placer.add(box);
          ctx.textAlign = 'left';
          write(ctx, p.name, x0, y, style, style.ink, placeAlpha);
          labelled++;
          break;
        }
      }
    }

    // States and provinces: only those whose name fits inside them, so the big ones come first.
    const regionAlpha = clamp01((wz - 3.2) / 0.8);
    if (regionAlpha > 0) {
      ctx.font = `italic 500 10.5px ${style.family}`;
      ctx.textAlign = 'center';
      for (const r of regionsBySize(basemap)) {
        if (wz < r.zoom - 3) continue;
        const x = r.x * k + tx;
        const y = r.y * k + ty;
        if (!on(x, y)) continue;
        const tw = measure(ctx, r.name);
        if ((r.bounds[2] - r.bounds[0]) * k < tw * 0.9) continue;
        const box = { x0: x - tw / 2 - 3, y0: y - 7, x1: x + tw / 2 + 3, y1: y + 7 };
        if (!placer.free(box)) continue;
        placer.add(box);
        write(ctx, r.name, x, y, style, style.muted, 0.9 * regionAlpha);
      }
    }
  }

  ctx.restore();
  return drawn;
}
