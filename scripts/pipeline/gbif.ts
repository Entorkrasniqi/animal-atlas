import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import { GRID_H, GRID_W, cellIndex } from '../../src/lib/grid';
import { alpha3 } from './countries';
import { get, getJson } from './http';
import type { IucnStatus } from '../../src/lib/types';

const API = 'https://api.gbif.org/v1';
const MAPS = 'https://api.gbif.org/v2/map/occurrence/adhoc';

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

/** Cells of the world grid (see src/lib/grid.ts) mapped to the number of records in them. */
export type CellCounts = Map<number, number>;

const OBSERVED = ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'PRESERVED_SPECIMEN'];

/**
 * Zoom level whose density tiles are as fine as a grid cell. GBIF bins records at a precision that
 * follows the zoom, so coarser tiles merge neighbouring cells: tigers fall in 41 cells at zoom 0 but
 * 94 at zoom 3. At zoom 3 a tile is 22.5° wide and a square of 64 units (of 4096) is one grid cell.
 */
const CELL_ZOOM = 3;

interface TileFeature {
  col: number;
  row: number;
  total: number;
}

/** Records of one EPSG:4326 density tile as grid cells; null when the tile holds none. */
async function readTile(filters: string, z: number, x: number, y: number): Promise<TileFeature[] | null> {
  // Above the finest zoom we only ask "is anything here?", so use the biggest squares to keep tiles small.
  const squareSize = z === CELL_ZOOM ? 8 * 2 ** z : 512;
  const url = `${MAPS}/${z}/${x}/${y}.mvt?srs=EPSG:4326&bin=square&squareSize=${squareSize}&${filters}`;
  const res = await get(url, { binary: true });
  if (res.status === 204 || res.status === 404 || res.body === '') return null;
  // GBIF answers a tile that holds no records with a 400 (base64 of "Tile is missing the expected layer").
  if (res.status === 400 && Buffer.from(res.body, 'base64').toString().includes('missing the expected layer')) return null;
  if (res.status >= 400) throw new Error(`HTTP ${res.status} for ${url}`);

  const layer = new VectorTile(new Pbf(Buffer.from(res.body, 'base64'))).layers.occurrence;
  if (!layer || layer.length === 0) return null;
  if (z !== CELL_ZOOM) return [];

  // The tile pyramid has 2^(z+1) columns and 2^z rows; a tile spans 4096 units, 8 per cell at zoom 0.
  const perCell = squareSize;
  const out: TileFeature[] = [];
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    const total = Number(feature.properties.total);
    const ring = feature.loadGeometry()[0];
    if (!total || !ring) continue;
    const col = Math.round((x * 4096 + Math.min(...ring.map((p) => p.x))) / perCell);
    const row = Math.round((y * 4096 + Math.min(...ring.map((p) => p.y))) / perCell);
    if (col >= 0 && col < GRID_W && row >= 0 && row < GRID_H) out.push({ col, row, total });
  }
  return out;
}

/**
 * Where records of a taxon fall on the world grid, from GBIF's density tiles.
 *
 * Walks the tile pyramid from the two world tiles down to `CELL_ZOOM`, fetching only tiles that
 * contain records. Zoos and escapes are not filtered out here; callers clip the counts to the
 * countries an animal is known from.
 */
export async function occurrenceGrid(key: number, window: Window): Promise<CellCounts> {
  const filters =
    `taxonKey=${key}&hasGeospatialIssue=false&year=${window.from},${window.to}&` +
    OBSERVED.map((b) => `basisOfRecord=${b}`).join('&');
  const counts: CellCounts = new Map();

  const walk = async (z: number, x: number, y: number): Promise<void> => {
    const found = await readTile(filters, z, x, y);
    if (!found) return;
    if (z === CELL_ZOOM) {
      for (const { col, row, total } of found) {
        const cell = cellIndex(col, row);
        counts.set(cell, (counts.get(cell) ?? 0) + total);
      }
      return;
    }
    await Promise.all([0, 1].flatMap((dy) => [0, 1].map((dx) => walk(z + 1, 2 * x + dx, 2 * y + dy))));
  };
  await Promise.all([walk(0, 0, 0), walk(0, 1, 0)]);
  return counts;
}

export const gbifSpeciesUrl = (key: number) => `https://www.gbif.org/species/${key}`;
