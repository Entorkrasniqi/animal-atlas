import type { DriverId, Level } from '../../src/lib/types';

/**
 * How strongly each pressure threatens each living animal, on a 0–3 scale:
 * 0 not a known threat, 1 minor, 2 moderate, 3 major.
 *
 * This is the editorial layer behind the what-if simulator. It is read from the threats listed for each
 * animal (see the `threats` field in the other curated files) and the species' IUCN threat notes, so it
 * is an estimate made by hand, not IUCN data. The simulator scales these levels by how much pressure
 * the user adds; it compares animals with each other and does not forecast extinctions.
 */
export type Pressure = Record<DriverId, Level>;

/** Order of the six numbers in each row below. */
const L = (
  warming: Level,
  habitat: Level,
  hunting: Level,
  invasive: Level,
  pollution: Level,
  disease: Level,
): Pressure => ({ warming, habitat, hunting, invasive, pollution, disease });

/**
 * Hunting also stands for fishing, bycatch, persecution and the wildlife trade: anything that removes
 * animals directly. Habitat means land or shore converted, fragmented or drained.
 */
export const PRESSURES: Record<string, Pressure> = {
  //                         warm hab hunt inv poll dis
  'african-lion':            L(1, 3, 3, 0, 0, 1), // livestock conflict, prey loss, trophy and bone trade
  'african-penguin':         L(3, 1, 3, 1, 3, 2), // prey shifts in warming seas, overfished sardines, oil spills
  'african-elephant':        L(1, 3, 3, 0, 0, 1), // ivory poaching, habitat loss
  'african-wild-dog':        L(1, 3, 2, 0, 0, 2), // fragmentation, snaring, rabies and distemper
  'american-alligator':      L(2, 2, 0, 1, 1, 0), // wetland loss, storms and sea-level rise
  'american-bison':          L(1, 2, 0, 0, 0, 1), // limited range, cattle genes, brucellosis
  'amur-leopard':            L(1, 3, 3, 0, 0, 1), // poaching, habitat loss
  'asian-elephant':          L(1, 3, 2, 1, 0, 1), // fragmentation, conflict, poaching
  'asiatic-lion':            L(1, 2, 1, 0, 0, 3), // one population: an epidemic could end it
  'bluefin-tuna':            L(2, 1, 3, 0, 2, 0), // overfishing, mercury, shifting spawning grounds
  'axolotl':                 L(2, 3, 1, 3, 3, 1), // urbanisation, polluted canals, invasive carp and tilapia
  'bald-eagle':              L(1, 2, 1, 0, 3, 2), // lead poisoning, DDT history, avian flu
  'beluga-sturgeon':         L(2, 3, 3, 1, 3, 0), // caviar fishing, dams, pollution
  'black-rhino':             L(1, 2, 3, 1, 0, 0), // horn poaching
  'blue-whale':              L(2, 1, 2, 0, 2, 0), // ship strikes, entanglement, noise, krill shifts
  'bornean-orangutan':       L(1, 3, 3, 0, 1, 0), // palm-oil deforestation, fires, hunting
  'california-condor':       L(0, 2, 1, 0, 3, 2), // lead ammunition, DDT, avian flu
  'cheetah':                 L(1, 3, 3, 0, 0, 0), // habitat loss, farmer conflict, cub trade
  'chimpanzee':              L(1, 3, 3, 0, 0, 2), // habitat loss, bushmeat, Ebola
  'chinese-alligator':       L(1, 3, 1, 0, 3, 0), // farmland conversion, pollution
  'chinese-giant-salamander': L(1, 3, 3, 2, 2, 2), // poaching, habitat loss, farmed-animal releases, chytrid
  'coelacanth':              L(1, 1, 3, 0, 0, 0), // deep-sea bycatch, tiny range
  'emperor-penguin':         L(3, 0, 1, 0, 1, 1), // sea-ice loss, krill fishing
  'galapagos-tortoise':      L(1, 1, 1, 3, 0, 0), // introduced rats, goats and pigs
  'gharial':                 L(1, 3, 2, 0, 3, 0), // dams, sand mining, river pollution, fishing nets
  'giant-panda':             L(2, 3, 1, 0, 0, 1), // fragmentation, bamboo die-offs
  'giraffe':                 L(1, 3, 2, 0, 0, 1), // habitat loss, unrest, poaching
  'golden-poison-frog':      L(2, 3, 2, 0, 2, 2), // deforestation, coca spraying, collection
  'great-indian-bustard':    L(1, 3, 2, 0, 1, 0), // power lines, grassland loss, hunting
  'great-white-shark':       L(1, 1, 3, 0, 2, 0), // bycatch, finning, beach nets
  'indian-rhino':            L(2, 3, 3, 2, 0, 0), // poaching, flooding, invasive plants in grassland
  'grey-wolf':               L(0, 2, 2, 0, 0, 1), // persecution, habitat loss
  'hippopotamus':            L(2, 3, 3, 0, 1, 1), // habitat loss, meat and tooth trade, drought
  'humpback-whale':          L(2, 0, 2, 0, 1, 0), // ship strikes, entanglement
  'hyacinth-macaw':          L(1, 3, 3, 0, 0, 1), // pet trade, habitat loss
  'iberian-lynx':            L(2, 3, 2, 0, 0, 3), // rabbit prey lost to disease, road deaths
  'jaguar':                  L(1, 3, 3, 0, 1, 0), // deforestation, retaliatory killing
  'javan-rhino':             L(1, 2, 2, 3, 0, 2), // tiny population, invasive palms
  'kakapo':                  L(1, 1, 0, 3, 0, 2), // stoats, cats and rats; aspergillosis
  'koala':                   L(3, 3, 0, 0, 0, 3), // land clearing, heat and bushfire, chlamydia
  'komodo-dragon':           L(3, 2, 1, 0, 0, 0), // climate change, prey loss, encroachment
  'leatherback-turtle':      L(3, 2, 3, 0, 3, 0), // bycatch, egg collection, plastic, beach loss, hot sand
  'lord-howe-stick-insect':  L(2, 1, 0, 3, 0, 0), // rats, tiny range
  'monarch-butterfly':       L(3, 3, 0, 0, 3, 2), // milkweed loss, pesticides, climate, parasites
  'mountain-gorilla':        L(2, 3, 2, 0, 0, 3), // disease from humans, snares, habitat loss
  'northern-white-rhino':    L(0, 1, 3, 0, 0, 0), // poaching in a civil war; two animals left
  'philippine-eagle':        L(1, 3, 3, 0, 1, 0), // deforestation, hunting
  'polar-bear':              L(3, 1, 1, 0, 3, 1), // sea-ice loss, pollutants
  'sea-otter':               L(1, 1, 1, 0, 3, 2), // oil spills, entanglement, parasites
  'snow-leopard':            L(3, 2, 3, 0, 0, 1), // retaliatory killing, prey decline, shrinking alpine range
  'white-rhino':             L(1, 1, 3, 0, 0, 0), // horn poaching
  'sumatran-rhino':          L(1, 3, 3, 0, 0, 1), // poaching, scattered populations
  'tasmanian-devil':         L(1, 1, 0, 0, 0, 3), // devil facial tumour disease
  'tiger':                   L(2, 3, 3, 0, 0, 1), // poaching, prey loss, habitat loss, sea-level rise in the Sundarbans
  'vaquita':                 L(1, 0, 3, 0, 1, 0), // gillnet entanglement
  'western-gorilla':         L(1, 3, 3, 0, 0, 3), // bushmeat, logging, Ebola
  'whale-shark':             L(2, 1, 3, 0, 2, 0), // fishing, bycatch, ship strikes, plastics
  'whooping-crane':          L(2, 3, 1, 0, 1, 1), // habitat loss, power lines, storms
};

/**
 * Animals that depend on sea ice. Warming reaches them as the loss of the ice they live on, so the
 * model treats them as polar wherever their recorded range sits.
 */
export const ICE_BOUND = new Set(['polar-bear', 'emperor-penguin']);
