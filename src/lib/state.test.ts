import { describe, expect, it } from 'vitest';
import { makeAnimal } from '../test/helpers';
import { animalsIn, countByCountry, isExtinctAt, populationAt, populationDomain, rangeAt, stageIndexAt } from './state';
import { MIN_YEAR } from './time';

const dodo = makeAnimal({
  id: 'dodo',
  extinctYear: 1662,
  range: [
    { from: MIN_YEAR, countries: ['MUS', 'REU'] },
    { from: 1600, countries: ['MUS'] },
  ],
  population: [
    [1600, 5000],
    [1650, 50],
  ],
});

const lion = makeAnimal({
  id: 'lion',
  range: [
    { from: MIN_YEAR, countries: ['KEN', 'TZA', 'IND'] },
    { from: 1980, countries: ['KEN', 'TZA'] },
  ],
  population: [
    [1990, 100],
    [2010, 10_000],
  ],
});

describe('extinction and range stages', () => {
  it('is extinct from the extinction year on', () => {
    expect(isExtinctAt(dodo, 1661)).toBe(false);
    expect(isExtinctAt(dodo, 1662)).toBe(true);
    expect(isExtinctAt(lion, 2025)).toBe(false);
  });

  it('picks the latest stage that has started', () => {
    expect(stageIndexAt(lion, 1979)).toBe(0);
    expect(stageIndexAt(lion, 1980)).toBe(1);
    expect(rangeAt(lion, 2000)).toEqual(['KEN', 'TZA']);
  });

  it('ignores a stage dated after the extinction', () => {
    const odd = makeAnimal({
      id: 'odd',
      extinctYear: 1800,
      range: [
        { from: MIN_YEAR, countries: ['AAA'] },
        { from: 1900, countries: ['ZZZ'] },
      ],
    });
    expect(rangeAt(odd, 1850)).toEqual(['AAA']);
    expect(rangeAt(odd, 1950)).toEqual(['AAA']);
    expect(stageIndexAt(odd, 2000)).toBe(0);
  });

  it('keeps showing the last range an extinct animal had', () => {
    expect(rangeAt(dodo, 1599)).toEqual(['MUS', 'REU']);
    expect(rangeAt(dodo, 1700)).toEqual(['MUS']);
    expect(rangeAt(dodo, 5000)).toEqual(['MUS']);
  });
});

describe('population readings', () => {
  it('has no reading without estimates, or before the first one', () => {
    expect(populationAt(makeAnimal({ id: 'x' }), 2000)).toBeNull();
    expect(populationAt(lion, 1989)).toBeNull();
  });

  it('reports a published estimate for its exact year', () => {
    expect(populationAt(lion, 1990)).toMatchObject({ value: 100, kind: 'estimate' });
    expect(populationAt(lion, 2010)).toMatchObject({ value: 10_000, kind: 'estimate' });
  });

  it('interpolates on a log scale between estimates', () => {
    const mid = populationAt(lion, 2000);
    expect(mid?.kind).toBe('interpolated');
    // Halfway between 100 and 10,000 on a log scale is 1,000, not 5,050.
    expect(mid?.value).toBeCloseTo(1000, 6);
    expect(mid).toMatchObject({ fromYear: 1990, toYear: 2010 });
  });

  it('holds the latest estimate after the last one', () => {
    expect(populationAt(lion, 2025)).toMatchObject({ value: 10_000, kind: 'latest', toYear: 2010 });
  });

  it('is zero once extinct', () => {
    expect(populationAt(dodo, 1662)).toEqual({ value: 0, kind: 'extinct' });
    expect(populationAt(dodo, 1800)).toEqual({ value: 0, kind: 'extinct' });
  });

  it('gives the span a chart should cover', () => {
    expect(populationDomain(makeAnimal({ id: 'x' }), 2025)).toBeNull();
    expect(populationDomain(lion, 2025)).toEqual([1990, 2025]);
    expect(populationDomain(dodo, 2025)).toEqual([1600, 1662]);
  });
});

describe('countries and animals', () => {
  const all = [dodo, lion];

  it('counts the living animals in each country in a year', () => {
    const in1500 = countByCountry(all, 1500);
    expect(in1500.get('MUS')).toBe(1);
    expect(in1500.get('KEN')).toBe(1);
    const in1700 = countByCountry(all, 1700);
    expect(in1700.has('MUS')).toBe(false);
    expect(in1700.get('IND')).toBe(1);
  });

  it('lists the animals alive in a country', () => {
    expect(animalsIn(all, 'KEN', 2000).map((a) => a.id)).toEqual(['lion']);
    expect(animalsIn(all, 'IND', 2000)).toEqual([]);
    expect(animalsIn(all, 'MUS', 1500).map((a) => a.id)).toEqual(['dodo']);
    expect(animalsIn(all, 'MUS', 1700)).toEqual([]);
  });
});
