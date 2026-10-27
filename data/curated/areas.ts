import type { Box } from './helpers';

/**
 * Hand-drawn areas for range stages that sightings and fossils cannot draw on their own: GBIF has
 * no usable coordinates for them (a few museum specimens, or a handful of records for the whole
 * species). Without an area such a stage would be shaded as whole countries.
 *
 * Keyed by animal id, then by the stage's `from` year (see the animal's `range`). Each box is
 * [west, south, east, north] in degrees, drawn loosely from published range descriptions.
 *
 * A stage with an area is confined to it: sightings outside the boxes are ignored, and when too
 * few remain inside, the boxes themselves are drawn, flat and labelled approximate (they say where
 * the animal lived, not how common it was). Land animals are still clipped to the stage's
 * countries, so a box over a coast stops at the shore.
 */
export const AREAS: Record<string, Record<number, Box[]>> = {
  'atlas-bear': {
    [-50000]: [
      [-9.5, 30.5, -1.5, 35.5], // Rif, Middle and High Atlas (Morocco)
      [-1.5, 34.5, 8.5, 36.8], // Tell Atlas and Aurès (Algeria)
      [8, 35.5, 10.5, 37.2], // northern Tunisia
    ],
  },
  aurochs: {
    1000: [
      [19, 50, 28, 55.5], // Polish, Lithuanian and Belarusian forests
      [22, 45, 30, 51.5], // Polesia, the Carpathian foothills and Moldavia
    ],
    1564: [[19.8, 51.6, 21.2, 52.6]], // Jaktorów forest, where the last cow died
  },
  baiji: {
    [-50000]: [
      [111, 28.8, 114, 31], // Dongting Lake to Jingzhou
      [114, 28.8, 117.5, 31.2], // Wuhan to Poyang Lake
      [117.5, 30.5, 122, 32.5], // lower Yangtze: Nanjing to the mouth
    ],
  },
  'bali-tiger': { [-50000]: [[114.4, -8.9, 115.8, -8]] }, // Bali
  bluebuck: { [-50000]: [[18.5, -35.2, 25, -33]] }, // south-western Cape
  'bramble-cay-melomys': { [-50000]: [[143.6, -9.5, 144.2, -8.9]] }, // Bramble Cay, Torres Strait
  'caspian-tiger': {
    [-50000]: [
      [38, 37.5, 44, 40.5], // eastern Turkey
      [43, 36.5, 56, 42.5], // Caucasus, Transcaucasia and the Hyrcanian forests
      [44, 30.5, 48.5, 34], // Mesopotamian marshes
      [58, 37, 69, 46], // Amu Darya, Syr Darya and the Aral lowlands
      [65, 35.5, 71, 38], // northern Afghanistan
      [73, 43, 80, 46.5], // Ili and Lake Balkhash
      [82, 38.5, 91, 42], // Tarim basin and Lop Nur
    ],
    1920: [
      [48, 36.5, 56, 38.5], // Iranian Caspian shore
      [60, 37, 68, 42.5], // Amu Darya tugai
      [68, 36.5, 71.5, 38.5], // Panj and Vakhsh rivers
      [73.5, 43.5, 79, 46.5], // Ili delta
    ],
    1960: [[52.5, 36.3, 57.5, 38.2]], // Golestan and Mazandaran
  },
  diprotodon: { [-50000]: [[136, -39, 153.5, -15]] }, // eastern and south-eastern Australia
  'irish-elk': { [-10000]: [[58, 52, 70, 60]] }, // last survivors east of the Urals
  'haasts-eagle': { [-50000]: [[166, -47.5, 174.5, -40.4]] }, // South Island
  'japanese-wolf': { [-50000]: [[129.5, 31, 142.5, 41.5]] }, // Kyushu, Shikoku and Honshu
  'javan-tiger': { [-50000]: [[105, -8.9, 114.7, -5.8]] }, // Java
  'northern-white-rhino': { 2009: [[36.8, -0.1, 37.1, 0.2]] }, // Ol Pejeta, Kenya
  'pyrenean-ibex': {
    [-50000]: [[-2, 41.8, 3.3, 43.2]], // the Pyrenees
    1900: [[-0.2, 42.5, 0.2, 42.8]], // Ordesa valley, where the last one lived
  },
  quagga: { [-50000]: [[18.5, -33.5, 29.5, -27.5]] }, // Karoo and the Free State grasslands
  'rodrigues-solitaire': { [-50000]: [[63.2, -19.85, 63.55, -19.65]] }, // Rodrigues
  'sea-mink': { [-50000]: [[-71, 42, -60, 47]] }, // Gulf of Maine and the Maritimes
  'stellers-sea-cow': { 1500: [[165.5, 54.3, 168.5, 55.4]] }, // Commander Islands
  'sumatran-rhino': {
    [-50000]: [
      [88, 24, 97, 28], // Himalayan foothills of north-east India and Bangladesh
      [92, 15, 101.5, 24], // Myanmar and Thailand
      [99, 1, 105, 10], // Malay Peninsula
      [95, -6, 106, 5.8], // Sumatra
      [109, 0.5, 119, 7], // Borneo
    ],
    1980: [
      [95, 2, 98.5, 5], // Gunung Leuser
      [102.5, -5.8, 106, -3.5], // Way Kambas and Bukit Barisan Selatan
      [116.5, 4, 118.8, 5.5], // Sabah
      [113.5, 0.4, 116.5, 2.5], // East Kalimantan
    ],
    2019: [
      [95.5, 3, 98, 4.8],
      [102.7, -5.2, 105.9, -3.6],
      [114.5, 0.4, 116.5, 1.8],
    ],
  },
  'western-black-rhino': {
    [-50000]: [[10, 5.5, 24, 12.5]], // savannas from north Cameroon to the Central African Republic
    1980: [[12.5, 8, 14.8, 9.6]], // Bénoué, northern Cameroon
  },
  'woolly-mammoth': { [-3600]: [[178, 70.7, -177, 71.7]] }, // Wrangel Island
  'woolly-rhino': {
    [-20000]: [
      [18, 48, 60, 58], // eastern Europe
      [60, 50, 125, 66], // Siberia
    ],
  },
};
