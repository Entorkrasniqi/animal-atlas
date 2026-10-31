import { MIN_YEAR } from '../lib/time';
import type { Animal } from '../lib/types';

/** A minimal animal for tests: only what a test cares about needs to be given. */
export function makeAnimal(over: Partial<Animal> & { id: string }): Animal {
  return {
    name: over.id,
    scientific: over.id,
    group: 'mammal',
    status: 'EN',
    about: '',
    threats: '',
    range: [{ from: MIN_YEAR, countries: ['AAA'] }],
    ...over,
  };
}
