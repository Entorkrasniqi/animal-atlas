import type { RangeData } from '../lib/types';

/** One file per animal, written by `npm run data`; each becomes its own lazy chunk. */
const files = import.meta.glob<RangeData>('./generated/ranges/*.json', { import: 'default' });

const cache = new Map<string, Promise<RangeData | null>>();

/** Where an animal lives, by range stage. Null if the file is missing or fails to load. */
export function loadRange(id: string): Promise<RangeData | null> {
  const load = files[`./generated/ranges/${id}.json`];
  if (!load) return Promise.resolve(null);
  let pending = cache.get(id);
  if (!pending) {
    pending = load().catch(() => null);
    cache.set(id, pending);
  }
  return pending;
}
