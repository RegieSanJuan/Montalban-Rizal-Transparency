/**
 * Display wording for the UI: Filipino text for source codes and known
 * upstream messages, the money-stage vocabulary, and title segmentation.
 *
 * Nothing here computes, changes or classifies a figure. Every translation is
 * keyed by an upstream code or by the exact upstream text; anything unknown
 * returns null so the caller shows the original English (marked lang="en").
 */
import type { BridgeGroup, Version } from '../api/types';

// ---------------------------------------------------------------------------
// Money stages: one fixed vocabulary for every peso figure
// ---------------------------------------------------------------------------

export const MONEY_STAGE = {
  /** The DPWH record's own budget field. Not a contract price, not spending. */
  record: 'Halaga sa record',
  abc: 'ABC',
  award: 'Award',
  nep: 'NEP',
  house: 'House bill',
  gaa: 'GAA',
} as const;
export type MoneyStage = keyof typeof MONEY_STAGE;

// ---------------------------------------------------------------------------
// The three source lists: same names everywhere (home tabs, stage switch, footer)
// ---------------------------------------------------------------------------

export type SourceStage = 'dpwh' | 'gaa' | 'nep';
export const SOURCE_STAGES: { id: SourceStage; to: string; name: string; unit: string; sub: string }[] = [
  { id: 'dpwh', to: '/contracts', name: 'Mga project record ng DPWH', unit: 'record', sub: 'may status' },
  { id: 'gaa', to: '/gaa', name: 'Naisabatas na budget', unit: 'programa', sub: 'GAA 2020–2026' },
  { id: 'nep', to: '/panukala-2027', name: 'Panukala para sa 2027', unit: 'record', sub: 'NEP at House bill' },
];

/** sessionStorage key: the 2027 row a reader opened, so "back" returns to it. */
export const PANUKALA_RETURN_KEY = 'panukala-return';

// ---------------------------------------------------------------------------
// DPWH titles
// ---------------------------------------------------------------------------

const SEP = /\s+-\s*|\s*-\s+/g;
/** A kilometre post or station on its own: "K0032 + 056", "K0030+(-838)", "STA. 27+700". */
const CHAINAGE = /^(?:K\s?\d{3,4}\s*\+|STA\.?\s*\d)/i;

/**
 * DPWH titles repeat a long program path before the part that tells records
 * apart. Lead with the last segment and keep the path as context. When the
 * last segments are only kilometre posts, the lead starts at the segment
 * before them, so it names the road. Both parts are exact substrings of the
 * source title: nothing is re-cased, reworded or dropped.
 */
export function splitTitle(title: string): { lead: string; context: string | null } {
  const cuts: { start: number; end: number }[] = [];
  for (const m of title.matchAll(SEP)) cuts.push({ start: m.index, end: m.index + m[0].length });
  const segs: { from: number; to: number }[] = [];
  let from = 0;
  for (const c of cuts) {
    if (c.start > from) segs.push({ from, to: c.start });
    from = c.end;
  }
  if (from < title.length) segs.push({ from, to: title.length });
  const text = (s: { from: number; to: number }) => title.slice(s.from, s.to).trim();
  const real = segs.filter((s) => text(s));
  if (real.length < 3) return { lead: title, context: null };
  let i = real.length - 1;
  while (i > 0 && CHAINAGE.test(text(real[i]))) i -= 1;
  if (i === 0) return { lead: title, context: null };
  const lead = title.slice(real[i].from).trim();
  const context = title.slice(0, real[i].from).replace(/[\s-]+$/, '').trim();
  return { lead, context: context || null };
}

// ---------------------------------------------------------------------------
// Contractor profile key: the same normalisation as the project directory
// ---------------------------------------------------------------------------

/** "/kontratista/<key>" for a source contractor name; null when the name is a placeholder. */
export function contractorKey(name: string | null | undefined): string | null {
  const n = name?.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!n || /^(?:n\/?a|none|unknown|not specified|for procurement|-+)$/i.test(n)) return null;
  return n.toLowerCase();
}

/** "[REVOKED]" and similar bracketed notes, exactly as the source writes them. */
export function bracketNotes(name: string): string[] {
  return [...name.matchAll(/\[[^\]]+\]/g)].map((m) => m[0]);
}

// ---------------------------------------------------------------------------
// DPWH status values: verbatim, with a Filipino gloss
// ---------------------------------------------------------------------------

const DPWH_STATUS: Record<string, string> = {
  completed: 'natapos',
  'on-going': 'ipinapatupad',
  ongoing: 'ipinapatupad',
  'for procurement': 'nasa procurement',
  terminated: 'itinigil',
  'not yet started': 'hindi pa nasisimulan',
  suspended: 'sinuspinde',
  cancelled: 'kinansela',
};
export function dpwhStatusGloss(status: string | null | undefined): string | null {
  return status ? DPWH_STATUS[status.trim().toLowerCase()] ?? null : null;
}

// ---------------------------------------------------------------------------
// Budget API labels, by code
// ---------------------------------------------------------------------------

