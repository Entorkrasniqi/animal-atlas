// Sanity checks for the dataset the app ships. Run with `npm run check:data`.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { seeds } from '../data/curated';
import { ICE_BOUND, PRESSURES } from '../data/curated/pressures';
import { MIN_YEAR } from '../src/lib/time';
import { GRID_H, GRID_W } from '../src/lib/grid';
import type { Animal, Exposure, RangeData } from '../src/lib/types';
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

// --- where in the countries: one layer per range stage -----------------------------------
const BASES = new Set(['records', 'all-time', 'area', 'countries']);
const rangesDir = path.resolve('src/data/generated/ranges');
let drawn = 0;
for (const a of animals) {
  const file = path.join(rangesDir, `${a.id}.json`);
  if (!existsSync(file)) {
    err(a.id, 'range layers missing (run `npm run data`)');
    continue;
  }
  const { layers } = JSON.parse(readFileSync(file, 'utf8')) as RangeData;
  if (layers.length !== a.range.length) err(a.id, `${layers.length} range layers for ${a.range.length} stages`);
  layers.forEach((layer, i) => {
    const at = `range layer ${i}`;
    if (!BASES.has(layer.basis)) err(a.id, `${at}: unknown basis "${layer.basis}"`);
    if (layer.cells.length % 2 !== 0) err(a.id, `${at}: cells is not [cell, count] pairs`);
    if (layer.basis === 'countries' ? layer.cells.length > 0 : layer.cells.length === 0) err(a.id, `${at}: ${layer.basis} layer has ${layer.cells.length / 2} cells`);
    if ((layer.basis === 'records' || layer.basis === 'all-time') && layer.records < 1) err(a.id, `${at}: ${layer.basis} layer with no records`);
    for (let k = 0; k < layer.cells.length; k += 2) {
      const cell = layer.cells[k];
      if (!Number.isInteger(cell) || cell < 0 || cell >= GRID_W * GRID_H) err(a.id, `${at}: cell ${cell} is off the grid`);
      else if (k > 0 && cell <= layer.cells[k - 2]) err(a.id, `${at}: cells not ascending at ${cell}`);
      if (!(layer.cells[k + 1] > 0)) err(a.id, `${at}: cell ${cell} has no count`);
    }
    if (layer.basis === 'records') drawn++;
  });
}
if (existsSync(rangesDir)) {
  for (const file of readdirSync(rangesDir)) {
    if (!generatedIds.has(file.replace(/\.json$/, ''))) err(file, 'range file for an animal that is not in the dataset (stale; run `npm run data`)');
  }
}

// --- what-if simulator: threat levels (curated) and range geometry (generated) -------------------
const living = animals.filter((a) => a.extinctYear === undefined);
const livingIds = new Set(living.map((a) => a.id));
const DRIVER_IDS = ['warming', 'habitat', 'hunting', 'invasive', 'pollution', 'disease'];
for (const a of living) {
  const p = PRESSURES[a.id];
  if (!p) {
    err(a.id, 'living animal with no threat levels in data/curated/pressures.ts');
    continue;
  }
  for (const key of DRIVER_IDS) {
    const v = (p as Record<string, unknown>)[key];
    if (v !== 0 && v !== 1 && v !== 2 && v !== 3) err(a.id, `pressures.ts: ${key} must be 0, 1, 2 or 3`);
  }
  if (DRIVER_IDS.every((key) => (p as Record<string, number>)[key] === 0)) err(a.id, 'pressures.ts: every level is 0, so nothing could ever hurt it');
}
for (const id of Object.keys(PRESSURES)) if (!livingIds.has(id)) err(id, 'pressures.ts: not a living animal in the dataset');
for (const id of ICE_BOUND) if (!livingIds.has(id)) err(id, 'pressures.ts: ICE_BOUND names an animal that is not living');

const exposureFile = path.resolve('src/data/generated/exposure.json');
if (!existsSync(exposureFile)) {
  err('exposure.json', 'missing (run `npm run data` or `npm run data:exposure`)');
} else {
  const exposure = JSON.parse(readFileSync(exposureFile, 'utf8')) as Record<string, Exposure>;
  for (const a of living) {
    const e = exposure[a.id];
    if (!e) {
      err(a.id, 'no exposure entry (run `npm run data:exposure`)');
      continue;
    }
    if (!(e.area > 0)) err(a.id, 'exposure: area must be positive');
    if (e.bands.length !== 18) err(a.id, `exposure: ${e.bands.length} latitude bands, expected 18`);
    const total = e.bands.reduce((sum, b) => sum + b, 0);
    if (Math.abs(total - 1) > 0.02) err(a.id, `exposure: latitude bands add up to ${total.toFixed(3)}, expected 1`);
  }
  for (const id of Object.keys(exposure)) if (!livingIds.has(id)) err(id, 'exposure.json: not a living animal in the dataset (stale)');
}

// --- base map: states, cities, lakes, rivers -----------------------------------------------
const basemapDir = path.resolve('src/data/generated/basemap');
for (const name of ['admin1', 'water', 'places']) {
  if (!existsSync(path.join(basemapDir, `${name}.json`))) err(`basemap/${name}.json`, 'missing (run `npm run data`)');
}
if (existsSync(path.join(basemapDir, 'places.json'))) {
  const places = JSON.parse(readFileSync(path.join(basemapDir, 'places.json'), 'utf8')) as [number, number, string, number, number, number, string][];
  if (places.length < 5000) err('basemap/places.json', `only ${places.length} places`);
  for (const [lon, lat, name, , , capital, code] of places) {
    if (!(Math.abs(lon) <= 180 && Math.abs(lat) <= 90)) err('basemap/places.json', `${name} is off the globe`);
    if (capital !== 0 && capital !== 1 && capital !== 2) err('basemap/places.json', `${name} has capital flag ${capital}`);
    if (!code) err('basemap/places.json', `${name} has no country`);
  }
}
for (const name of ['admin1', 'water']) {
  const file = path.join(basemapDir, `${name}.json`);
  if (!existsSync(file)) continue;
  const topo = JSON.parse(readFileSync(file, 'utf8')) as { type: string; transform?: unknown; arcs: unknown[]; objects: Record<string, { geometries: unknown[] }> };
  if (topo.type !== 'Topology' || !topo.transform) err(`basemap/${name}.json`, 'not a quantized topology');
  for (const [key, object] of Object.entries(topo.objects)) {
    if (object.geometries.length === 0) err(`basemap/${name}.json`, `object "${key}" is empty`);
  }
}

const extinct = animals.filter((a) => a.extinctYear !== undefined).length;
const withSilhouette = animals.filter((a) => a.silhouette).length;
console.log(
  `${animals.length} animals (${animals.length - extinct} living, ${extinct} extinct), ${used.size} countries, ` +
    `${withSilhouette} silhouettes, ${drawn} periods drawn from sightings, ${Object.keys(PRESSURES).length} what-if threat profiles, generated ${generatedAt}`,
);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log('data OK');
