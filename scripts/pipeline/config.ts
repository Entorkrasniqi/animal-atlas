/** Tunable rules for turning API evidence into dataset changes. */
export const CONFIG = {
  /** GBIF records in this window confirm that a species still lives in a listed country. */
  modernWindow: { from: 1990, to: 2025 },
  /** Extinct species are checked against GBIF records from this year until they vanished. */
  historicalFrom: 1500,
  /** Records needed before a listed country counts as confirmed by GBIF. */
  gbifConfirmMin: 3,
  /** A country outside the curated range is flagged for review at this many records AND share. */
  gbifCandidateMin: 25,
  gbifCandidateShare: 0.01,

  /** Late Pleistocene, in years before present: the part of the timeline PBDB finds can speak to. */
  pleistocene: { oldestBp: 50_000, youngestBp: 11_700 },
  /** Fossil finds dated more loosely than this say little about any one period, so they are ignored. */
  pbdbMaxWindowYears: 130_000,
  /** Finds needed in a country before PBDB extends a species' deep-time range there. */
  pbdbMinPerCountry: 2,
  /** Curated extinction dates this far outside PBDB's last-appearance bounds are flagged. */
  extinctionToleranceYears: 1500,
  /** PBDB only extends ranges of species that died out before this year. */
  fossilEraBefore: 1500,

  /** Silhouettes may depict a close relative, but no further than this. */
  silhouetteLowestRank: 'family' as const,
};

/** Years before present are counted from 1950, the convention PBDB and radiocarbon dating use. */
export const toBp = (year: number): number => 1950 - year;
