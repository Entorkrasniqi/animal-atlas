# Data pipeline report

Generated 2026-10-31 from 100 curated entries. Re-run with `npm run data`.

## Coverage

| | Count |
|---|---|
| Animals | 100 |
| Matched in GBIF | 100 |
| Silhouette of the species itself | 72 |
| Silhouette of the genus / family | 13 / 14 |
| No silhouette | 1 |
| Wikipedia article linked | 100 |
| Paleobiology Database entry linked | 25 |
| Range periods drawn from their own sightings or fossils | 105 |
| Range periods drawn from all records inside their countries | 23 |
| Range periods drawn from a hand-drawn area (`data/curated/areas.ts`) | 29 |
| Range periods known only as whole countries | 4 |

## IUCN status differs from the curated one (IUCN was applied) (2)

- **baiji**: Curated EX, IUCN says CR (Critically Endangered).
- **rabbs-treefrog**: Curated EX, IUCN says CR (Critically Endangered).

## Curated extinction date vs Paleobiology Database bounds (1)

- **irish-elk**: Curated extinction 5,700 BCE (7,650 years ago) is outside PBDB's last-appearance bounds (11,700 to 129,000 years ago). PBDB holds few young Holocene dates, so a younger curated date can still be right; check the literature.

## Listed countries with no GBIF records (kept, but unconfirmed) (25)

- **african-elephant**: No GBIF records 1990 onward in: CAF COD MLI SSD SDN SOM TGO GIN SEN.
- **asian-elephant**: No GBIF records 1990 onward in: MMR LAO.
- **tiger**: No GBIF records 1990 onward in: BTN MMR VNM.
- **african-lion**: No GBIF records 1990 onward in: SSD SOM AGO.
- **black-rhino**: No GBIF records 1990 onward in: ZMB.
- **white-rhino**: No GBIF records 1990 onward in: MOZ.
- **western-gorilla**: No GBIF records 1990 onward in: GNQ AGO NGA COD.
- **chimpanzee**: No GBIF records 1990 onward in: SLE GHA GNQ BDI SSD MLI.
- **snow-leopard**: No GBIF records 1990 onward in: AFG BTN UZB.
- **amur-leopard**: No GBIF records 1990 onward in: CHN.
- **jaguar**: No GBIF records 1990 onward in: HND.
- **cheetah**: No GBIF records 1990 onward in: BFA CMR CAF ETH MLI MOZ NGA SOM AGO SDN IND.
- **grey-wolf**: No GBIF records 1990 onward in: TKM AFG MDA PRK.
- **giraffe**: No GBIF records 1990 onward in: BWA CAF ETH MWI MOZ SOM ZMB ZWE SWZ RWA.
- **hippopotamus**: No GBIF records 1990 onward in: GIN LBR SLE SOM SSD SDN.
- **african-wild-dog**: No GBIF records 1990 onward in: AGO COD CMR TCD SWZ UGA.
- **blue-whale**: No GBIF records 1990 onward in: COL PAN ZAF MOZ MDG JPN RUS CHN KOR NOR BRA URY.
- **humpback-whale**: No GBIF records 1990 onward in: IDN.
- **great-indian-bustard**: No GBIF records 1990 onward in: PAK.
- **leatherback-turtle**: No GBIF records 1990 onward in: GUY LKA THA.
- **great-white-shark**: No GBIF records 1990 onward in: CHL PER ECU ARG URY NAM MOZ MDG IND JPN CHN ITA MLT HRV DZA EGY TUR.
- **whale-shark**: No GBIF records 1990 onward in: KEN SOM YEM ERI CHN.
- **coelacanth**: No GBIF records 1990 onward in: KEN.
- **beluga-sturgeon**: No GBIF records 1990 onward in: KAZ AZE IRN TKM ROU BGR SRB.
- **bluefin-tuna**: No GBIF records 1990 onward in: ISL TUN LBY EGY MAR.

## GBIF records outside the curated range (not applied) (14)

