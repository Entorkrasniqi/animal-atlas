import { get, getJson } from './http';
import type { GbifTaxon } from './gbif';

const API = 'https://api.phylopic.org';
const RANKS = ['species', 'genus', 'family', 'order'] as const;

/**
 * Licences the atlas can show without extra obligations beyond a credit line.
 * NonCommercial and ShareAlike images are left out on purpose.
 */
const ACCEPTED: Record<string, string> = {
  'https://creativecommons.org/publicdomain/zero/1.0/': 'CC0',
  'https://creativecommons.org/publicdomain/mark/1.0/': 'Public Domain',
  'https://creativecommons.org/licenses/by/3.0/': 'CC BY 3.0',
  'https://creativecommons.org/licenses/by/4.0/': 'CC BY 4.0',
};

export interface SilhouetteHit {
  uuid: string;
  svg: string;
  credit: string;
  license: string;
  licenseUrl: string;
  pageUrl: string;
  rank: 'species' | 'genus' | 'family' | 'order';
  taxon: string;
}

interface Link {
  href: string;
  title?: string;
}
interface ImageRecord {
  uuid: string;
  attribution?: string | null;
  _links: { license?: Link; vectorFile?: Link; self?: Link };
}
interface NodeRecord {
  uuid: string;
  _links: { images?: Link };
  _embedded?: { primaryImage?: ImageRecord };
}

let build: number | null = null;
async function currentBuild(): Promise<number> {
  if (build) return build;
  // The root redirects to ?build=N; the number changes whenever PhyloPic's data does.
  const root = await getJson<{ build: number }>(`${API}/`, { noCache: true });
  if (!root?.build) throw new Error('Could not read the PhyloPic build number');
  return (build = root.build);
}

function acceptable(image: ImageRecord | undefined): image is ImageRecord {
  const licence = image?._links.license?.href;
  return !!image && !!licence && licence in ACCEPTED && !!image._links.vectorFile?.href;
}

/** The first usable image for a node: its primary image, else any permissively licensed one. */
async function usableImage(node: NodeRecord): Promise<ImageRecord | null> {
  if (acceptable(node._embedded?.primaryImage)) return node._embedded.primaryImage;
  const b = await currentBuild();
  const list = await getJson<{ _embedded?: { items?: ImageRecord[] } }>(
    `${API}/images?build=${b}&filter_node=${node.uuid}&filter_license_nc=false&filter_license_sa=false&embed_items=true&page=0`,
  );
  return list?._embedded?.items?.find(acceptable) ?? null;
}

async function nodeForGbif(key: number): Promise<NodeRecord | null> {
  const b = await currentBuild();
  return getJson<NodeRecord>(`${API}/resolve/gbif.org/species/${key}?build=${b}&embed_primaryImage=true`);
}

async function nodeForName(name: string): Promise<NodeRecord | null> {
  const b = await currentBuild();
  const res = await getJson<{ _embedded?: { items?: NodeRecord[] } }>(
    `${API}/nodes?build=${b}&filter_name=${encodeURIComponent(name.toLowerCase())}&embed_items=true&embed_primaryImage=true&page=0`,
  );
  return res?._embedded?.items?.[0] ?? null;
}

/**
 * The closest permissively licensed silhouette: the species itself, then its
 * genus, family and (if allowed) order. Close relatives look alike; distant
 * ones don't, so the search stops at `lowestRank`.
 */
export async function findSilhouette(
  taxon: GbifTaxon,
  options: { lowestRank: 'genus' | 'family' | 'order'; nameFallback?: string },
): Promise<SilhouetteHit | null> {
  const allowed = new Set<string>(RANKS.slice(0, RANKS.indexOf(options.lowestRank) + 1));

  for (const step of taxon.lineage) {
    if (!allowed.has(step.rank)) continue;
    let node = await nodeForGbif(step.key);
    if (!node && step.rank === 'species') node = await nodeForName(options.nameFallback ?? step.name);
    if (!node) continue;
    const image = await usableImage(node);
    if (!image) continue;

    const svg = await get(image._links.vectorFile?.href as string);
    if (svg.status !== 200 || !svg.body.includes('<svg')) continue;

    const licenseUrl = image._links.license?.href as string;
    return {
      uuid: image.uuid,
      svg: svg.body,
      credit: image.attribution?.trim() ?? '',
      license: ACCEPTED[licenseUrl],
      licenseUrl,
      pageUrl: `https://www.phylopic.org/images/${image.uuid}`,
      rank: step.rank,
      taxon: step.name,
    };
  }
  return null;
}
