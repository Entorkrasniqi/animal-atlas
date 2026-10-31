import { exposureById, iceBound, pressureById } from '../data';
import { WARM_FULL, type Tone } from './heat';
import { rangeAt } from './state';
import { MAX_YEAR, formatCount, roundSig } from './time';
import type { Animal, DriverId, Group, Habitat, IucnStatus, Level, SourceLink } from './types';

/**
 * The what-if simulator.
 *
 * It does not forecast extinctions. It ranks the living animals by how much pressure they would be under
 * if the world changed the way the sliders say, so you can compare animals and see which pressures matter
 * for which of them. For each animal the score (0–100) is built like this:
 *
 *   start      today's IUCN status, as a number (Least Concern 5 … Critically Endangered 75), nudged up or
 *              down by up to 4 points by how small its population and range are
 *   pressure   for each driver, how far the slider is pushed, times how much of it reaches the animal
 *              (warming: where its range lies; habitat loss: land, shore or sea), times how much that
 *              driver threatens this species (the 0–3 level in data/curated/pressures.ts)
 *   fragility  small populations and small ranges magnify every pressure by up to 1.0 / 0.6 = 1.7×
 *   combine    risk = 1 − (1 − start) × Π (1 − pressure), so pressures add up but can never pass 100
 */

export interface Driver {
  id: DriverId;
  /** Name on the control and in the breakdown. */
  label: string;
  /** What the slider measures, one line. */
  hint: string;
  max: number;
  step: number;
  /** Unit and sign shown beside a typed value. */
  unit: '°C' | '%';
  plus: boolean;
  /** The value as shown next to the slider, e.g. "+2.5 °C". */
  format: (v: number) => string;
  /** One finding from the research behind the driver. */
  fact: string;
  sources: SourceLink[];
}

const IPBES: SourceLink = { label: 'IPBES Global Assessment (2019)', url: 'https://www.ipbes.net/news/Media-Release-Global-Assessment' };

export const DRIVERS: Driver[] = [
  {
    id: 'warming',
    label: 'Warming',
    hint: 'Extra global warming from today',
    max: 6,
    step: 0.1,
    unit: '°C',
    plus: true,
    format: (v) => `+${v.toFixed(1)} °C`,
    fact: 'Roughly 5% of species are at risk of extinction at 2 °C of warming, rising to 16% at 4.3 °C.',
    sources: [IPBES],
  },
  {
    id: 'habitat',
    label: 'Habitat loss',
    hint: 'Share of remaining habitat cleared',
    max: 60,
    step: 1,
    unit: '%',
    plus: false,
    format: (v) => `${v}%`,
    fact: 'About 75% of the land and 66% of the ocean are already significantly altered by people. Agriculture threatens 62% of the 8,688 threatened species in one analysis.',
    sources: [
      IPBES,
      { label: 'Maxwell et al. 2016 (IUCN)', url: 'https://www.iucn.org/news/secretariat/201608/three-quarters-world%E2%80%99s-threatened-species-are-imperiled-agriculture-land-conversion-overharvesting' },
    ],
  },
  {
    id: 'hunting',
    label: 'Hunting & fishing',
    hint: 'More hunting, fishing and trade than today',
    max: 100,
    step: 1,
    unit: '%',
    plus: true,
    format: (v) => `+${v}%`,
    fact: 'Overexploitation threatens 72% of those 8,688 species. Hunting is a major threat to 301 mammals, and a third of marine fish stocks are fished unsustainably.',
    sources: [
      { label: 'Maxwell et al. 2016 (IUCN)', url: 'https://www.iucn.org/news/secretariat/201608/three-quarters-world%E2%80%99s-threatened-species-are-imperiled-agriculture-land-conversion-overharvesting' },
      { label: 'Ripple et al. 2016', url: 'https://ueaeprints.uea.ac.uk/61245/' },
      IPBES,
    ],
  },
  {
    id: 'invasive',
    label: 'Invasive species',
    hint: 'More invasive predators, plants and pests',
    max: 100,
    step: 1,
    unit: '%',
    plus: true,
    format: (v) => `+${v}%`,
    fact: 'Invasive species contributed to about 60% of recorded plant and animal extinctions, and were the only cause in 16%. Around 90% of the extinctions they mainly caused were on islands.',
    sources: [
      { label: 'IPBES invasive species assessment (2023)', url: 'https://www.sciencedaily.com/releases/2023/09/230907162622.htm' },
      { label: 'Mongabay on the assessment', url: 'https://india.mongabay.com/2023/09/bioinvasions-are-a-global-threat-to-ecosystems-says-ipbes-report/' },
    ],
  },
  {
    id: 'pollution',
    label: 'Pollution',
    hint: 'More plastic, chemicals, oil, noise and lead',
    max: 100,
    step: 1,
    unit: '%',
    plus: true,
    format: (v) => `+${v}%`,
    fact: 'Plastic pollution is up tenfold since 1980, and there are more than 400 ocean dead zones. Pesticides and fertilisers rank second after habitat loss in an insect-decline review.',
    sources: [IPBES, { label: 'Insect decline review (2019)', url: 'https://uk.news.yahoo.com/mass-insect-extinction-within-century-114000732.html' }],
  },
  {
    id: 'disease',
    label: 'Disease',
    hint: 'More wildlife-disease outbreaks',
    max: 100,
    step: 1,
    unit: '%',
    plus: true,
    format: (v) => `+${v}%`,
    fact: 'Chytrid fungus has driven declines in 501 amphibian species, 90 of them presumed extinct. White-nose syndrome cut three North American bat species by over 90%.',
    sources: [
      { label: 'Scheele et al. 2019 (Mongabay)', url: 'https://news.mongabay.com/2019/04/deadly-fungal-disease-has-devastated-more-than-500-amphibian-species/' },
      { label: 'White-nose syndrome (Wildlife Society)', url: 'https://wildlife.org/which-north-american-bats-are-most-impacted-by-wns/' },
    ],
  },
];

