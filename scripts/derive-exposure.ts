// Rebuilds src/data/generated/exposure.json from the range layers already on disk (no network).
// `npm run data` does this too; run this alone after changing how exposure is worked out.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Animal, RangeData } from '../src/lib/types';
import { writeExposure } from './pipeline/exposure';

const { animals } = JSON.parse(readFileSync(path.resolve('src/data/generated/animals.json'), 'utf8')) as { animals: Animal[] };

const entries = animals
  .filter((a) => a.extinctYear === undefined)
  .map((a) => {
    const { layers } = JSON.parse(readFileSync(path.resolve('src/data/generated/ranges', `${a.id}.json`), 'utf8')) as RangeData;
    return { id: a.id, layer: layers[layers.length - 1] };
  });

const n = await writeExposure(entries);
console.log(`Wrote exposure for ${n} of ${entries.length} living animals.`);
