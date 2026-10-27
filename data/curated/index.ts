import { extinctBirds, livingBirds } from './birds';
import { extinctMammals, livingMammals } from './mammals';
import { AREAS } from './areas';
import type { Seed } from './helpers';
import { extinctOthers, livingOthers } from './other';

const entries: Seed[] = [
  ...livingMammals,
  ...extinctMammals,
  ...livingBirds,
  ...extinctBirds,
  ...livingOthers,
  ...extinctOthers,
];

/** The editorial layer: every species the atlas covers, with the facts no open API provides. */
export const seeds: Seed[] = entries.map((seed) => {
  const areas = AREAS[seed.id];
  return areas ? { ...seed, range: seed.range.map((stage) => ({ ...stage, areas: areas[stage.from] })) } : seed;
});

// A typo in areas.ts would silently do nothing, so fail loudly.
for (const [id, byYear] of Object.entries(AREAS)) {
  const seed = entries.find((s) => s.id === id);
  if (!seed) throw new Error(`areas.ts: unknown animal "${id}"`);
  for (const year of Object.keys(byYear)) {
    if (!seed.range.some((stage) => stage.from === Number(year))) throw new Error(`areas.ts: ${id} has no range stage starting ${year}`);
  }
}