export const DRIVER_BY_ID = new Map(DRIVERS.map((d) => [d.id, d]));

/** How far each slider is pushed, from 0 (today) up to the driver's max. */
export type Scenario = Record<DriverId, number>;

export const NO_CHANGE: Scenario = { warming: 0, habitat: 0, hunting: 0, invasive: 0, pollution: 0, disease: 0 };

export const isNoChange = (s: Scenario): boolean => DRIVERS.every((d) => s[d.id] === 0);

/**
 * Global warming today, in °C above 1850–1900: the WMO puts 2025 at 1.43 ± 0.13 °C. The warming slider is
 * "extra from today", so a sourced total such as 2.7 °C becomes a slider value of 2.7 − 1.4.
 */
export const WARMING_TODAY = 1.4;

export interface WarmingPreset {
  /** °C above 1850–1900. */
  total: number;
  /** What the research says about that much warming. */
  note: string;
}

export const WARMING_PRESETS: WarmingPreset[] = [
  { total: 1.5, note: 'Urban 2024: about 1.8% of species at risk of extinction.' },
  { total: 2, note: 'IPBES 2019: roughly 5% of species at risk.' },
  { total: 2.7, note: 'Urban 2024: about 1 in 20 species at risk.' },
  { total: 4.3, note: 'IPBES 2019: about 16% of species at risk.' },
  { total: 5.4, note: 'Urban 2024: about 30% of species at risk.' },
];

/** The slider value (extra °C from today) for a total above 1850–1900. */
export const extraWarming = (total: number): number => Math.max(0, Math.round((total - WARMING_TODAY) * 10) / 10);

export const LEVEL_LABEL = ['Not a known threat', 'Minor threat', 'Moderate threat', 'Major threat'] as const;

// --- the URL hash ---------------------------------------------------------------------------

/** Sliders that were set, from `#whatif&warming=2.5&habitat=30`. Anything missing or odd is 0. */
export function readScenario(params: URLSearchParams): Scenario {
  const out = { ...NO_CHANGE };
  for (const d of DRIVERS) {
    const v = Number(params.get(d.id));
    if (Number.isFinite(v) && v > 0) out[d.id] = Math.min(d.max, Math.round(v / d.step) * d.step);
  }
  return out;
}

/** The sliders that are not at 0, as hash parts. */
export function scenarioParts(s: Scenario): string[] {
  return DRIVERS.filter((d) => s[d.id] > 0).map((d) => `${d.id}=${+s[d.id].toFixed(1)}`);
}

// --- the model ------------------------------------------------------------------------------

