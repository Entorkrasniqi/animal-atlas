import { describe, expect, it } from 'vitest';
import {
  MAX_YEAR,
  MIN_YEAR,
  clampYear,
  formatCount,
  formatYear,
  posToYear,
  roundSig,
  snapYear,
  stepFor,
  yearToPos,
  yearsAgo,
} from './time';

describe('timeline scale', () => {
  it('maps the ends of time to the ends of the track', () => {
    expect(yearToPos(MIN_YEAR)).toBe(0);
    expect(yearToPos(MAX_YEAR)).toBe(1);
    expect(posToYear(0)).toBe(MIN_YEAR);
    expect(posToYear(1)).toBe(MAX_YEAR);
  });

  it('gives recent centuries more room than deep time', () => {
    expect(yearToPos(-10000)).toBeCloseTo(0.12);
    expect(yearToPos(1500)).toBeCloseTo(0.3);
    expect(yearToPos(1900)).toBeCloseTo(0.63);
    // 500 years since 1500 take more track than the 11,500 years before it.
    expect(yearToPos(2000) - yearToPos(1500)).toBeGreaterThan(yearToPos(1500) - yearToPos(-10000));
  });

  it('only ever moves forward', () => {
    let last = -1;
    for (let y = MIN_YEAR; y <= MAX_YEAR; y += 250) {
      const pos = yearToPos(y);
      expect(pos).toBeGreaterThanOrEqual(last);
      last = pos;
    }
  });

  it('turns a position back into the same year', () => {
    for (const year of [-45000, -10000, -300, 0, 1500, 1750, 1900, 1936, 2025]) {
      expect(posToYear(yearToPos(year))).toBeCloseTo(year, 6);
    }
  });

  it('clamps positions and years outside the range', () => {
    expect(yearToPos(-99999)).toBe(0);
    expect(yearToPos(9999)).toBe(1);
    expect(posToYear(-1)).toBe(MIN_YEAR);
    expect(posToYear(2)).toBe(MAX_YEAR);
    expect(clampYear(3000)).toBe(MAX_YEAR);
    expect(clampYear(-60000)).toBe(MIN_YEAR);
    expect(clampYear(1936.6)).toBe(1937);
  });
});

describe('year snapping', () => {
  it('uses coarser steps further back', () => {
    expect(stepFor(-20000)).toBe(250);
    expect(stepFor(1000)).toBe(25);
    expect(stepFor(1900)).toBe(1);
  });

  it('snaps to the step for that era', () => {
    expect(snapYear(-20010)).toBe(-20000);
    expect(snapYear(1012)).toBe(1000);
    expect(snapYear(1013)).toBe(1025);
    expect(snapYear(1936)).toBe(1936);
    expect(snapYear(5000)).toBe(MAX_YEAR);
  });
});

describe('formatting', () => {
  it('writes years in the right era', () => {
    expect(formatYear(-50000)).toBe('50,000 BCE');
    expect(formatYear(0)).toBe('1 BCE');
    expect(formatYear(1000)).toBe('1000 CE');
    expect(formatYear(1936)).toBe('1936');
  });

  it('says how long ago, rounding old dates', () => {
    expect(yearsAgo(MAX_YEAR)).toBe('this year');
    expect(yearsAgo(MAX_YEAR - 100)).toBe('100 years ago');
    expect(yearsAgo(-5000)).toBe('about 7,000 years ago');
  });

  it('shortens large counts', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(12345)).toBe('12,345');
    expect(formatCount(1_500_000)).toBe('1.5 million');
    expect(formatCount(12_000_000)).toBe('12 million');
    expect(formatCount(2_000_000_000)).toBe('2 billion');
  });

  it('rounds to significant figures so estimates do not look exact', () => {
    expect(roundSig(99)).toBe(99);
    expect(roundSig(123_456)).toBe(120_000);
    expect(roundSig(1_949_999)).toBe(1_900_000);
  });
});
