import type { Box, Seed, SeedStage } from '../../data/curated/helpers';
import { CELL_DEG, GRID_W, GRID_H, cellCol, cellRow, lonLatToCell } from '../../src/lib/grid';
import type { RangeLayer } from '../../src/lib/types';
import { CONFIG, toBp } from './config';
import { occurrenceGrid, type CellCounts } from './gbif';
import { touches, type LandMask } from './landmask';
import type { FossilOccurrence } from './pbdb';

export interface LayerBuild {
  layers: RangeLayer[];
  /** One line per stage that is not drawn from its own records, for the report. */
  concerns: string[];
  notes: string[];
}

const NOW = 2025;
const fmt = (year: number) => (year <= 0 ? `${Math.abs(year).toLocaleString('en-US')} BCE` : String(year));
const span = (from: number, to: number) => `${fmt(from)}–${fmt(to)}`;

/** Weighted records per cell: whole sightings from GBIF, fractions for fossils dated loosely. */
type Evidence = Map<number, number>;

interface Stage {
  from: number;
  to: number;
  stage: SeedStage;
}

/** The years each stage covers: from its own start until the next one begins (or the animal is gone). */
function stagesOf(seed: Seed): Stage[] {
  const end = seed.extinctYear ?? NOW;
  return seed.range.map((stage, i) => ({
    stage,
    from: stage.from,
    to: i + 1 < seed.range.length ? seed.range[i + 1].from - 1 : end,
  }));
}

/** Whether any part of a grid cell lies inside a box (which may cross the antimeridian). */
function overlaps(cell: number, [west, south, east, north]: Box): boolean {
  const lon0 = -180 + cellCol(cell) * CELL_DEG;
  const lat1 = 90 - cellRow(cell) * CELL_DEG;
  if (lat1 <= south || lat1 - CELL_DEG >= north) return false;
  return west <= east ? lon0 + CELL_DEG > west && lon0 < east : lon0 + CELL_DEG > west || lon0 < east;
}

