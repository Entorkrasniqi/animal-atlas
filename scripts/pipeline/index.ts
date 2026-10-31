/**
 * Builds the dataset the app ships.
 *
 *   npm run data                  rebuild everything (reads the cache; only new lookups hit the network)
 *   npm run data -- --refresh     ignore the cache and re-query every source
 *   npm run data -- --only=tiger,dodo   dry run for a few animals; writes nothing
 *
 * Input:  data/curated/*            the editorial layer (facts no open API provides)
 * Output: src/data/generated/animals.json   what the app imports
 *         src/data/generated/exposure.json   range area and latitudes of living animals (what-if simulator)
 *         src/data/generated/basemap/*.json   Natural Earth states, cities, lakes, rivers (thinned)
 *         public/silhouettes/*.svg + CREDITS.md   self-hosted PhyloPic images
 *         data/generated/report.md  what was changed or needs a human look
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { seeds } from '../../data/curated';
import { buildBasemap } from './basemap';
import { buildAnimal, type Built, type Flag, type FlagKind } from './build';
import { writeExposure } from './exposure';
import { mapLimit, setRefresh } from './http';
import type { RangeData } from '../../src/lib/types';

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
setRefresh(args.includes('--refresh'));

const OUT_JSON = path.resolve('src/data/generated/animals.json');
const OUT_RANGES = path.resolve('src/data/generated/ranges');
const OUT_REPORT = path.resolve('data/generated/report.md');
const OUT_SVG = path.resolve('public/silhouettes');

const picked = only ? seeds.filter((s) => only.includes(s.id)) : seeds;
if (only && picked.length !== only.length) {
  const known = new Set(seeds.map((s) => s.id));
  throw new Error(`Unknown animal id(s): ${only.filter((id) => !known.has(id)).join(', ')}`);
}

let done = 0;
const built: Built[] = await mapLimit(picked, 4, async (seed) => {
  try {
    const result = await buildAnimal(seed);
    process.stdout.write(`\r  ${++done}/${picked.length}  ${seed.id.padEnd(32)}`);
    return result;
  } catch (err) {
    throw new Error(`${seed.id}: ${err instanceof Error ? err.message : String(err)}`);
  }
});
process.stdout.write('\n');

const flags = built.flatMap((b) => b.flags);
const animals = built.map((b) => b.animal).sort((a, b) => a.name.localeCompare(b.name));

if (only) {
  console.log(JSON.stringify(animals, null, 2));
  console.log('\nFlags:\n' + flags.map((f) => `  [${f.kind}] ${f.id}: ${f.detail}`).join('\n'));
  console.log('\nDry run (--only): nothing written.');
  process.exit(0);
}

// --- silhouettes: write each distinct image once, drop stale ones -------------
await mkdir(OUT_SVG, { recursive: true });
const images = new Map<string, NonNullable<Built['silhouette']>>();
for (const b of built) if (b.silhouette) images.set(b.silhouette.uuid, b.silhouette);
for (const [uuid, hit] of images) await writeFile(path.join(OUT_SVG, `${uuid}.svg`), hit.svg);
for (const file of await readdir(OUT_SVG)) {
  if (file.endsWith('.svg') && !images.has(file.slice(0, -4))) await rm(path.join(OUT_SVG, file));
}
const credits = [...images.values()]
  .sort((a, b) => a.taxon.localeCompare(b.taxon))
  .map((h) => `- **${h.taxon}** (${h.license}) ${h.credit ? `by ${h.credit}` : 'no credit required'} — ${h.pageUrl}`);
await writeFile(
  path.join(OUT_SVG, 'CREDITS.md'),
  `# Silhouette credits\n\nSilhouettes come from [PhyloPic](https://www.phylopic.org) under the licences listed. Only CC0, public-domain and CC BY images are used.\n\n${credits.join('\n')}\n`,
);

// --- dataset -----------------------------------------------------------------------
await mkdir(path.dirname(OUT_JSON), { recursive: true });
const generatedAt = new Date().toISOString().slice(0, 10);
await writeFile(OUT_JSON, JSON.stringify({ generatedAt, animals }, null, 1) + '\n');

// --- base map: state borders, cities, lakes and rivers (Natural Earth) ------------------
const basemap = await buildBasemap();

// --- range layers: one file per animal, loaded when it is selected -----------------
await mkdir(OUT_RANGES, { recursive: true });
for (const b of built) {
  const data: RangeData = { layers: b.layers };
  await writeFile(path.join(OUT_RANGES, `${b.animal.id}.json`), JSON.stringify(data));
}
const keep = new Set(built.map((b) => `${b.animal.id}.json`));
for (const file of await readdir(OUT_RANGES)) if (!keep.has(file)) await rm(path.join(OUT_RANGES, file));

// --- exposure: how big each living animal's range is and where it lies (for the what-if simulator) ---
const exposed = await writeExposure(
  built.filter((b) => b.animal.extinctYear === undefined).map((b) => ({ id: b.animal.id, layer: b.layers[b.layers.length - 1] })),
);

// --- report ------------------------------------------------------------------------
const TITLES: Record<FlagKind, string> = {
  'no-gbif-match': 'No GBIF match',
  'status-differs': 'IUCN status differs from the curated one (IUCN was applied)',
  'status-conflict': 'Status and extinction year disagree',
  'extinction-date': 'Curated extinction date vs Paleobiology Database bounds',
  'gbif-unconfirmed': 'Listed countries with no GBIF records (kept, but unconfirmed)',
  'gbif-candidates': 'GBIF records outside the curated range (not applied)',
  'pbdb-extended': 'Ice Age ranges extended by fossil finds (applied)',
  'range-coarse': 'Periods not drawn from their own records (too few sightings or fossil finds)',
  'silhouette-relative': 'Silhouette shows a relative, not the species',
  'no-silhouette': 'No silhouette available',
  'no-article': 'No Wikipedia article found',
};
const byKind = (kind: FlagKind): Flag[] => flags.filter((f) => f.kind === kind);
const layerCount = (basis: string) => built.flatMap((b) => b.layers).filter((l) => l.basis === basis).length;
const rankCount = (rank: string) => animals.filter((a) => a.silhouette?.rank === rank).length;

const report = [
  `# Data pipeline report`,
  ``,
  `Generated ${generatedAt} from ${animals.length} curated entries. Re-run with \`npm run data\`.`,
  ``,
  `## Coverage`,
  ``,
  `| | Count |`,
  `|---|---|`,
  `| Animals | ${animals.length} |`,
  `| Matched in GBIF | ${animals.length - byKind('no-gbif-match').length} |`,
  `| Silhouette of the species itself | ${rankCount('species')} |`,
  `| Silhouette of the genus / family | ${rankCount('genus')} / ${rankCount('family')} |`,
  `| No silhouette | ${animals.filter((a) => !a.silhouette).length} |`,
  `| Wikipedia article linked | ${animals.filter((a) => a.sources?.some((s) => s.label === 'Wikipedia')).length} |`,
  `| Paleobiology Database entry linked | ${animals.filter((a) => a.sources?.some((s) => s.label === 'Paleobiology Database')).length} |`,
  `| Range periods drawn from their own sightings or fossils | ${layerCount('records')} |`,
  `| Range periods drawn from all records inside their countries | ${layerCount('all-time')} |`,
  `| Range periods drawn from a hand-drawn area (\`data/curated/areas.ts\`) | ${layerCount('area')} |`,
  `| Range periods known only as whole countries | ${layerCount('countries')} |`,
  ``,
  ...(Object.keys(TITLES) as FlagKind[]).flatMap((kind) => {
    const items = byKind(kind);
    if (!items.length) return [];
    return [`## ${TITLES[kind]} (${items.length})`, ``, ...items.map((f) => `- **${f.id}**: ${f.detail}`), ``];
  }),
].join('\n');
await mkdir(path.dirname(OUT_REPORT), { recursive: true });
await writeFile(OUT_REPORT, report);

console.log(`Wrote ${animals.length} animals, ${images.size} silhouettes, ${flags.length} review notes.`);
console.log(`Base map: ${basemap.admin1} regions, ${basemap.places} places, ${basemap.lakes} lakes, ${basemap.rivers} rivers.`);
console.log(`Exposure: range area and latitudes for ${exposed} living animals.`);
console.log(`  ${path.relative('.', OUT_JSON)}\n  ${path.relative('.', OUT_REPORT)}`);
