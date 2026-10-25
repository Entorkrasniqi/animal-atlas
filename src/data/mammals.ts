import { S, add, animal, c, drop } from './helpers';

// ---------------------------------------------------------------------------
// Living mammals
// ---------------------------------------------------------------------------

const WOLF_WIDE = c(
  'CAN USA MEX GRL RUS CHN MNG KAZ UZB TKM TJK KGZ AFG PAK IND NPL IRN IRQ SAU SYR ISR JOR TUR GEO ARM AZE ' +
    'UKR BLR POL SVK CZE HUN ROU BGR MDA GRC ALB MKD SRB BIH HRV SVN MNE ITA CHE AUT DEU FRA ESP PRT BEL NLD ' +
    'DNK SWE NOR FIN EST LVA LTU GBR IRL JPN KOR PRK',
);
const WOLF_1800 = drop(WOLF_WIDE, 'GBR IRL');
const WOLF_1900 = drop(WOLF_1800, 'JPN DNK NLD BEL CHE AUT DEU FRA CZE');
const WOLF_1975 = drop(WOLF_1900, 'SWE NOR KOR');
const WOLF_1992 = add(WOLF_1975, 'FRA');
const WOLF_2000 = add(WOLF_1992, 'SWE NOR DEU');
const WOLF_2012 = add(WOLF_2000, 'CHE DNK AUT CZE');
const WOLF_2018 = add(WOLF_2012, 'BEL NLD');

const CHEETAH_WIDE = c(
  'MAR DZA TUN LBY EGY MRT MLI NER NGA TCD SDN SSD ETH SOM KEN UGA TZA AGO ZMB MWI MOZ ZWE BWA NAM ZAF SEN GIN ' +
    'BFA BEN TGO CMR CAF COD IRN IRQ SYR SAU TKM UZB TJK AFG PAK IND ISR JOR',
);
const CHEETAH_1975 = c(
  'DZA BEN BWA BFA CMR CAF TCD ETH KEN MWI MLI MOZ NAM NER NGA SOM ZAF SSD TZA UGA ZMB ZWE AGO IRN SDN',
);