/** Today's risk by IUCN category, as a share of 1. */
const START: Partial<Record<IucnStatus, number>> = { LC: 0.05, NT: 0.15, VU: 0.3, EN: 0.5, CR: 0.75 };

/**
 * How much the surface warms where an animal lives, relative to the global mean. Land warms faster than
 * the sea (IPCC AR6: about +1.6 °C on land against +0.9 °C at sea while the globe warmed 1.1 °C), and the
 * far north faster still (the Arctic has warmed 3–4 times faster than the globe since 1979, Rantanen et
 * al. 2022). This is a simple pattern, not a climate model.
 */
const SURFACE: Record<Habitat, number> = { land: 1.45, coast: 1.15, sea: 0.85 };
const ARCTIC = 3;
/** Local warming (°C) at which warming reaches an animal in full (also where the map's warming colours end). */
const WARMING_FULL = WARM_FULL;
/** How much of the habitat-loss slider reaches animals of each habitat: sea life is touched mostly at the shore. */
const HABITAT_REACH: Record<Habitat, number> = { land: 1, coast: 0.8, sea: 0.35 };
const POLLUTION_REACH: Record<Habitat, number> = { land: 0.75, coast: 1, sea: 1 };
/** No single pressure can account for more than this share of the way to certain extinction. */
const MAX_PRESSURE = 0.85;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

interface Profile {
  start: number;
  habitat: Habitat;
  levels: Record<DriverId, Level>;
  /** Local warming per °C of global warming, averaged over the range. */
  warmingFactor: number;
  pop: number | null;
  area: number | null;
  popFragility: number;
  rangeFragility: number;
  /** 0 (large, numerous) to 1 (tiny range, few animals). */
  fragility: number;
}

const profiles = new Map<string, Profile>();

/** How much faster than the globe the far north warms at a latitude: 1× up to 50°N, 3× from 75°N. */
const northBoost = (lat: number): number => (lat > 50 ? 1 + (ARCTIC - 1) * clamp01((lat - 50) / 25) : 1);

/** The surface's own factor, or the far north's if that is higher (the sea in the Arctic warms fast too). */
const factorAtLat = (surface: number, lat: number): number => {
  const north = northBoost(lat);
  return north > 1 ? Math.max(surface, north) : surface;
};

/** How many times the global warming an animal's surface warms at a latitude. The map colours its range by this. */
export function warmingFactorAt(a: Animal): (lat: number) => number {
  if (iceBound.has(a.id)) return () => ARCTIC;
  const surface = SURFACE[a.habitat ?? 'land'];
  return (lat) => factorAtLat(surface, lat);
}

function warmingFactorOf(a: Animal, habitat: Habitat): number {
  if (iceBound.has(a.id)) return ARCTIC;
  const surface = SURFACE[habitat];
  const bands = exposureById.get(a.id)?.bands;
  if (!bands) return surface;
  let f = 0;
  bands.forEach((share, i) => (f += share * factorAtLat(surface, -85 + i * 10)));
  return f;
}

function profileOf(a: Animal): Profile {
  let p = profiles.get(a.id);
  if (p) return p;
  const habitat = a.habitat ?? 'land';
  const pop = a.population?.length ? a.population[a.population.length - 1][1] : null;
  const area = exposureById.get(a.id)?.area ?? null;
  // 100 animals is as fragile as it gets, a million is not at all; 1,000 km² against a million km².
  const popFragility = pop === null ? 0.5 : 1 - clamp01((Math.log10(pop) - 2) / 4);
  const rangeFragility = area === null ? 0.5 : 1 - clamp01((Math.log10(area) - 3) / 3);
  const none = { warming: 0, habitat: 0, hunting: 0, invasive: 0, pollution: 0, disease: 0 } as const;
  const fragility = (popFragility + rangeFragility) / 2;
  p = {
    // Status first; fragility only breaks ties between animals of the same category.
    start: clamp01((START[a.status] ?? 0.05) + 0.08 * (fragility - 0.5)),
    habitat,
    levels: pressureById.get(a.id) ?? none,
    warmingFactor: warmingFactorOf(a, habitat),
    pop,
    area,
    popFragility,
    rangeFragility,
    fragility,
  };
  profiles.set(a.id, p);
  return p;
}

