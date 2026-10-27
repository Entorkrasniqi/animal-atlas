# Animal Atlas

An interactive world map of 100 animals — 58 living, 42 extinct. Pick an animal on the left, drag the
timeline from **50,000 BCE to today**, and watch where it lives, how many remain, or when and where it
disappeared.

- **Map** – shows *where in* its countries the animal has been recorded, as a heat surface: pale blue
  where it is rare, through sand and orange, to dark red where it is most common. Land animals stop at
  the coast and at the borders of their countries; sea animals are painted on the water. Once extinct,
  the last known range stays in muted violet-greys. Hover for how common it is at that spot. Scroll/pinch
  to zoom, drag to pan, click a country to filter the list to animals found there.
- **Timeline** – drag, click, use the arrow keys (Shift = ×10) and Page Up / Page Down to hop between
  extinctions, or press play. The scale is non-linear: deep time is compressed so the last 500 years
  get room. Ticks mark extinctions and are clickable.
- **Detail panel** – status in the chosen year, interpolated population, a log-scale population chart,
  threats, the country list, a silhouette, and **sources** for every animal.
- **Overview** – close the detail panel to see how many atlas animals live in each country at that year
  (this view is still per country).
- The URL hash (`#animal=tiger&year=1936`) is shareable.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + validate data + production build into dist/
npm run data         # rebuild the dataset from the open sources (see below)
npm run build:fresh  # re-query every source, then build
```

## Stack

Svelte 5 + TypeScript + Vite. The map is drawn on a **canvas** (d3-geo projection, d3-zoom) rather than
SVG so redrawing ~240 detailed countries stays at 60 fps while dragging the timeline. There is no
backend: the app imports one static JSON file, the 50m country outlines (`world-atlas`) load as a
separate lazy chunk, and each animal's range layers (`src/data/generated/ranges/<id>.json`) load when
it is selected. The build in `dist/` is static and can be hosted anywhere.

## The data pipeline

The dataset is **generated**, not hand-typed. Facts that no open API provides (population estimates,
extinction dates, the written summaries) live in a small editorial layer; everything else is read
from public sources, checked against that layer, and written to a static file the app imports.

```
data/curated/*.ts  ─┐
                    ├─►  scripts/pipeline  ─►  src/data/generated/animals.json   (the app reads this)
GBIF · PBDB ·       │      (cached, throttled)  public/silhouettes/*.svg + CREDITS.md
PhyloPic · Wikipedia┘                           data/generated/report.md          (what to review)
```

| Source | What it supplies | How it is used |
|---|---|---|
| [GBIF](https://www.gbif.org) Backbone | Accepted names, classification | Resolves every animal; keys the other lookups |
| IUCN Red List, mirrored by GBIF | Conservation status | **Overrides** the curated status when IUCN assessed exactly that taxon |
| GBIF occurrences | Where observers and museums recorded the species | **Confirms** the curated range ("9 of 11 countries have records since 1990"). Never extends it: counts show where people look, not where animals live (tigers have zoo records in the US) |
| GBIF density tiles | Sighting counts per ~0.35° cell (about 39 km) | **Draws the map**: where in its countries, and how often, an animal was recorded (see below) |
| [Paleobiology Database](https://paleobiodb.org) | Fossil finds with country, coordinates and age | **Extends** an extinct species' Ice Age range where ≥2 well-dated finds exist, cross-checks curated extinction dates, and draws the Ice Age map |
| [PhyloPic](https://www.phylopic.org) | Silhouettes | Self-hosted; only CC0, public-domain and CC BY images; falls back to a close relative (genus, then family) and says so |
| Wikipedia | Article links | Verified to resolve to a real article |

### How the map colours are made

Countries say *whether* an animal lives somewhere; the layers say *where in it*. For each range stage
(the "from year" steps of an animal's range) the pipeline builds a layer on a 1024 × 512 world grid:

1. **Count** records on the grid: GBIF sightings and museum specimens from the stage's own years, and
   for extinct species Paleobiology Database finds weighted by how well their dating fits the stage.
2. **Clip** them to the stage's countries (plus one cell of coast for islands and shores). That is what
   keeps a zoo tiger in Texas off the map. Sea animals are not clipped; shore animals get a 2° margin.
3. In the browser the counts are log-scaled and smoothed over about 80 km into a continuous surface.
   Every screen pixel is turned back into a longitude and latitude, the surface is sampled there with
   bicubic interpolation, and the value is looked up in a 1024-step colour table (`src/lib/heat.ts`), so
   there are no cell edges or colour steps at any zoom. The picture is repainted when a pan or zoom
   settles. Pale blue is rare, dark red most common **relative to that animal's own busiest places**.

When a stage has too few records of its own (fewer than 5), the layer falls back, in order, to every
record since 1700 inside its countries (`all-time`), to the hand-drawn boxes in `data/curated/areas.ts`
(`area`), and finally to the bare countries (`countries`). The last two have no
abundance information, so they are drawn in one flat grey-blue and labelled approximate.

What the colour is, and is not: it is **how often the animal was recorded nearby**, which follows where
people and cameras are as well as where animals are. A national park looks hotter than a roadless
forest with more animals in it, and blank areas can still hold animals. It is a better answer than a
filled country, not a census.

Every run writes `data/generated/report.md`: IUCN statuses that differ from the curated ones, fossil
extinction-date disagreements, listed countries GBIF cannot confirm, GBIF records outside the range,
and silhouettes that show a relative. Those are the places a human should look.

Good to know:

- **Reproducible builds.** The generated files are committed, so `npm run build` needs no network.
  `npm run data` reuses a local cache in `.cache/` (git-ignored) and only fetches what is new;
  `--refresh` ignores it. `npm run data -- --only=tiger,dodo` is a dry run that writes nothing.
- **Polite to public APIs.** Requests are throttled per host, retried with back-off, and identify the
  project in the User-Agent.
- **Not generated.** Population figures and extinction dates are curated from published estimates;
  the "How this entry was built" note on each animal says so. No open API provides them (the Living
  Planet Index and IUCN API are licence- or token-restricted).

## Adding an animal

Add an entry to `data/curated/*.ts` with the `animal()` helper, then run `npm run data`:

```ts
animal({
  id: 'thylacine',
  name: 'Thylacine (Tasmanian tiger)',
  sci: 'Thylacinus cynocephalus',
  group: 'mammal',               // mammal | bird | reptile | amphibian | fish | invertebrate
  habitat: 'land',               // land (default) | coast | sea: how the range is clipped and drawn
  status: 'EX',                  // fallback; the pipeline uses IUCN's category when it has one
  extinct: 1936,                 // omit for living species; negative = BCE
  about: '…',
  threats: '…',
  range: [                       // [from-year, ISO alpha-3 codes] – each stage applies until the next
    [S, 'AUS PNG IDN'],
    [-1200, 'AUS'],
  ],
  pop: [[1805, 4000], [1933, 1]],// optional [year, count]; interpolated on a log scale
  hints: { gbif: '…', pbdb: '…', wikipedia: '…' }, // only if a source doesn't know the scientific name
});
```

If the animal's range stage is a refuge much smaller than its country (an island, a single mountain
range) and GBIF has little to say about it, add rough `[west, south, east, north]` boxes for that stage in
`data/curated/areas.ts`; without them the whole country is shaded. Boxes also confine the stage's
sightings to the refuge. Set `habitat: 'sea'` or `'coast'` for animals of the water.

`npm run check:data` validates the generated dataset: country codes, range stages, range layers,
licences, that every silhouette file exists, and that it covers exactly the curated entries.

## About the data

Figures are rounded estimates drawn from the IUCN Red List, WWF and published studies, and are
approximate. Ranges are simplified to modern-day countries (marine species list the countries whose
waters they visit). Treat it as a starting point, not a scientific record, and check primary sources
before relying on any number. Silhouettes are credited per animal and in `public/silhouettes/CREDITS.md`.
