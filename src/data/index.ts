import type { Animal } from '../lib/types';
import raw from './generated/animals.json';

/** Written by `npm run data` from the curated entries plus GBIF, PBDB and PhyloPic. */
export const animals: Animal[] = [...(raw.animals as unknown as Animal[])].sort((a, b) => a.name.localeCompare(b.name));

export const animalById = new Map(animals.map((a) => [a.id, a]));

/** When the pipeline last ran (YYYY-MM-DD). */
export const dataDate: string = raw.generatedAt;
