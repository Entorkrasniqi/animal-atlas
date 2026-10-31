import { ICE_BOUND, PRESSURES, type Pressure } from '../../data/curated/pressures';
import type { Animal, Exposure } from '../lib/types';
import raw from './generated/animals.json';
import exposureRaw from './generated/exposure.json';

/** Written by `npm run data` from the curated entries plus GBIF, PBDB and PhyloPic. */
export const animals: Animal[] = [...(raw.animals as unknown as Animal[])].sort((a, b) => a.name.localeCompare(b.name));

export const animalById = new Map(animals.map((a) => [a.id, a]));

/** When the pipeline last ran (YYYY-MM-DD). */
export const dataDate: string = raw.generatedAt;

/** Range area and latitudes of each living animal, for the what-if simulator (written by `npm run data`). */
export const exposureById = new Map(Object.entries(exposureRaw as unknown as Record<string, Exposure>));

/** How strongly each pressure threatens each living animal (curated in data/curated/pressures.ts). */
export const pressureById = new Map<string, Pressure>(Object.entries(PRESSURES));

/** Animals that depend on sea ice. */
export const iceBound = ICE_BOUND;
