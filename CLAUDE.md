# Animal Atlas: context for Claude

Read this first in any new session. It says what the product is, how the code is laid out, what has been
decided, and what to watch out for. If you change the architecture or finish a roadmap item, update this
file in the same change. Detailed data-pipeline docs live in `README.md`.

## Product idea

**Animal Atlas** is an interactive world map of 100 animals (58 living, 42 extinct) that shows *where* they
live, *how many* remain, and *when and why* they disappeared. It is a static web app with no backend.

Two modes, switched at the top of the sidebar:

1. **Explore** – pick an animal, drag a timeline from 50,000 BCE to 2025, and watch its range (drawn as a
   heat surface from real sightings and fossils), its population, and its extinction. Overview mode (no
   animal selected) colours countries by how many atlas animals live there.
2. **What if…** – a scenario explorer for extinction drivers. Six sliders (warming, habitat loss, hunting and
   fishing, invasive species, pollution, disease) add pressure on top of today. Every living animal gets a
   0–100 score; the list re-ranks, countries darken where animals are under more pressure, and an animal's
   panel shows which pressures hit it and why.

The owner's goal: make the causes of animal extinction *visible and explorable*, grounded in real research.
They think in terms of "a person enters an input (e.g. temperature) and sees which animals are most at
risk". Visual feedback when an input changes is a priority.

### Product principles (do not break these)

- **Honest about uncertainty.** The map colour is *how often an animal was recorded nearby*, not a census.
  What-if scores *compare animals*; they are **not forecasts**. Say so in the UI wherever scores appear.
- **Never imply knowledge we don't have.** Example: we do not shrink a range for "habitat loss", because we
  don't know *where* habitat disappears. Show numbers (area left) instead of redrawing geography.
- **Sources for everything.** Every animal links its sources; every what-if driver cites the research
  behind it (see `DRIVERS` in `src/lib/scenario.ts` and "Research facts" below).
- **Hand-made estimates are labelled as such.** The 0–3 threat levels are editorial, not IUCN data.
- **No backend, no network at runtime.** The generated data is committed; `npm run build` needs no network.

## Stack and commands

Svelte 5 (runes) + TypeScript + Vite. Map is a **canvas** (d3-geo `geoNaturalEarth1`, d3-zoom), not SVG.
No UI library; styling is plain scoped CSS with tokens in `src/app.css` (warm paper palette, terracotta
accent, Newsreader serif for headings, Inter for text).

```bash
npm run dev            # http://localhost:5173
npm run check          # svelte-check + tsc for scripts/data  (must be 0 errors)
npm run check:data     # validates the dataset, threat levels and exposure file
npm test               # Vitest unit tests (npm run test:watch while developing)
npm run build          # check + check:data + tests + vite build
npm run data           # rebuild dataset from GBIF/PBDB/PhyloPic/Wikipedia (cached, throttled)
npm run data:exposure  # rebuild only exposure.json from range files on disk (offline)
```

Before calling work done: `npm run build` (it runs all of the above). New logic gets a test next to it.

## Architecture

### Data flow

```
data/curated/*.ts  ──►  scripts/pipeline  ──►  src/data/generated/animals.json        (animals, ranges, sources)
(editorial layer)        (GBIF, PBDB,          src/data/generated/ranges/<id>.json     (per-animal heat cells, lazy-loaded)
                          PhyloPic, Wikipedia)  src/data/generated/exposure.json        (range area + latitude bands, living animals)
                                                src/data/generated/basemap/*.json       (states, cities, lakes, rivers)
                                                public/silhouettes/*.svg
data/curated/pressures.ts ─────────────────────► imported straight by src/data/index.ts (what-if threat levels)
```

- **Generated files are committed.** Never hand-edit `src/data/generated/*`; change `data/curated/*` or the
  pipeline and regenerate. Population figures and extinction dates are curated (no open API provides them).
- `data/curated/*.ts` use the `animal()` helper (`helpers.ts`). `areas.ts` holds hand-drawn range boxes for
  refuges smaller than a country.
- The world grid is 1024 × 512 cells of 0.3516° (about 39 km); see `src/lib/grid.ts`.

### Layout (`src/App.svelte`)

CSS grid: `side` (330px sidebar) | `stage` (map) | `detail` (380px, right) over a full-width `time` row.
`.has-detail` adds the right column. On ≤720px it becomes a column: map, time bar, detail, list.
`App.svelte` owns all state (`year`, `selectedId`, `mode`, `scenario`, filters), the URL hash, playback, and
the derived values the children render.

### Key modules (`src/lib`, `src/components`)

