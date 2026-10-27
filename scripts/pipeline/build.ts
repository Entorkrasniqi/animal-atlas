import type { Seed } from '../../data/curated/helpers';
import type { Animal, IucnStatus, RangeLayer, RangeStage, SourceLink } from '../../src/lib/types';
import { CONFIG, toBp } from './config';
import { onMap } from './countries';
import { gbifSpeciesUrl, iucnCategory, matchTaxon, occurrenceCountries, sameTaxon, type CountryEvidence } from './gbif';
import { buildLandMask, type LandMask } from './landmask';
import { lookupTaxon, occurrences, pbdbTaxonUrl, type FossilOccurrence, type PbdbTaxon } from './pbdb';
import { findSilhouette, type SilhouetteHit } from './phylopic';
import { buildLayers } from './range';
import { findArticle } from './wikipedia';

export type FlagKind =
  | 'no-gbif-match'
  | 'status-differs'
  | 'status-conflict'
  | 'extinction-date'
  | 'gbif-unconfirmed'
  | 'gbif-candidates'
  | 'pbdb-extended'
  | 'range-coarse'
  | 'silhouette-relative'
  | 'no-silhouette'
  | 'no-article';

export interface Flag {
  id: string;
  kind: FlagKind;
  detail: string;
}

export interface Built {
  animal: Animal;
  /** Where the animal lives, one layer per range stage. */
  layers: RangeLayer[];
  flags: Flag[];
  /** The SVG to write, when a silhouette was found. */
  silhouette?: SilhouetteHit;
}

const STATUS_NAME: Record<IucnStatus, string> = {
  LC: 'Least Concern',
  NT: 'Near Threatened',
  VU: 'Vulnerable',
  EN: 'Endangered',
  CR: 'Critically Endangered',
  EW: 'Extinct in the Wild',
  EX: 'Extinct',
};

let landMask: LandMask | undefined;

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
const fmtYear = (y: number) => (y <= 0 ? `${Math.abs(y).toLocaleString('en-US')} BCE` : String(y));

