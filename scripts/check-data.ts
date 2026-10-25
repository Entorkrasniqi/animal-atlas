// Sanity checks for the dataset the app ships. Run with `npm run check:data`.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { seeds } from '../data/curated';
import { MIN_YEAR } from '../src/lib/time';
import type { Animal } from '../src/lib/types';
import { onMap } from './pipeline/countries';

const file = path.resolve('src/data/generated/animals.json');
if (!existsSync(file)) {
  console.error('src/data/generated/animals.json is missing. Run `npm run data` first.');
  process.exit(1);
}
const { generatedAt, animals } = JSON.parse(readFileSync(file, 'utf8')) as { generatedAt: string; animals: Animal[] };

const ALLOWED_LICENCES = new Set(['CC0', 'Public Domain', 'CC BY 3.0', 'CC BY 4.0']);
const errors: string[] = [];
const err = (id: string, msg: string) => errors.push(`${id}: ${msg}`);

// The generated file must cover exactly the curated entries.
const curatedIds = new Set(seeds.map((s) => s.id));
const generatedIds = new Set(animals.map((a) => a.id));
for (const id of curatedIds) if (!generatedIds.has(id)) err(id, 'curated but missing from the generated dataset (run `npm run data`)');
for (const id of generatedIds) if (!curatedIds.has(id)) err(id, 'in the generated dataset but not curated (stale; run `npm run data`)');

const ids = new Set<string>();
const used = new Set<string>();

for (const a of animals) {
  if (ids.has(a.id)) err(a.id, 'duplicate id');
  ids.add(a.id);

  // IUCN files species it suspects are extinct (baiji) as Critically Endangered, so CR is allowed too.
  const possiblyExtinct = a.extinctYear !== undefined && a.status === 'CR';
  if (!possiblyExtinct && (a.extinctYear !== undefined) !== (a.status === 'EX')) err(a.id, 'extinctYear and status EX disagree');
  if (a.range[0].from !== MIN_YEAR) err(a.id, `first range stage must start at ${MIN_YEAR}`);

  a.range.forEach((stage, i) => {
    if (i > 0 && stage.from <= a.range[i - 1].from) err(a.id, `range stages not ascending at ${stage.from}`);
    if (a.extinctYear !== undefined && stage.from >= a.extinctYear) err(a.id, `range stage ${stage.from} after extinction`);
    if (new Set(stage.countries).size !== stage.countries.length) err(a.id, `duplicate country in stage ${stage.from}`);
    if (stage.countries.length === 0) err(a.id, `empty stage ${stage.from}`);
    for (const code of stage.countries) {
      used.add(code);
      if (!onMap(code)) err(a.id, `${code} is not a country on the map`);
    }
  });

  a.population?.forEach(([y, v], i) => {
    if (i > 0 && y <= (a.population as [number, number][])[i - 1][0]) err(a.id, `population years not ascending at ${y}`);
    if (v < 1) err(a.id, `population value < 1 at ${y}`);
    if (a.extinctYear !== undefined && y > a.extinctYear) err(a.id, `population point ${y} after extinction`);
  });

  if (a.statusSource !== 'iucn' && a.statusSource !== 'curated') err(a.id, 'statusSource missing');

  for (const link of a.sources ?? []) {
    if (!/^https:\/\//.test(link.url)) err(a.id, `source "${link.label}" is not an https URL`);
  }

  const sil = a.silhouette;
  if (sil) {
    if (!existsSync(path.resolve('public', sil.file.replace(/^\//, '')))) err(a.id, `silhouette file ${sil.file} is missing`);
    if (!ALLOWED_LICENCES.has(sil.license)) err(a.id, `silhouette licence "${sil.license}" is not allowed`);
    if (sil.license.startsWith('CC BY') && !sil.credit) err(a.id, 'CC BY silhouette without a credit line');
    if (!/^https:\/\/www\.phylopic\.org\/images\//.test(sil.pageUrl)) err(a.id, 'silhouette page URL looks wrong');
  }
}

const extinct = animals.filter((a) => a.extinctYear !== undefined).length;
const withSilhouette = animals.filter((a) => a.silhouette).length;
console.log(
  `${animals.length} animals (${animals.length - extinct} living, ${extinct} extinct), ${used.size} countries, ` +
    `${withSilhouette} silhouettes, generated ${generatedAt}`,
);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log('data OK');