| File | Job |
|---|---|
| `lib/types.ts` | `Animal`, `RangeLayer`, `Mode`, `DriverId`, `Level`, `Exposure`, labels |
| `lib/state.ts` | Pure helpers: range/population at a year, countries ↔ animals |
| `lib/time.ts` | Non-linear timeline scale, `MAX_YEAR` (2025), formatting |
| `lib/heat.ts` | Range cells → smoothed density; colour ramps (OKLab); `renderField` paints per pixel, optionally tinted by score or by local warming (`RangeTint`) |
| `lib/geo.ts`, `basemap.ts`, `labels.ts` | Countries, base map, label placement |
| `lib/scenario.ts` | **What-if model**: `DRIVERS`, `assess()`, `riskByCountry()`, hash helpers |
| `components/WorldMap.svelte` | Canvas map: zoom/pan, country fill, heat texture, tooltip |
| `components/Sidebar.svelte` | Mode switch, search/filters, list (explore) or risk-ranked list (what-if) |
| `components/DetailPanel.svelte` | Animal details; embeds `ScenarioCard` in what-if mode |
| `components/Timeline.svelte` | Year slider (Explore only) |
| `components/ScenarioBar.svelte` | The six driver sliders (What-if only; takes the timeline's slot) |
| `components/ScenarioCard.svelte` | Per-animal "Under this scenario" breakdown |
| `components/RiskMark.svelte`, `ScoreBar.svelte` | List score mark; bar with dark "today" + light "added" segments |
| `components/SummaryPanel.svelte` (+ `BandStrip`, `DriverBars`, `GroupBars`) | Right column in What-if when nothing is selected |
| `components/MethodNote.svelte` | "How the scores work" disclosure in the sidebar |
| `src/data/index.ts` | Loads JSON; exports `animals`, `animalById`, `exposureById`, `pressureById`, `iceBound` |

### URL hash (shareable state)

`#animal=tiger&year=1936`, `#overview&year=1900`, and in What-if mode
`#whatif&animal=polar-bear&warming=3&habitat=20`. `readHash()` / the write `$effect` in `App.svelte` are the
only places that touch it. Entering What-if clears the selection and pins the year to 2025; leaving restores
what Explore was showing.

### Rendering notes

- Per-animal range files load on selection (`src/data/ranges.ts`). The heat is repainted per pixel when the
  view settles (`WorldMap.paintHeat` → `heat.renderField`); it is expensive, so avoid triggering repaints
  on every slider tick (throttle, or key repaints on a small primitive).
- The legend container is `aria-hidden`; put interactive controls elsewhere.
- `prefers-reduced-motion` disables CSS transitions globally (`app.css`); handle JS/Svelte animations yourself.

## The what-if model (`src/lib/scenario.ts`)

Score 0–100 per **living** animal:

```
start     = IUCN status as number (LC 5, NT 15, VU 30, EN 50, CR 75) ± 4 points for small population/range
pressure  = slider fraction × reach × (level/3) × (0.6 + 0.4 × fragility)       per driver, capped at 0.85
risk      = 1 − (1 − start) × Π(1 − pressure_d)
```

- `level` (0–3) is **hand-curated** per animal and driver in `data/curated/pressures.ts` (`PRESSURES`).
  `ICE_BOUND` (polar bear, emperor penguin) get the polar warming factor wherever they are.
- `reach`: warming = `delta × warmingFactor / 12 °C`, where the factor is land 1.45×, coast 1.15×, sea 0.85×,
  rising to 3× in the far north (area-weighted over `exposure.json` latitude bands). Habitat loss reaches
  sea animals only 0.35×; pollution reaches land animals 0.75×.
- `fragility` comes from last population estimate and recorded range area (log scales).
- Slider units: warming = **extra °C from today**; habitat = % of remaining habitat cleared (0–60); the other
  four = % more than today (0–100).
- `rise = score − baseline`. List can rank by **Most affected** (rise) or **Highest risk** (score).
  Ranking by score alone is dominated by today's status (every CR animal already sits near 75).
- Adding a driver: add to `DriverId` (`types.ts`), `DRIVERS` + `reach()` (`scenario.ts`), a level in every
  row of `pressures.ts`, and a line in `check-data.ts`'s `DRIVER_IDS`.

### Research facts used in the UI (all searched this project; check sources before quoting new numbers)

- IPBES 2019 (fetched directly): five direct drivers ranked land/sea use, exploitation, climate, pollution,
  invasives; ~75% of land and 66% of ocean significantly altered; 33% of marine fish stocks fished
  unsustainably; plastic up tenfold since 1980; 400+ dead zones; ~5% of species at risk at 2 °C, 16% at 4.3 °C.
- Maxwell et al. 2016: of 8,688 threatened species, agriculture threatens 62%, overexploitation 72%.
- Ripple et al. 2016: hunting is a major threat to 301 mammals.
- IPBES 2023 invasives: ~60% of recorded plant+animal extinctions, 16% sole cause, ~90% on islands.
- Scheele et al. 2019: chytrid fungus, 501 amphibian species declining, 90 presumed extinct.
- Urban 2024 (*Science*): ~1.8% of species at risk at 1.5 °C, ~1 in 20 at 2.7 °C, ~15% at 4.3 °C, ~30% at 5.4 °C.
  Secondary coverage has unit slips; the DOI is 10.1126/science.adp4461.
- WMO 2025: global temperature ≈ 1.43 ± 0.13 °C above 1850–1900 (2024: ≈ 1.55). Used as "today ≈ 1.4 °C" to
  convert sourced warming presets into the slider's "extra from today".
- IUCN Red List (Oct 2025): 172,620 species assessed, 48,646 threatened.
- Land vs ocean warming (+1.6 vs +0.9 °C while the globe warmed 1.1 °C) is the IPCC AR6 figure but was
  confirmed only through a secondary summary; Arctic warming 3–4× global is Rantanen et al. 2022.

## Tests (Vitest, `*.test.ts` next to the code)

96 tests, about half a second. Covered: `lib/time` (timeline scale, formatting), `lib/state` (stages,
population interpolation), `lib/heat` (density, ramps, `renderField` painting on a stand-in canvas),
`lib/scenario` (the whole model), `scripts/pipeline/exposure` (area and latitude bands), and
`src/data/data.test.ts` (the shipped curated data and the story the model tells with it).

- `scenario.test.ts` mocks `../data` with fake animals (`vi.mock`) so it tests the *model*; edits to the real
  threat levels cannot break it. `data.test.ts` is the opposite: it pins the real data's behaviour (e.g.
  warming puts the sea-ice animals first). If you re-curate levels on purpose and it fails, check the new
  ranking still makes sense, then update the expectation.