export const livingMammals = [
  animal({
    id: 'african-elephant',
    name: 'African savanna elephant',
    sci: 'Loxodonta africana',
    group: 'mammal',
    status: 'EN',
    about:
      'The largest land animal on Earth. Poaching for ivory cut the continent-wide population by more than half in a few decades.',
    threats: 'Ivory poaching, habitat loss, human–elephant conflict',
    range: [
      [
        S,
        'SEN GMB GIN GNB SLE CIV GHA TGO BEN NGA NER MLI BFA TCD CMR CAF COG COD AGO NAM BWA ZMB ZWE MOZ MWI TZA KEN UGA RWA BDI ETH ERI SSD SDN SOM ZAF SWZ',
      ],
      [
        1980,
        'AGO BEN BWA BFA CMR CAF TCD COD ETH KEN MWI MLI MOZ NAM NER NGA RWA SSD SDN SOM SWZ TZA TGO UGA ZMB ZWE ZAF GHA CIV GIN SEN',
      ],
    ],
    pop: [
      [1979, 1300000],
      [1989, 600000],
      [2016, 415000],
    ],
  }),
  animal({
    id: 'asian-elephant',
    name: 'Asian elephant',
    sci: 'Elephas maximus',
    group: 'mammal',
    status: 'EN',
    about:
      'Once ranged from Mesopotamia to China. Today about half of all wild Asian elephants live in India, in fragmented forests.',
    threats: 'Habitat fragmentation, human–elephant conflict, poaching',
    range: [
      [S, 'IRQ SYR IND NPL BTN BGD LKA MMR THA LAO KHM VNM MYS IDN CHN'],
      [-700, 'IND NPL BTN BGD LKA MMR THA LAO KHM VNM MYS IDN CHN'],
    ],
    pop: [
      [1950, 100000],
      [2020, 48000],
    ],
  }),
  animal({
    id: 'tiger',
    name: 'Tiger',
    sci: 'Panthera tigris',
    group: 'mammal',
    status: 'EN',
    about:
      'The biggest cat. A century ago about 100,000 tigers roamed Asia; they lost over 90% of their range and bottomed out near 3,200 in 2010 before a modest recovery.',
    threats: 'Poaching, prey depletion, habitat loss',
    range: [
      [S, 'IND NPL BTN BGD MMR THA LAO KHM VNM MYS IDN CHN RUS PRK KOR'],
      [2000, 'IND NPL BTN BGD MMR THA VNM MYS IDN CHN RUS'],
    ],
    pop: [
      [1900, 100000],
      [2010, 3200],
      [2022, 4500],
    ],
  }),
  animal({
    id: 'african-lion',
    name: 'African lion',
    sci: 'Panthera leo',
    group: 'mammal',
    status: 'VU',
    about:
      'Lions have vanished from about 90% of their historic range. West and Central African populations are especially small and isolated.',
    threats: 'Conflict with livestock keepers, prey loss, habitat loss, trophy and bone trade',
    range: [
      [
        S,
        'MAR DZA TUN LBY EGY SEN GMB GIN SLE MLI BFA NER NGA BEN TGO GHA CIV TCD CMR CAF COG GAB COD SDN SSD ETH ERI DJI SOM KEN UGA RWA BDI TZA AGO ZMB MWI MOZ ZWE BWA NAM ZAF SWZ',
      ],
      [
        1980,
        'SEN BFA BEN NER NGA CMR TCD CAF COD SDN SSD ETH SOM KEN UGA RWA TZA AGO ZMB MWI MOZ ZWE BWA NAM ZAF SWZ',
      ],
    ],
    pop: [
      [1993, 32000],
      [2014, 20000],
    ],
  }),
  animal({
    id: 'asiatic-lion',
    name: 'Asiatic lion',
    sci: 'Panthera leo persica',
    group: 'mammal',
    status: 'EN',
    about:
      'Once ranged from Greece to India. By 1913 only about 20 survived in the Gir forest of Gujarat; protection has since grown the population past 600.',
    threats: 'Tiny range (one population), disease, epidemics',
    range: [
      [S, 'GRC TUR SYR IRQ IRN AFG PAK IND'],
      [1900, 'IRN IND'],
      [1945, 'IND'],
    ],
    pop: [
      [1913, 20],
      [2001, 327],
      [2015, 523],
      [2020, 674],
    ],
  }),
  animal({
    id: 'giant-panda',
    name: 'Giant panda',
    sci: 'Ailuropoda melanoleuca',
    group: 'mammal',
    status: 'VU',
    about:
      'A bamboo specialist now confined to mountain forests in central China. Reserves and reforestation lifted it from Endangered to Vulnerable in 2016.',
    threats: 'Habitat fragmentation, climate effects on bamboo',
    range: [
      [S, 'CHN VNM MMR'],
      [-2000, 'CHN'],
    ],
    pop: [
      [1976, 2459],
      [1988, 1114],
      [2003, 1590],
      [2014, 1864],
    ],
  }),
  animal({
    id: 'black-rhino',
    name: 'Black rhinoceros',
    sci: 'Diceros bicornis',
    group: 'mammal',
    status: 'CR',
    about:
      'Poaching crashed the population by 98% between 1970 and 1993. Intensive protection has since more than doubled it.',
    threats: 'Poaching for horn, habitat loss',
    range: [
      [
        S,
        'SDN SSD ETH ERI SOM DJI KEN UGA RWA BDI TZA MWI MOZ ZMB ZWE BWA NAM ZAF SWZ AGO COD CMR CAF TCD NGA NER',
      ],
      [1980, 'CMR KEN TZA ZWE NAM ZAF ZMB MOZ AGO MWI SWZ'],
      [2012, 'KEN TZA ZWE NAM ZAF SWZ MWI ZMB BWA RWA'],
    ],
    pop: [
      [1970, 70000],
      [1993, 2300],
      [2023, 6500],
    ],
  }),
  animal({
    id: 'white-rhino',
    name: 'Southern white rhinoceros',
    sci: 'Ceratotherium simum simum',
    group: 'mammal',
    status: 'NT',
    about:
      'One of conservation’s great comebacks: down to about 100 animals around 1895, now roughly 16,000 — though poaching is rising again.',
    threats: 'Poaching for horn',
    range: [
      [S, 'ZAF NAM BWA ZWE MOZ SWZ ZMB AGO'],
      [1895, 'ZAF'],
      [1960, 'ZAF SWZ NAM BWA ZWE'],
      [2000, 'ZAF SWZ NAM BWA ZWE KEN ZMB MOZ'],
    ],
    pop: [
      [1895, 100],
      [1968, 1800],
      [2021, 16000],
    ],
  }),
  animal({
    id: 'northern-white-rhino',
    name: 'Northern white rhinoceros',
    sci: 'Ceratotherium simum cottoni',
    group: 'mammal',
    status: 'CR',
    about:
      'Functionally extinct: only two females, Najin and Fatu, remain, guarded 24/7 at Ol Pejeta in Kenya. Frozen embryos are the last hope.',
    threats: 'Poaching during civil conflict in its range',
    range: [
      [S, 'UGA SSD COD CAF TCD SDN'],
      [1960, 'UGA SSD COD CAF'],
      [2009, 'KEN'],
    ],
    pop: [
      [1960, 2300],
      [2008, 8],
      [2018, 2],
    ],
  }),
  animal({
    id: 'javan-rhino',
    name: 'Javan rhinoceros',
    sci: 'Rhinoceros sondaicus',
    group: 'mammal',
    status: 'CR',
    about:
      'One of the rarest large mammals on Earth, living in a single national park. The last Vietnamese rhino was poached in 2010.',
    threats: 'Tiny population, poaching, volcano/tsunami risk, invasive palms',
    range: [
      [S, 'IND BGD MMR THA LAO KHM VNM MYS IDN'],
      [1960, 'IDN VNM'],
      [2010, 'IDN'],
    ],
    pop: [
      [1967, 25],
      [2010, 50],
      [2023, 76],
    ],
  }),
  animal({
    id: 'indian-rhino',
    name: 'Greater one-horned rhinoceros',
    sci: 'Rhinoceros unicornis',
    group: 'mammal',
    status: 'VU',
    about:
      'Fell to around 200 animals in the early 1900s. Kaziranga and Chitwan now hold most of a population above 4,000.',
    threats: 'Poaching, flooding, habitat loss',
    range: [
      [S, 'PAK IND NPL BTN BGD MMR'],
      [1900, 'IND NPL'],
    ],
    pop: [
      [1900, 200],
      [2008, 2575],
      [2022, 4014],
    ],
  }),
  animal({
    id: 'sumatran-rhino',
    name: 'Sumatran rhinoceros',
    sci: 'Dicerorhinus sumatrensis',
    group: 'mammal',
    status: 'CR',
    about:
      'The smallest and hairiest rhino. Declared extinct in Malaysia in 2019; fewer than 80 survive on Sumatra and Borneo’s Indonesian side.',
    threats: 'Poaching, habitat loss, small scattered populations',
    range: [
      [S, 'IND BGD MMR THA LAO KHM VNM MYS IDN'],
      [1980, 'IDN MYS'],
      [2019, 'IDN'],
    ],
    pop: [
      [1985, 800],
      [2020, 80],
    ],
  }),
  animal({
    id: 'mountain-gorilla',
    name: 'Mountain gorilla',
    sci: 'Gorilla beringei beringei',
    group: 'mammal',
    status: 'EN',
    about:
      'Fewer than 700 in 1989; tourism-funded protection across three countries has pushed the count above 1,000.',
    threats: 'Disease from humans, habitat loss, snares',
    range: [[S, 'UGA RWA COD']],
    pop: [
      [1981, 250],
      [1989, 620],
      [2010, 880],
      [2018, 1063],
    ],
  }),
  animal({
    id: 'western-gorilla',
    name: 'Western gorilla',
    sci: 'Gorilla gorilla',
    group: 'mammal',
    status: 'CR',
    about:
      'The most numerous gorilla, yet it declined by over 60% in three generations — mostly from Ebola and hunting.',
    threats: 'Ebola, bushmeat hunting, logging',
    range: [[S, 'CMR CAF COG GAB GNQ AGO NGA COD']],
    pop: [[2008, 316000]],
  }),
  animal({
    id: 'chimpanzee',
    name: 'Chimpanzee',
    sci: 'Pan troglodytes',
    group: 'mammal',
    status: 'EN',
    about:
      'Our closest living relative. Perhaps a million lived across Africa a century ago; habitat loss and the bushmeat trade have cut that by roughly three quarters.',
    threats: 'Habitat loss, bushmeat trade, disease',
    range: [
      [S, 'SEN GMB GNB GIN SLE LBR CIV GHA TGO BEN BFA NGA CMR CAF GAB GNQ COG COD UGA RWA BDI TZA SSD MLI'],
      [1960, 'SEN GNB GIN SLE LBR CIV GHA NGA CMR CAF GAB GNQ COG COD UGA RWA BDI TZA SSD MLI'],
    ],
    pop: [
      [1900, 1000000],
      [2016, 230000],
    ],
  }),
  animal({
    id: 'bornean-orangutan',
    name: 'Bornean orangutan',
    sci: 'Pongo pygmaeus',
    group: 'mammal',
    status: 'CR',
    about:
      'Lost more than 100,000 animals between 1999 and 2015, mainly as rainforest was cleared for palm oil and timber.',
    threats: 'Deforestation for palm oil, fires, hunting',
    range: [[S, 'IDN MYS']],
    pop: [
      [1973, 288500],
      [2016, 104700],
    ],
  }),
  animal({
    id: 'snow-leopard',
    name: 'Snow leopard',
    sci: 'Panthera uncia',
    group: 'mammal',
    status: 'VU',
    about:
      'The “ghost of the mountains” lives across 12 countries of Central and South Asia, almost always above the tree line.',
    threats: 'Retaliatory killing, poaching, prey decline, climate change',
    range: [[S, 'AFG BTN CHN IND KAZ KGZ MNG NPL PAK RUS TJK UZB']],
    pop: [[2016, 5000]],
  }),
  animal({
    id: 'amur-leopard',
    name: 'Amur leopard',
    sci: 'Panthera pardus orientalis',
    group: 'mammal',
    status: 'CR',
    about:
      'The rarest big cat: just ~30 wild animals in 2007, now about 130 in the Russian Far East and neighbouring China.',
    threats: 'Poaching, habitat loss, inbreeding',
    range: [
      [S, 'RUS CHN PRK KOR'],
      [1970, 'RUS CHN'],
    ],
    pop: [
      [2007, 30],
      [2023, 130],
    ],
  }),
  animal({
    id: 'jaguar',
    name: 'Jaguar',
    sci: 'Panthera onca',
    group: 'mammal',
    status: 'NT',
    about:
      'The Americas’ largest cat has lost roughly half its historic range. The Amazon and Pantanal remain its strongholds.',
    threats: 'Deforestation, retaliatory killing, prey loss',
    range: [
      [S, 'USA MEX BLZ GTM SLV HND NIC CRI PAN COL VEN GUY SUR ECU PER BOL BRA PRY ARG URY'],
      [1970, 'MEX BLZ GTM HND NIC CRI PAN COL VEN GUY SUR ECU PER BOL BRA PRY ARG'],
    ],
    pop: [[2016, 173000]],
  }),
  animal({
    id: 'cheetah',
    name: 'Cheetah',
    sci: 'Acinonyx jubatus',
    group: 'mammal',
    status: 'VU',
    about:
      'The fastest land animal has vanished from over 90% of its historic range. In 2022–23 cheetahs from Namibia and South Africa were reintroduced to India.',
    threats: 'Habitat loss, conflict with farmers, illegal pet trade',
    range: [
      [S, CHEETAH_WIDE],
      [1952, drop(CHEETAH_WIDE, 'IND')],
      [1975, CHEETAH_1975],
      [2022, add(CHEETAH_1975, 'IND')],
    ],
    pop: [
      [1900, 100000],
      [1975, 14000],
      [2016, 7100],
    ],
  }),
  animal({
    id: 'grey-wolf',
    name: 'Grey wolf',
    sci: 'Canis lupus',
    group: 'mammal',
    status: 'LC',
    about:
      'Once the most widespread land mammal after humans. Persecution wiped wolves from much of Western Europe; protection is now bringing them back to Germany, France and beyond.',
    threats: 'Persecution, habitat loss',
    range: [
      [S, WOLF_WIDE],
      [1800, WOLF_1800],
      [1900, WOLF_1900],
      [1975, WOLF_1975],
      [1992, WOLF_1992],
      [2000, WOLF_2000],
      [2012, WOLF_2012],
      [2018, WOLF_2018],
    ],
    pop: [[2018, 250000]],
  }),
  animal({
    id: 'polar-bear',
    name: 'Polar bear',
    sci: 'Ursus maritimus',
    group: 'mammal',
    status: 'VU',
    about:
      'Depends on sea ice to hunt seals. Arctic sea ice is shrinking about 13% per decade, shortening the hunting season.',
    threats: 'Sea-ice loss from climate change, pollution',
    range: [[S, 'CAN USA RUS NOR GRL']],
    pop: [[2015, 26000]],
  }),
  animal({
    id: 'giraffe',
    name: 'Giraffe',
    sci: 'Giraffa camelopardalis',
    group: 'mammal',
    status: 'VU',
    about:
      'A “silent extinction”: giraffe numbers fell by about 40% in 30 years. Several populations are separate species or subspecies in their own right.',
    threats: 'Habitat loss, civil unrest, poaching',
    range: [
      [
        S,
        'SEN GMB GIN MRT MLI BFA GHA TGO BEN NER NGA TCD CMR CAF SDN SSD ETH ERI SOM KEN UGA RWA TZA MWI MOZ ZMB ZWE BWA NAM AGO ZAF SWZ COD',
      ],
      [1990, 'AGO BWA TCD CMR CAF COD ETH KEN MWI MOZ NAM NER SSD SOM TZA UGA ZMB ZWE ZAF SWZ RWA'],
    ],
    pop: [
      [1985, 155000],
      [2015, 97500],
    ],
  }),
  animal({
    id: 'hippopotamus',
    name: 'Hippopotamus',
    sci: 'Hippopotamus amphibius',
    group: 'mammal',
    status: 'VU',
    about:
      'Africa’s most dangerous large herbivore. It disappeared from Egypt in the 1800s and is declining wherever water and grazing are squeezed.',
    threats: 'Habitat loss, hunting for meat and ivory teeth',
    range: [
      [
        S,
        'EGY MRT ERI AGO BEN BWA BFA BDI CMR CAF TCD COG COD CIV ETH GAB GMB GHA GIN GNB KEN LBR MWI MLI MOZ NAM NER NGA RWA SEN SLE SOM SSD SDN SWZ TZA TGO UGA ZMB ZWE ZAF',
      ],
      [
        1850,
        'AGO BEN BWA BFA BDI CMR CAF TCD COG COD CIV ETH GAB GMB GHA GIN GNB KEN LBR MWI MLI MOZ NAM NER NGA RWA SEN SLE SOM SSD SDN SWZ TZA TGO UGA ZMB ZWE ZAF',
      ],
    ],
    pop: [[2016, 125000]],
  }),
  animal({
    id: 'american-bison',
    name: 'American bison',
    sci: 'Bison bison',
    group: 'mammal',
    status: 'NT',
    about:
      'An estimated 30 million roamed North America before 1800. Market hunting reduced them to 541 by 1889; today about 500,000 exist, though only ~31,000 are in conservation herds.',
    threats: 'Historical slaughter; today genetic dilution from cattle, limited range',
    range: [
      [S, 'CAN USA MEX'],
      [1890, 'CAN USA'],
      [2009, 'CAN USA MEX'],
    ],
    pop: [
      [1800, 30000000],
      [1889, 541],
      [2017, 500000],
    ],
  }),
  animal({
    id: 'african-wild-dog',
    name: 'African wild dog',
    sci: 'Lycaon pictus',
    group: 'mammal',
    status: 'EN',
    about:
      'An expert pack hunter, once found in 39 countries. Fewer than 7,000 remain, mostly in southern and eastern Africa.',
    threats: 'Habitat fragmentation, snaring, disease, conflict',
    range: [
      [
        S,
        'SEN GIN SLE GHA BEN TGO CIV GNB MRT MLI BFA NER NGA CMR CAF TCD SDN SSD ETH ERI SOM DJI KEN UGA TZA BDI RWA COD AGO NAM BWA ZMB MWI MOZ ZWE ZAF SWZ',
      ],
      [1980, 'BWA NAM ZMB ZWE ZAF MOZ TZA KEN ETH SSD AGO MWI COD CMR CAF TCD SWZ UGA'],
    ],
    pop: [
      [1900, 500000],
      [2020, 6600],
    ],
  }),
  animal({
    id: 'koala',
    name: 'Koala',
    sci: 'Phascolarctos cinereus',
    group: 'mammal',
    status: 'VU',
    about:
      'Australia’s eucalyptus specialist. Bushfires, land clearing and disease have sent some regional populations into steep decline.',
    threats: 'Land clearing, bushfire, chlamydia, vehicle strikes, climate change',
    range: [[S, 'AUS']],
  }),
  animal({
    id: 'tasmanian-devil',
    name: 'Tasmanian devil',
    sci: 'Sarcophilus harrisii',
    group: 'mammal',
    status: 'EN',
    about:
      'The largest living carnivorous marsupial. A contagious facial cancer, first seen in 1996, has cut the population by about 80%.',
    threats: 'Devil facial tumour disease, road deaths',
    range: [[S, 'AUS']],
    pop: [
      [1996, 140000],
      [2008, 50000],
      [2020, 20000],
    ],
  }),
  animal({
    id: 'vaquita',
    name: 'Vaquita',
    sci: 'Phocoena sinus',
    group: 'mammal',
    status: 'CR',
    about:
      'The world’s rarest marine mammal, found only in the northern Gulf of California. Illegal gillnets set for totoaba kill the last few.',
    threats: 'Entanglement in illegal gillnets',
    range: [[S, 'MEX']],
    pop: [
      [1997, 567],
      [2008, 245],
      [2014, 100],
      [2016, 30],
      [2018, 19],
      [2023, 10],
    ],
  }),
  animal({
    id: 'blue-whale',
    name: 'Blue whale',
    sci: 'Balaenoptera musculus',
    group: 'mammal',
    status: 'EN',
    about:
      'The largest animal that has ever lived. Industrial whaling killed ~360,000 in the 20th century; they are recovering slowly. Countries listed are those whose waters they visit.',
    threats: 'Ship strikes, entanglement, noise, climate-driven prey shifts',
    range: [
      [
        S,
        'USA MEX CAN CHL PER ECU COL CRI PAN AUS NZL ZAF NAM MOZ MDG IND LKA IDN JPN RUS CHN KOR ISL NOR GRL BRA ARG URY ATA',
      ],
    ],
    pop: [
      [1900, 350000],
      [2018, 15000],
    ],
  }),
  animal({
    id: 'humpback-whale',
    name: 'Humpback whale',
    sci: 'Megaptera novaeangliae',
    group: 'mammal',
    status: 'LC',
    about:
      'Famous for haunting songs and breaching. Hunted to around 5,000 animals by the 1960s, many populations have rebounded since the whaling ban.',
    threats: 'Ship strikes, entanglement',
    range: [
      [
        S,
        'USA MEX CAN CHL PER ECU COL CRI PAN AUS NZL ZAF NAM MOZ MDG AGO GAB IND IDN JPN RUS ISL NOR GRL BRA ARG DOM ATA',
      ],
    ],
    pop: [
      [1900, 125000],
      [1966, 5000],
      [2018, 135000],
    ],
  }),
  animal({
    id: 'sea-otter',
    name: 'Sea otter',
    sci: 'Enhydra lutris',
    group: 'mammal',
    status: 'EN',
    about:
      'The densest fur of any animal made it a prize. The fur trade nearly wiped it out by 1911; protection and reintroductions rebuilt a population of ~125,000.',
    threats: 'Oil spills, entanglement, predation shifts',
    range: [
      [S, 'RUS JPN USA CAN MEX'],
      [1900, 'RUS USA'],
      [1975, 'RUS USA CAN'],
    ],
    pop: [
      [1741, 200000],
      [1911, 2000],
      [2018, 125000],
    ],
  }),
  animal({
    id: 'iberian-lynx',
    name: 'Iberian lynx',
    sci: 'Lynx pardinus',
    group: 'mammal',
    status: 'VU',
    about:
      'The world’s most endangered cat in 2002, with fewer than 100 left. Rabbit restoration and breeding programmes lifted it to Vulnerable in 2024.',
    threats: 'Loss of rabbit prey, road deaths, habitat loss',
    range: [
      [S, 'ESP PRT FRA'],
      [1900, 'ESP PRT'],
      [2005, 'ESP'],
      [2015, 'ESP PRT'],
    ],
    pop: [
      [2002, 100],
      [2012, 320],
      [2018, 590],
      [2020, 855],
      [2022, 1365],
      [2023, 2021],
    ],
  }),
];

