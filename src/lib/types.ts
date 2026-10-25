export type StateFilter = 'all' | 'alive' | 'extinct';

export type Group = 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'fish' | 'invertebrate';

/** IUCN Red List categories. EX = extinct, EW = extinct in the wild. */
export type IucnStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX';

/** From `from` (year) onward, the species is found in these countries (ISO 3166-1 alpha-3). */
export interface RangeStage {
  from: number;
  countries: string[];
}

export interface Animal {
  id: string;
  name: string;
  scientific: string;
  group: Group;
  /** Latest IUCN category. */
  status: IucnStatus;
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