- **asian-elephant**: Records outside the curated range: USA (4406). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **african-lion**: Records outside the curated range: IND (207). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **black-rhino**: Records outside the curated range: USA (170). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **western-gorilla**: Records outside the curated range: USA (133). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **chimpanzee**: Records outside the curated range: USA (74), GMB (55). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **snow-leopard**: Records outside the curated range: USA (91). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **grey-wolf**: Records outside the curated range: AUS (35053), CHL (7222), COL (7130), GBR (1548). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **hippopotamus**: Records outside the curated range: COL (162). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **african-wild-dog**: Records outside the curated range: USA (95). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **great-auk**: Records outside the curated range: CAN (88). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **leatherback-turtle**: Records outside the curated range: FRA (1473), IRL (1139), GBR (830), NAM (345), PRT (292), CMR (266). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **galapagos-tortoise**: Records outside the curated range: COL (1978), BRA (1143), PER (219), ARG (217), BOL (141), SUR (80). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **bluefin-tuna**: Records outside the curated range: BHS (94). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.
- **monarch-butterfly**: Records outside the curated range: CRI (155). Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.

## Ice Age ranges extended by fossil finds (applied) (2)

- **woolly-mammoth**: Deep-time range extended by fossil finds in: GRC.
- **irish-elk**: Deep-time range extended by fossil finds in: GRC.

## Periods not drawn from their own records (too few sightings or fossil finds) (56)

- **asian-elephant**: 50,000 BCE–701 BCE: 0 records of its own, so it shows all 6,204 records inside its countries.
- **asiatic-lion**: 50,000 BCE–1899: 0 records of its own, so it shows all 10 records inside its countries.
- **asiatic-lion**: 1900–1944: 1 record of its own, so it shows all 10 records inside its countries.
- **giant-panda**: 50,000 BCE–2,001 BCE: 0 records of its own, so it shows all 35 records inside its countries.
- **white-rhino**: 50,000 BCE–1894: 0 records of its own, so it shows all 3,540 records inside its countries.
- **white-rhino**: 1895–1959: 0 records of its own, so it shows all 3,138 records inside its countries.
- **northern-white-rhino**: 1960–2008: 0 records of its own, so it shows all 65 records inside its countries.
- **northern-white-rhino**: 2009–2025: no usable records; drawn from a hand-drawn area.
- **javan-rhino**: 50,000 BCE–1959: 1 record of its own, so it shows all 8 records inside its countries.
- **javan-rhino**: 1960–2009: 0 records of its own, so it shows all 8 records inside its countries.
- **indian-rhino**: 50,000 BCE–1899: 0 records of its own, so it shows all 1,239 records inside its countries.
- **sumatran-rhino**: 50,000 BCE–1979: no usable records; drawn from a hand-drawn area.
- **sumatran-rhino**: 1980–2018: no usable records; drawn from a hand-drawn area.
- **sumatran-rhino**: 2019–2025: no usable records; drawn from a hand-drawn area.
- **amur-leopard**: 50,000 BCE–1969: 2 records of its own, so it shows all 44 records inside its countries.
- **hippopotamus**: 50,000 BCE–1849: 0 records of its own, so it shows all 11,658 records inside its countries.
- **iberian-lynx**: 50,000 BCE–1899: 0 records of its own, so it shows all 944 records inside its countries.
- **woolly-mammoth**: 12,000 BCE–8,001 BCE: 0 records of its own, so it shows all 24 records inside its countries.
- **woolly-mammoth**: 8,000 BCE–3,601 BCE: 0 records of its own, so it shows all 19 records inside its countries.
- **woolly-mammoth**: 3,600 BCE–2,000 BCE: no usable records; drawn from a hand-drawn area.
- **woolly-rhino**: 50,000 BCE–20,001 BCE: 2 records of its own, so it shows all 7 records inside its countries.
- **woolly-rhino**: 20,000 BCE–12,000 BCE: no usable records; drawn from a hand-drawn area.
- **giant-ground-sloth**: 50,000 BCE–8,000 BCE: 3 records of its own, so it shows all 9 records inside its countries.
- **irish-elk**: 50,000 BCE–10,001 BCE: 2 records of its own, so it shows all 6 records inside its countries.
- **irish-elk**: 10,000 BCE–5,700 BCE: no usable records; drawn from a hand-drawn area.
- **cave-bear**: 50,000 BCE–22,000 BCE: 1 record of its own, so it shows all 5 records inside its countries.
- **diprotodon**: 50,000 BCE–42,000 BCE: no usable records; drawn from a hand-drawn area.
- **stellers-sea-cow**: 1500–1768: no usable records; drawn from a hand-drawn area.
- **quagga**: 50,000 BCE–1883: no usable records; drawn from a hand-drawn area.
- **aurochs**: 1000–1563: no usable records; drawn from a hand-drawn area.
- **aurochs**: 1564–1627: no usable records; drawn from a hand-drawn area.
- **thylacine**: 50,000 BCE–1,201 BCE: 4 records of its own, so it shows all 20 records inside its countries.
- **bali-tiger**: 50,000 BCE–1937: no usable records; drawn from a hand-drawn area.
- **javan-tiger**: 50,000 BCE–1976: no usable records; drawn from a hand-drawn area.
- **caspian-tiger**: 50,000 BCE–1919: no usable records; drawn from a hand-drawn area.
- **caspian-tiger**: 1920–1959: no usable records; drawn from a hand-drawn area.
- **caspian-tiger**: 1960–1970: no usable records; drawn from a hand-drawn area.
- **pyrenean-ibex**: 50,000 BCE–1899: no usable records; drawn from a hand-drawn area.
- **pyrenean-ibex**: 1900–2000: no usable records; drawn from a hand-drawn area.
- **western-black-rhino**: 50,000 BCE–1979: no usable records; drawn from a hand-drawn area.
- **western-black-rhino**: 1980–2011: no usable records; drawn from a hand-drawn area.
- **baiji**: 50,000 BCE–2006: no usable records; drawn from a hand-drawn area.
- **japanese-wolf**: 50,000 BCE–1905: no usable records; drawn from a hand-drawn area.
- **falkland-wolf**: 50,000 BCE–1876: no usable records; only the countries are known.
- **caribbean-monk-seal**: 1850–1952: 4 records of its own, so it shows all 61 records inside its countries.
- **sea-mink**: 50,000 BCE–1894: no usable records; drawn from a hand-drawn area.
- **bramble-cay-melomys**: 50,000 BCE–2009: no usable records; drawn from a hand-drawn area outside the country outlines.
- **atlas-bear**: 50,000 BCE–1870: no usable records; drawn from a hand-drawn area.
- **bluebuck**: 50,000 BCE–1800: no usable records; drawn from a hand-drawn area.
- **moa**: 50,000 BCE–1445: no usable records; only the countries are known.
- **haasts-eagle**: 50,000 BCE–1400: no usable records; drawn from a hand-drawn area.
- **elephant-bird**: 50,000 BCE–1000: no usable records; only the countries are known.
- **dodo**: 50,000 BCE–1662: no usable records; only the countries are known.
- **rodrigues-solitaire**: 50,000 BCE–1760: no usable records; drawn from a hand-drawn area outside the country outlines.
- **gharial**: 50,000 BCE–1979: 2 records of its own, so it shows all 791 records inside its countries.
- **beluga-sturgeon**: 50,000 BCE–1899: 0 records of its own, so it shows all 25 records inside its countries.

