import { describe, expect, it, vi } from 'vitest';
import { makeAnimal } from '../test/helpers';
import type { Animal, DriverId, Exposure } from './types';

// The model reads its per-animal facts from the data module. Fake animals keep these tests about the
// model alone: they do not break when the real, hand-curated threat levels are edited.
const fake = vi.hoisted(() => {
  const band = (lat: number): Exposure['bands'] => {
    const bands = new Array<number>(18).fill(0);
    bands[Math.floor((lat + 90) / 10)] = 1;
    return bands;
  };
  const L = (warming: number, habitat: number, hunting: number, invasive: number, pollution: number, disease: number) => ({
    warming,
    habitat,
    hunting,
    invasive,
    pollution,
    disease,
  });
  return { band, L, exposure: new Map<string, Exposure>(), pressures: new Map<string, ReturnType<typeof L>>(), ice: new Set<string>() };
});

vi.mock('../data', () => ({ exposureById: fake.exposure, pressureById: fake.pressures, iceBound: fake.ice }));

const {
  DRIVERS,
  LEVEL_LABEL,
  NO_CHANGE,
  WARMING_PRESETS,
  WARMING_TODAY,
  assess,
  describeScenario,
  extraWarming,
  isNoChange,
  readScenario,
  riskByCountry,
  scenarioParts,
  summarize,
  toneOf,
  warmingFactorAt,
} = await import('./scenario');
type Scenario = import('./scenario').Scenario;

interface Spec {
  id: string;
  lat?: number;
  pop?: number;
  area?: number;
  levels: [number, number, number, number, number, number];
  over?: Partial<Animal>;
  ice?: boolean;
}

/** Registers a fake animal: where it lives, how many there are, and how each pressure threatens it. */
function add(spec: Spec): Animal {
  const { id, lat = 5, pop = 500_000, area = 2_000_000, levels, over, ice } = spec;
  fake.exposure.set(id, { area, bands: fake.band(lat) });
  fake.pressures.set(id, fake.L(...levels));
  if (ice) fake.ice.add(id);
  return makeAnimal({ id, population: [[2020, pop]], ...over });
}

const ALL3: Spec['levels'] = [3, 3, 3, 3, 3, 3];
const MAX: Scenario = { warming: 6, habitat: 60, hunting: 100, invasive: 100, pollution: 100, disease: 100 };
const only = (id: DriverId, value: number): Scenario => ({ ...NO_CHANGE, [id]: value });

const warmOnly: Spec['levels'] = [3, 0, 0, 0, 0, 0];
const tropic = add({ id: 'tropic', levels: warmOnly, over: { status: 'VU', habitat: 'land' } });
const arctic = add({ id: 'arctic', lat: 75, levels: warmOnly, over: { status: 'VU', habitat: 'land' } });
const seaTropic = add({ id: 'sea-tropic', levels: warmOnly, over: { status: 'VU', habitat: 'sea' } });
const iceBound = add({ id: 'ice', levels: warmOnly, over: { status: 'VU', habitat: 'coast' }, ice: true });
const tiny = add({ id: 'tiny', pop: 50, area: 2000, levels: ALL3, over: { status: 'CR' } });
const huge = add({ id: 'huge', pop: 5_000_000, area: 50_000_000, levels: ALL3, over: { status: 'LC' } });
const immune = add({ id: 'immune', levels: [0, 0, 0, 0, 0, 0], over: { status: 'VU' } });
const lvl3 = add({ id: 'lvl3', levels: [0, 0, 3, 0, 0, 0], over: { status: 'VU' } });
const lvl1 = add({ id: 'lvl1', levels: [0, 0, 1, 0, 0, 0], over: { status: 'VU' } });
const small = add({ id: 'small', pop: 100, area: 1500, levels: [0, 0, 3, 0, 0, 0], over: { status: 'VU' } });
const large = add({ id: 'large', pop: 5_000_000, area: 50_000_000, levels: [0, 0, 3, 0, 0, 0], over: { status: 'VU' } });
const landHab = add({ id: 'land-hab', levels: [0, 3, 0, 0, 0, 0], over: { status: 'VU', habitat: 'land' } });
const seaHab = add({ id: 'sea-hab', levels: [0, 3, 0, 0, 0, 0], over: { status: 'VU', habitat: 'sea' } });

const everyone = () => [tropic, arctic, seaTropic, iceBound, tiny, huge, immune, lvl3, lvl1, small, large, landHab, seaHab];

