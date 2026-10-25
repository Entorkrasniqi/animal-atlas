import { alpha3 } from './countries';
import { getJson } from './http';
import type { IucnStatus } from '../../src/lib/types';

const API = 'https://api.gbif.org/v1';

export interface GbifTaxon {
  /** Key of the matched name (may be a subspecies). */
  key: number;
  /** Key of the accepted usage, when the matched name is a synonym. */
  acceptedKey: number;
  canonicalName: string;
  rank: string;
  matchType: string;
  confidence: number;
  genus?: string;
  family?: string;
  order?: string;
  class?: string;
  /** Keys up the classification, closest first, for silhouette fallbacks. */
  lineage: { rank: 'species' | 'genus' | 'family' | 'order'; name: string; key: number }[];
}

interface MatchResponse {
  usageKey?: number;
  acceptedUsageKey?: number;
  canonicalName?: string;
  rank?: string;
  status?: string;
  matchType?: string;
  confidence?: number;
  species?: string;
  speciesKey?: number;
  genus?: string;
  genusKey?: number;
  family?: string;
  familyKey?: number;
  order?: string;
  orderKey?: number;
  class?: string;
}

/** Match a scientific name against the GBIF Backbone. Null when GBIF only finds a higher rank. */
export async function matchTaxon(name: string): Promise<GbifTaxon | null> {
  const res = await getJson<MatchResponse>(
    `${API}/species/match?name=${encodeURIComponent(name)}&kingdom=Animalia`,
  );
  if (!res || !res.usageKey || res.matchType === 'NONE' || res.matchType === 'HIGHERRANK') return null;

  const lineage: GbifTaxon['lineage'] = [];
  if (res.speciesKey && res.species) lineage.push({ rank: 'species', name: res.species, key: res.speciesKey });
  if (res.genusKey && res.genus) lineage.push({ rank: 'genus', name: res.genus, key: res.genusKey });
  if (res.familyKey && res.family) lineage.push({ rank: 'family', name: res.family, key: res.familyKey });
  if (res.orderKey && res.order) lineage.push({ rank: 'order', name: res.order, key: res.orderKey });

  return {
    key: res.usageKey,
    acceptedKey: res.acceptedUsageKey ?? res.usageKey,
    canonicalName: res.canonicalName ?? name,
    rank: res.rank ?? 'UNKNOWN',
    matchType: res.matchType ?? 'UNKNOWN',
    confidence: res.confidence ?? 0,
    genus: res.genus,
    family: res.family,
    order: res.order,
    class: res.class,
    lineage,
  };
}

const IUCN: Record<string, IucnStatus> = {
  LEAST_CONCERN: 'LC',
  NEAR_THREATENED: 'NT',
  VULNERABLE: 'VU',
  ENDANGERED: 'EN',
  CRITICALLY_ENDANGERED: 'CR',
  EXTINCT_IN_THE_WILD: 'EW',
  EXTINCT: 'EX',
};

export interface IucnRecord {
  status: IucnStatus;
  taxonId: string;
  /** The name IUCN assessed, so callers can tell a species-level result from a subspecies one. */
  assessedName: string;
}

/** The IUCN Red List category GBIF mirrors for a taxon. Null for Data Deficient or unassessed taxa. */
export async function iucnCategory(key: number): Promise<IucnRecord | null> {
  const res = await getJson<{ category?: string; iucnTaxonID?: string; scientificName?: string }>(
    `${API}/species/${key}/iucnRedListCategory`,
  );
  const status = res?.category ? IUCN[res.category] : undefined;
  if (!res || !status) return null;
  return { status, taxonId: res.iucnTaxonID ?? '', assessedName: res.scientificName ?? '' };
}

/**
 * Whether an assessed name ("Panthera leo (Linnaeus, 1758)") is exactly the
 * canonical name ("Panthera leo") and not a subspecies of it ("Panthera leo persica").
 */
export function sameTaxon(assessedName: string, canonical: string): boolean {
  if (!assessedName.startsWith(canonical)) return false;
  const rest = assessedName.slice(canonical.length).trim();
  return rest === '' || /^[A-Z(]/.test(rest);
}

export interface Window {
  from: number;
  to: number;
}

export interface CountryEvidence {
  /** Records in the window that survived the quality filters. */
  total: number;
  /** alpha-3 -> number of records. */
  byCountry: Record<string, number>;
}

/**
 * Where people recorded a taxon in a window of years.
 *
 * Counts show where observers and museums are, not where animals live, so
 * the pipeline only uses them to confirm a range, never to extend one.
 */
export async function occurrenceCountries(key: number, window: Window): Promise<CountryEvidence> {
  const basis = ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'PRESERVED_SPECIMEN']
    .map((b) => `basisOfRecord=${b}`)
    .join('&');
  const url =
    `${API}/occurrence/search?taxonKey=${key}&limit=0&facet=country&facetLimit=300` +
    `&occurrenceStatus=PRESENT&hasCoordinate=true&hasGeospatialIssue=false&${basis}&year=${window.from},${window.to}`;
  const res = await getJson<{ count?: number; facets?: { counts: { name: string; count: number }[] }[] }>(url);
  const byCountry: Record<string, number> = {};
  for (const { name, count } of res?.facets?.[0]?.counts ?? []) {
    const code = alpha3(name);
    if (code) byCountry[code] = (byCountry[code] ?? 0) + count;
  }
  return { total: res?.count ?? 0, byCountry };
}

export const gbifSpeciesUrl = (key: number) => `https://www.gbif.org/species/${key}`;
