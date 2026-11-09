/**
 * Defensive readers for the coverage and location-review data the data layer
 * is adding (src/lib/coverage.ts, `location`, `reviewProjects`, `reviewRows`).
 * Every field is optional here so the UI renders before, during and after
 * that work lands; nothing in this file invents a figure.
 */
import type { DistrictCard, DistrictOffice, Envelope } from '../api/types';
import type { Async } from '../lib/portal-context';
import type { ScopedProject, ScopeResult } from '../lib/scope';
import type { GaaResult, GaaRow } from '../lib/gaa';

export type StageKey = 'nep' | 'house' | 'gaa' | 'award' | 'spending';
export type StageStatus = 'available' | 'partial' | 'unavailable';

export interface CoverageStage { key: StageKey; status: StageStatus; note: string; source?: string }
export interface CoverageGap { label: string; detail: string; url?: string }
export interface Coverage { checkedAt?: string; aliases: string[]; stages: CoverageStage[]; gaps: CoverageGap[] }

export type LocationConfidence = 'named' | 'shared' | 'review';
export interface LocationInfo { confidence: LocationConfidence; note: string }

// import.meta.glob resolves to {} when the module does not exist yet, so the
// build never depends on the data layer's timing.
const modules = import.meta.glob<{ COVERAGE?: Partial<Coverage> }>('../lib/coverage.ts', { eager: true });
const raw = Object.values(modules)[0]?.COVERAGE;

const STAGE_KEYS: StageKey[] = ['nep', 'house', 'gaa', 'award', 'spending'];
const STATUSES: StageStatus[] = ['available', 'partial', 'unavailable'];

/**
 * Conservative fallback, used per stage when the data layer has not published
 * one: nothing is claimed complete, and stages the portal does not load are
 * marked unavailable.
 */
const FALLBACK: Record<StageKey, CoverageStage> = {
  nep: { key: 'nep', status: 'partial', note: 'Mga linyang may pangalan ng Montalban o Rodriguez sa pamagat. Sinusuri pa kung kumpleto.' },
  house: { key: 'house', status: 'partial', note: 'Parehong saklaw ng NEP. Panukala pa lang ito, hindi pa batas.' },
  gaa: { key: 'gaa', status: 'partial', note: 'Mga programang tumutukoy sa bayan sa pangalan, 2020–2026. Maaaring may kulang.' },
  award: { key: 'award', status: 'unavailable', note: 'Wala pang datos ng kontrata o procurement award sa portal na ito.' },
  spending: { key: 'spending', status: 'unavailable', note: 'Wala pang datos ng aktuwal na nagastos o COA audit sa portal na ito.' },
};

export function coverage(): Coverage & { fromDataLayer: boolean } {
  const given = new Map<StageKey, CoverageStage>();
  for (const s of raw?.stages ?? []) {
    if (s && STAGE_KEYS.includes(s.key) && STATUSES.includes(s.status)) given.set(s.key, s);
  }
  return {
    fromDataLayer: Boolean(raw),
    checkedAt: raw?.checkedAt,
    aliases: Array.isArray(raw?.aliases) ? raw.aliases : [],
    stages: STAGE_KEYS.map((k) => given.get(k) ?? FALLBACK[k]),
    gaps: Array.isArray(raw?.gaps) ? raw.gaps.filter((g) => g && g.label) : [],
  };
}

type WithLocation = { location?: LocationInfo };

export function locationOf(row: ScopedProject | GaaRow): LocationInfo | undefined {
  const loc = (row as WithLocation).location;
  return loc && typeof loc.confidence === 'string' ? loc : undefined;
}

export function reviewProjects(scope: ScopeResult): ScopedProject[] {
  const list = (scope as ScopeResult & { reviewProjects?: ScopedProject[] }).reviewProjects;
  return Array.isArray(list) ? list : [];
}

export function reviewRows(result: GaaResult): GaaRow[] {
  const list = (result as GaaResult & { reviewRows?: GaaRow[] }).reviewRows;
  return Array.isArray(list) ? list : [];
}

export const LOCATION_LABEL: Record<LocationConfidence, string> = {
  named: 'Nakapangalan ang bayan',
  shared: 'Kahati ang ibang lugar',
  review: 'Sinusuri pa ang lokasyon',
};

