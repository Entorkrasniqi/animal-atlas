import { geoNaturalEarth1 } from 'd3-geo';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lonLatToCell } from './grid';
import { MIN_VISIBLE, WARM_FULL, commonness, densityAt, makeDensity, rampColor, rampGradient, renderField, type RampKind, type WarmTint } from './heat';
import type { RangeLayer } from './types';

/** A layer from [lon, lat, count] sightings. */
function layerOf(sightings: [number, number, number][], basis: RangeLayer['basis'] = 'records'): RangeLayer {
  const byCell = new Map<number, number>();
  for (const [lon, lat, n] of sightings) {
    const cell = lonLatToCell(lon, lat);
    if (cell !== null) byCell.set(cell, (byCell.get(cell) ?? 0) + n);
  }
  const cells = [...byCell].sort((a, b) => a[0] - b[0]).flat();
  return { basis, source: 'test', records: sightings.length, cells };
}

/** A 5 × 5 block of cells around a point: a small range with the same count everywhere. */
function patch(lon: number, lat: number, count = 100): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) out.push([lon + dx * 0.36, lat + dy * 0.36, count]);
  return out;
}

describe('how common', () => {
  it('names the level of a density value', () => {
    expect(commonness(0.01)).toBe('No sightings recorded nearby');
    expect(commonness(0.1)).toBe('Rare here');
    expect(commonness(0.3)).toBe('Uncommon here');
    expect(commonness(0.6)).toBe('Common here');
    expect(commonness(0.9)).toBe('Very common here');
  });
});

