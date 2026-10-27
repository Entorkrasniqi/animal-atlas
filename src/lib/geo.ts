import { geoArea, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects, GeoProjection } from 'd3-geo';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

countries.registerLocale(en);

/** Atlas geometry id (zero-padded ISO numeric) -> ISO alpha-3. */
const numericToAlpha3 = new Map<string, string>();
for (const [numeric, alpha2] of Object.entries(countries.getNumericCodes())) {
  const alpha3 = countries.alpha2ToAlpha3(alpha2);
  if (alpha3) numericToAlpha3.set(numeric.padStart(3, '0'), alpha3);
}

/** ISO names are often formal; these read better on a map. */
const FRIENDLY: Record<string, string> = {
  CHN: 'China',
  CIV: 'Côte d’Ivoire',
  COD: 'DR Congo',
  CZE: 'Czechia',
  FLK: 'Falkland Islands',
  GMB: 'Gambia',
  IRN: 'Iran',
  LAO: 'Laos',
  MDA: 'Moldova',
  MKD: 'North Macedonia',
  RUS: 'Russia',
  SYR: 'Syria',
  TWN: 'Taiwan',
  TZA: 'Tanzania',
  USA: 'United States',
};

export function countryName(code: string, fallback = code): string {
  return FRIENDLY[code] ?? countries.getName(code, 'en') ?? fallback;
}

export interface Shape {
  /** ISO alpha-3, or null for disputed areas the atlas has no code for. */
  code: string | null;
  name: string;
  path: Path2D;
  /** Projected bounds at zoom 1: [x0, y0, x1, y1]. */
  bounds: [number, number, number, number];
  centroid: [number, number];
  /** Projected area in px² at zoom 1. */
  area: number;
  /** Where to write the name: the middle of the country's biggest piece (not of far-off islands). */
  anchor: [number, number];
  /** Width and height of that piece at zoom 1. */
  mainSize: [number, number];
}

export interface World {
  width: number;
  height: number;
  projection: GeoProjection;
  shapes: Shape[];
  sphere: Path2D;
  graticule: Path2D;
  /** Every country outline in one path, for drawing the borders in a single stroke. */
  borders: Path2D;
  byCode: Map<string, Shape>;
}

/** One path covering all the shapes of the given countries (mainland and far-flung territories alike). */
export function unionPath(world: World, codes: Iterable<string>): Path2D {
  const wanted = new Set(codes);
  const path = new Path2D();
  for (const s of world.shapes) if (s.code && wanted.has(s.code)) path.addPath(s.path);
  return path;
}

let topologyPromise: Promise<FeatureCollection<Geometry, { name: string }>> | null = null;

/** Loads the 50m country outlines once; the JSON is a separate lazy chunk. */
export function loadCountries(): Promise<FeatureCollection<Geometry, { name: string }>> {
  topologyPromise ??= import('world-atlas/countries-50m.json').then((mod) => {
    const topo = (mod.default ?? mod) as unknown as Topology;
    return feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
  });
  return topologyPromise;
}

let detailPromise: Promise<FeatureCollection<Geometry, { name: string }>> | null = null;

/** The 10m outlines: 5x the detail and about 3.6 MB, so they load only when someone zooms in. */
export function loadCountriesDetail(): Promise<FeatureCollection<Geometry, { name: string }>> {
  detailPromise ??= import('world-atlas/countries-10m.json').then((mod) => {
    const topo = (mod.default ?? mod) as unknown as Topology;
    return feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
  });
  return detailPromise;
}

/**
 * The finer outlines on the same projection as `base`, so the two line up and can be swapped by zoom.
 * Turning 700 thousand points into paths takes about a second, so this works in short slices and lets
 * the page breathe in between.
 */
