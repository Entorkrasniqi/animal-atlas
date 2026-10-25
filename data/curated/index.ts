import { extinctBirds, livingBirds } from './birds';
import { extinctMammals, livingMammals } from './mammals';
import type { Seed } from './helpers';
import { extinctOthers, livingOthers } from './other';

/** The editorial layer: every species the atlas covers, with the facts no open API provides. */
export const seeds: Seed[] = [
  ...livingMammals,
  ...extinctMammals,
  ...livingBirds,
  ...extinctBirds,
  ...livingOthers,
  ...extinctOthers,
];