describe('the starting point', () => {
  it('leaves everyone at today when no slider is raised', () => {
    for (const a of everyone()) {
      const r = assess(a, NO_CHANGE);
      expect(r.score).toBe(r.baseline);
      expect(r.rise).toBe(0);
      expect(r.parts).toEqual([]);
    }
  });

  it('starts from the IUCN status', () => {
    const at = (status: Animal['status']) => assess(add({ id: `status-${status}`, levels: ALL3, over: { status } }), NO_CHANGE).baseline;
    expect(at('LC')).toBeLessThan(at('NT'));
    expect(at('NT')).toBeLessThan(at('VU'));
    expect(at('VU')).toBeLessThan(at('EN'));
    expect(at('EN')).toBeLessThan(at('CR'));
  });

  it('breaks ties inside a status with population and range', () => {
    const fragile = assess(add({ id: 'cr-few', pop: 50, area: 1500, levels: ALL3, over: { status: 'CR' } }), NO_CHANGE).baseline;
    const sturdy = assess(add({ id: 'cr-many', pop: 5_000_000, area: 50_000_000, levels: ALL3, over: { status: 'CR' } }), NO_CHANGE).baseline;
    expect(fragile).toBeGreaterThan(sturdy);
    // ...but only a little: status stays the main thing.
    expect(fragile - sturdy).toBeLessThanOrEqual(8);
  });
});

