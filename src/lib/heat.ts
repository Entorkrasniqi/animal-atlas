import { CELL_DEG, GRID_H, GRID_W, cellCol, cellRow, colToLon, rowToLat } from './grid';
import type { Habitat, RangeLayer } from './types';

/**
 * A range layer smoothed into a 0..1 surface over a box of the world grid.
 * 0 = nothing recorded nearby; 1 = as many sightings as the animal's busiest places.
 */
export interface Density {
  col0: number;
  row0: number;
  w: number;
  h: number;
  /** Row-major over the box. */
  values: Float32Array;
  /** True for a hand-drawn area: it says where the animal lived, not how common it was there. */
  uniform: boolean;
}

/** What the map draws for the selected animal in the selected year. */
export interface RangeView {
  /** Smoothed sightings; null when only the countries are known. */
  density: Density | null;
  basis: RangeLayer['basis'];
  habitat: Habitat;
  /** The countries of the current stage: land animals are clipped to them. */
  countries: string[];
  /** False for a refuge outside the country outlines, which must not be clipped away. */
  clip: boolean;
  /** True once the animal is gone: its last known range is drawn in muted tones. */
  extinct: boolean;
}

/** How far a single sighting is spread, in degrees: about 80 km, the scale of a reserve. */
const SIGMA_DEG = 0.7;
/** Below this a cell is drawn as nothing. */
export const MIN_VISIBLE = 0.05;
/** Where a cell's colour reaches full strength; below it, it fades into the map. */
const FULL_ALPHA = 0.2;
/** Fraction of the cells that hold records whose smoothed value sets the "most common" level. */
const TOP_QUANTILE = 0.95;

export function makeDensity(layer: RangeLayer): Density | null {
  if (layer.cells.length === 0) return null;

  let c0 = GRID_W;
  let c1 = 0;
  let r0 = GRID_H;
  let r1 = 0;
  for (let i = 0; i < layer.cells.length; i += 2) {
    const col = cellCol(layer.cells[i]);
    const row = cellRow(layer.cells[i]);
    c0 = Math.min(c0, col);
    c1 = Math.max(c1, col);
    r0 = Math.min(r0, row);
    r1 = Math.max(r1, row);
  }

  const sigma = SIGMA_DEG / CELL_DEG;
  // Rows near the poles are narrow, so the blur is stretched sideways there (capped, so it stays local).
  const stretch = (row: number) => Math.min(4, 1 / Math.max(0.05, Math.cos((rowToLat(row) - CELL_DEG / 2) * (Math.PI / 180))));
  const padY = Math.ceil(sigma * 3);
  const farthest = Math.abs(r0 - GRID_H / 2) > Math.abs(r1 - GRID_H / 2) ? r0 : r1;
  const padX = Math.ceil(sigma * 3 * stretch(farthest));

  const col0 = Math.max(0, c0 - padX);
  const row0 = Math.max(0, r0 - padY);
  const w = Math.min(GRID_W - 1, c1 + padX) - col0 + 1;
  const h = Math.min(GRID_H - 1, r1 + padY) - row0 + 1;

  // A hand-drawn area says nothing about abundance: every cell counts the same, and only the edge is softened.
  const area = layer.basis === 'area';
  // log(1 + n): a zoo or a single watched waterhole must not drown out everything else.
  const raw = new Float32Array(w * h);
  for (let i = 0; i < layer.cells.length; i += 2) {
    raw[(cellRow(layer.cells[i]) - row0) * w + (cellCol(layer.cells[i]) - col0)] = area ? 1 : Math.log1p(layer.cells[i + 1]);
  }

  // Separable Gaussian: sideways (width depends on the row), then up and down.
  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const sx = sigma * stretch(row0 + y);
    const reach = Math.ceil(sx * 3);
    const kernel = new Float32Array(reach * 2 + 1);
    for (let k = -reach; k <= reach; k++) kernel[k + reach] = Math.exp(-(k * k) / (2 * sx * sx));
    const norm = 1 / kernel.reduce((a, b) => a + b, 0);
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -reach; k <= reach; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < w) sum += raw[y * w + xx] * kernel[k + reach];
      }
      tmp[y * w + x] = sum * norm;
    }
  }
  const reachY = Math.ceil(sigma * 3);
  const kernelY = new Float32Array(reachY * 2 + 1);
  for (let k = -reachY; k <= reachY; k++) kernelY[k + reachY] = Math.exp(-(k * k) / (2 * sigma * sigma));
  const normY = 1 / kernelY.reduce((a, b) => a + b, 0);
  const smooth = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -reachY; k <= reachY; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < h) sum += tmp[yy * w + x] * kernelY[k + reachY];
      }
      smooth[y * w + x] = sum * normY;
    }
  }

  if (area) {
    // Small areas lose height when blurred; scale so the middle of every area is fully shaded.
    const peak = smooth.reduce((m, v) => Math.max(m, v), 0) || 1;
    return { col0, row0, w, h, values: smooth.map((v) => Math.min(1, v / peak)), uniform: true };
  }

  // "Most common" is judged against the animal's own record-holding cells, so a species with a few
  // hundred sightings in total is still shown from pale to dark instead of all pale.
  const atRecords: number[] = [];
  for (let i = 0; i < layer.cells.length; i += 2) {
    atRecords.push(smooth[(cellRow(layer.cells[i]) - row0) * w + (cellCol(layer.cells[i]) - col0)]);
  }
  atRecords.sort((a, b) => a - b);
  const top = atRecords[Math.min(atRecords.length - 1, Math.floor(atRecords.length * TOP_QUANTILE))] || 1;

  const values = new Float32Array(w * h);
  for (let i = 0; i < values.length; i++) values[i] = Math.min(1, smooth[i] / top);
  return { col0, row0, w, h, values, uniform: false };
}

