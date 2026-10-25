import { S, animal } from './helpers';

export const livingOthers = [
  // Reptiles
  animal({
    id: 'komodo-dragon',
    name: 'Komodo dragon',
    sci: 'Varanus komodoensis',
    group: 'reptile',
    status: 'EN',
    about:
      'The world’s heaviest lizard, found on just five Indonesian islands. Rising seas could swallow much of its coastal habitat.',
    threats: 'Climate change, loss of prey, human encroachment',
    range: [[S, 'IDN']],
    pop: [[2021, 3000]],
  }),
  animal({
    id: 'leatherback-turtle',
    name: 'Leatherback sea turtle',
    sci: 'Dermochelys coriacea',
    group: 'reptile',
    status: 'VU',
    about:
      'The biggest turtle, diving over 1,000 m and crossing entire oceans. Pacific nesting populations have fallen by more than 90%. Countries listed are those with nesting beaches.',
    threats: 'Fisheries bycatch, egg collection, plastic ingestion, beach loss',
    range: [
      [S, 'USA MEX CRI PAN COL VEN GUY SUR BRA TTO GAB COG AGO GHA ZAF MOZ MDG IND LKA THA IDN MYS PNG SLB AUS CHN PHL'],
    ],
    pop: [
      [1980, 115000],
      [1996, 34500],
    ],
    popUnit: 'nesting females (global)',
  }),
  animal({
    id: 'galapagos-tortoise',
    name: 'Galápagos giant tortoise',
    sci: 'Chelonoidis niger complex',
    group: 'reptile',
    status: 'VU',
    about:
      'Whalers and sailors took ~100,000 tortoises from the islands for food. Breeding programmes and rat eradication have lifted the number to around 20,000.',
    threats: 'Historic harvesting; introduced rats, goats and pigs',
    range: [[S, 'ECU']],
    pop: [
      [1570, 250000],
      [1974, 3060],
      [2014, 19700],
    ],
  }),
  animal({
    id: 'gharial',
    name: 'Gharial',
    sci: 'Gavialis gangeticus',
    group: 'reptile',
    status: 'CR',
    about:
      'A fish-eating crocodilian with a long thin snout. Dams, sand mining and fishing nets have wiped it from most rivers.',
    threats: 'Dams, sand mining, river pollution, fishing nets',
    range: [
      [S, 'PAK IND NPL BGD BTN MMR'],
      [1980, 'IND NPL'],
    ],
    pop: [
      [1946, 10000],
      [1997, 200],
      [2017, 650],
    ],
  }),
  animal({
    id: 'chinese-alligator',
    name: 'Chinese alligator',
    sci: 'Alligator sinensis',
    group: 'reptile',
    status: 'CR',
    about:
      'A small alligator that hibernates in burrows. Only about 120 live in the wild, though thousands are bred in captivity.',
    threats: 'Habitat conversion to farmland, pollution',
    range: [[S, 'CHN']],
    pop: [[2018, 120]],
  }),
  animal({
    id: 'american-alligator',
    name: 'American alligator',
    sci: 'Alligator mississippiensis',
    group: 'reptile',
    status: 'LC',
    about:
      'Listed as endangered in 1967 after hide hunting; protection brought it back to over five million animals.',
    threats: 'Historic hide hunting; today wetland loss',
    range: [[S, 'USA']],
    pop: [[2020, 5000000]],
  }),

  // Amphibians
  animal({
    id: 'chinese-giant-salamander',
    name: 'Chinese giant salamander',
    sci: 'Andrias davidianus',
    group: 'amphibian',
    status: 'CR',
    about:
      'The largest amphibian, up to 1.8 m. Wild populations have fallen by over 80% since the 1950s, largely because it is eaten as a delicacy.',
    threats: 'Poaching for food, habitat loss, farmed-animal releases',
    range: [[S, 'CHN']],
  }),
  animal({
    id: 'axolotl',
    name: 'Axolotl',
    sci: 'Ambystoma mexicanum',
    group: 'amphibian',
    status: 'CR',
    about:
      'A salamander that stays in its larval form for life and can regrow limbs. Its only wild home is a few canals near Mexico City.',
    threats: 'Urbanisation, water pollution, invasive fish',
    range: [[S, 'MEX']],
  }),
  animal({
    id: 'golden-poison-frog',
    name: 'Golden poison frog',
    sci: 'Phyllobates terribilis',
    group: 'amphibian',
    status: 'EN',
    about:
      'One of the most poisonous animals on Earth: a single frog carries enough toxin to kill about ten people. It lives in a tiny strip of Colombian rainforest.',
    threats: 'Deforestation, illegal coca cultivation, collection',
    range: [[S, 'COL']],
  }),

  // Fish
  animal({
    id: 'great-white-shark',
    name: 'Great white shark',
    sci: 'Carcharodon carcharias',
    group: 'fish',
    status: 'VU',
    about:
      'The largest predatory fish. Slow to mature and slow to breed, it cannot withstand heavy fishing pressure. Countries listed are those whose coastal waters it visits.',
    threats: 'Fisheries bycatch, finning, beach nets',
    range: [
      [
        S,
        'USA MEX CAN CHL PER ECU ARG BRA URY AUS NZL ZAF NAM MOZ MDG IND JPN CHN KOR ITA ESP FRA PRT MLT TUN HRV DZA EGY TUR GRC',
      ],
    ],
  }),
  animal({
    id: 'whale-shark',
    name: 'Whale shark',
    sci: 'Rhincodon typus',
    group: 'fish',
    status: 'EN',
    about:
      'The biggest fish alive — up to 18 m — a gentle filter feeder. Its Indo-Pacific numbers have fallen by an estimated 63% over 75 years.',
    threats: 'Fishing, ship strikes, bycatch',
    range: [
      [
        S,
        'MEX USA BLZ HND BRA CUB AUS IDN PHL THA IND LKA MDV MOZ TZA KEN MDG SOM OMN YEM DJI ERI EGY SAU JPN TWN CHN',
      ],
    ],
  }),
  animal({
    id: 'coelacanth',
    name: 'Coelacanth',
    sci: 'Latimeria chalumnae',
    group: 'fish',
    status: 'CR',
    about:
      'Known only from fossils and presumed extinct for ~66 million years — until a living one was caught off South Africa in 1938.',
    threats: 'Deep-sea fishing bycatch, tiny range',
    range: [[S, 'COM TZA KEN MOZ ZAF MDG']],
    pop: [[2002, 500]],
  }),
  animal({
    id: 'beluga-sturgeon',
    name: 'Beluga sturgeon',
    sci: 'Huso huso',
    group: 'fish',
    status: 'CR',
    about:
      'Source of the finest caviar, it can live over 100 years and reach 6 m. Dams block its spawning migrations and poaching continues.',
    threats: 'Overfishing for caviar, dams, pollution',
    range: [
      [S, 'RUS KAZ AZE IRN TKM UKR ROU BGR SRB HUN AUT SVK GEO TUR'],
      [1900, 'RUS KAZ AZE IRN TKM UKR ROU BGR SRB'],
    ],
  }),
  animal({
    id: 'bluefin-tuna',
    name: 'Atlantic bluefin tuna',
    sci: 'Thunnus thynnus',
    group: 'fish',
    status: 'LC',
    about:
      'A warm-blooded, 3-metre ocean sprinter. Overfishing drove the spawning stock down by about 80%; tight quotas since 2010 have let it rebound.',
    threats: 'Overfishing, illegal catches',
    range: [
      [
        S,
        'USA CAN MEX BRA ISL NOR GBR IRL FRA ESP PRT ITA MLT GRC TUR TUN LBY EGY MAR DZA HRV JPN',
      ],
    ],
  }),

  // Invertebrates
  animal({
    id: 'monarch-butterfly',
    name: 'Monarch butterfly (eastern)',
    sci: 'Danaus plexippus plexippus',
    group: 'invertebrate',
    status: 'EN',
    about:
      'Each autumn monarchs migrate up to 4,000 km from Canada and the US to the fir forests of central Mexico. The wintering colony shrank from ~18 hectares in 1996 to under 1 hectare.',
    threats: 'Milkweed loss, logging in Mexico, climate change, pesticides',
    range: [[S, 'CAN USA MEX']],
    pop: [
      [1996, 384000000],
      [2013, 14000000],
      [2018, 127000000],
      [2023, 19000000],
    ],
    popUnit: 'wintering butterflies in Mexico (estimated from forest area)',
  }),
  animal({
    id: 'lord-howe-stick-insect',
    name: 'Lord Howe Island stick insect',
    sci: 'Dryococelus australis',
    group: 'invertebrate',
    status: 'CR',
    about:
      'A lobster-sized insect declared extinct after rats arrived on its island in 1918. In 2001, 24 were found clinging to a single bush on a sea stack, Ball’s Pyramid.',
    threats: 'Rats introduced by a shipwreck, tiny range',
    range: [[S, 'AUS']],
    pop: [[2001, 24]],
  }),
];