export interface FilLabel { label: string; help?: string }
type LabelKind = 'status' | 'match' | 'reading' | 'dpwh_site' | 'zone' | 'flag';

const API_LABELS: Record<LabelKind, Record<string, FilLabel>> = {
  status: {
    amount_same: { label: 'Parehong halaga sa dalawa', help: 'Nasa dalawang dokumento, at pareho ang halaga.' },
    house_only_candidate: { label: 'Nasa House bill lang', help: 'Nakalista sa House bill; walang nakitang katapat na linya sa NEP. Kandidato ito, hindi kumpirmadong dagdag.' },
    nep_only_candidate: { label: 'Nasa NEP lang', help: 'Nakalista sa NEP; walang nakitang katapat na linya sa House bill. Kandidato ito, hindi kumpirmadong pagtanggal.' },
    candidate_increase: { label: 'Mas mataas sa House bill', help: 'Nasa dalawang dokumento; mas malaki ang halaga sa House bill.' },
    candidate_decrease: { label: 'Mas mababa sa House bill', help: 'Nasa dalawang dokumento; mas maliit ang halaga sa House bill.' },
  },
  match: {
    exact_candidate: { label: 'Parehong pangalan, rehiyon at linya ng programa' },
    house_unmatched: { label: 'Walang katapat sa NEP' },
    nep_unmatched: { label: 'Walang katapat sa House bill' },
    chainage_candidate: { label: 'Parehong kalsada, magkaibang kilometer marker' },
    title_and_coordinates: { label: 'Parehong pangalan at coordinates sa mapa' },
    coordinates: { label: 'Parehong coordinates sa mapa, magkaiba ang pangalan' },
    ai_corrected: { label: 'Parehong pangalan matapos ayusin ang mali sa pag-scan' },
    title_similarity: { label: 'Kahawig na pangalan sa parehong probinsya' },
  },
  reading: {
    same_amount: { label: 'Pareho sa dalawang pagbasa sa Kamara' },
    no_house_record: { label: 'Wala sa House bill' },
  },
  dpwh_site: {
    paired: { label: 'Nasa website ng DPWH', help: 'Nasa listahan din ng transparency website ng DPWH ang linyang ito sa NEP.' },
    no_nep_anchor: { label: 'Walang masusuri sa website ng DPWH', help: 'Nasa House bill lang ang linyang ito, kaya walang linya sa NEP na mahahanap sa website ng DPWH.' },
  },
  zone: {
    local: { label: 'Lokal na pondo' },
  },
  flag: {
    nep_evidence_review: { label: 'Sinusuri pa ang halaga sa NEP laban sa scan ng dokumento' },
    house_only: { label: 'Nasa House bill lang · walang katapat sa NEP' },
    nep_only: { label: 'Nasa NEP lang · walang katapat sa House bill' },
    uncertain_match: { label: 'Itinugma sa mas maluwag na tuntunin (kilometer marker, lugar, saklaw o kahawig na pangalan)' },
    office_difference: { label: 'Magkaiba ang opisina sa dalawang dokumento' },
    'method:title_and_coordinates': { label: 'Itinugma sa pangalan at coordinates sa mapa' },
    'method:coordinates': { label: 'Itinugma sa coordinates sa mapa lamang' },
    'method:ai_corrected': { label: 'Itinugma matapos ang pag-aayos ng baybay sa tulong ng AI' },
    column_dropped: { label: 'May halaga sa House bill, blangko sa NEP' },
    column_added: { label: 'May halaga sa NEP, blangko sa House bill' },
  },
};

/** Filipino for an API label code; null for an unknown code (show the API's English). */
export function apiLabel(kind: LabelKind, code: string | null | undefined): FilLabel | null {
  return code ? API_LABELS[kind][code] ?? null : null;
}

/** How the House bill compares with the NEP, by the API's bridge group. */
export const GROUP_FIL: Record<BridgeGroup, string> = {
  house_only: 'Nasa House bill lang',
  nep_only: 'Nasa NEP lang',
  unchanged: 'Parehong halaga sa dalawa',
  increased: 'Mas mataas sa House bill',
  decreased: 'Mas mababa sa House bill',
  scope_review: 'Ibang bahagi ng parehong kalsada',
};

export const VERSION_FIL: Record<Version, { name: string; gloss: string }> = {
  nep: { name: 'NEP', gloss: 'Panukala ng Pangulo sa Kongreso' },
  hgab2: { name: 'House bill, ikalawang pagbasa', gloss: 'Bersyon ng Kamara' },
  hgab3: { name: 'House bill, ikatlong pagbasa', gloss: 'Bersyon ng Kamara na ipinapadala sa Senado' },
  api: { name: 'Listahan sa website ng DPWH', gloss: 'Hindi bahagi ng budget' },
};

/** "Shared with 2 other districts, not split" → Filipino; null for wording we have not seen. */
export function tierTextFil(text: string | null | undefined): string | null {
  const m = text?.trim().match(/^Shared with (\d+) other districts?, not split$/i);
  if (m) return `Kahati ng ${m[1]} pang distrito, hindi hinahati`;
  return null;
}

