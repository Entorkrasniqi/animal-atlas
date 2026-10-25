import type { Animal, Group, IucnStatus } from '../lib/types';

/** Start of the timeline. Every animal's first range stage begins here. */
export const S = -50000;

/** Split a space-separated list of ISO alpha-3 codes. */
export const c = (s: string): string[] => s.split(/\s+/).filter(Boolean);

/** `base` plus extra countries. */
export const add = (base: string[], s: string): string[] => [...new Set([...base, ...c(s)])];

/** `base` minus some countries. */
export const drop = (base: string[], s: string): string[] => {
  const out = new Set(c(s));
  return base.filter((x) => !out.has(x));
};

interface Input {
  id: string;
  name: string;
  sci: string;
  group: Group;
  status: IucnStatus;
  extinct?: number;
  about: string;
  threats: string;
  /** [fromYear, countries] stages. Strings are space-separated alpha-3 codes. */
  range: [number, string | string[]][];
  pop?: [number, number][];
  popUnit?: string;
}

export function animal(i: Input): Animal {
  return {
    id: i.id,
    name: i.name,
    scientific: i.sci,
    group: i.group,
    status: i.status,
    extinctYear: i.extinct,
    about: i.about,
    threats: i.threats,
    range: i.range.map(([from, countries]) => ({
      from,
      countries: typeof countries === 'string' ? c(countries) : countries,
    })),
    population: i.pop,
    popUnit: i.popUnit,
  };
}
