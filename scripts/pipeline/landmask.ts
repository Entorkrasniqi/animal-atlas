import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon } from 'geojson';
import { GRID_H, GRID_W } from '../../src/lib/grid';
import { numericToAlpha3 } from './countries';

const require = createRequire(import.meta.url);

/** Samples per grid cell along each axis. A cell belongs to a country if any of its samples do. */
const SUB = 3;
const SW = GRID_W * SUB;
const SH = GRID_H * SUB;
const STEP = 360 / SW;

export interface LandMask {
  /** Country at each sample (0 = open water), `SW` × `SH`, row-major from the north-west. */
  samples: Uint16Array;
  /** alpha-3 code -> value stored in `samples`. */
  ids: Map<string, number>;
}

/** Rasterises the 50m country outlines onto the supersampled grid with an even-odd scanline fill. */
export function buildLandMask(): LandMask {
  const topo = require('world-atlas/countries-50m.json') as Topology;
  const collection = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry>;
  const samples = new Uint16Array(SW * SH);
  const ids = new Map<string, number>();

  for (const f of collection.features as Feature<Geometry>[]) {
    const code = numericToAlpha3(String(f.id ?? ''));
    if (!code || (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon')) continue;
    if (!ids.has(code)) ids.set(code, ids.size + 1);
    fill(f.geometry as Polygon | MultiPolygon, ids.get(code) as number, samples);
  }
  return { samples, ids };
}

/**
 * The atlas rings are spherical: one that crosses the antimeridian (Russia, Fiji) jumps from +180 to
 * -180 between two points. Shift the far side by 360° so the ring is continuous on a flat plane.
 * A ring that circles a pole (Antarctica) doesn't close that way and is left as it is.
 */
function unwrap(ring: number[][]): number[][] {
  const out: number[][] = [];
  let shift = 0;
  for (let i = 0; i < ring.length; i++) {
    if (i > 0) {
      const jump = ring[i][0] - ring[i - 1][0];
      if (jump > 180) shift -= 360;
      else if (jump < -180) shift += 360;
    }
    out.push([ring[i][0] + shift, ring[i][1]]);
  }
  return shift === 0 ? out : ring;
}

function fill(geometry: Polygon | MultiPolygon, value: number, samples: Uint16Array): void {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const crossings = new Map<number, number[]>();

  for (const polygon of polygons) {
    for (const raw of polygon) {
      const ring = unwrap(raw);
      for (let i = 1; i < ring.length; i++) {
        const [x0, y0] = ring[i - 1];
        const [x1, y1] = ring[i];
        if (y0 === y1) continue;
        const lo = Math.min(y0, y1);
        const hi = Math.max(y0, y1);
        // Sample rows whose latitude falls in [lo, hi).
        const first = Math.max(0, Math.ceil((90 - hi) / STEP - 0.5));
        const last = Math.min(SH - 1, Math.floor((90 - lo) / STEP - 0.5));
        for (let j = first; j <= last; j++) {
          const lat = 90 - (j + 0.5) * STEP;
          if (lat < lo || lat >= hi) continue;
          const x = x0 + ((lat - y0) * (x1 - x0)) / (y1 - y0);
          const list = crossings.get(j);
          if (list) list.push(x);
          else crossings.set(j, [x]);
        }
      }
    }
  }

  for (const [j, xs] of crossings) {
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.ceil((xs[k] + 180) / STEP - 0.5);
      const to = Math.floor((xs[k + 1] + 180) / STEP - 0.5);
      for (let c = from; c <= to; c++) samples[j * SW + (((c % SW) + SW) % SW)] = value;
    }
  }
}

/**
 * Whether a grid cell touches one of `countries` (values from `LandMask.ids`). `radius` widens the
 * test to neighbouring cells, so coastal waters and small islands still count.
 */
export function touches(mask: LandMask, col: number, row: number, countries: Set<number>, radius: number): boolean {
  for (let dr = -radius; dr <= radius; dr++) {
    const r = row + dr;
    if (r < 0 || r >= GRID_H) continue;
    for (let dc = -radius; dc <= radius; dc++) {
      const c = (col + dc + GRID_W) % GRID_W;
      for (let sj = 0; sj < SUB; sj++) {
        const base = (r * SUB + sj) * SW + c * SUB;
        for (let si = 0; si < SUB; si++) {
          const v = mask.samples[base + si];
          if (v && countries.has(v)) return true;
        }
      }
    }
  }
  return false;
}

/** The country that most of a cell's samples belong to, or 0 for water. */
export function countryOf(mask: LandMask, col: number, row: number): number {
  const tally = new Map<number, number>();
  for (let sj = 0; sj < SUB; sj++) {
    for (let si = 0; si < SUB; si++) {
      const v = mask.samples[(row * SUB + sj) * SW + col * SUB + si];
      if (v) tally.set(v, (tally.get(v) ?? 0) + 1);
    }
  }
  let best = 0;
  let bestN = 0;
  for (const [v, n] of tally) if (n > bestN) [best, bestN] = [v, n];
  return best;
}
