export type StateFilter = 'all' | 'alive' | 'extinct';

export type Group = 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'fish' | 'invertebrate';

/** IUCN Red List categories. EX = extinct, EW = extinct in the wild. */
export type IucnStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX';

/** From `from` (year) onward, the species is found in these countries (ISO 3166-1 alpha-3). */
export interface RangeStage {
  from: number;
  countries: string[];
}

/** Where an animal lives, which decides how its range is drawn. */
export type Habitat = 'land' | 'coast' | 'sea';

/**
 * How one range stage is drawn on the world grid (see grid.ts). `cells` holds sighting counts, so
 * the more records near a place, the "more common" the animal is shown to be there.
 */
export interface RangeLayer {
  /**
   * records  – counted from sightings and fossil finds made in this stage
   * all-time – too few records in this stage, so every record since 1700 inside its countries
   * area     – no usable records; a hand-drawn area (a few animals live in one small refuge)
   * countries – no usable records and no area: only the stage's countries are known
   */
  basis: 'records' | 'all-time' | 'area' | 'countries';
  /** Plain-language description of the evidence, e.g. "GBIF sightings, 1990–2025". */
  source: string;
  /** Records behind the layer (fossil finds count by how well their age fits the stage). */
  records: number;
  /** Flat [cell, count, cell, count, …] sorted by cell; empty for `countries`. */
  cells: number[];
  /** False when the cells lie outside the country outlines (a refuge too small for the map): don't clip them. */
  clip?: false;
}

/** One layer per `Animal.range` stage, in the same order. Stored per animal, loaded on demand. */
export interface RangeData {
  layers: RangeLayer[];
}

/** A silhouette from PhyloPic, self-hosted under /silhouettes. */
export interface Silhouette {
  /** Public path, e.g. "/silhouettes/tiger.svg". */
  file: string;
  /** Contributor to credit (empty for public-domain images). */
  credit: string;
  /** Short licence name, e.g. "CC0" or "CC BY 4.0". */
  license: string;
  licenseUrl: string;
  /** The image's page on PhyloPic. */
  pageUrl: string;
  /** How closely the image matches: the species itself, or a close relative. */
  rank: 'species' | 'genus' | 'family' | 'order';
  /** Name of the taxon the image depicts, e.g. "Panthera tigris" or "Felidae". */
  taxon: string;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface Animal {
  id: string;
  name: string;
  scientific: string;
  group: Group;
  /** Defaults to land. Sea animals are drawn over open water, coastal ones over shores and shallows. */
  habitat?: Habitat;
  /** Conservation category: IUCN's where it assessed this taxon, otherwise curated. */
  status: IucnStatus;
  /** Where `status` came from. */
  statusSource?: 'iucn' | 'curated';
  /** Year the species was lost (negative = BCE). Absent for living species. */
  extinctYear?: number;
  about: string;
  /** Main threats, or the cause of extinction. */
  threats: string;
  /** Sorted by `from`; the first stage starts at MIN_YEAR. */
  range: RangeStage[];
  /** [year, count] estimates, sorted by year. */
  population?: [number, number][];
  /** What `population` counts. Defaults to "individuals". */
  popUnit?: string;

  // --- filled in by the data pipeline (see scripts/pipeline) ---
  silhouette?: Silhouette;
  /** Where to read more. */
  sources?: SourceLink[];
  /** Plain-language notes on how this entry was built and checked. */
  notes?: string[];
}

/** The app's two modes: browse animals through time, or raise pressures and see who is most at risk. */
export type Mode = 'explore' | 'whatif';

/** The pressures the what-if scenario can raise (see scenario.ts). */
export type DriverId = 'warming' | 'habitat' | 'hunting' | 'invasive' | 'pollution' | 'disease';

/** How strongly a pressure threatens one species: 0 not a known threat, 1 minor, 2 moderate, 3 major. */
export type Level = 0 | 1 | 2 | 3;

/** Where a living animal's range lies, worked out from its range layer (see scripts/pipeline/exposure.ts). */
export interface Exposure {
  /** Area covered by its recorded range, in km². */
  area: number;
  /** Share of that area in each 10° band of latitude, from 90°S to 90°N (18 numbers adding up to 1). */
  bands: number[];
}

export const GROUP_LABEL: Record<Group, string> = {
  mammal: 'Mammals',
  bird: 'Birds',
  reptile: 'Reptiles',
  amphibian: 'Amphibians',
  fish: 'Fish',
  invertebrate: 'Invertebrates',
};

export const STATUS_LABEL: Record<IucnStatus, string> = {
  LC: 'Least Concern',
  NT: 'Near Threatened',
  VU: 'Vulnerable',
  EN: 'Endangered',
  CR: 'Critically Endangered',
  EW: 'Extinct in the Wild',
  EX: 'Extinct',
};
