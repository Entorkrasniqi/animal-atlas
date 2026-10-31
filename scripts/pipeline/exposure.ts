import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CELL_DEG, GRID_W, GRID_H, cellCol, cellRow, rowToLat } from '../../src/lib/grid';
import type { Exposure, RangeLayer } from '../../src/lib/types';

export const OUT_EXPOSURE = path.resolve('src/data/generated/exposure.json');

/** Each recorded sighting cell is widened by this many cells (about 0.7°, the spread the map gives a sighting). */
const REACH = 2;
const BANDS = 18;
const KM_PER_DEG = (Math.PI * 6371) / 180;
/** Area of one grid cell on the equator, in km². */
const CELL_KM2 = (CELL_DEG * KM_PER_DEG) ** 2;

/**
 * How big an animal's range is and which latitudes it spans, from the cells of its latest range layer.
 * The what-if simulator uses it to tell how much a warming world reaches the animal, and how little room
 * it has. Null for a layer that holds no cells (only countries are known).
 */
export function exposureOf(layer: RangeLayer): Exposure | null {
  if (layer.cells.length === 0) return null;

  // Widen every recorded cell, so the area is that of the drawn range and not of the sightings alone.
  // A hand-drawn area already is the range, so it is taken as drawn.
  const reach = layer.basis === 'area' ? 0 : REACH;
  const covered = new Set<number>();
  for (let i = 0; i < layer.cells.length; i += 2) {
    const col = cellCol(layer.cells[i]);
    const row = cellRow(layer.cells[i]);
    for (let dr = -reach; dr <= reach; dr++) {
      const r = row + dr;
      if (r < 0 || r >= GRID_H) continue;
      for (let dc = -reach; dc <= reach; dc++) {
        if (dr * dr + dc * dc > reach * reach) continue;
        covered.add(r * GRID_W + ((col + dc + GRID_W) % GRID_W));
      }
    }
  }

  let area = 0;
  const bands = new Array<number>(BANDS).fill(0);
  for (const cell of covered) {
    const lat = rowToLat(cellRow(cell)) - CELL_DEG / 2;
    const km2 = CELL_KM2 * Math.cos((lat * Math.PI) / 180);
    area += km2;
    bands[Math.min(BANDS - 1, Math.max(0, Math.floor((lat + 90) / 10)))] += km2;
  }
  return {
    area: Math.round(area),
    bands: bands.map((b) => Math.round((b / area) * 1000) / 1000),
  };
}

/** Writes `exposure.json`: one entry per living animal, from its latest range layer. */
export async function writeExposure(entries: { id: string; layer: RangeLayer }[]): Promise<number> {
  const out: Record<string, Exposure> = {};
  for (const { id, layer } of [...entries].sort((a, b) => a.id.localeCompare(b.id))) {
    const e = exposureOf(layer);
    if (e) out[id] = e;
  }
  await mkdir(path.dirname(OUT_EXPOSURE), { recursive: true });
  await writeFile(OUT_EXPOSURE, JSON.stringify(out, null, 1) + '\n');
  return Object.keys(out).length;
}
