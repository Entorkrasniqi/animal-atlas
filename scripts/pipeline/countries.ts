import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const iso = require('i18n-iso-countries') as {
  registerLocale(locale: unknown): void;
  alpha2ToAlpha3(code: string): string | undefined;
  alpha3ToNumeric(code: string): string | undefined;
};
iso.registerLocale(require('i18n-iso-countries/langs/en.json'));

const atlas = require('world-atlas/countries-50m.json') as { objects: { countries: { geometries: { id?: string }[] } } };
const atlasIds = new Set(atlas.objects.countries.geometries.map((g) => g.id).filter(Boolean) as string[]);

/** ISO alpha-2 (as GBIF and PBDB report) to alpha-3 (as the app uses), or null if unknown. */
export function alpha3(alpha2: string): string | null {
  return iso.alpha2ToAlpha3(alpha2.toUpperCase()) ?? null;
}

/** Whether the map has a shape for this alpha-3 country. */
export function onMap(code: string): boolean {
  const numeric = iso.alpha3ToNumeric(code);
  return !!numeric && atlasIds.has(numeric.padStart(3, '0'));
}
