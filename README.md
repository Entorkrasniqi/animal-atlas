# Animal Atlas

An interactive world map of 100 animals — 58 living, 42 extinct. Pick an animal on the left, drag the
timeline from **50,000 BCE to today**, and watch where it lives, how many remain, or when and where it
disappeared.

- **Map** – countries light up green where the animal lives in the selected year; once extinct, its last
  known range is hatched red. Tiny island nations get a dot. Scroll/pinch to zoom, drag to pan, click a
  country to filter the list to animals found there.
- **Timeline** – drag, click, use the arrow keys (Shift = ×10) and Page Up / Page Down to hop between extinctions, or press
  play. The scale is non-linear: deep time is compressed so the last 500 years get room. Red ticks mark
  extinctions and are clickable.
- **Detail panel** – status in the chosen year, interpolated population, a log-scale population chart,
  threats, and the list of countries.
- **Overview** – close the detail panel to see how many atlas animals live in each country at that year.
- The URL hash (`#animal=tiger&year=1936`) is shareable.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run check:data # validates every animal and country code
```

## Stack

Svelte 5 + TypeScript + Vite. The map is drawn on a **canvas** (d3-geo projection, d3-zoom) rather
than SVG so recolouring ~240 detailed countries stays at 60 fps while dragging the timeline. There is no
backend: the dataset is bundled as typed code and the 50m country outlines (`world-atlas`) load as a
separate lazy chunk. The build in `dist/` is static and can be hosted anywhere.

## Adding an animal

Animals live in `src/data/*.ts`, written with the `animal()` helper:

```ts
animal({
  id: 'thylacine',
  name: 'Thylacine (Tasmanian tiger)',
  sci: 'Thylacinus cynocephalus',
  group: 'mammal',               // mammal | bird | reptile | amphibian | fish | invertebrate
  status: 'EX',                  // IUCN: LC NT VU EN CR EW EX
  extinct: 1936,                 // omit for living species; negative = BCE
  about: '…',
  threats: '…',
  range: [                       // [from-year, ISO alpha-3 codes] – each stage applies until the next
    [S, 'AUS PNG IDN'],
    [-1200, 'AUS'],
  ],
  pop: [[1805, 4000], [1933, 1]],// optional [year, count]; interpolated on a log scale
  popUnit: 'individuals',        // optional
});
```

Run `npm run check:data` afterwards — it catches unknown country codes, unsorted stages and
inconsistent extinction data.

## About the data

Figures are rounded estimates drawn from the IUCN Red List, WWF and published studies, and are
approximate. Ranges are simplified to modern-day countries (marine species list the countries whose
waters they visit). Treat it as a starting point, not a scientific record, and check primary sources
before relying on any number.