/** Relative commonness (0..1) at a position, or 0 outside the layer. */
export function densityAt(d: Density, lon: number, lat: number): number {
  const col = Math.floor((lon + 180) / CELL_DEG) - d.col0;
  const row = Math.floor((90 - lat) / CELL_DEG) - d.row0;
  if (col < 0 || row < 0 || col >= d.w || row >= d.h) return 0;
  return d.values[row * d.w + col];
}

/** Words for a relative commonness, used in tooltips. */
export function commonness(v: number): string {
  if (v < MIN_VISIBLE) return 'No sightings recorded nearby';
  if (v < 0.25) return 'Rare here';
  if (v < 0.5) return 'Uncommon here';
  if (v < 0.75) return 'Common here';
  return 'Very common here';
}

// --- colours -----------------------------------------------------------------------

/** The score bands the what-if mode colours by; the colours are the IUCN categories'. */
export type Tone = 'LC' | 'NT' | 'VU' | 'EN' | 'CR';

export type RampKind = 'living' | 'extinct' | 'estimate' | 'warming' | `score-${Tone}`;

/**
 * Cold to hot, and light to dark. The cold end is a pale blue so a rare record is still visible on
 * the light land; sand and orange carry the middle; the common end is a deep red.
 */
const LIVING_STOPS = ['#8fc3e0', '#dcbd68', '#f0a050', '#d9532f', '#a11d2b', '#5c0b1d'];
/** The same idea for an animal that is gone, in muted violet-greys so a lost range never looks alive. */
const EXTINCT_STOPS = ['#c9c6d6', '#9a95b3', '#6a6490', '#3f3a63', '#1f1a3a'];
/** One flat tone for areas drawn by hand, where nothing says how common the animal was. */
const ESTIMATE = '#8c93a8';
const ESTIMATE_OPACITY = 0.6;

export const ESTIMATE_COLOR = ESTIMATE;