export const STAGE_LABEL: Record<StageKey, { name: string; short: string; who: string }> = {
  nep: { name: 'Panukala ng Pangulo', short: 'NEP', who: 'National Expenditure Program' },
  house: { name: 'Bersyon ng Kamara', short: 'House bill', who: 'General Appropriations Bill' },
  gaa: { name: 'Naisabatas na budget', short: 'GAA', who: 'General Appropriations Act' },
  award: { name: 'Kontrata at award', short: 'Kontrata', who: 'PhilGEPS / ahensya' },
  spending: { name: 'Aktuwal na gastos', short: 'Gastos', who: 'Paglabas ng pondo / COA' },
};

export const STATUS_LABEL: Record<StageStatus, string> = {
  available: 'May datos',
  partial: 'Bahagya',
  unavailable: 'Wala sa portal',
};

/** "Bohol 1st District Engineering Office" → "Bohol 1st DEO", for tight spaces. */
export function shortOffice(office: string): string {
  return office.replace(/ District Engineering Office$/, ' DEO');
}

// ---------------------------------------------------------------------------
// DPWH contracts snapshot (src/lib/contracts.ts, added by the data layer)
// ---------------------------------------------------------------------------

export type ContractConfidence = 'named' | 'coordinates' | 'shared' | 'review' | 'conflict';
export interface ContractRecord {
  id: string;
  title: string;
  year: string;
  /** The DPWH record's budget field. Not actual spending. null = not provided. */
  amountPhp: number | null;
  status: string;
  progress: number | null;
  contractor: string | null;
  startDate: string | null;
  completionDate: string | null;
  latitude: number | null;
  longitude: number | null;
  location: { confidence: ContractConfidence; note: string };
  /** Machine-readable API record (JSON). Not a document. */
  sourceUrl: string;
  /**
   * Optional, data-layer verified human-readable page for this record. The UI
   * shows it first when present and never builds one itself.
   */
  recordPageUrl?: string | null;
  recordPageLabel?: string | null;
  fundingSource?: string | null;
  program?: string | null;
  /** Source's planned end date; completionDate is the source's completion date. */
  expiryDate?: string | null;
  procurement?: {
    /** Approved Budget for the Contract: the ceiling, not the price. */
    abcPhp: number | null;
    awardAmountPhp: number | null;
    advertisementDate: string | null;
    bidSubmissionDeadline: string | null;
    dateOfAward: string | null;
  } | null;
}
export interface ContractSnapshot {
  checkedAt: string;
  source: { name: string; url: string; originalUrl: string; queriedUrls: string[]; note: string };
  counts: { included: number; review: number; rejected: number; fetched: number };
  records: ContractRecord[];
  reviewRecords: ContractRecord[];
}

const contractModules = import.meta.glob<{ loadContracts?: () => Promise<ContractSnapshot> }>('../lib/contracts.ts');

/** null when the data layer has not shipped the contracts module yet. */
export function contractsLoader(): (() => Promise<ContractSnapshot>) | null {
  const load = Object.values(contractModules)[0];
  if (!load) return null;
  return async () => {
    const mod = await load();
    if (typeof mod.loadContracts !== 'function') throw new Error('Wala pang loadContracts sa contracts module.');
    const snap = await mod.loadContracts();
    return {
      ...snap,
      records: Array.isArray(snap?.records) ? snap.records : [],
      reviewRecords: Array.isArray(snap?.reviewRecords) ? snap.reviewRecords : [],
    };
  };
}

export const CONTRACT_LOCATION_LABEL: Record<ContractConfidence, string> = {
  named: 'Nakapangalan ang bayan',
  coordinates: 'Nasa loob ng bayan ang coordinates',
  shared: 'Kahati ang ibang lugar',
  review: 'Sinusuri pa ang lokasyon',
  conflict: 'Magkasalungat ang pangalan at coordinates',
};

const PESO_WHOLE = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const PESO_CENTS = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Exact record amounts: ₱12,345,678 or, with centavos, ₱48,263,587.50. null is "not provided". */
export function contractPeso(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? PESO_WHOLE.format(n) : PESO_CENTS.format(n);
}