const YEAR_SCOPE: Record<string, string> = {
  'the whole office': 'buong opisina',
  'named projects only': 'mga nakapangalang proyekto lang',
};
export function yearScopeFil(scope: string | null | undefined): string | null {
  return scope ? YEAR_SCOPE[scope.trim().toLowerCase()] ?? null : null;
}

/** API glossary terms, by key. */
export const TERM_FIL: Record<string, { term: string; meaning: string }> = {
  residual: {
    term: 'Hindi nakatalaga sa distrito',
    meaning: 'pondong nakalista sa DPWH Central Office o sa regional office. Hindi ito lumalabas sa anumang district card.',
  },
};

// ---------------------------------------------------------------------------
// Upstream notices: a Filipino summary; the English stays verbatim beside it
// ---------------------------------------------------------------------------

/** Disclaimers from the Budget API, by id. Unknown ids show the English only. */
export const DISCLAIMER_FIL: Record<string, { title: string; summary: string }> = {
  'disclaimer-no-allegations': {
    title: 'Walang paratang.',
    summary:
      'Paghahambing lang ng mga pinagmulan ang “kandidato” na dagdag, bawas o pagbabago ng halaga. Hindi nito pinatutunayan ang iregularidad o mali ng sinumang opisina o opisyal. Ang pagkawala sa isang API snapshot ay hindi patunay na wala ito sa NEP o na itinago ito.',
  },
  'disclaimer-offices': {
    title: 'Mga opisina at distrito.',
    summary:
      'Iniuugnay ng DEO mapping ang mga opisina sa mga distrito. Hindi nito sinasabing may kinatawang humiling, nag-sponsor o kumontrol ng proyekto, o na nasa bawat distrito ang bawat proyekto. Hindi hinahati ang kabuuan ng opisinang kahati ng ilang distrito, at hiwalay sa FY2027 ang mga lumang halaga.',
  },
};

const KNOWN_TEXT: { en: RegExp; fil: string }[] = [
  {
    // The Budget API's meta.notice (footer).
    en: /^Independent and unofficial\. This comparison is our own reading of the published documents/,
    fil: 'Ayon sa pinagmulan: malaya at hindi opisyal ang paghahambing na ito. Pagbasa ito ng BetterGov.ph sa mga nailathalang dokumento, hindi opisyal na tala ng DBM, mga ahensya o Kamara. Ang mga numero ay halagang nakalathala sa dokumento, hindi gastos. Walang paratang: ang “kandidato” ay paghahambing lamang, hindi patunay ng mali.',
  },
  {
    en: /^Representatives are listed so a reader can find their district\. Nothing here establishes that a representative requested, sponsored or controlled any project or amount\.$/,
    fil: 'Nakalista ang mga kinatawan para mahanap mo ang iyong distrito. Walang nakasaad dito na sila ang humiling, nag-sponsor o kumontrol ng anumang proyekto o halaga.',
  },
  {
    // The DPWH contracts snapshot's source note.
    en: /^Retrieval time only; no upstream freshness timestamp supplied\. All pages of listed candidate queries reconciled, not a complete all-agency inventory\./,
    fil: 'Petsa ito ng pagkuha; walang petsa ng update mula sa pinagmulan. Kinuha ang lahat ng pahina ng mga nakalistang paghahanap, pero hindi ito kumpletong imbentaryo ng lahat ng ahensya. Ang budget field ay iniulat na halaga ng proyekto o kontrata, hindi bayad na gastos; ang 0 ay itinuturing na hindi ibinigay. Hindi independiyenteng nasuri ang status at progreso. Ang probinsya sa record ay tumutukoy sa DEO, hindi sa bayan. Ang record na isinama dahil lang sa punto sa mapa ay patunay ng punto, hindi ng buong saklaw ng proyekto.',
  },
  // The refresh pipeline's four status messages (src/lib/refresh-status.ts).
  { en: /^Complete refresh published successfully\.$/, fil: 'Nailathala nang buo ang huling refresh.' },
  { en: /^Refresh in progress\. Published data remains available\.$/, fil: 'Tumatakbo ang refresh. Magagamit pa rin ang nailathalang datos.' },
  { en: /^Refresh could not be completed\. Showing the last validated data\.$/, fil: 'Hindi natapos ang refresh. Ipinapakita ang huling na-validate na datos.' },
  { en: /^No complete refresh result is recorded\. Source dates are retrieval times\.$/, fil: 'Walang naitalang buong refresh. Petsa ng pagkuha ang mga petsa ng pinagmulan.' },
];

/** A Filipino rendering of a known upstream text; null when the text is not one we have reviewed. */
export function knownTextFil(en: string | null | undefined): string | null {
  const t = en?.trim();
  if (!t) return null;
  return KNOWN_TEXT.find((k) => k.en.test(t))?.fil ?? null;
}
