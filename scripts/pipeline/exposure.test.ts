import { describe, expect, it } from 'vitest';
import { cellCol, cellIndex, lonLatToCell } from '../../src/lib/grid';
import type { RangeLayer } from '../../src/lib/types';
import { exposureOf } from './exposure';

const layerAt = (lon: number, lat: number, basis: RangeLayer['basis'] = 'records'): RangeLayer => ({
  basis,
  source: 'test',
  records: 1,
  cells: [lonLatToCell(lon, lat) as number, 3],
});

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('exposureOf', () => {
  it('has nothing for a layer that holds no cells', () => {
    expect(exposureOf({ basis: 'countries', source: 'test', records: 0, cells: [] })).toBeNull();
  });

  it('widens a sighting to the area the map draws for it', () => {
    const e = exposureOf(layerAt(10, 0.1))!;
    // A disc of 13 cells of about 1,530 km² each.
    expect(e.area).toBeGreaterThan(15_000);
    expect(e.area).toBeLessThan(25_000);
  });

  it('takes a hand-drawn area as drawn', () => {
    const drawn = exposureOf(layerAt(10, 0.1, 'area'))!;
    const sighted = exposureOf(layerAt(10, 0.1))!;
    expect(drawn.area).toBeGreaterThan(1300);
    expect(drawn.area).toBeLessThan(1700);
    expect(sighted.area).toBeGreaterThan(drawn.area * 8);
  });

  it('spreads the area over 18 latitude bands that add up to 1', () => {
    const [a, b] = [lonLatToCell(10, 0.1)!, lonLatToCell(10, 45)!].sort((x, y) => x - y);
    const e = exposureOf({ basis: 'records', source: 'test', records: 2, cells: [a, 1, b, 1] })!;
    expect(e.bands).toHaveLength(18);
    expect(sum(e.bands)).toBeCloseTo(1, 1);
    expect(e.bands.filter((b) => b > 0)).toHaveLength(3); // the two cells, one of them across the equator
  });

  it('puts a range in the band of its latitude', () => {
    const north = exposureOf(layerAt(10, 75.1))!;
    expect(north.bands[16]).toBeGreaterThan(0.95); // 70–80°N
    const south = exposureOf(layerAt(10, -75.1))!;
    expect(south.bands[1]).toBeGreaterThan(0.95); // 80–70°S
    const equator = exposureOf(layerAt(10, 0.1))!;
    expect(equator.bands[8] + equator.bands[9]).toBeGreaterThan(0.99);
  });

  it('shrinks the same shape towards the poles, as the map does', () => {
    const equator = exposureOf(layerAt(10, 0.1))!.area;
    const sixty = exposureOf(layerAt(10, 60))!.area;
    expect(sixty / equator).toBeGreaterThan(0.42);
    expect(sixty / equator).toBeLessThan(0.58); // cos 60° = 0.5
  });

  it('wraps across the 180° meridian instead of stopping at the edge of the grid', () => {
    // Near the pole a cell's width changes quickly from row to row, so a neighbour that wrapped into the
    // wrong row would change the area; at the equator it would not show.
    const inland = exposureOf(layerAt(10, 80.1))!;
    const west = layerAt(-179.9, 80.1);
    const east = layerAt(179.9, 80.1);
    expect(cellCol(west.cells[0])).toBe(0);
    expect(exposureOf(west)).toEqual(inland);
    expect(exposureOf(east)).toEqual(inland);
  });

  it('stops at the top of the grid', () => {
    const top = exposureOf({ basis: 'records', source: 'test', records: 1, cells: [cellIndex(500, 0), 1] })!;
    const inside = exposureOf({ basis: 'records', source: 'test', records: 1, cells: [cellIndex(500, 100), 1] })!;
    expect(top.area).toBeLessThan(inside.area * 0.9);
  });
});