/** How much of a driver's pressure reaches the animal at all, 0 to 1. */
function reach(d: Driver, value: number, p: Profile): number {
  switch (d.id) {
    case 'warming':
      return clamp01((value * p.warmingFactor) / WARMING_FULL);
    case 'habitat':
      return (value / d.max) * HABITAT_REACH[p.habitat];
    case 'pollution':
      return (value / d.max) * POLLUTION_REACH[p.habitat];
    default:
      return value / d.max;
  }
}

export interface Part {
  id: DriverId;
  level: Level;
  /** Score points this driver adds on top of today's. Adds up to the whole rise. */
  points: number;
  /** What the slider does to this animal, in a sentence. */
  detail: string;
}

export interface Assessment {
  /** 0–100. */
  score: number;
  /** The score with every slider at 0: today's status as a number. */
  baseline: number;
  /** How far the scenario lifts the score above the baseline. */
  rise: number;
  /** Drivers that add risk, biggest first. */
  parts: Part[];
  fragility: number;
  /** Why the animal is more or less fragile: population and range. */
  fragilityNote: string;
}

const MORE: Record<'hunting' | 'invasive' | 'pollution' | 'disease', string> = {
  hunting: 'more hunting and fishing',
  invasive: 'more invasive species',
  pollution: 'more pollution',
  disease: 'more disease outbreaks',
};

function detailOf(d: Driver, value: number, p: Profile): string {
  if (d.id === 'warming') {
    const local = value * p.warmingFactor;
    return `Its range warms about +${local.toFixed(1)} °C locally with +${value.toFixed(1)} °C worldwide`;
  }
  if (d.id === 'habitat') {
    return p.habitat === 'sea'
      ? `${d.format(value)} of habitat cleared, felt mostly at the shore as it lives at sea`
      : `${d.format(value)} of its remaining habitat cleared`;
  }
  return `${value}% ${MORE[d.id]} than today`;
}

function fragilityNoteOf(p: Profile): string {
  const bits: string[] = [];
  if (p.pop !== null && p.popFragility >= 0.6) bits.push(`a small population (about ${formatCount(roundSig(p.pop))})`);
  if (p.area !== null && p.rangeFragility >= 0.6) bits.push(`a small range (about ${formatCount(roundSig(p.area))} km²)`);
  if (bits.length) return `${bits.join(' and ')} make${bits.length === 1 ? 's' : ''} every pressure hit harder.`.replace(/^./, (c) => c.toUpperCase());
  if (p.fragility <= 0.3) return 'A large population and range soften every pressure.';
  return 'Its population and range give it a middling cushion.';
}

/** Scores one living animal under a scenario. */
export function assess(a: Animal, s: Scenario): Assessment {
  const p = profileOf(a);
  // Fragility scales every pressure between 0.6× (robust) and 1× (fragile).
  const amplify = 0.6 + 0.4 * p.fragility;

  const raised = DRIVERS.map((d) => {
    const level = p.levels[d.id];
    const hit = Math.min(MAX_PRESSURE, reach(d, s[d.id], p) * (level / 3) * amplify);
    return { d, level, load: -Math.log(1 - hit) };
  });
  const load = raised.reduce((sum, r) => sum + r.load, 0);
  const risk = 1 - (1 - p.start) * Math.exp(-load);
  const rise = (risk - p.start) * 100;

  const parts: Part[] = raised
    .filter((r) => r.load > 0 && (rise * r.load) / load >= 0.5)
    .map((r) => ({ id: r.d.id, level: r.level, points: (rise * r.load) / load, detail: detailOf(r.d, s[r.d.id], p) }))
    .sort((x, y) => y.points - x.points);

  return {
    score: Math.round(risk * 100),
    baseline: Math.round(p.start * 100),
    rise: Math.round(risk * 100) - Math.round(p.start * 100),
    parts,
    fragility: p.fragility,
    fragilityNote: fragilityNoteOf(p),
  };
}

/** The IUCN-style colour band a score falls in, for the bars. */
export function toneOf(score: number): 'LC' | 'NT' | 'VU' | 'EN' | 'CR' {
  if (score < 20) return 'LC';
  if (score < 35) return 'NT';
  if (score < 50) return 'VU';
  if (score < 70) return 'EN';
  return 'CR';
}

export interface CountryRisk {
  count: number;
  /** Mean score of the living atlas animals found there. */
  mean: number;
  top: { animal: Animal; score: number };
}

