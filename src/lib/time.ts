export const MIN_YEAR = -50000;
export const MAX_YEAR = 2025;

/**
 * The timeline is piecewise linear: deep time is compressed so the last few
 * centuries, where most extinctions and population counts live, get room.
 * [year, position along the track 0..1]
 */
const KNOTS: [number, number][] = [
  [MIN_YEAR, 0],
  [-10000, 0.12],
  [1500, 0.3],
  [1800, 0.46],
  [1900, 0.63],
  [MAX_YEAR, 1],
];

export function yearToPos(year: number): number {
  const y = Math.min(Math.max(year, MIN_YEAR), MAX_YEAR);
  for (let i = 1; i < KNOTS.length; i++) {
    const [y1, p1] = KNOTS[i];
    if (y <= y1) {
      const [y0, p0] = KNOTS[i - 1];
      return p0 + ((y - y0) / (y1 - y0)) * (p1 - p0);
    }
  }
  return 1;
}

export function posToYear(pos: number): number {
  const p = Math.min(Math.max(pos, 0), 1);
  for (let i = 1; i < KNOTS.length; i++) {
    const [y1, p1] = KNOTS[i];
    if (p <= p1) {
      const [y0, p0] = KNOTS[i - 1];
      return y0 + ((p - p0) / (p1 - p0)) * (y1 - y0);
    }
  }
  return MAX_YEAR;
}

/** Keyboard / snapping granularity at a given year. */
export function stepFor(year: number): number {
  if (year < -10000) return 250;
  if (year < 1500) return 25;
  return 1;
}

export function clampYear(year: number): number {
  return Math.min(Math.max(Math.round(year), MIN_YEAR), MAX_YEAR);
}

export function snapYear(year: number): number {
  const step = stepFor(year);
  return clampYear(Math.round(year / step) * step);
}

const fmt = new Intl.NumberFormat('en-US');

export function formatYear(year: number): string {
  if (year <= 0) return `${fmt.format(Math.abs(year) || 1)} BCE`;
  if (year < 1500) return `${year} CE`;
  return String(year);
}

/** "89 years ago", "about 4,000 years ago". */
export function yearsAgo(year: number): string {
  const ago = MAX_YEAR - year;
  if (ago < 1) return 'this year';
  if (ago < 1000) return `${fmt.format(ago)} years ago`;
  const round = ago < 10000 ? 100 : 1000;
  return `about ${fmt.format(Math.round(ago / round) * round)} years ago`;
}

export interface Mark {
  year: number;
  label: string;
  /** Dropped on narrow screens so labels don't collide. */
  minor?: boolean;
}

/** Labelled ticks along the track. */
export const MARKS: Mark[] = [
  { year: MIN_YEAR, label: '50k BCE' },
  { year: -10000, label: '10k BCE', minor: true },
  { year: 1500, label: '1500' },
  { year: 1800, label: '1800', minor: true },
  { year: 1900, label: '1900' },
  { year: 1950, label: '1950', minor: true },
  { year: 2000, label: '2000', minor: true },
  { year: MAX_YEAR, label: '2025' },
];

/** Quick-jump presets under the track. */
export const JUMPS: Mark[] = [
  { year: -40000, label: 'Ice Age' },
  { year: -5000, label: 'Early farmers' },
  { year: 1500, label: '1500' },
  { year: 1800, label: '1800' },
  { year: 1900, label: '1900' },
  { year: 1950, label: '1950' },
  { year: MAX_YEAR, label: 'Today' },
];

/** Round to `digits` significant figures so interpolated values don't look falsely exact. */
export function roundSig(n: number, digits = 2): number {
  if (n < 100) return Math.round(n);
  const p = 10 ** (Math.floor(Math.log10(n)) - digits + 1);
  return Math.round(n / p) * p;
}

export function formatCount(n: number): string {
  if (n >= 1e12) return `${trim(n / 1e12)} trillion`;
  if (n >= 1e9) return `${trim(n / 1e9)} billion`;
  if (n >= 1e6) return `${trim(n / 1e6)} million`;
  return fmt.format(Math.round(n));
}

function trim(n: number): string {
  return n >= 10 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, '');
}
