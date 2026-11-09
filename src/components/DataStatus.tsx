import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COVERAGE } from '../lib/coverage';
import { knownTextFil } from '../lib/display';
import { OriginalEnglish } from './Bits';
import { usePortal } from '../lib/portal-context';
import { contractsLoader, loadStatus, manilaTime, type RefreshStatus } from './data-shapes';

type Loaded = { status: 'loading' } | { status: 'done'; value: RefreshStatus | null };

/**
 * When this portal's data was last refreshed, and what it is showing now.
 * Reads the refresh status once (non-blocking). If the status is missing or
 * invalid, it shows only dates the published snapshots themselves carry and
 * says that no verified full refresh is recorded; it never infers a success.
 */
export default function DataStatus({ compact = false }: { compact?: boolean }) {
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const [dpwhDate, setDpwhDate] = useState<string | null>(null);
  const { scope } = usePortal();
  const budgetBuilt = scope.status === 'ready' ? scope.value.meta.built_at : null;

  useEffect(() => {
    const ctrl = new AbortController();
    let live = true;
    loadStatus(ctrl.signal).then((value) => live && setLoaded({ status: 'done', value }));
    return () => { live = false; ctrl.abort(); };
  }, []);

  // Fallback source date for DPWH records: the snapshot's own retrieval date (shared, cached loader).
  const needsFallback = loaded.status === 'done' && !loaded.value;
  useEffect(() => {
    if (!needsFallback) return;
    const load = contractsLoader();
    if (!load) return;
    let live = true;
    load().then((s) => live && setDpwhDate(s.checkedAt), () => undefined);
    return () => { live = false; };
  }, [needsFallback]);

  const Wrapper = compact ? 'div' : 'section';
  return (
    <Wrapper className={`dstatus${compact ? ' dstatus-compact' : ''}`} aria-labelledby="dstatus-h">
      {compact
        ? <h3 id="dstatus-h" className="dstatus-h">Kalagayan ng datos</h3>
        : <h2 id="dstatus-h" className="dstatus-h">Kalagayan ng datos</h2>}
      <div aria-live="polite">
        {loaded.status === 'loading' ? (
          <p className="dstatus-loading" role="status">Tinitingnan ang kalagayan ng datos…</p>
        ) : loaded.value ? (
          <Known s={loaded.value} />
        ) : (
          <Fallback budgetBuilt={budgetBuilt} dpwhDate={dpwhDate} />
        )}
      </div>
      <p className="dstatus-note">
        Hindi ito live na koneksyon sa mga ahensya: mga naka-save at sinuring snapshot ang ipinapakita. Oras sa Pilipinas.
      </p>
    </Wrapper>
  );
}

function Known({ s }: { s: RefreshStatus }) {
  const success = manilaTime(s.lastSuccessAt);
  const attempt = manilaTime(s.lastAttemptAt);
  const lkg = s.serving === 'last-known-good';
  const tone = s.state === 'failed' ? 'warn' : s.state === 'running' ? 'info' : s.state === 'succeeded' && !lkg ? 'ok' : 'neutral';
  const headline =
    s.state === 'failed' ? 'Hindi natapos ang huling update.'
    : s.state === 'running' ? 'May update na kasalukuyang tumatakbo.'
    : s.state === 'succeeded' && !lkg ? 'Natapos nang buo ang huling update.'
    : 'Walang kasalukuyang update.';
  const serving = !lkg
    ? 'Ipinapakita ang datos mula sa huling buong update.'
    : s.lastSuccessAt
      ? 'Ipinapakita pa rin ang huling kumpletong datos; hindi ito napalitan.'
      : 'Ipinapakita ang mga naka-publish na snapshot. Wala pang naitalang buong update.';
  return (
    <>
      <p className={`dstatus-line tone-${tone}`}>
        <span className="dstatus-dot" aria-hidden="true" />
        <span>{headline}</span>
      </p>
      <p className="dstatus-serving">{serving}</p>
      <div className="dstatus-groups">
        <dl className="dstatus-dl">
          <div>
            <dt>Huling buong update</dt>
            <dd>{success ?? 'Wala pang naitala'}</dd>
          </div>
          <div>
            <dt>Huling pagsubok</dt>
            <dd>
              {attempt ?? 'Wala pang naitala'}
              {s.state === 'failed' && attempt && <span className="dstatus-tag">hindi natapos</span>}
              {s.state === 'running' && <span className="dstatus-tag">tumatakbo</span>}
              {s.retry && s.state !== 'succeeded' && <span className="dstatus-sub">subok {s.retry.attempt} sa {s.retry.maxAttempts}</span>}
            </dd>
          </div>
        </dl>
        <dl className="dstatus-dl dstatus-sources" aria-label="Petsa ng mga pinagmulan">
          <div>
            <dt>Budget (NEP, House bill, GAA)</dt>
            <dd>{manilaTime(s.sources.budget.checkedAt) ?? 'Walang petsa'}</dd>
          </div>
          <div>
            <dt>Mga project record ng DPWH</dt>
            <dd>{manilaTime(s.sources.dpwh.checkedAt) ?? 'Walang petsa'}</dd>
          </div>
        </dl>
      </div>
      {s.message && (
        knownTextFil(s.message)
          ? <div className="dstatus-msg"><p>Tala ng refresh: {knownTextFil(s.message)}</p><OriginalEnglish label="Orihinal na tala ng refresh (Ingles)"><p>{s.message}</p></OriginalEnglish></div>
          : <p className="dstatus-msg">Tala ng refresh: <span lang="en">{s.message}</span></p>
      )}
    </>
  );
}