/** Per country: how many living animals the atlas holds and how hard the scenario hits them on average. */
export function riskByCountry(living: Animal[], results: Map<string, Assessment>): Map<string, CountryRisk> {
  const sums = new Map<string, { count: number; total: number; top: { animal: Animal; score: number } }>();
  for (const a of living) {
    const score = results.get(a.id)?.score;
    if (score === undefined) continue;
    for (const code of rangeAt(a, MAX_YEAR)) {
      const cur = sums.get(code);
      if (!cur) sums.set(code, { count: 1, total: score, top: { animal: a, score } });
      else {
        cur.count++;
        cur.total += score;
        if (score > cur.top.score) cur.top = { animal: a, score };
      }
    }
  }
  return new Map([...sums].map(([code, v]) => [code, { count: v.count, mean: v.total / v.count, top: v.top }]));
}

// --- the summary: the whole atlas at a glance -------------------------------------------------

/** The score bands, from calm to critical. Their colours are the IUCN categories'. */
export const BANDS: { tone: Tone; label: string; range: string }[] = [
  { tone: 'LC', label: 'Low', range: '0–19' },
  { tone: 'NT', label: 'Watch', range: '20–34' },
  { tone: 'VU', label: 'Elevated', range: '35–49' },
  { tone: 'EN', label: 'High', range: '50–69' },
  { tone: 'CR', label: 'Critical', range: '70–100' },
];

/** A pressure counts as hitting an animal noticeably from this many points up. */
const NOTICEABLE = 5;

export interface Summary {
  count: number;
  averageToday: number;
  averageNow: number;
  /** Animals per score band, today and under the scenario. */
  bands: { tone: Tone; label: string; range: string; today: number; now: number }[];
  /** Mean score per animal group. */
  groups: { group: Group; count: number; today: number; now: number }[];
  /** Per pressure: points added across all animals, and how many animals it lifts noticeably. */
  drivers: { id: DriverId; points: number; animals: number }[];
  /** The animals the scenario lifts the most. */
  top: { animal: Animal; assessment: Assessment }[];
}

export function summarize(living: Animal[], results: Map<string, Assessment>): Summary {
  const rows = living.flatMap((animal) => {
    const assessment = results.get(animal.id);
    return assessment ? [{ animal, assessment }] : [];
  });
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const bands = BANDS.map((b) => ({
    ...b,
    today: rows.filter((r) => toneOf(r.assessment.baseline) === b.tone).length,
    now: rows.filter((r) => toneOf(r.assessment.score) === b.tone).length,
  }));

  const groups = [...new Set(rows.map((r) => r.animal.group))].map((group) => {
    const of = rows.filter((r) => r.animal.group === group);
    return {
      group,
      count: of.length,
      today: Math.round(mean(of.map((r) => r.assessment.baseline))),
      now: Math.round(mean(of.map((r) => r.assessment.score))),
    };
  });

  const drivers = DRIVERS.map((d) => {
    const points = rows.map((r) => r.assessment.parts.find((p) => p.id === d.id)?.points ?? 0);
    return { id: d.id, points: points.reduce((a, b) => a + b, 0), animals: points.filter((p) => p >= NOTICEABLE).length };
  });

  return {
    count: rows.length,
    averageToday: Math.round(mean(rows.map((r) => r.assessment.baseline))),
    averageNow: Math.round(mean(rows.map((r) => r.assessment.score))),
    bands,
    groups,
    drivers,
    top: rows
      .filter((r) => r.assessment.rise > 0)
      .sort((a, b) => b.assessment.rise - a.assessment.rise || b.assessment.score - a.assessment.score)
      .slice(0, 5),
  };
}

/** The sliders in words, e.g. "+3.0 °C warming · 20% of habitat cleared". */
export function describeScenario(s: Scenario): string {
  const words: Record<DriverId, (v: number) => string> = {
    warming: (v) => `+${v.toFixed(1)} °C warming`,
    habitat: (v) => `${v}% of habitat cleared`,
    hunting: (v) => `${v}% more hunting and fishing`,
    invasive: (v) => `${v}% more invasive species`,
    pollution: (v) => `${v}% more pollution`,
    disease: (v) => `${v}% more disease outbreaks`,
  };
  const parts = DRIVERS.filter((d) => s[d.id] > 0).map((d) => words[d.id](s[d.id]));
  return parts.length ? parts.join(' · ') : 'No change from today';
}
