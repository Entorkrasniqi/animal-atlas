export type StateFilter = 'all' | 'alive' | 'extinct';

export type Group = 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'fish' | 'invertebrate';

/** IUCN Red List categories. EX = extinct, EW = extinct in the wild. */
export type IucnStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX';

/** From `from` (year) onward, the species is found in these countries (ISO 3166-1 alpha-3). */
export interface RangeStage {
  from: number;
  countries: string[];
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
