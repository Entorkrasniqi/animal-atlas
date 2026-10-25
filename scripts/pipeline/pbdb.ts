import { alpha3 } from './countries';
import { getJson } from './http';

const API = 'https://paleobiodb.org/data1.2';

export interface PbdbTaxon {
  taxonNo: number;
  name: string;
  /** Number of occurrences PBDB holds for this taxon and its subtaxa. */
  occurrenceCount: number;
  /** True if PBDB flags the taxon as still living. */
  extant: boolean;
  /** Last appearance, in millions of years ago: the earliest and latest it could be. */
  lastEarlyMa: number;
  lastLateMa: number;
}

interface TaxonRecord {
  oid: string;
  nam: string;
  noc?: number;
  ext?: string;
  lea?: number;
  lla?: number;
}

export async function lookupTaxon(name: string): Promise<PbdbTaxon | null> {
  const res = await getJson<{ records?: TaxonRecord[] }>(
    `${API}/taxa/single.json?name=${encodeURIComponent(name)}&show=attr,app`,
  );
  const r = res?.records?.[0];
  if (!r) return null;
  return {
    taxonNo: Number(r.oid.replace(/\D/g, '')),
    name: r.nam,
    occurrenceCount: r.noc ?? 0,
    extant: r.ext === '1',
    lastEarlyMa: r.lea ?? 0,
    lastLateMa: r.lla ?? 0,
  };
}

export interface FossilOccurrence {
  /** alpha-3, or null when PBDB has no country (e.g. open ocean). */
  country: string | null;
  /** Age bounds in years before present (1950): the find is somewhere in [youngest, oldest]. */
  oldestBp: number;
  youngestBp: number;
}

interface OccRecord {
  cc2?: string;
  eag?: number;
  lag?: number;
}

export async function occurrences(name: string): Promise<FossilOccurrence[]> {
  const res = await getJson<{ records?: OccRecord[] }>(
    `${API}/occs/list.json?base_name=${encodeURIComponent(name)}&show=loc&limit=all`,
  );
  const out: FossilOccurrence[] = [];
  for (const r of res?.records ?? []) {
    if (r.eag === undefined || r.lag === undefined) continue;
    out.push({
      country: r.cc2 ? alpha3(r.cc2) : null,
      oldestBp: Math.round(r.eag * 1e6),
      youngestBp: Math.round(r.lag * 1e6),
    });
  }
  return out;
}

export const pbdbTaxonUrl = (taxonNo: number) => `https://paleobiodb.org/classic/basicTaxonInfo?taxon_no=${taxonNo}`;