describe('density from range cells', () => {
  it('has nothing to draw for a layer without cells', () => {
    expect(makeDensity({ basis: 'countries', source: 'test', records: 0, cells: [] })).toBeNull();
  });

  it('is strongest at the sightings and nothing far away', () => {
    const d = makeDensity(layerOf(patch(10, 5)))!;
    expect(d.uniform).toBe(false);
    expect(densityAt(d, 10, 5)).toBeGreaterThan(0.5);
    expect(densityAt(d, 40, 5)).toBe(0);
    expect(densityAt(d, 10, 60)).toBe(0);
  });

  it('keeps every value between 0 and 1', () => {
    const d = makeDensity(layerOf([...patch(10, 5, 1), ...patch(12, 6, 5000)]))!;
    for (const v of d.values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('scales counts on a log scale, so one busy waterhole does not drown the rest', () => {
    const d = makeDensity(layerOf([[10, 5, 5000], [40, 5, 5]]))!;
    const busy = densityAt(d, 10, 5);
    const quiet = densityAt(d, 40, 5);
    expect(busy).toBeGreaterThan(quiet);
    // 1000× the sightings must not mean 1000× the colour: the ratio follows log(1 + n), about 0.2 here
    // (a linear scale would give 0.001, and the quiet place would vanish).
    expect(quiet).toBeGreaterThan(MIN_VISIBLE);
    expect(quiet / busy).toBeGreaterThan(0.1);
    expect(quiet / busy).toBeLessThan(0.4);
  });

  it('shades a hand-drawn area evenly', () => {
    const d = makeDensity(layerOf(patch(10, 5, 1), 'area'))!;
    expect(d.uniform).toBe(true);
    expect(Math.max(...d.values)).toBeCloseTo(1, 5);
    expect(densityAt(d, 10, 5)).toBeGreaterThan(0.9);
  });
});

describe('colour ramps', () => {
  const brightness = ([r, g, b]: number[]) => r + g + b;

  it('runs from pale to deep', () => {
    for (const kind of ['living', 'extinct', 'warming', 'score-EN'] as RampKind[]) {
      expect(brightness(rampColor(kind, 0))).toBeGreaterThan(brightness(rampColor(kind, 1)));
    }
  });

  it('starts the sightings ramp cold (blue) and ends it hot (red)', () => {
    const [r0, , b0] = rampColor('living', 0);
    const [r1, , b1] = rampColor('living', 1);
    expect(b0).toBeGreaterThan(r0);
    expect(r1).toBeGreaterThan(b1);
  });

  it('keeps the warming ramp off blue, so it never reads as the sightings scale', () => {
    for (let v = 0; v <= 1; v += 0.1) {
      const [r, , b] = rampColor('warming', v);
      expect(r).toBeGreaterThanOrEqual(b);
    }
  });

  it('clamps values outside 0..1', () => {
    expect(rampColor('living', -3)).toEqual(rampColor('living', 0));
    expect(rampColor('living', 9)).toEqual(rampColor('living', 1));
  });

  it('writes a legend gradient', () => {
    const css = rampGradient('warming');
    expect(css).toMatch(/^linear-gradient\(90deg, #f6e7b0 0%/);
    expect(css).toMatch(/#6e1038 100%\)$/);
  });
});

describe('painting a range', () => {
  afterEach(() => vi.unstubAllGlobals());

  const W = 1000;
  const H = 500;
  const projection = geoNaturalEarth1().fitSize([W, H], { type: 'Sphere' } as never);

  /** Paints a layer on a stand-in canvas and reports the painted pixels. */
  function paint(sightings: [number, number, number][], kind: RampKind, warm?: WarmTint, region: [number, number, number, number] = [0, 0, W, H]) {
    let pixels = new Uint8ClampedArray(0);
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          createImageData: (w: number, h: number) => ((pixels = new Uint8ClampedArray(w * h * 4)), { data: pixels }),
          putImageData() {},
        }),
      }),
    });
    const density = makeDensity(layerOf(sightings))!;
    const texture = renderField(
      density,
      (p) => projection.invert!(p) as [number, number],
      (p) => projection(p) as [number, number],
      { x: 0, y: 0, k: 1 },
      region,
      kind,
      1,
      warm,
    );
    let painted = 0;
    const mean = [0, 0, 0];
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) continue;
      painted++;
      for (let k = 0; k < 3; k++) mean[k] += pixels[i + k];
    }
    return { texture, painted, rgb: mean.map((m) => (painted ? m / painted : 0)) };
  }

  const polarFactor = (lat: number) => (lat > 50 ? 3 : 1.45);

  it('paints nothing when the range is off screen', () => {
    expect(paint(patch(20, 0), 'living', undefined, [0, 0, 10, 10]).texture).toBeNull();
  });

  it('paints a texture that sits on the map plane', () => {
    const { texture, painted } = paint(patch(20, 0), 'living');
    expect(painted).toBeGreaterThan(50);
    expect(texture!.w).toBeGreaterThan(0);
    expect(texture!.h).toBeGreaterThan(0);
    expect(Number.isFinite(texture!.x) && Number.isFinite(texture!.y)).toBe(true);
    expect(texture!.opacity).toBe(1);
  });

  it('colours a range by the warming at its latitude: hotter in the far north', () => {
    const north = paint(patch(20, 70), 'warming', { delta: 3, factorAt: polarFactor });
    const tropics = paint(patch(20, 0), 'warming', { delta: 3, factorAt: polarFactor });
    // Along the warming ramp, green falls as it gets hotter (sand to orange to red to plum).
    expect(north.rgb[1]).toBeLessThan(tropics.rgb[1] - 30);
  });

  it('colours a range pale sand when there is no extra warming', () => {
    const { rgb } = paint(patch(20, 70), 'warming', { delta: 0, factorAt: polarFactor });
    const [r, g, b] = rampColor('warming', 0);
    expect(rgb[0]).toBeCloseTo(r, -1);
    expect(rgb[1]).toBeCloseTo(g, -1);
    expect(rgb[2]).toBeCloseTo(b, -1);
  });

  it('saturates at the end of the warming ramp', () => {
    const a = paint(patch(20, 70), 'warming', { delta: 6, factorAt: () => WARM_FULL });
    const b = paint(patch(20, 70), 'warming', { delta: 60, factorAt: () => WARM_FULL });
    expect(b.rgb).toEqual(a.rgb);
  });

  it('keeps the shape from the sightings whatever the colour', () => {
    const plain = paint(patch(20, 30), 'living');
    const warm = paint(patch(20, 30), 'warming', { delta: 3, factorAt: polarFactor });
    const score = paint(patch(20, 30), 'score-CR');
    expect(warm.painted).toBe(plain.painted);
    expect(score.painted).toBe(plain.painted);
  });

  it('tints by score: red for critical, green for low', () => {
    const critical = paint(patch(20, 30), 'score-CR');
    const low = paint(patch(20, 30), 'score-LC');
    expect(critical.rgb[0]).toBeGreaterThan(critical.rgb[1]);
    expect(low.rgb[1]).toBeGreaterThan(low.rgb[0]);
  });
});
