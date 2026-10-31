import { describe, expect, it } from 'vitest';
import { assess, DRIVERS, NO_CHANGE, type Scenario } from '../lib/scenario';
import type { DriverId } from '../lib/types';
import { animals, exposureById, iceBound, pressureById } from './index';

const living = animals.filter((a) => a.extinctYear === undefined);

describe('the shipped data behind the what-if mode', () => {
  it('has threat levels for every living animal, and only living animals', () => {
    for (const a of living) {
      const p = pressureById.get(a.id);
      expect(p, `${a.id} has no threat levels`).toBeDefined();
      const levels = Object.values(p!);
      expect(levels).toHaveLength(DRIVERS.length);
      for (const l of levels) expect([0, 1, 2, 3]).toContain(l);
      expect(Math.max(...levels), `${a.id}: nothing could ever hurt it`).toBeGreaterThan(0);
    }
    const livingIds = new Set(living.map((a) => a.id));
    for (const id of pressureById.keys()) expect(livingIds.has(id), `${id} is not a living animal`).toBe(true);
    for (const id of iceBound) expect(livingIds.has(id)).toBe(true);
  });

  it('knows where every living animal lives', () => {
    for (const a of living) {
      const e = exposureById.get(a.id);
      expect(e, `${a.id} has no exposure`).toBeDefined();
      expect(e!.area).toBeGreaterThan(0);
      expect(e!.bands).toHaveLength(18);
      expect(e!.bands.reduce((s, b) => s + b, 0)).toBeCloseTo(1, 1);
    }
  });

  it('has no exposure for animals that are gone', () => {
    const livingIds = new Set(living.map((a) => a.id));
    for (const id of exposureById.keys()) expect(livingIds.has(id)).toBe(true);
  });
});

// These pin the story the research tells. If you re-curate the threat levels on purpose and one of
// them fails, check the new ranking still makes sense, then update the expectation.
describe('what the shipped model says', () => {
  const ranked = (s: Scenario) =>
    living
      .map((a) => ({ id: a.id, r: assess(a, s) }))
      .sort((x, y) => y.r.rise - x.r.rise || y.r.score - x.r.score);
  const top = (s: Scenario, n: number) => ranked(s).slice(0, n).map((x) => x.id);
  const only = (id: DriverId, v: number): Scenario => ({ ...NO_CHANGE, [id]: v });

  it('moves nobody when nothing is raised', () => {
    for (const { r } of ranked(NO_CHANGE)) expect(r.rise).toBe(0);
  });

  it('starts with the Critically Endangered on top', () => {
    const first = ranked(NO_CHANGE).slice(0, 10);
    for (const { id } of first) expect(living.find((a) => a.id === id)?.status).toBe('CR');
  });

  it('puts the animals that live on sea ice at the front for warming', () => {
    expect(top(only('warming', 3), 2).sort()).toEqual(['emperor-penguin', 'polar-bear']);
  });

  it('puts island animals at the front for invasive species', () => {
    const t = top(only('invasive', 60), 8);
    for (const id of ['kakapo', 'galapagos-tortoise', 'lord-howe-stick-insect']) expect(t).toContain(id);
  });

  it('puts the diseased and the disease-prone at the front for disease', () => {
    const t = top(only('disease', 60), 8);
    for (const id of ['asiatic-lion', 'tasmanian-devil', 'koala']) expect(t).toContain(id);
  });

  it('puts the hunted at the front for hunting and fishing', () => {
    const t = top(only('hunting', 60), 8);
    expect(t).toContain('white-rhino');
    expect(t).toContain('bluefin-tuna');
  });

  it('raises the atlas average with every pressure', () => {
    const mean = (s: Scenario) => living.reduce((sum, a) => sum + assess(a, s).score, 0) / living.length;
    const base = mean(NO_CHANGE);
    for (const d of DRIVERS) expect(mean(only(d.id, d.max)), d.id).toBeGreaterThan(base);
  });

  it('touches sea animals less than land animals when habitat is cleared', () => {
    const rise = (habitat: string) => {
      const group = living.filter((a) => (a.habitat ?? 'land') === habitat);
      return group.reduce((s, a) => s + assess(a, only('habitat', 40)).rise, 0) / group.length;
    };
    expect(rise('sea')).toBeLessThan(rise('land'));
  });
});
