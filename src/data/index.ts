import type { Animal } from '../lib/types';
import { extinctBirds, livingBirds } from './birds';
import { extinctMammals, livingMammals } from './mammals';
import { extinctOthers, livingOthers } from './other';

export const animals: Animal[] = [
  ...livingMammals,
  ...extinctMammals,
  ...livingBirds,
  ...extinctBirds,
  ...livingOthers,
  ...extinctOthers,
].sort((a, b) => a.name.localeCompare(b.name));

export const animalById = new Map(animals.map((a) => [a.id, a]));