describe('adding pressure', () => {
  it('never lowers a score, whichever slider moves', () => {
    for (const a of [tropic, tiny, huge, landHab, lvl3]) {
      for (const d of DRIVERS) {
        let last = assess(a, NO_CHANGE).score;
        for (let v = 0; v <= d.max; v += d.max / 20) {
          const score = assess(a, only(d.id, v)).score;
          expect(score).toBeGreaterThanOrEqual(last);
          last = score;
        }
      }
    }
  });

  it('keeps every score between 0 and 100, even with everything at its worst', () => {
    for (const a of everyone()) {
      const r = assess(a, MAX);
      expect(r.score).toBeGreaterThanOrEqual(r.baseline);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it('adds pressures together without double counting past the ceiling', () => {
    const w = assess(tiny, only('warming', 4)).score;
    const h = assess(tiny, only('habitat', 40)).score;
    const both = assess(tiny, { ...NO_CHANGE, warming: 4, habitat: 40 }).score;
    expect(both).toBeGreaterThan(Math.max(w, h));
    expect(both).toBeLessThan(assess(tiny, NO_CHANGE).baseline + (w - assess(tiny, NO_CHANGE).baseline) + (h - assess(tiny, NO_CHANGE).baseline) + 1);
  });

  it('ignores a pressure that is not a known threat to the animal', () => {
    const r = assess(immune, MAX);
    expect(r.score).toBe(r.baseline);
    expect(assess(tropic, only('hunting', 100)).rise).toBe(0);
    expect(assess(lvl3, only('disease', 100)).rise).toBe(0);
  });

  it('hits harder where the pressure is a major threat than a minor one', () => {
    const major = assess(lvl3, only('hunting', 50)).rise;
    const minor = assess(lvl1, only('hunting', 50)).rise;
    expect(major).toBeGreaterThan(minor);
    expect(minor).toBeGreaterThan(0);
  });

  it('hits small populations and ranges harder than large ones', () => {
    expect(assess(small, only('hunting', 50)).rise).toBeGreaterThan(assess(large, only('hunting', 50)).rise);
  });
});

describe('breakdown of a score', () => {
  const r = assess(tiny, { ...NO_CHANGE, warming: 3, habitat: 30, hunting: 60, disease: 40 });

  it('splits the rise between the pressures that caused it', () => {
    const sum = r.parts.reduce((s, p) => s + p.points, 0);
    // The rise is rounded to whole points, the parts are not.
    expect(Math.abs(sum - r.rise)).toBeLessThanOrEqual(1);
    expect(r.parts.map((p) => p.id).sort()).toEqual(['disease', 'habitat', 'hunting', 'warming']);
  });

  it('lists the biggest cause first', () => {
    const points = r.parts.map((p) => p.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });

  it('only lists pressures that were raised', () => {
    expect(assess(tiny, only('pollution', 50)).parts.map((p) => p.id)).toEqual(['pollution']);
  });

  it('carries the curated level and a plain-language detail', () => {
    const part = assess(lvl3, only('hunting', 50)).parts[0];
    expect(part.level).toBe(3);
    expect(LEVEL_LABEL[part.level]).toBe('Major threat');
    expect(part.detail).toBe('50% more hunting and fishing than today');
  });

  it('explains fragility', () => {
    expect(assess(tiny, NO_CHANGE).fragilityNote).toMatch(/small population.*small range.*make every pressure hit harder/);
    expect(assess(huge, NO_CHANGE).fragilityNote).toMatch(/large population and range soften/);
  });
});

describe('warming', () => {
  it('reaches the far north harder than the tropics', () => {
    expect(assess(arctic, only('warming', 3)).rise).toBeGreaterThan(assess(tropic, only('warming', 3)).rise);
  });

  it('reaches land harder than open sea', () => {
    expect(assess(tropic, only('warming', 3)).rise).toBeGreaterThan(assess(seaTropic, only('warming', 3)).rise);
  });

  it('treats sea-ice animals as polar wherever their range is recorded', () => {
    expect(assess(iceBound, only('warming', 3)).rise).toBeGreaterThan(assess(tropic, only('warming', 3)).rise);
  });

  it('says how much the range warms locally', () => {
    const detail = assess(tropic, only('warming', 3)).parts[0].detail;
    expect(detail).toMatch(/warms about \+4\.[34] °C locally with \+3\.0 °C worldwide/);
  });

  it('computes the warming factor by latitude, the way the map colours it', () => {
    const land = warmingFactorAt(tropic);
    expect(land(0)).toBe(1.45);
    expect(land(50)).toBe(1.45);
    expect(land(62.5)).toBeCloseTo(2, 6); // halfway up the ramp from 1× at 50°N to 3× at 75°N
    expect(land(75)).toBe(3);
    expect(land(89)).toBe(3);
    expect(land(-80)).toBe(1.45); // no polar boost in the south

    const sea = warmingFactorAt(seaTropic);
    expect(sea(0)).toBe(0.85);
    expect(sea(80)).toBe(3);

    expect(warmingFactorAt(iceBound)(-70)).toBe(3);
    expect(warmingFactorAt(iceBound)(10)).toBe(3);
  });
});

describe('habitat loss', () => {
  it('reaches sea animals far less than land animals', () => {
    const land = assess(landHab, only('habitat', 40)).rise;
    const sea = assess(seaHab, only('habitat', 40)).rise;
    expect(land).toBeGreaterThan(sea);
    expect(sea).toBeGreaterThan(0);
  });
});

describe('warming presets', () => {
  it('converts a total above 1850–1900 into extra warming from today', () => {
    expect(extraWarming(1.5)).toBe(0.1);
    expect(extraWarming(2.7)).toBe(1.3);
    expect(extraWarming(4.3)).toBe(2.9);
    expect(extraWarming(WARMING_TODAY)).toBe(0);
    expect(extraWarming(1)).toBe(0); // already past it
  });

  it('only offers presets the slider can reach', () => {
    const warming = DRIVERS.find((d) => d.id === 'warming');
    for (const p of WARMING_PRESETS) {
      expect(extraWarming(p.total)).toBeLessThanOrEqual(warming!.max);
      expect(p.note.length).toBeGreaterThan(0);
    }
    const totals = WARMING_PRESETS.map((p) => p.total);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
  });
});

describe('score bands', () => {
  it('cuts at the documented edges', () => {
    expect([0, 19].map(toneOf)).toEqual(['LC', 'LC']);
    expect([20, 34].map(toneOf)).toEqual(['NT', 'NT']);
    expect([35, 49].map(toneOf)).toEqual(['VU', 'VU']);
    expect([50, 69].map(toneOf)).toEqual(['EN', 'EN']);
    expect([70, 100].map(toneOf)).toEqual(['CR', 'CR']);
  });
});

describe('the URL hash', () => {
  const parse = (query: string) => readScenario(new URLSearchParams(query));

  it('reads the sliders that were set', () => {
    expect(parse('warming=2.5&habitat=30')).toEqual({ ...NO_CHANGE, warming: 2.5, habitat: 30 });
  });

  it('treats missing, negative and junk values as 0', () => {
    expect(parse('')).toEqual(NO_CHANGE);
    expect(parse('warming=-3&habitat=abc&hunting=')).toEqual(NO_CHANGE);
  });

  it('clamps to the slider and snaps to its step', () => {
    expect(parse('warming=99&habitat=500').warming).toBe(6);
    expect(parse('habitat=500').habitat).toBe(60);
    expect(parse('warming=2.46').warming).toBeCloseTo(2.5, 6);
  });

  it('round-trips through scenarioParts', () => {
    const s: Scenario = { ...NO_CHANGE, warming: 3.2, pollution: 40, disease: 7 };
    const parts = scenarioParts(s);
    expect(parts).toEqual(['warming=3.2', 'pollution=40', 'disease=7']);
    expect(parse(parts.join('&'))).toEqual(s);
    expect(scenarioParts(NO_CHANGE)).toEqual([]);
  });

  it('knows when nothing has changed', () => {
    expect(isNoChange(NO_CHANGE)).toBe(true);
    expect(isNoChange(only('disease', 1))).toBe(false);
  });

  it('describes the sliders in words', () => {
    expect(describeScenario(NO_CHANGE)).toBe('No change from today');
    expect(describeScenario({ ...NO_CHANGE, warming: 3, habitat: 20 })).toBe('+3.0 °C warming · 20% of habitat cleared');
  });
});

describe('summaries over many animals', () => {
  const group = [tiny, huge, tropic, arctic, immune, small, large].map((a, i) =>
    i === 2 ? { ...a, group: 'bird' as const } : i === 3 ? { ...a, group: 'bird' as const } : a,
  );
  const scenario: Scenario = { ...NO_CHANGE, warming: 4, hunting: 60 };
  const results = new Map(group.map((a) => [a.id, assess(a, scenario)]));
  const sum = summarize(group, results);

  it('counts every animal once in each band, today and under the scenario', () => {
    expect(sum.count).toBe(group.length);
    expect(sum.bands.reduce((s, b) => s + b.today, 0)).toBe(group.length);
    expect(sum.bands.reduce((s, b) => s + b.now, 0)).toBe(group.length);
    expect(sum.bands.map((b) => b.tone)).toEqual(['LC', 'NT', 'VU', 'EN', 'CR']);
  });

  it('averages scores and groups them', () => {
    const scores = group.map((a) => results.get(a.id)!.score);
    expect(sum.averageNow).toBe(Math.round(scores.reduce((s, x) => s + x, 0) / scores.length));
    expect(sum.averageNow).toBeGreaterThanOrEqual(sum.averageToday);
    expect(sum.groups.reduce((s, g) => s + g.count, 0)).toBe(group.length);
    const birds = sum.groups.find((g) => g.group === 'bird');
    expect(birds?.count).toBe(2);
  });

  it('totals the points each pressure added', () => {
    const byId = Object.fromEntries(sum.drivers.map((d) => [d.id, d]));
    expect(byId.warming.points).toBeGreaterThan(0);
    expect(byId.hunting.points).toBeGreaterThan(0);
    expect(byId.pollution.points).toBe(0);
    expect(byId.disease.animals).toBe(0);
    expect(byId.warming.animals).toBeLessThanOrEqual(group.length);
  });

  it('lists the animals the scenario lifts most, never one it did not touch', () => {
    const rises = sum.top.map((t) => t.assessment.rise);
    expect(rises).toEqual([...rises].sort((a, b) => b - a));
    expect(sum.top.length).toBeLessThanOrEqual(5);
    expect(sum.top.every((t) => t.assessment.rise > 0)).toBe(true);
    expect(sum.top.map((t) => t.animal.id)).not.toContain('immune');
  });

  it('is empty-handed when nothing was raised', () => {
    const calm = summarize(group, new Map(group.map((a) => [a.id, assess(a, NO_CHANGE)])));
    expect(calm.top).toEqual([]);
    expect(calm.averageNow).toBe(calm.averageToday);
    expect(calm.drivers.every((d) => d.points === 0)).toBe(true);
  });
});

describe('risk by country', () => {
  const a = add({ id: 'in-aaa-bbb', levels: [0, 0, 3, 0, 0, 0], over: { status: 'CR', range: [{ from: -50000, countries: ['AAA', 'BBB'] }] } });
  const b = add({ id: 'in-bbb-ccc', levels: [0, 0, 3, 0, 0, 0], over: { status: 'LC', range: [{ from: -50000, countries: ['BBB', 'CCC'] }] } });
  const results = new Map([a, b].map((x) => [x.id, assess(x, only('hunting', 50))]));
  const byCountry = riskByCountry([a, b], results);

  it('averages the scores of the animals that live in each country', () => {
    const [sa, sb] = [results.get(a.id)!.score, results.get(b.id)!.score];
    expect(byCountry.get('AAA')).toMatchObject({ count: 1, mean: sa });
    expect(byCountry.get('CCC')).toMatchObject({ count: 1, mean: sb });
    expect(byCountry.get('BBB')).toMatchObject({ count: 2, mean: (sa + sb) / 2 });
  });

  it('remembers the animal at most risk there', () => {
    expect(byCountry.get('BBB')?.top.animal.id).toBe(a.id);
    expect(byCountry.has('ZZZ')).toBe(false);
  });
});
