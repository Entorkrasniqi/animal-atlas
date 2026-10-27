import type { Animal } from './types';

export interface PopReading {
  /** Estimated number (0 once extinct). */
  value: number;
  /**
   * estimate     – a published estimate exists for this exact year
   * interpolated – between two published estimates
   * latest       – past the last estimate; showing that last figure
   * extinct      – the species is gone
   */
  kind: 'estimate' | 'interpolated' | 'latest' | 'extinct';
  fromYear?: number;
  toYear?: number;
}

export function isExtinctAt(a: Animal, year: number): boolean {
  return a.extinctYear !== undefined && year >= a.extinctYear;
}

/** Which range stage applies in `year` (once extinct, the last one it had). */
export function stageIndexAt(a: Animal, year: number): number {
  const y = isExtinctAt(a, year) ? (a.extinctYear as number) - 1 : year;
  let current = 0;
  for (let i = 0; i < a.range.length; i++) {
    if (a.range[i].from <= y) current = i;
    else break;
  }
  return current;
}

/** Countries where the species is (or, once extinct, last was) found. */
export function rangeAt(a: Animal, year: number): string[] {
  return a.range[stageIndexAt(a, year)].countries;
}

export function populationAt(a: Animal, year: number): PopReading | null {
  const pts = a.population;
  if (!pts || pts.length === 0) return null;
  if (isExtinctAt(a, year)) return { value: 0, kind: 'extinct' };
  if (year < pts[0][0]) return null;

  const last = pts[pts.length - 1];
  if (year >= last[0]) {
    return { value: last[1], kind: year === last[0] ? 'estimate' : 'latest', toYear: last[0] };
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const [y0, v0] = pts[i];
    const [y1, v1] = pts[i + 1];
    if (year >= y0 && year < y1) {
      if (year === y0) return { value: v0, kind: 'estimate', fromYear: y0, toYear: y0 };
      const t = (year - y0) / (y1 - y0);
      const value = Math.exp(Math.log(v0) + t * (Math.log(v1) - Math.log(v0)));
      return { value, kind: 'interpolated', fromYear: y0, toYear: y1 };
    }
  }
  return null;
}

/** Years covered by an animal's population series, for the chart. */
export function populationDomain(a: Animal, maxYear: number): [number, number] | null {
  const pts = a.population;
  if (!pts || pts.length === 0) return null;
  const end = a.extinctYear !== undefined ? a.extinctYear : maxYear;
  return [pts[0][0], Math.max(end, pts[pts.length - 1][0])];
}

/** How many dataset animals live in each country in `year`. */
export function countByCountry(animals: Animal[], year: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const a of animals) {
    if (isExtinctAt(a, year)) continue;
    for (const code of rangeAt(a, year)) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
}

/** Animals present in `code` in `year`, alive then. */
export function animalsIn(animals: Animal[], code: string, year: number): Animal[] {
  return animals.filter((a) => !isExtinctAt(a, year) && rangeAt(a, year).includes(code));
}