- Fixtures must be built at module top level, not in `beforeAll` (`describe` bodies run at collection time).
- Painting is tested by stubbing `document.createElement('canvas')`; there is no DOM environment. Components
  (Svelte) and pointer interaction are **not** unit-tested.
- Mutation-checked once: 15 deliberate breakages of the model, state, timeline, heat and exposure code were
  all caught. Do this again for new logic (change the code, confirm a test fails, restore).

## Conventions

- Match the surrounding code: comments explain *why*, short, no filler. Svelte 5 runes (`$state`,
  `$derived`, `$effect`, `$props`, `$bindable`). TypeScript strict, `noUnusedLocals`.
- `src/` may import from `data/curated/pressures.ts`; keep that file free of heavy imports (the other curated
  files pull in every animal).
- Use design tokens from `app.css` (`--accent`, `--s-LC … --s-CR`, `--line`, `--panel`, …); IUCN-style tone
  colours are reused for score bands (`toneOf`).
- Components are small and scoped-CSS; keep keyboard access and `aria-*` on interactive controls.
- Commit only when asked. Branch in use: `map` (main branch is `main`). Commit messages end with the
  co-author line the harness asks for.

## Gotchas

- **No browser tooling in this sandbox**: headless Chrome hangs even on a blank page. Verify UI by (1)
  `npm run check`, (2) server-side rendering the real app through Vite and reading the HTML, e.g. a script
  that does `createServer({ server: { middlewareMode: true }, appType: 'custom' })`, sets
  `globalThis.location = { hash: '#whatif&warming=3' }`, `ssrLoadModule('/src/App.svelte')` and renders it
  with `svelte/server`. That catches template and derived-state errors but **not** pointer interaction,
  canvas painting or layout, so say plainly what was not seen.
- Scratch files go in the session scratchpad, not the repo. `.cache/` is git-ignored.
- Vite chunk-size warnings for the basemap/countries files are pre-existing.
- `Animal` JSON uses `extinctYear` for extinct animals; living = `extinctYear === undefined`. A few CR entries
  with an `extinctYear` are "possibly extinct".
- Scores for extinct animals do not exist; What-if lists living animals only.

## Status and roadmap

**Done**
- Explore mode: map, timeline, detail panel, overview, sightings heat, base map, data pipeline, sources.
- What-if: six sliders with typed number boxes, sourced warming presets (1.5/2/2.7/4.3/5.4 °C, converted to
  "extra from today" with `WARMING_TODAY = 1.4`) and a ▶ sweep; scoring model; risk-ranked list
  ("Most affected" / "Highest risk") with animated reordering, ▲/▼ moves vs today's order, silhouettes tinted
  by score and today-plus-added score bars (`ScoreBar`); country shading in overview; summary panel
  (`SummaryPanel`: band strip, most affected, what-matters-most, by-group) in the right column when nothing
  is selected; per-animal `ScenarioCard`; "Colour range by" switch (sightings / scenario score / local
  warming) that recolours the selected animal's range (`RangeTint` in `heat.ts`, `tint` prop on `WorldMap`);
  hash round-trip; data checks.

**Unit tests**: 96 passing (see above). **Not verified in a real browser** (no browser tooling here): pointer interaction, the canvas painting of
the tints on screen, row animation, and layout at narrow widths. The tint colouring was tested with a
stub canvas (`renderField` called directly): polar-bear range comes out deep red at +3 °C, a lion's orange,
and 0 °C is the palest sand. Look at it with `npm run dev` before relying on the visuals.

**Ideas not started**: IUCN Red List API for real per-species threat levels (needs a free token); a
sweep of time to 2100; compare two scenarios side by side; a map layer of the warming pattern itself
(not only on the selected animal's range).
