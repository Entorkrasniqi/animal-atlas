import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import { quantize } from 'topojson-client';
import { presimplify, simplify } from 'topojson-simplify';
import { topology } from 'topojson-server';
import type { Topology } from 'topojson-specification';
import { alpha3 } from './countries';
import { get } from './http';

/**
 * The reference layer under the animals: state and province borders, cities, lakes and rivers.
 *
 * All of it is Natural Earth (naturalearthdata.com), which is in the public domain. The 10m files are
 * far too big to ship as they are, so this thins the lines, rounds the coordinates and keeps only the
 * fields the map reads. Written to src/data/generated/basemap/, one lazy chunk per file.
 */
const SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const OUT = path.resolve('src/data/generated/basemap');

/** Coordinates are rounded to this grid (1e5 steps across the world: about 400 m). */
const QUANTIZE = 1e5;
/**
 * Points whose removal changes a line by less than this (a triangle area in square degrees) go: a
 * kink about 0.02° (2 km) across. Natural Earth's 10m lines are only that accurate to begin with, and
 * at the deepest zoom it moves a border by a few pixels.
 */
const MIN_WEIGHT = 5e-4;
/** Lakes and rivers Natural Earth wants shown only deeper than this are left out. */
const MAX_WATER_ZOOM = 7;

type Props = Record<string, unknown>;

async function fetchCollection<G extends Geometry>(file: string): Promise<FeatureCollection<G, Props>> {
  const res = await get(`${SOURCE}/${file}.geojson`);
  if (res.status !== 200) throw new Error(`HTTP ${res.status} for ${file}`);
  return JSON.parse(res.body) as FeatureCollection<G, Props>;
}

/** Natural Earth's own country code is not always ISO (South Sudan is SDS); the 2-letter one is. */
function iso3(props: Props): string {
  const a2 = String(props.iso_a2 ?? '');
  return (a2.length === 2 && a2 !== '-9' ? alpha3(a2) : null) ?? String(props.adm0_a3 ?? '');
}

/**
 * GeoJSON (RFC 7946) winds a polygon's outer ring counter-clockwise; d3 wants it clockwise, and draws
 * the whole world minus the polygon otherwise. Flip any polygon that comes the GeoJSON way round.
 */
function windForD3(geometry: Geometry): void {
  const flip = (rings: number[][][]) => {
    let area = 0;
    const outer = rings[0];
    for (let i = 1; i < outer.length; i++) area += outer[i - 1][0] * outer[i][1] - outer[i][0] * outer[i - 1][1];
    if (area > 0) for (const ring of rings) ring.reverse();
  };
  if (geometry.type === 'Polygon') flip(geometry.coordinates);
  else if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(flip);
}

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

/** Thin the lines of a topology, then round its coordinates. Simplifying must come first: it needs real degrees. */
function thin(objects: Parameters<typeof topology>[0]): Topology {
  // The simplify typings insist on non-null properties, which GeoJSON's can be; the data is fine.
  const thinned = simplify(presimplify(topology(objects) as never), MIN_WEIGHT) as unknown as Topology;
  return quantize(thinned as never, QUANTIZE) as unknown as Topology;
}

/** What the app's `Basemap` reads; see src/lib/basemap.ts. */
export interface BasemapReport {
  admin1: number;
  places: number;
  lakes: number;
  rivers: number;
  bytes: Record<string, number>;
}

export async function buildBasemap(): Promise<BasemapReport> {
  await mkdir(OUT, { recursive: true });
  const bytes: Record<string, number> = {};
  const write = async (name: string, data: unknown) => {
    const text = JSON.stringify(data);
    await writeFile(path.join(OUT, name), text);
    bytes[name] = text.length;
  };

  // States and provinces: borders, plus a label point and the zoom Natural Earth suggests naming them at.
  const states = await fetchCollection('ne_10m_admin_1_states_provinces');
  for (const f of states.features) {
    const p = f.properties;
    f.properties = {
      n: String(p.name_en ?? p.name ?? ''),
      c: iso3(p),
      x: round(Number(p.longitude), 2),
      y: round(Number(p.latitude), 2),
      z: round(Number(p.min_label ?? 9), 1),
    };
  }
  for (const f of states.features) windForD3(f.geometry);
  await write('admin1.json', thin({ states }));

  // Cities: [lon, lat, name, population in thousands, zoom to show at, capital (0 no, 1 country, 2 region), country].
  const populated = await fetchCollection<Point>('ne_10m_populated_places_simple');
  const places = populated.features
    .map((f: Feature<Point, Props>) => {
      const p = f.properties;
      const capital = Number(p.adm0cap) === 1 ? 1 : /admin-1 capital/i.test(String(p.featurecla)) ? 2 : 0;
      return [
        round(f.geometry.coordinates[0], 2),
        round(f.geometry.coordinates[1], 2),
        String(p.name),
        Math.round(Number(p.pop_max) / 1000),
        round(Number(p.min_zoom), 1),
        capital,
        iso3(p),
      ];
    })
    .sort((a, b) => (b[3] as number) - (a[3] as number));
  await write('places.json', places);

  // Lakes and rivers, with the zoom Natural Earth suggests drawing each at.
  const lakes = await fetchCollection('ne_10m_lakes');
  const rivers = await fetchCollection('ne_10m_rivers_lake_centerlines');
  for (const f of lakes.features) windForD3(f.geometry);
  for (const f of [...lakes.features, ...rivers.features]) {
    const p = f.properties;
    f.properties = { n: String(p.name_en ?? p.name ?? ''), z: round(Number(p.min_zoom ?? 5), 1) };
  }
  // The smallest ponds and streams only appear at zooms this map never reaches.
  lakes.features = lakes.features.filter((f) => Number(f.properties.z) <= MAX_WATER_ZOOM);
  rivers.features = rivers.features.filter((f) => Number(f.properties.z) <= MAX_WATER_ZOOM);
  await write('water.json', thin({ lakes, rivers }));

  return { admin1: states.features.length, places: places.length, lakes: lakes.features.length, rivers: rivers.features.length, bytes };
}
