import { geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, GeometryObject, Topology } from 'topojson-specification';

/**
 * The reference layer under the animals: state and province borders, cities, lakes and rivers.
 * Natural Earth data, thinned by the pipeline (scripts/pipeline/basemap.ts) into three lazy files.
 */

/** [lon, lat, name, population in thousands, zoom to show at, capital (0 no, 1 country, 2 region), country]. */
type PlaceRow = [number, number, string, number, number, number, string];

interface Raw {
  admin1: Topology;
  water: Topology;
  places: PlaceRow[];
}

const files = import.meta.glob('../data/generated/basemap/*.json', { import: 'default' });

let loading: Promise<Raw> | null = null;

/** Fetches the three files once. They are a few MB between them, so this waits until the map is up. */
export function loadBasemap(): Promise<Raw> {
  loading ??= Promise.all(
    ['admin1', 'water', 'places'].map((name) => {
      const load = files[`../data/generated/basemap/${name}.json`];
      if (!load) throw new Error(`basemap/${name}.json is missing; run \`npm run data\``);
      return load();
    }),
  ).then(([admin1, water, places]) => ({ admin1, water, places }) as Raw);
  return loading;
}

/** A state, province or similar first-level division. */
export interface Region {
  name: string;
  /** ISO alpha-3 of its country. */
  code: string;
  /** Natural Earth's suggested zoom for naming it. */
  zoom: number;
  /** Where its name goes, on the unzoomed map plane. */
  x: number;
  y: number;
  /** Projected bounds, [x0, y0, x1, y1]. */
  bounds: [number, number, number, number];
  /** Longitude/latitude box [west, south, east, north], for finding the region under a point. */
  box: [number, number, number, number];
  /** Rings of each polygon, as longitude/latitude. */
  polygons: number[][][][];
}

export interface Place {
  name: string;
  code: string;
  /** Thousands of people. */
  pop: number;
  zoom: number;
  capital: 0 | 1 | 2;
  lon: number;
  lat: number;
  /** Position on the unzoomed map plane. */
  x: number;
  y: number;
}

/** Lines or shapes first wanted at about this zoom. */
export interface Tier {
  zoom: number;
  path: Path2D;
}

export interface Basemap {
  regions: Region[];
  /** Borders between the regions of one country, one path each so off-screen countries can be skipped. */
  borders: { code: string; path: Path2D; bounds: [number, number, number, number] }[];
  /** Largest first. */
  places: Place[];
  lakes: Tier[];
  rivers: Tier[];
}

/** Natural Earth zoom levels at which water is added; each tier is one path. */
const WATER_TIERS = [3, 4.5, 6, 7.1];

type RegionProps = { n: string; c: string; x: number; y: number; z: number };
type WaterProps = { n: string; z: number };

export function buildBasemap(raw: Raw, projection: GeoProjection): Basemap {
  const path = geoPath(projection);

  const states = raw.admin1.objects.states as GeometryCollection<RegionProps>;
  const collection = feature(raw.admin1, states) as FeatureCollection<Polygon | MultiPolygon, RegionProps>;
  const regions: Region[] = [];
  for (const f of collection.features) {
    if (!f.geometry) continue;
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    for (const polygon of polygons) {
      for (const [lon, lat] of polygon[0]) {
        west = Math.min(west, lon);
        east = Math.max(east, lon);
        south = Math.min(south, lat);
        north = Math.max(north, lat);
      }
    }
    const [[x0, y0], [x1, y1]] = path.bounds(f as Feature<Geometry>);
    const label = projection([f.properties.x, f.properties.y]) ?? [(x0 + x1) / 2, (y0 + y1) / 2];
    regions.push({
      name: f.properties.n,
      code: f.properties.c,
      zoom: f.properties.z,
      x: label[0],
      y: label[1],
      bounds: [x0, y0, x1, y1],
      box: [west, south, east, north],
      polygons,
    });
  }

  // Interior borders, country by country: `mesh` over a country's own regions keeps this linear in the
  // data, where one filtered mesh over everything would not be able to tell countries apart.
  const byCountry = new Map<string, GeometryObject<RegionProps>[]>();
  for (const g of states.geometries) {
    const code = (g.properties as RegionProps | undefined)?.c ?? '';
    const list = byCountry.get(code);
    if (list) list.push(g);
    else byCountry.set(code, [g]);
  }
  const borders: Basemap['borders'] = [];
  for (const [code, geometries] of byCountry) {
    if (geometries.length < 2) continue;
    const lines = mesh(raw.admin1, { type: 'GeometryCollection', geometries } as GeometryCollection, (a, b) => a !== b);
    if (lines.coordinates.length === 0) continue;
    const d = path(lines);
    if (!d) continue;
    const [[x0, y0], [x1, y1]] = path.bounds(lines);
    borders.push({ code, path: new Path2D(d), bounds: [x0, y0, x1, y1] });
  }

  const places: Place[] = [];
  for (const [lon, lat, name, pop, zoom, capital, code] of raw.places) {
    const p = projection([lon, lat]);
    if (p) places.push({ name, code, pop, zoom, capital: capital as 0 | 1 | 2, lon, lat, x: p[0], y: p[1] });
  }

  const tiers = (object: unknown): Tier[] => {
    const all = feature(raw.water, object as GeometryCollection) as unknown as FeatureCollection<Geometry, WaterProps>;
    return WATER_TIERS.map((limit, i) => {
      const lower = i === 0 ? -Infinity : WATER_TIERS[i - 1];
      const features = all.features.filter((f) => f.properties.z > lower && f.properties.z <= limit);
      const d = path({ type: 'FeatureCollection', features });
      return { zoom: limit, path: new Path2D(d ?? '') };
    });
  };

  return {
    regions,
    borders,
    places,
    lakes: tiers(raw.water.objects.lakes),
    rivers: tiers(raw.water.objects.rivers),
  };
}

function inRing(ring: number[][], lon: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The region holding a position, or null over open water or where the data has none. */
export function regionAt(bm: Basemap, lon: number, lat: number): Region | null {
  for (const r of bm.regions) {
    const [west, south, east, north] = r.box;
    if (lon < west || lon > east || lat < south || lat > north) continue;
    for (const polygon of r.polygons) {
      if (inRing(polygon[0], lon, lat) && !polygon.slice(1).some((hole) => inRing(hole, lon, lat))) return r;
    }
  }
  return null;
}

/** What is under the pointer, for the tooltip. */
export interface Hover {
  /** ISO alpha-3 of the country, if the pointer is over one. */
  code: string | null;
  country: string | null;
  /** The state or province, where the data has one. */
  region: string | null;
  /** A city dot the pointer is on. */
  place: Place | null;
  lon: number;
  lat: number;
}