export const TONE_HEX: Record<Tone, string> = { LC: '#8a9a6b', NT: '#b3ad5c', VU: '#d1a23c', EN: '#d9803f', CR: '#a93226' };
/** Local warming, sand to plum, so it can never be read as the blue-to-red "how common" scale. */
const WARM_STOPS = ['#f6e7b0', '#f2b66b', '#e5703c', '#b8322a', '#6e1038'];
/** The local warming (°C) at which the warming colours reach their darkest end. */
export const WARM_FULL = 12;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const part = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${part(r1, r2)}${part(g1, g2)}${part(b1, b2)}`;
}

/** A score colour from pale (rarely recorded) to deep (most recorded), so the sightings still show. */
const toneStops = (hex: string): string[] => [mixHex(hex, '#ffffff', 0.55), hex, mixHex(hex, '#000000', 0.35)];

function stopsOf(kind: RampKind): string[] {
  if (kind === 'living') return LIVING_STOPS;
  if (kind === 'extinct') return EXTINCT_STOPS;
  if (kind === 'warming') return WARM_STOPS;
  if (kind === 'estimate') return [ESTIMATE];
  return toneStops(TONE_HEX[kind.slice(6) as Tone]);
}

/** CSS gradient for a legend. */
export function rampGradient(kind: RampKind): string {
  const stops = stopsOf(kind);
  return `linear-gradient(90deg, ${stops.map((c, i) => `${c} ${Math.round((i / Math.max(1, stops.length - 1)) * 100)}%`).join(', ')})`;
}

// Blend in OKLab so the blue-to-sand step stays clean instead of turning grey-green.
const toLinear = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)));

function toOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const oklabStops: Partial<Record<RampKind, [number, number, number][]>> = {};

export function rampColor(kind: RampKind, v: number): [number, number, number] {
  const stops = (oklabStops[kind] ??= stopsOf(kind).map((hex) => toOklab(hexToRgb(hex))));
  const x = Math.min(1, Math.max(0, v)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const t = x - i;
  return fromOklab([0, 1, 2].map((k) => stops[i][k] + (stops[i + 1][k] - stops[i][k]) * t) as [number, number, number]);
}

const LUT_SIZE = 1024;
const luts: Partial<Record<RampKind, Uint8ClampedArray>> = {};

/** Colour and opacity for every value, so a pixel is a table lookup and there are no visible steps. */
function lut(kind: RampKind): Uint8ClampedArray {
  const cached = luts[kind];
  if (cached) return cached;
  const table = new Uint8ClampedArray(LUT_SIZE * 4);
  for (let i = 0; i < LUT_SIZE; i++) {
    const v = i / (LUT_SIZE - 1);
    // Fades in from nothing at MIN_VISIBLE to full strength at FULL_ALPHA, easing at both ends.
    const t = Math.min(1, Math.max(0, (v - MIN_VISIBLE) / (FULL_ALPHA - MIN_VISIBLE)));
    const [r, g, b] = kind === 'estimate' ? hexToRgb(ESTIMATE) : rampColor(kind, v);
    table.set([r, g, b, Math.round(255 * t * t * (3 - 2 * t))], i * 4);
  }
  return (luts[kind] = table);
}

/** Colour a range by local warming instead of by how often it was recorded: hotter where the world warms more. */
export interface WarmTint {
  /** Extra global warming, °C. */
  delta: number;
  /** How many times the global warming the surface warms at a latitude. */
  factorAt: (lat: number) => number;
}

/** How the what-if mode recolours the selected animal's range. */
export type RangeTint = ({ kind: 'warming' } & WarmTint) | { kind: 'score'; tone: Tone };

// --- painting the field ---------------------------------------------------------------

/** A painted layer, placed on the unzoomed map plane. */
export interface HeatTexture {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
  /** How opaque to draw it. Applied when drawing, not when painting. */
  opacity: number;
}

/** The map's current pan and zoom, as d3-zoom reports it. */
export interface View {
  x: number;
  y: number;
  k: number;
}

type Invert = (point: [number, number]) => [number, number] | null;
type Project = (point: [number, number]) => [number, number] | null;

/**
 * Where a density sits on the unzoomed map plane: [x0, y0, x1, y1] around the cells at or above
 * `min`, found by projecting the outline of their longitude/latitude box.
 */
export function densityBounds(d: Density, project: Project, min: number): [number, number, number, number] | null {
  let c0 = d.w;
  let c1 = -1;
  let r0 = d.h;
  let r1 = -1;
  for (let j = 0; j < d.h; j++) {
    for (let i = 0; i < d.w; i++) {
      if (d.values[j * d.w + i] < min) continue;
      c0 = Math.min(c0, i);
      c1 = Math.max(c1, i);
      r0 = Math.min(r0, j);
      r1 = Math.max(r1, j);
    }
  }
  if (c1 < 0) return null;
  const west = colToLon(d.col0 + c0);
  const east = colToLon(d.col0 + c1 + 1);
  const north = rowToLat(d.row0 + r0);
  const south = rowToLat(d.row0 + r1 + 1);

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const STEPS = 24;
  const at = (lon: number, lat: number) => {
    const p = project([lon, lat]);
    if (!p) return;
    x0 = Math.min(x0, p[0]);
    y0 = Math.min(y0, p[1]);
    x1 = Math.max(x1, p[0]);
    y1 = Math.max(y1, p[1]);
  };
  // The outline, plus the equator where the map is widest if the box crosses it.
  for (let n = 0; n <= STEPS; n++) {
    const lon = west + ((east - west) * n) / STEPS;
    const lat = south + ((north - south) * n) / STEPS;
    at(lon, north);
    at(lon, south);
    at(west, lat);
    at(east, lat);
    if (south < 0 && north > 0) {
      at(west, 0);
      at(east, 0);
    }
  }
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : null;
}

/** Catmull-Rom weights for the four samples around a fractional position. */
function cubic(t: number, out: Float32Array): void {
  const t2 = t * t;
  const t3 = t2 * t;
  out[0] = -0.5 * t3 + t2 - 0.5 * t;
  out[1] = 1.5 * t3 - 2.5 * t2 + 1;
  out[2] = -1.5 * t3 + 2 * t2 + 0.5 * t;
  out[3] = 0.5 * t3 - 0.5 * t2;
}

/** Output pixels per mesh node when working out where each pixel lies on the globe. */
const MESH = 6;
/** Most pixels painted for one view. */
const MAX_PIXELS = 1_600_000;

/**
 * Paints the density for the current view, one pixel at a time.
 *
 * Every pixel is turned back into a longitude and latitude, the smoothed density is sampled there
 * with bicubic interpolation, and the value is looked up in a 1024-step colour table. The result
 * has no cell edges and no colour steps at any zoom, which pre-painted blocks could not give.
 * `region` is the part of the screen worth painting, in screen pixels; it is cut down to where the
 * density is. The caller repaints once the view settles, because detail depends on the zoom.
 */
export function renderField(
  d: Density,
  invert: Invert,
  project: Project,
  view: View,
  region: [number, number, number, number],
  kind: RampKind,
  maxRatio: number,
  warm?: WarmTint,
): HeatTexture | null {
  const box = densityBounds(d, project, MIN_VISIBLE);
  if (!box) return null;

  // Screen rectangle to paint: the region, trimmed to the density (plus a little for the fade).
  const sx0 = Math.max(region[0], box[0] * view.k + view.x - 2);
  const sy0 = Math.max(region[1], box[1] * view.k + view.y - 2);
  const sx1 = Math.min(region[2], box[2] * view.k + view.x + 2);
  const sy1 = Math.min(region[3], box[3] * view.k + view.y + 2);
  if (sx1 - sx0 < 1 || sy1 - sy0 < 1) return null;

  // Sharper than one pixel per screen pixel where that is cheap (small ranges), never above the cap.
  const ratio = Math.min(maxRatio, Math.max(1, Math.sqrt(MAX_PIXELS / ((sx1 - sx0) * (sy1 - sy0)))));
  const W = Math.max(1, Math.ceil((sx1 - sx0) * ratio));
  const H = Math.max(1, Math.ceil((sy1 - sy0) * ratio));

  // Longitude and latitude at a coarse mesh of points; pixels in between are interpolated.
  const mw = Math.ceil(W / MESH) + 2;
  const mh = Math.ceil(H / MESH) + 2;
  const lons = new Float32Array(mw * mh);
  const lats = new Float32Array(mw * mh);
  for (let j = 0; j < mh; j++) {
    for (let i = 0; i < mw; i++) {
      const sx = sx0 + (i * MESH) / ratio;
      const sy = sy0 + (j * MESH) / ratio;
      const at = invert([(sx - view.x) / view.k, (sy - view.y) / view.k]);
      const ok = at && Number.isFinite(at[0]) && Math.abs(at[0]) <= 180 && Math.abs(at[1]) <= 90;
      lons[j * mw + i] = ok ? (at as [number, number])[0] : NaN;
      lats[j * mw + i] = ok ? (at as [number, number])[1] : NaN;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const image = ctx.createImageData(W, H);
  const out = image.data;
  const table = lut(kind);
  const wx = new Float32Array(4);
  const wy = new Float32Array(4);
  const { values, w, h } = d;
  const col0 = d.col0;
  const row0 = d.row0;

  for (let y = 0; y < H; y++) {
    const my = y / MESH;
    const j = Math.floor(my);
    const fy = my - j;
    for (let x = 0; x < W; x++) {
      const mx = x / MESH;
      const i = Math.floor(mx);
      const fx = mx - i;
      const a = j * mw + i;
      const lon00 = lons[a];
      const lon10 = lons[a + 1];
      const lon01 = lons[a + mw];
      const lon11 = lons[a + mw + 1];
      let lon: number;
      let lat: number;
      // Away from the map's outline the position follows from the mesh. A square that touches the
      // outline (a corner off the globe, or across the 180° meridian) is worked out exactly instead,
      // or the edge of the world would come out as a staircase of missing squares.
      const interior =
        lon00 === lon00 && lon10 === lon10 && lon01 === lon01 && lon11 === lon11 &&
        Math.abs(lon10 - lon00) < 180 && Math.abs(lon01 - lon00) < 180 && Math.abs(lon11 - lon00) < 180;
      if (interior) {
        const lat00 = lats[a];
        const lat10 = lats[a + 1];
        const lat01 = lats[a + mw];
        const lat11 = lats[a + mw + 1];
        lon = (lon00 * (1 - fx) + lon10 * fx) * (1 - fy) + (lon01 * (1 - fx) + lon11 * fx) * fy;
        lat = (lat00 * (1 - fx) + lat10 * fx) * (1 - fy) + (lat01 * (1 - fx) + lat11 * fx) * fy;
      } else {
        const at = invert([(sx0 + (x + 0.5) / ratio - view.x) / view.k, (sy0 + (y + 0.5) / ratio - view.y) / view.k]);
        if (!at || !Number.isFinite(at[0]) || Math.abs(at[0]) > 180 || Math.abs(at[1]) > 90) continue;
        [lon, lat] = at;
      }

      // Position among the cell centres of the density box.
      const gx = (lon + 180) / CELL_DEG - 0.5 - col0;
      const gy = (90 - lat) / CELL_DEG - 0.5 - row0;
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      if (ix < -1 || iy < -1 || ix > w || iy > h) continue;
      cubic(gx - ix, wx);
      cubic(gy - iy, wy);

      let v = 0;
      for (let q = 0; q < 4; q++) {
        const yy = iy - 1 + q;
        if (yy < 0 || yy >= h) continue;
        let row = 0;
        for (let p = 0; p < 4; p++) {
          const xx = ix - 1 + p;
          if (xx >= 0 && xx < w) row += values[yy * w + xx] * wx[p];
        }
        v += row * wy[q];
      }
      if (v < MIN_VISIBLE) continue;
      const t = (v >= 1 ? LUT_SIZE - 1 : Math.round(v * (LUT_SIZE - 1))) * 4;
      const o = (y * W + x) * 4;
      if (warm) {
        // The colour follows the local warming at this latitude; the opacity still follows the sightings.
        const w = Math.min(1, Math.max(0, (warm.delta * warm.factorAt(lat)) / WARM_FULL));
        const c = Math.round(w * (LUT_SIZE - 1)) * 4;
        out[o] = table[c];
        out[o + 1] = table[c + 1];
        out[o + 2] = table[c + 2];
      } else {
        out[o] = table[t];
        out[o + 1] = table[t + 1];
        out[o + 2] = table[t + 2];
      }
      out[o + 3] = table[t + 3];
    }
  }
  ctx.putImageData(image, 0, 0);

  return {
    canvas,
    x: (sx0 - view.x) / view.k,
    y: (sy0 - view.y) / view.k,
    w: W / ratio / view.k,
    h: H / ratio / view.k,
    opacity: kind === 'estimate' ? ESTIMATE_OPACITY : 1,
  };
}
