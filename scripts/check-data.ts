// Sanity checks for the animal dataset. Run with `npm run check:data`.
import { createRequire } from 'node:module';
import { animals } from '../src/data/index';
import { MIN_YEAR } from '../src/lib/time';

const require = createRequire(import.meta.url);
const iso = require('i18n-iso-countries');
iso.registerLocale(require('i18n-iso-countries/langs/en.json'));
const atlas = require('world-atlas/countries-50m.json');

const atlasIds = new Set<string>(
  atlas.objects.countries.geometries.map((g: { id?: string }) => g.id).filter(Boolean),
);

const errors: string[] = [];
const err = (id: string, msg: string) => errors.push(`${id}: ${msg}`);

const ids = new Set<string>();
const used = new Set<string>();

for (const a of animals) {
  if (ids.has(a.id)) err(a.id, 'duplicate id');
  ids.add(a.id);

  if ((a.extinctYear !== undefined) !== (a.status === 'EX')) err(a.id, 'extinctYear and status EX disagree');
  if (a.range[0].from !== MIN_YEAR) err(a.id, `first range stage must start at ${MIN_YEAR}`);

  a.range.forEach((stage, i) => {
    if (i > 0 && stage.from <= a.range[i - 1].from) err(a.id, `range stages not ascending at ${stage.from}`);
    if (a.extinctYear !== undefined && stage.from >= a.extinctYear) err(a.id, `range stage ${stage.from} after extinction`);
    if (new Set(stage.countries).size !== stage.countries.length) err(a.id, `duplicate country in stage ${stage.from}`);
    if (stage.countries.length === 0) err(a.id, `empty stage ${stage.from}`);
    for (const code of stage.countries) {
      used.add(code);
      const num = iso.alpha3ToNumeric(code);
      if (!num) err(a.id, `unknown alpha-3 code ${code}`);
      else if (!atlasIds.has(String(num).padStart(3, '0'))) err(a.id, `${code} (${num}) not in world-atlas 50m`);
    }
  });

  a.population?.forEach(([y, v], i) => {
    if (i > 0 && y <= (a.population as [number, number][])[i - 1][0]) err(a.id, `population years not ascending at ${y}`);
    if (v < 1) err(a.id, `population value < 1 at ${y}`);
    if (a.extinctYear !== undefined && y > a.extinctYear) err(a.id, `population point ${y} after extinction`);
  });
}

const extinct = animals.filter((a) => a.extinctYear !== undefined).length;
console.log(`${animals.length} animals (${animals.length - extinct} living, ${extinct} extinct), ${used.size} countries used`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log('data OK');