export async function buildLayers(
  seed: Seed,
  occKey: number | null,
  fossils: FossilOccurrence[],
  mask: LandMask,
): Promise<LayerBuild> {
  const habitat = seed.habitat ?? 'land';
  const radius = habitat === 'sea' ? null : habitat === 'coast' ? CONFIG.layers.coastRadius : CONFIG.layers.landRadius;
  const located = fossils.filter(
    (f) => f.lon !== undefined && f.lat !== undefined && Number.isFinite(f.lon) && Number.isFinite(f.lat) && f.oldestBp - f.youngestBp <= CONFIG.pbdbMaxWindowYears,
  );
  const lastYear = seed.extinctYear ?? NOW;

  const gbifCache = new Map<string, CellCounts>();
  const gbif = async (from: number, to: number): Promise<CellCounts> => {
    const lo = Math.max(from, CONFIG.layers.gbifFrom);
    const hi = Math.min(to, NOW);
    if (!occKey || hi < lo) return new Map();
    const key = `${lo}-${hi}`;
    let grid = gbifCache.get(key);
    if (!grid) gbifCache.set(key, (grid = await occurrenceGrid(occKey, { from: lo, to: hi })));
    return grid;
  };

  const layers: RangeLayer[] = [];
  const concerns: string[] = [];
  const notes: string[] = [];

  for (const { stage, from, to } of stagesOf(seed)) {
    const countries = new Set(stage.countries.map((c) => mask.ids.get(c)).filter((v): v is number => v !== undefined));
    const areas = stage.areas ?? [];
    const cellOk = (cell: number): boolean => {
      if (areas.length && !areas.some((box) => overlaps(cell, box))) return false;
      return radius === null || touches(mask, cellCol(cell), cellRow(cell), countries, radius);
    };

    /** Sightings plus fossil finds for a window, clipped to where this stage allows the animal. */
    const gather = async (win: { from: number; to: number }, fossilFit: (f: FossilOccurrence) => number) => {
      const cells: Evidence = new Map();
      let sightings = 0;
      let finds = 0;
      for (const [cell, n] of await gbif(win.from, win.to)) {
        if (!cellOk(cell)) continue;
        cells.set(cell, (cells.get(cell) ?? 0) + n);
        sightings += n;
      }
      for (const f of located) {
        const w = fossilFit(f);
        if (w <= 0) continue;
        const cell = lonLatToCell(f.lon as number, f.lat as number);
        if (cell === null || !cellOk(cell)) continue;
        cells.set(cell, (cells.get(cell) ?? 0) + w);
        finds += w;
      }
      return { cells, sightings, finds, total: sightings + finds };
    };

    // 1. This stage's own evidence. A fossil counts by how much of its dating window falls in the stage.
    const stageOldest = toBp(from);
    const stageYoungest = toBp(to);
    const own = await gather({ from, to }, (f) => {
      const overlap = Math.min(f.oldestBp, stageOldest) - Math.max(f.youngestBp, stageYoungest);
      return overlap > 0 ? overlap / Math.max(1, f.oldestBp - f.youngestBp) : 0;
    });
    if (own.total >= CONFIG.layers.minRecords) {
      layers.push(toLayer('records', describe(own.sightings, own.finds, from, to), own));
      continue;
    }

    // 2. Too thin: every record since GBIF began, and every well-dated fossil, inside this stage's countries.
    const all = await gather({ from: CONFIG.layers.gbifFrom, to: lastYear }, () => 1);
    if (all.total >= CONFIG.layers.minRecords) {
      const source = `${describe(all.sightings, all.finds, CONFIG.layers.gbifFrom, lastYear)}; ${own.total < 1 ? 'none' : 'too few'} from ${span(from, to)} itself`;
      layers.push(toLayer('all-time', source, all));
      const n = Math.round(own.total);
      concerns.push(
        `${span(from, to)}: ${n === 1 ? '1 record' : `${n.toLocaleString('en-US')} records`} of its own, so it shows all ${Math.round(all.total).toLocaleString('en-US')} records inside its countries.`,
      );
      continue;
    }

    // 3. No evidence at all: the hand-drawn area if there is one, else the countries themselves.
    const area: number[] = [];
    if (areas.length) {
      for (let cell = 0; cell < GRID_W * GRID_H; cell++) if (cellOk(cell)) area.push(cell, 1);
    }
    if (area.length) {
      layers.push({ basis: 'area', source: 'Hand-drawn area; no usable records for this stage', records: 0, cells: area });
      concerns.push(`${span(from, to)}: no usable records; drawn from a hand-drawn area.`);
    } else if (areas.length) {
      // The refuge is a speck the 50m outlines leave out (Rodrigues, Bramble Cay): draw its cells as they are.
      for (let cell = 0; cell < GRID_W * GRID_H; cell++) if (areas.some((box) => overlaps(cell, box))) area.push(cell, 1);
      layers.push({ basis: 'area', source: 'Hand-drawn area; no usable records for this stage', records: 0, cells: area, clip: false });
      concerns.push(`${span(from, to)}: no usable records; drawn from a hand-drawn area outside the country outlines.`);
    } else {
      layers.push({ basis: 'countries', source: 'Country level only; no usable records for this stage', records: 0, cells: [] });
      concerns.push(`${span(from, to)}: no usable records; only the countries are known.`);
    }
  }

  const real = layers.filter((l) => l.basis === 'records').length;
  notes.push(
    real === layers.length
      ? `The map is drawn from recorded sightings and fossil finds in every period (${layers.map((l) => Math.round(l.records).toLocaleString('en-US')).join(', ')} records).`
      : `${real} of ${layers.length} periods are drawn from their own recorded sightings or fossil finds; the rest use all records, a hand-drawn area, or country outlines (see the data report).`,
  );
  return { layers, concerns, notes };
}

function describe(sightings: number, finds: number, from: number, to: number): string {
  const parts = [];
  if (sightings > 0) parts.push(`GBIF sightings ${span(Math.max(from, CONFIG.layers.gbifFrom), Math.min(to, NOW))}`);
  if (finds > 0) parts.push('Paleobiology Database fossil finds');
  return parts.join(' and ');
}

function toLayer(basis: RangeLayer['basis'], source: string, e: { cells: Evidence; total: number }): RangeLayer {
  const cells: number[] = [];
  for (const cell of [...e.cells.keys()].sort((a, b) => a - b)) {
    const count = Math.round((e.cells.get(cell) as number) * 100) / 100;
    if (count > 0) cells.push(cell, count); // a fossil dated far outside the stage can round to nothing
  }
  return { basis, source, records: Math.round(e.total * 10) / 10, cells };
}