/** Bar labels: "₱1.19B", "₱993M", "₱850K"; short enough for narrow columns. */
export function compactAmount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return `₱${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `₱${Math.round(n / 1e6)}M`;
  if (a >= 1e3) return `₱${Math.round(n / 1e3)}K`;
  return `₱${Math.round(n)}`;
}

/** "api.dpwh.bettergov.ph" from a URL; the raw string when it does not parse. */
export function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}

// ---------------------------------------------------------------------------
// Data refresh status (src/lib/refresh-status.ts, owned by the data layer)
// ---------------------------------------------------------------------------

export type RefreshState = 'idle' | 'running' | 'succeeded' | 'failed';
export interface RefreshStatus {
  schemaVersion: 1;
  lastAttemptAt: string | null;
  /** A complete, published refresh only; never inferred from source dates. */
  lastSuccessAt: string | null;
  state: RefreshState;
  serving: 'last-known-good' | 'fresh';
  message: string;
  sources: { budget: { checkedAt: string | null }; dpwh: { checkedAt: string | null } };
  retry?: { attempt: number; maxAttempts: number };
}

const isoOrNull = (v: unknown): v is string | null => v === null || (typeof v === 'string' && !Number.isNaN(Date.parse(v)));

/** Local validator, used only until the data layer's own reader is available. */
function readStatusLocally(raw: unknown): RefreshStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const src = r.sources as Record<string, { checkedAt?: unknown } | undefined> | undefined;
  if (r.schemaVersion !== 1) return null;
  if (!isoOrNull(r.lastAttemptAt) || !isoOrNull(r.lastSuccessAt)) return null;
  if (!['idle', 'running', 'succeeded', 'failed'].includes(r.state as string)) return null;
  if (!['last-known-good', 'fresh'].includes(r.serving as string)) return null;
  if (typeof r.message !== 'string') return null;
  if (!src || !isoOrNull(src.budget?.checkedAt ?? null) || !isoOrNull(src.dpwh?.checkedAt ?? null)) return null;
  return {
    schemaVersion: 1,
    lastAttemptAt: r.lastAttemptAt as string | null,
    lastSuccessAt: r.lastSuccessAt as string | null,
    state: r.state as RefreshState,
    serving: r.serving as RefreshStatus['serving'],
    message: r.message,
    sources: { budget: { checkedAt: (src.budget?.checkedAt as string | null) ?? null }, dpwh: { checkedAt: (src.dpwh?.checkedAt as string | null) ?? null } },
  };
}

const statusModules = import.meta.glob<{ loadRefreshStatus?: () => Promise<RefreshStatus | null> }>('../lib/refresh-status.ts');

/**
 * Load the refresh status once. Uses the data layer's loader when present;
 * otherwise a local, abortable fetch with the same validation. Resolves to
 * null for missing, invalid or unreachable metadata; never throws.
 */
export async function loadStatus(signal: AbortSignal): Promise<RefreshStatus | null> {
  const mod = Object.values(statusModules)[0];
  if (mod) {
    try {
      const m = await mod();
      if (typeof m.loadRefreshStatus === 'function') return await m.loadRefreshStatus();
    } catch {
      return null;
    }
  }
  try {
    const res = await fetch('/data/refresh-status.json', { signal, headers: { Accept: 'application/json' } });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    return readStatusLocally(await res.json());
  } catch {
    return null;
  }
}

const MANILA = (() => {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' };
  try { return new Intl.DateTimeFormat('fil-PH', opts); } catch { return new Intl.DateTimeFormat('en-PH', opts); }
})();
const MANILA_DAY = (() => {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: 'long', timeZone: 'Asia/Manila' };
  try { return new Intl.DateTimeFormat('fil-PH', opts); } catch { return new Intl.DateTimeFormat('en-PH', opts); }
})();

/** "Nobyembre 8, 2026, 3:45 PM" in Philippine time; a date-only string stays a date. */
export function manilaTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return MANILA_DAY.format(d);
  // Keep the time together ("nang 10:51 PM") so it never wraps mid-time.
  return MANILA.format(d).replace(/\s(nang|at)\s/, ' $1\u00a0').replace(/(\d)\s(AM|PM)/, '$1\u00a0$2');
}

// ---------------------------------------------------------------------------
// The DPWH office shown beside the town's enacted programs
// ---------------------------------------------------------------------------

/** The first office with an enacted (GAA) year, or null while loading or when none has one. */
export function officeWithHistory(districts: Async<Envelope<DistrictCard>[]>): DistrictOffice | null {
  if (districts.status !== 'ready') return null;
  for (const env of districts.value) for (const o of env.data.offices) if (o.years?.some((y) => y.stage === 'gaa' && y.php)) return o;
  return null;
}