export async function buildAnimal(seed: Seed): Promise<Built> {
  const flags: Flag[] = [];
  const flag = (kind: FlagKind, detail: string) => flags.push({ id: seed.id, kind, detail });
  const notes: string[] = [];
  const sources: SourceLink[] = [];
  const extinct = seed.extinctYear !== undefined;

  // 1. Taxonomy: GBIF Backbone ---------------------------------------------
  const taxon = await matchTaxon(seed.hints?.gbif ?? seed.scientific);
  if (!taxon) flag('no-gbif-match', `GBIF has no exact match for "${seed.hints?.gbif ?? seed.scientific}".`);
  else if (taxon.rank === 'GENUS') {
    notes.push(`GBIF has no single entry for this taxon, so lookups use its genus, ${taxon.canonicalName}.`);
  } else {
    notes.push(`Name matched to the GBIF Backbone as ${taxon.canonicalName}${taxon.family ? ` (family ${taxon.family})` : ''}.`);
  }

  // 2. Conservation status: IUCN Red List, read through GBIF ----------------
  let status: IucnStatus = seed.status;
  let statusSource: 'iucn' | 'curated' = 'curated';
  if (taxon) {
    // Ask about the name we matched first: GBIF resolves it by key, so the answer is for that very
    // taxon (even when IUCN spells it differently, e.g. habroptilus/habroptila). Only if there is
    // none, try the accepted usage, and then only when the names agree. Otherwise a synonym or
    // subspecies would inherit its parent's status (an extinct ibex subspecies is not "Least Concern").
    let iucn = taxon.rank === 'GENUS' ? null : await iucnCategory(taxon.key);
    if (!iucn && taxon.rank !== 'GENUS' && taxon.acceptedKey !== taxon.key) {
      const viaAccepted = await iucnCategory(taxon.acceptedKey);
      const comparable = taxon.rank === 'SUBSPECIES' ? taxon.canonicalName : (taxon.lineage[0]?.name ?? taxon.canonicalName);
      if (viaAccepted && sameTaxon(viaAccepted.assessedName, comparable)) iucn = viaAccepted;
    }
    if (iucn) {
      if (iucn.status !== seed.status) {
        flag('status-differs', `Curated ${seed.status}, IUCN says ${iucn.status} (${STATUS_NAME[iucn.status]}).`);
      }
      status = iucn.status;
      statusSource = 'iucn';
      notes.push(`Conservation status (${STATUS_NAME[iucn.status]}) comes from the IUCN Red List, as mirrored by GBIF.`);
      if (extinct && iucn.status === 'CR') {
        notes.push(
          `IUCN lists it as Critically Endangered (possibly extinct) because extinction is not formally confirmed. ` +
            `This atlas dates its extinction to ${fmtYear(seed.extinctYear as number)}; see the description for why.`,
        );
      }
    } else {
      notes.push('The IUCN Red List has no category for this exact taxon, so the status is curated.');
    }
  }
  // A curated extinction date wins over a status label. "Critically Endangered" is the one category
  // IUCN uses for species it suspects are extinct (e.g. the baiji), so that pairing is expected.
  if (extinct && status !== 'EX' && status !== 'CR') {
    flag('status-conflict', `Curated as extinct in ${fmtYear(seed.extinctYear as number)}, but IUCN says ${status}.`);
    status = 'EX';
  } else if (!extinct && status === 'EX') {
    flag('status-conflict', 'IUCN says extinct, but the curated entry has no extinction year.');
  }

  // 3. Range evidence: GBIF occurrences (confirm only, never extend) -----------
  const occKey = taxon ? (taxon.rank === 'SUBSPECIES' ? taxon.key : (taxon.lineage[0]?.key ?? taxon.key)) : null;
  const stages: RangeStage[] = seed.range.map((s) => ({ from: s.from, countries: [...s.countries] }));
  const latest = stages[stages.length - 1].countries;
  const window = !extinct
    ? CONFIG.modernWindow
    : (seed.extinctYear as number) >= CONFIG.historicalFrom + 100
      ? { from: CONFIG.historicalFrom, to: seed.extinctYear as number }
      : null;
  if (taxon && window) {
    const ev: CountryEvidence = await occurrenceCountries(occKey as number, window);
    const confirmed = latest.filter((c) => (ev.byCountry[c] ?? 0) >= CONFIG.gbifConfirmMin);
    const missing = latest.filter((c) => !confirmed.includes(c));
    const span = `${window.from}${extinct ? ` to ${fmtYear(window.to)}` : ' onward'}`;
    notes.push(
      ev.total === 0
        ? `GBIF holds no usable records for ${span}.`
        : `GBIF holds ${plural(ev.total, 'record')} from ${span}; they confirm ${confirmed.length} of ${latest.length} countries in the latest range.`,
    );
    if (ev.total > 0 && missing.length > 0 && confirmed.length > 0) {
      flag('gbif-unconfirmed', `No GBIF records ${span} in: ${missing.join(' ')}.`);
    }
    const candidates = Object.entries(ev.byCountry)
      .filter(([c, n]) => !latest.includes(c) && onMap(c) && n >= CONFIG.gbifCandidateMin && n / ev.total >= CONFIG.gbifCandidateShare)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${c} (${n})`);
    if (candidates.length) {
      flag(
        'gbif-candidates',
        `Records outside the curated range: ${candidates.join(', ')}. Often zoos, escapes, domestic animals counted under the species, or real sightings worth adding by hand.`,
      );
    }
  }

  // 4. Fossil record: Paleobiology Database ------------------------------------
  let pbdb: PbdbTaxon | null = null;
  let finds: FossilOccurrence[] = [];
  if (extinct) {
    pbdb = await lookupTaxon(seed.hints?.pbdb ?? seed.scientific);
    if (pbdb && pbdb.occurrenceCount > 0) {
      finds = await occurrences(pbdb.name);
      const located = finds.filter((f) => f.country && onMap(f.country));
      notes.push(`The Paleobiology Database holds ${plural(pbdb.occurrenceCount, 'fossil occurrence')} of this species.`);

      // Cross-check the curated extinction date against PBDB's last-appearance bounds.
      const bp = toBp(seed.extinctYear as number);
      const youngest = Math.round(pbdb.lastLateMa * 1e6);
      const oldest = Math.round(pbdb.lastEarlyMa * 1e6);
      const tol = CONFIG.extinctionToleranceYears;
      if (bp > oldest + tol || bp < youngest - tol) {
        flag(
          'extinction-date',
          `Curated extinction ${fmtYear(seed.extinctYear as number)} (${bp.toLocaleString('en-US')} years ago) is outside PBDB's last-appearance bounds (${youngest.toLocaleString('en-US')} to ${oldest.toLocaleString('en-US')} years ago). PBDB holds few young Holocene dates, so a younger curated date can still be right; check the literature.`,
        );
      }

      // Extend the deep-time range with countries holding several well-dated Pleistocene finds.
      if ((seed.extinctYear as number) < CONFIG.fossilEraBefore) {
        const { oldestBp, youngestBp } = CONFIG.pleistocene;
        const tally = new Map<string, number>();
        for (const f of located) {
          const tight = f.oldestBp - f.youngestBp <= CONFIG.pbdbMaxWindowYears;
          if (tight && f.youngestBp <= oldestBp && f.oldestBp >= youngestBp) {
            tally.set(f.country as string, (tally.get(f.country as string) ?? 0) + 1);
          }
        }
        const first = stages[0].countries;
        const added = [...tally]
          .filter(([c, n]) => n >= CONFIG.pbdbMinPerCountry && !first.includes(c))
          .sort((a, b) => b[1] - a[1])
          .map(([c]) => c);
        if (added.length) {
          first.push(...added);
          flag('pbdb-extended', `Deep-time range extended by fossil finds in: ${added.join(' ')}.`);
          notes.push(`Fossil finds added ${plural(added.length, 'country', 'countries')} to the Ice Age range (${added.join(', ')}).`);
        }
      }
    }
  }

  // 5. Sources: article, taxonomy, status, fossil record -----------------------
  const article = await findArticle([seed.hints?.wikipedia ?? seed.scientific, seed.name]);
  if (article) sources.push({ label: 'Wikipedia', url: article.url });
  else flag('no-article', 'No Wikipedia article found by scientific or common name.');
  if (statusSource === 'iucn') {
    sources.push({ label: 'IUCN Red List', url: `https://www.iucnredlist.org/search?query=${encodeURIComponent(seed.scientific)}&searchType=species` });
  }
  if (taxon) sources.push({ label: 'GBIF', url: gbifSpeciesUrl(taxon.key) });
  if (pbdb) sources.push({ label: 'Paleobiology Database', url: pbdbTaxonUrl(pbdb.taxonNo) });

  // 6. Silhouette: PhyloPic ------------------------------------------------------
  let silhouette: SilhouetteHit | undefined;
  if (taxon) {
    silhouette = (await findSilhouette(taxon, { lowestRank: CONFIG.silhouetteLowestRank, nameFallback: seed.scientific })) ?? undefined;
    if (!silhouette) flag('no-silhouette', `No permissively licensed PhyloPic silhouette up to ${CONFIG.silhouetteLowestRank} level.`);
    else if (silhouette.rank !== 'species') flag('silhouette-relative', `Shows ${silhouette.rank} ${silhouette.taxon}.`);
  }

  // 7. Where in those countries: sightings and fossil finds on the world grid -------
  landMask ??= buildLandMask();
  // Use the stages as extended by fossil finds, so their countries are inside the layers' masks too.
  const extended = { ...seed, range: seed.range.map((s, i) => ({ ...s, countries: stages[i].countries })) };
  const range = await buildLayers(extended, occKey, finds, landMask);
  notes.push(...range.notes);
  for (const line of range.concerns) flag('range-coarse', line);

  const curated = [seed.population ? 'population figures' : '', extinct ? 'the extinction date' : ''].filter(Boolean);
  if (curated.length) {
    const subject = curated.join(' and ');
    notes.push(
      `${subject[0].toUpperCase()}${subject.slice(1)} ${curated.length > 1 || subject.endsWith('figures') ? 'are' : 'is'} curated from published estimates, not machine-generated.`,
    );
  }

  const animal: Animal = {
    id: seed.id,
    name: seed.name,
    scientific: seed.scientific,
    group: seed.group,
    habitat: seed.habitat,
    status,
    statusSource,
    extinctYear: seed.extinctYear,
    about: seed.about,
    threats: seed.threats,
    range: stages,
    population: seed.population,
    popUnit: seed.popUnit,
    silhouette: silhouette && {
      file: `/silhouettes/${silhouette.uuid}.svg`,
      credit: silhouette.credit,
      license: silhouette.license,
      licenseUrl: silhouette.licenseUrl,
      pageUrl: silhouette.pageUrl,
      rank: silhouette.rank,
      taxon: silhouette.taxon,
    },
    sources,
    notes,
  };
  return { animal, layers: range.layers, flags, silhouette };
}