export const extinctOthers = [
  animal({
    id: 'pinta-tortoise',
    name: 'Pinta Island tortoise',
    sci: 'Chelonoidis abingdonii',
    group: 'reptile',
    status: 'EX',
    extinct: 2012,
    about:
      'The last, “Lonesome George”, was found in 1971 and spent 40 years as the rarest creature in the world. He died on 24 June 2012.',
    threats: 'Whaler and sailor harvesting, feral goats stripping vegetation',
    range: [[S, 'ECU']],
    pop: [
      [1971, 1],
      [2012, 1],
    ],
  }),
  animal({
    id: 'golden-toad',
    name: 'Golden toad',
    sci: 'Incilius periglenes',
    group: 'amphibian',
    status: 'EX',
    extinct: 1989,
    about:
      'Brilliant orange males gathered by the thousand in cloud-forest pools at Monteverde. After a 1987 breeding season of ~1,500 adults, it crashed to a single male in 1989.',
    threats: 'Climate-linked drying, chytrid fungus',
    range: [[S, 'CRI']],
    pop: [
      [1987, 1500],
      [1988, 10],
      [1989, 1],
    ],
  }),
  animal({
    id: 'gastric-brooding-frog',
    name: 'Southern gastric-brooding frog',
    sci: 'Rheobatrachus silus',
    group: 'amphibian',
    status: 'EX',
    extinct: 1983,
    about:
      'Females swallowed their fertilised eggs and brooded tadpoles in the stomach, giving birth through the mouth. Discovered in 1972, gone by 1983.',
    threats: 'Chytrid fungus, habitat disturbance',
    range: [[S, 'AUS']],
  }),
  animal({
    id: 'rabbs-treefrog',
    name: 'Rabbs’ fringe-limbed treefrog',
    sci: 'Ecnomiohyla rabborum',
    group: 'amphibian',
    status: 'EX',
    extinct: 2016,
    about:
      'A big cloud-forest treefrog of Panama. Its last captive male, “Toughie”, died in Atlanta in 2016 after years of calling for a mate.',
    threats: 'Chytrid fungus, habitat loss',
    range: [[S, 'PAN']],
  }),
  animal({
    id: 'chinese-paddlefish',
    name: 'Chinese paddlefish',
    sci: 'Psephurus gladius',
    group: 'fish',
    status: 'EX',
    extinct: 2005,
    about:
      'One of the largest freshwater fish ever, up to 7 m. Dams on the Yangtze blocked its migration; the last confirmed one was seen in 2003 and it was declared extinct in 2022.',
    threats: 'Dams blocking spawning runs, overfishing',
    range: [[S, 'CHN']],
  }),
  animal({
    id: 'rocky-mountain-locust',
    name: 'Rocky Mountain locust',
    sci: 'Melanoplus spretus',
    group: 'invertebrate',
    status: 'EX',
    extinct: 1902,
    about:
      'Its 1875 swarm — 1,800 km long and perhaps 3.5 trillion insects — was the largest locust swarm ever recorded. Within 30 years the species was gone.',
    threats: 'Farming of its river-valley breeding grounds',
    range: [[S, 'USA CAN']],
    pop: [
      [1875, 3500000000000],
      [1902, 1],
    ],
  }),
  animal({
    id: 'xerces-blue',
    name: 'Xerces blue',
    sci: 'Glaucopsyche xerces',
    group: 'invertebrate',
    status: 'EX',
    extinct: 1941,
    about:
      'A butterfly from the sand dunes of San Francisco, the first American butterfly driven extinct by urban development. It inspired the Xerces Society.',
    threats: 'Urban development of its dune habitat',
    range: [[S, 'USA']],
  }),
];