function Fallback({ budgetBuilt, dpwhDate }: { budgetBuilt: string | null; dpwhDate: string | null }) {
  return (
    <>
      <p className="dstatus-line tone-neutral">
        <span className="dstatus-dot" aria-hidden="true" />
        <span>Wala pang naitalang na-verify na buong update. Narito ang mga petsang dala ng mismong mga snapshot.</span>
      </p>
      <dl className="dstatus-dl dstatus-sources">
        <div>
          <dt>Budget API (NEP, House bill)</dt>
          <dd>{manilaTime(budgetBuilt) ? `datos noong ${manilaTime(budgetBuilt)}` : 'Hindi pa nakuha'}</dd>
        </div>
        <div>
          <dt>Mga project record ng DPWH</dt>
          <dd>{manilaTime(dpwhDate) ? `kinuha noong ${manilaTime(dpwhDate)}` : 'Walang petsa'}</dd>
        </div>
        <div>
          <dt>Saklaw at lokasyon</dt>
          <dd>{manilaTime(COVERAGE.checkedAt) ? `sinuri noong ${manilaTime(COVERAGE.checkedAt)}` : 'Walang petsa'}</dd>
        </div>
      </dl>
    </>
  );
}

const SHORT_TIME = (() => {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' };
  try { return new Intl.DateTimeFormat('fil-PH', opts); } catch { return new Intl.DateTimeFormat('en-PH', opts); }
})();
const SHORT_DAY = (() => {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' };
  try { return new Intl.DateTimeFormat('fil-PH', opts); } catch { return new Intl.DateTimeFormat('en-PH', opts); }
})();
const fmt = (f: Intl.DateTimeFormat, iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : f.format(d).replace(/(\d)\s(AM|PM)/, '$1\u00a0$2');
};

/** "Nob 8, 2026", or both dates when the two sources were taken on different days. */
function snapshotDays(s: RefreshStatus): string | null {
  const budget = fmt(SHORT_DAY, s.sources.budget.checkedAt);
  const dpwh = fmt(SHORT_DAY, s.sources.dpwh.checkedAt);
  if (budget && dpwh) return budget === dpwh ? budget : `${budget} (budget) at ${dpwh} (DPWH)`;
  return budget ?? dpwh;
}

/**
 * One plain line for the home page: the real outcome of the last refresh,
 * failure included, with the snapshot date and a link to the full panel.
 */
export function DataStatusLine() {
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  useEffect(() => {
    const ctrl = new AbortController();
    let live = true;
    loadStatus(ctrl.signal).then((value) => live && setLoaded({ status: 'done', value }));
    return () => { live = false; ctrl.abort(); };
  }, []);
  const link = <Link to="/about#dstatus-h">Kalagayan ng datos <span aria-hidden="true">→</span></Link>;
  if (loaded.status === 'loading') return <p className="dline" role="status">Tinitingnan ang kalagayan ng datos…</p>;
  const s = loaded.value;
  if (!s) {
    return <p className="dline tone-neutral"><span className="dstatus-dot" aria-hidden="true" /><span>Wala pang naitalang na-verify na buong update; ipinapakita ang mga naka-save na snapshot. {link}</span></p>;
  }
  const day = snapshotDays(s);
  const shown = day ? ` Ipinapakita ang snapshot noong ${day}.` : '';
  const attempt = fmt(SHORT_TIME, s.lastAttemptAt);
  const lkg = s.serving === 'last-known-good';
  const [tone, text] =
    s.state === 'failed' ? ['warn', `Hindi natapos ang huling update${attempt ? ` (${attempt})` : ''}.${shown}`]
    : s.state === 'running' ? ['info', `May update na tumatakbo.${shown}`]
    : s.state === 'succeeded' && !lkg ? ['ok', `Natapos nang buo ang huling update${fmt(SHORT_TIME, s.lastSuccessAt) ? ` (${fmt(SHORT_TIME, s.lastSuccessAt)})` : ''}.`]
    : ['neutral', `Walang kasalukuyang update.${shown}`];
  return (
    <p className={`dline tone-${tone}`}>
      <span className="dstatus-dot" aria-hidden="true" />
      <span>{text} {link}</span>
    </p>
  );
}