// ---------------------------------------------------------------------------
// Extinct mammals
// ---------------------------------------------------------------------------

export const extinctMammals = [
  animal({
    id: 'woolly-mammoth',
    name: 'Woolly mammoth',
    sci: 'Mammuthus primigenius',
    group: 'mammal',
    status: 'EX',
    extinct: -2000,
    about:
      'Ice Age giant of the northern steppes. Mainland populations died out ~10,000 years ago; a few hundred survived on Wrangel Island until the time the pyramids were being built.',
    threats: 'Warming climate shrinking steppe grassland, human hunting',
    range: [
      [
        S,
        'GBR FRA ESP BEL NLD DEU DNK POL CZE AUT HUN ITA UKR BLR RUS KAZ MNG CHN JPN CAN USA',
      ],
      [-12000, 'RUS USA CAN'],
      [-8000, 'RUS USA'],
      [-3600, 'RUS'],
    ],
  }),
  animal({
    id: 'smilodon',
    name: 'Sabre-toothed cat',
    sci: 'Smilodon fatalis',
    group: 'mammal',
    status: 'EX',
    extinct: -8000,
    about:
      'A stocky ambush predator with 18 cm canines that hunted bison and giant sloths across the Americas.',
    threats: 'Collapse of megafauna prey after the last Ice Age, human arrival',
    range: [[S, 'USA MEX COL VEN ECU PER BOL BRA PRY ARG URY CHL']],
  }),
  animal({
    id: 'dire-wolf',
    name: 'Dire wolf',
    sci: 'Aenocyon dirus',
    group: 'mammal',
    status: 'EX',
    extinct: -11000,
    about:
      'Heavier than any living wolf, it scavenged and hunted alongside Smilodon at the La Brea tar pits.',
    threats: 'Loss of large prey, climate change',
    range: [[S, 'CAN USA MEX VEN COL ECU PER BOL']],
  }),
  animal({
    id: 'woolly-rhino',
    name: 'Woolly rhinoceros',
    sci: 'Coelodonta antiquitatis',
    group: 'mammal',
    status: 'EX',
    extinct: -12000,
    about:
      'A cold-adapted grazer that fills cave paintings in France. It declined rapidly as the climate warmed ~14,000 years ago.',
    threats: 'Climate warming, human hunting',
    range: [
      [S, 'GBR FRA ESP BEL NLD DEU POL CZE UKR RUS KAZ MNG CHN KOR'],
      [-20000, 'POL UKR RUS KAZ MNG CHN'],
    ],
  }),
  animal({
    id: 'giant-ground-sloth',
    name: 'Giant ground sloth',
    sci: 'Megatherium americanum',
    group: 'mammal',
    status: 'EX',
    extinct: -8000,
    about:
      'As heavy as an elephant, it stood on its hind legs to strip leaves from trees across the South American plains.',
    threats: 'Human hunting, climate change',
    range: [[S, 'ARG BRA URY PRY BOL PER CHL']],
  }),
  animal({
    id: 'irish-elk',
    name: 'Giant deer (“Irish elk”)',
    sci: 'Megaloceros giganteus',
    group: 'mammal',
    status: 'EX',
    extinct: -5700,
    about:
      'Its antlers spanned up to 3.5 metres. The last survivors lived in Siberia more than 7,000 years ago.',
    threats: 'Climate-driven vegetation change, hunting',
    range: [
      [S, 'IRL GBR NLD DEU POL CZE UKR RUS KAZ CHN MNG'],
      [-10000, 'RUS KAZ'],
    ],
  }),
  animal({
    id: 'cave-bear',
    name: 'Cave bear',
    sci: 'Ursus spelaeus',
    group: 'mammal',
    status: 'EX',
    extinct: -22000,
    about:
      'A mostly vegetarian giant that hibernated in European caves, leaving thousands of bones behind.',
    threats: 'Cooling climate shrinking plant food, competition with humans for caves',
    range: [[S, 'ESP FRA GBR BEL DEU AUT ITA CHE CZE POL SVK HUN ROU SVN HRV BIH SRB BGR GRC UKR RUS']],
  }),
  animal({
    id: 'diprotodon',
    name: 'Diprotodon',
    sci: 'Diprotodon optatum',
    group: 'mammal',
    status: 'EX',
    extinct: -42000,
    about:
      'The largest marsupial ever — a rhino-sized, wombat-like herbivore that roamed Australia’s inland.',
    threats: 'Climate shifts, human arrival (debated)',
    range: [[S, 'AUS']],
  }),
  animal({
    id: 'stellers-sea-cow',
    name: 'Steller’s sea cow',
    sci: 'Hydrodamalis gigas',
    group: 'mammal',
    status: 'EX',
    extinct: 1768,
    about:
      'A gentle 8-metre kelp-eater, found in 1741 by shipwrecked naturalist Georg Steller. It was hunted to extinction within 27 years of its discovery.',
    threats: 'Hunting for meat and fat by fur traders',
    range: [
      [S, 'JPN RUS USA'],
      [1500, 'RUS'],
    ],
    pop: [
      [1741, 2000],
      [1768, 1],
    ],
  }),
  animal({
    id: 'quagga',
    name: 'Quagga',
    sci: 'Equus quagga quagga',
    group: 'mammal',
    status: 'EX',
    extinct: 1883,
    about:
      'A zebra subspecies striped only on its front half. The last captive quagga died in Amsterdam Zoo on 12 August 1883.',
    threats: 'Hunting by settlers, competition with livestock',
    range: [[S, 'ZAF LSO']],
    pop: [[1883, 1]],
  }),
  animal({
    id: 'aurochs',
    name: 'Aurochs',
    sci: 'Bos primigenius',
    group: 'mammal',
    status: 'EX',
    extinct: 1627,
    about:
      'The wild ancestor of domestic cattle. The last cow died in Poland’s Jaktorów Forest in 1627, after a 1564 survey counted just 38.',
    threats: 'Hunting, habitat loss, disease from livestock',
    range: [
      [
        S,
        'GBR FRA ESP PRT ITA DEU POL CZE HUN ROU UKR BLR LTU RUS TUR IRN IND MAR DZA TUN EGY',
      ],
      [1000, 'POL LTU BLR UKR ROU'],
      [1564, 'POL'],
    ],
    pop: [
      [1564, 38],
      [1620, 1],
    ],
  }),
  animal({
    id: 'thylacine',
    name: 'Thylacine (Tasmanian tiger)',
    sci: 'Thylacinus cynocephalus',
    group: 'mammal',
    status: 'EX',
    extinct: 1936,
    about:
      'A striped marsupial predator. Hunted under a bounty scheme, the last known one, “Benjamin”, died at Hobart Zoo on 7 September 1936.',
    threats: 'Bounty hunting, habitat loss, disease, competition with dogs',
    range: [
      [S, 'AUS PNG IDN'],
      [-1200, 'AUS'],
    ],
    pop: [
      [1805, 4000],
      [1900, 1500],
      [1920, 100],
      [1930, 1],
    ],
  }),
  animal({
    id: 'bali-tiger',
    name: 'Bali tiger',
    sci: 'Panthera tigris balica',
    group: 'mammal',
    status: 'EX',
    extinct: 1937,
    about:
      'The smallest tiger. Confined to a single island, the last known individual was shot in 1937.',
    threats: 'Hunting, habitat conversion',
    range: [[S, 'IDN']],
  }),
  animal({
    id: 'javan-tiger',
    name: 'Javan tiger',
    sci: 'Panthera tigris sondaica',
    group: 'mammal',
    status: 'EX',
    extinct: 1976,
    about:
      'Hunted and displaced by rice farming, the last confirmed tiger was in Meru Betiri in 1976.',
    threats: 'Hunting, forest conversion, loss of prey',
    range: [[S, 'IDN']],
  }),
  animal({
    id: 'caspian-tiger',
    name: 'Caspian tiger',
    sci: 'Panthera tigris virgata',
    group: 'mammal',
    status: 'EX',
    extinct: 1970,
    about:
      'Lived in river-valley forests from Turkey to western China. The last was seen in Iran around 1970.',
    threats: 'Hunting, river-valley forest clearing for farmland, prey loss',
    range: [
      [S, 'TUR GEO ARM AZE IRN IRQ AFG TKM UZB TJK KAZ CHN RUS'],
      [1920, 'IRN AFG TKM UZB TJK KAZ AZE'],
      [1960, 'IRN TKM'],
    ],
  }),
  animal({
    id: 'pyrenean-ibex',
    name: 'Pyrenean ibex',
    sci: 'Capra pyrenaica pyrenaica',
    group: 'mammal',
    status: 'EX',
    extinct: 2000,
    about:
      'A mountain goat. The last, a female called Celia, was killed by a falling tree in 2000; a clone born in 2003 lived only minutes — the first “de-extinction” attempt.',
    threats: 'Hunting, competition with livestock',
    range: [
      [S, 'ESP FRA PRT AND'],
      [1900, 'ESP'],
    ],
    pop: [
      [1989, 14],
      [1999, 1],
    ],
  }),
  animal({
    id: 'western-black-rhino',
    name: 'Western black rhinoceros',
    sci: 'Diceros bicornis longipes',
    group: 'mammal',
    status: 'EX',
    extinct: 2011,
    about:
      'Declared extinct in 2011 after surveys in Cameroon found none. Poachers fed the demand for horn.',
    threats: 'Poaching for horn',
    range: [
      [S, 'CMR TCD CAF NGA'],
      [1980, 'CMR'],
    ],
    pop: [
      [2000, 10],
      [2006, 1],
    ],
  }),
  animal({
    id: 'baiji',
    name: 'Baiji (Yangtze river dolphin)',
    sci: 'Lipotes vexillifer',
    group: 'mammal',
    status: 'EX',
    extinct: 2006,
    about:
      'A pale freshwater dolphin of the Yangtze, declared functionally extinct after a 2006 expedition found none. The first dolphin species lost to human activity.',
    threats: 'Fishing gear, ship traffic, dams, pollution',
    range: [[S, 'CHN']],
    pop: [
      [1979, 400],
      [1997, 13],
      [2006, 1],
    ],
  }),
  animal({
    id: 'japanese-wolf',
    name: 'Japanese wolf',
    sci: 'Canis lupus hodophilax',
    group: 'mammal',
    status: 'EX',
    extinct: 1905,
    about:
      'A small wolf worshipped in Shinto shrines. Rabies, a hunting bounty and forest clearing erased it; the last was killed in Nara in 1905.',
    threats: 'Rabies and distemper, bounty hunting, habitat loss',
    range: [[S, 'JPN']],
    pop: [[1905, 1]],
  }),
  animal({
    id: 'falkland-wolf',
    name: 'Falkland Islands wolf',
    sci: 'Dusicyon australis',
    group: 'mammal',
    status: 'EX',
    extinct: 1876,
    about:
      'The only native land mammal of the Falklands and the first documented canid to go extinct in historical times. Charles Darwin saw one in 1834.',
    threats: 'Hunting and poisoning by settlers',
    range: [[S, 'FLK']],
  }),
  animal({
    id: 'caribbean-monk-seal',
    name: 'Caribbean monk seal',
    sci: 'Neomonachus tropicalis',
    group: 'mammal',
    status: 'EX',
    extinct: 1952,
    about:
      'The only seal native to the warm Caribbean. Hunted for oil and food since Columbus, it was last seen on Serranilla Bank in 1952.',
    threats: 'Hunting for oil, fishing pressure',
    range: [
      [S, 'BHS CUB JAM HTI DOM MEX BLZ HND NIC USA'],
      [1850, 'BHS JAM MEX HND NIC'],
    ],
  }),
  animal({
    id: 'sea-mink',
    name: 'Sea mink',
    sci: 'Neogale macrodon',
    group: 'mammal',
    status: 'EX',
    extinct: 1894,
    about:
      'A large coastal mink valued for its fur, trapped out of existence along the New England and Maritime Canada coasts.',
    threats: 'Fur trapping',
    range: [[S, 'USA CAN']],
  }),
  animal({
    id: 'bramble-cay-melomys',
    name: 'Bramble Cay melomys',
    sci: 'Melomys rubicola',
    group: 'mammal',
    status: 'EX',
    extinct: 2009,
    about:
      'A rodent living on a tiny Great Barrier Reef sand cay. Storm surges and rising seas flooded its island; it is often called the first mammal extinction caused by human-driven climate change.',
    threats: 'Sea-level rise and storm surge',
    range: [[S, 'AUS']],
    pop: [
      [1978, 98],
      [2009, 1],
    ],
  }),
  animal({
    id: 'atlas-bear',
    name: 'Atlas bear',
    sci: 'Ursus arctos crowtheri',
    group: 'mammal',
    status: 'EX',
    extinct: 1870,
    about:
      'Africa’s only native bear, once found in the Atlas Mountains. It was hunted out, partly for Roman arena spectacles and later by colonial hunters.',
    threats: 'Hunting, capture for arena shows',
    range: [[S, 'MAR DZA TUN']],
  }),
  animal({
    id: 'bluebuck',
    name: 'Bluebuck',
    sci: 'Hippotragus leucophaeus',
    group: 'mammal',
    status: 'EX',
    extinct: 1800,
    about:
      'The first African large mammal to go extinct in historic times, wiped out within about 100 years of European settlement.',
    threats: 'Hunting, farmland expansion',
    range: [[S, 'ZAF']],
  }),
];