## Silhouette shows a relative, not the species (27)

- **northern-white-rhino**: Shows genus Ceratotherium.
- **javan-rhino**: Shows genus Rhinoceros.
- **mountain-gorilla**: Shows genus Gorilla.
- **giraffe**: Shows genus Giraffa.
- **pyrenean-ibex**: Shows genus Capra.
- **falkland-wolf**: Shows family Canidae.
- **sea-mink**: Shows genus Mustela.
- **bramble-cay-melomys**: Shows family Muridae.
- **bluebuck**: Shows genus Hippotragus.
- **kakapo**: Shows family Psittacidae.
- **whooping-crane**: Shows genus Grus.
- **philippine-eagle**: Shows family Accipitridae.
- **great-indian-bustard**: Shows genus Ardeotis.
- **moa**: Shows genus Dinornis.
- **haasts-eagle**: Shows family Accipitridae.
- **labrador-duck**: Shows family Anatidae.
- **passenger-pigeon**: Shows family Columbidae.
- **carolina-parakeet**: Shows family Psittacidae.
- **poouli**: Shows family Fringillidae.
- **galapagos-tortoise**: Shows genus Chelonoidis.
- **lord-howe-stick-insect**: Shows family Phasmatidae.
- **golden-toad**: Shows genus Incilius.
- **gastric-brooding-frog**: Shows genus Rheobatrachus.
- **rabbs-treefrog**: Shows family Hylidae.
- **chinese-paddlefish**: Shows family Polyodontidae.
- **rocky-mountain-locust**: Shows family Acrididae.
- **xerces-blue**: Shows family Lycaenidae.

## No silhouette available (1)

- **giant-ground-sloth**: No permissively licensed PhyloPic silhouette up to family level.