export async function buildDetailWorld(
  collection: FeatureCollection<Geometry, { name: string }>,
  base: World,
  isCurrent: () => boolean,
): Promise<World | null> {
  const toPath = geoPath(base.projection);
  const shapes: Shape[] = [];
  const byCode = new Map<string, Shape>();
  const borders = new Path2D();
  let sliceStart = performance.now();

  for (const f of collection.features as Feature<Geometry, { name: string }>[]) {
    const d = toPath(f as GeoPermissibleObjects);
    if (!d) continue;
    const [[x0, y0], [x1, y1]] = toPath.bounds(f as GeoPermissibleObjects);
    const code = numericToAlpha3.get(String(f.id ?? '').padStart(3, '0')) ?? null;
    const like = code ? base.byCode.get(code) : undefined;
    const shape: Shape = {
      code,
      name: like?.name ?? f.properties.name,
      path: new Path2D(d),
      bounds: [x0, y0, x1, y1],
      centroid: like?.centroid ?? [(x0 + x1) / 2, (y0 + y1) / 2],
      area: toPath.area(f as GeoPermissibleObjects),
      anchor: like?.anchor ?? [(x0 + x1) / 2, (y0 + y1) / 2],
      mainSize: like?.mainSize ?? [x1 - x0, y1 - y0],
    };
    shapes.push(shape);
    borders.addPath(shape.path);
    if (code && shape.area > (byCode.get(code)?.area ?? -1)) byCode.set(code, shape);

    if (performance.now() - sliceStart > 12) {
      await new Promise((resolve) => setTimeout(resolve));
      if (!isCurrent()) return null;
      sliceStart = performance.now();
    }
  }
  return { ...base, shapes, byCode, borders };
}

export function buildWorld(
  collection: FeatureCollection<Geometry, { name: string }>,
  width: number,
  height: number,
): World {
  const projection = geoNaturalEarth1().fitExtent(
    [
      [6, 6],
      [width - 6, height - 6],
    ],
    { type: 'Sphere' },
  );
  const toPath = geoPath(projection);
  const shapes: Shape[] = [];
  const byCode = new Map<string, Shape>();
  const borders = new Path2D();

  for (const f of collection.features as Feature<Geometry, { name: string }>[]) {
    const d = toPath(f as GeoPermissibleObjects);
    if (!d) continue;
    const [[x0, y0], [x1, y1]] = toPath.bounds(f as GeoPermissibleObjects);
    const code = numericToAlpha3.get(String(f.id ?? '').padStart(3, '0')) ?? null;
    const main = biggestPiece(f.geometry);
    const [[mx0, my0], [mx1, my1]] = toPath.bounds(main);
    const shape: Shape = {
      code,
      name: code ? countryName(code, f.properties.name) : f.properties.name,
      path: new Path2D(d),
      bounds: [x0, y0, x1, y1],
      centroid: toPath.centroid(f as GeoPermissibleObjects),
      area: toPath.area(f as GeoPermissibleObjects),
      anchor: toPath.centroid(main),
      mainSize: [mx1 - mx0, my1 - my0],
    };
    shapes.push(shape);
    borders.addPath(shape.path);
    // Several features can share a code (mainland + far-flung territories): keep the largest.
    if (code && shape.area > (byCode.get(code)?.area ?? -1)) byCode.set(code, shape);
  }

  return {
    width,
    height,
    projection,
    shapes,
    byCode,
    borders,
    sphere: new Path2D(toPath({ type: 'Sphere' }) ?? ''),
    graticule: new Path2D(toPath(graticule()) ?? ''),
  };
}

/** The largest polygon of a country, by spherical area. */
function biggestPiece(geometry: Geometry): GeoPermissibleObjects {
  if (geometry.type !== 'MultiPolygon') return geometry as GeoPermissibleObjects;
  let best: GeoPermissibleObjects = geometry;
  let bestArea = -1;
  for (const coordinates of geometry.coordinates) {
    const polygon: GeoPermissibleObjects = { type: 'Polygon', coordinates };
    const a = geoArea(polygon);
    if (a > bestArea) [best, bestArea] = [polygon, a];
  }
  return best;
}

function graticule(): GeoPermissibleObjects {
  const lines: [number, number][][] = [];
  for (let lon = -150; lon <= 180; lon += 30) {
    lines.push(Array.from({ length: 37 }, (_, i) => [lon, -90 + i * 5] as [number, number]));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    lines.push(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat] as [number, number]));
  }
  return { type: 'MultiLineString', coordinates: lines };
}
