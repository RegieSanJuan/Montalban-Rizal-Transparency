/**
 * /contracts — DPWH contract records for Montalban (Rodriguez), from the
 * BetterGov mirror of the DPWH transparency site. A separate stage: these
 * amounts are never added to NEP, House bill or GAA figures.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { shortNameOf } from '../config';
import { External, Money, OriginalEnglish } from '../components/Bits';
import { PageHead } from '../components/Chrome';
import StageSwitch from '../components/StageSwitch';
import {
  CONTRACT_LOCATION_LABEL, contractPeso, contractsLoader, hostOf,
  type ContractRecord, type ContractSnapshot,
} from '../components/data-shapes';
import { contractorKey, dpwhStatusGloss, knownTextFil, splitTitle } from '../lib/display';
import { count, date } from '../lib/format';
import type { Async } from '../lib/portal-context';
import { usePortal } from '../lib/portal-context';
import { useTitle } from '../lib/use-title';

const PAGE = 30;

export default function Contracts() {
  const { config } = usePortal();
  useTitle(`Mga project record ng DPWH · ${shortNameOf(config)}`);
  const load = useMemo(() => contractsLoader(), []);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ attempt: number; value: Async<ContractSnapshot> } | null>(null);

  useEffect(() => {
    if (!load) return;
    let live = true;
    load().then(
      (value) => live && setState({ attempt, value: { status: 'ready', value } }),
      (error) => live && setState({ attempt, value: { status: 'error', error: error instanceof Error ? error : new Error(String(error)) } }),
    );
    return () => { live = false; };
  }, [load, attempt]);
  const current: Async<ContractSnapshot> = state?.attempt === attempt ? state.value : { status: 'loading' };

  return (
    <main className="page main">
      <PageHead title="Mga project record ng DPWH para sa Montalban">
        <p>
          Mga record mula sa project registry ng DPWH, gaya ng pagkakalathala: may natapos na, ipinapatupad, nasa procurement
          pa, o hindi pa nasisimulan. Hindi lahat ay may award o kontrata na. Ang halaga ay ang budget field ng DPWH record,
          hindi presyo ng kontrata o aktuwal na nagastos. Ang status at progreso ay iniulat ng pinagmulan at hindi pa
          independiyenteng nasuri.
        </p>
      </PageHead>
      <StageSwitch />

      {!load ? (
        <div className="state" role="status">
          <p>Inihahanda pa ang mga DPWH record. Lalabas ito rito kapag handa na ang snapshot.</p>
        </div>
      ) : current.status === 'loading' ? (
        <div className="state" role="status"><span className="spinner" aria-hidden="true" /> Kinukuha ang mga project record ng DPWH… Maaaring tumagal nang ilang segundo.</div>
      ) : current.status === 'error' ? (
        <div className="state state-error" role="alert">
          <p><strong>Hindi makuha ang mga project record ng DPWH.</strong> Subukang muli maya-maya.</p>
          <p className="state-detail">Teknikal na detalye: <span lang="en">{current.error.message}</span></p>
          <button type="button" className="button" onClick={() => setAttempt((n) => n + 1)}>Subukang muli</button>
        </div>
      ) : (
        <ContractList snap={current.value} />
      )}
    </main>
  );
}

function ContractList({ snap }: { snap: ContractSnapshot }) {
  const all = snap.records;
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const year = params.get('year') ?? '';
  const status = params.get('status') ?? '';
  const openId = params.get('open') ?? '';
  const [shown, setShown] = useState(PAGE);
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
    setShown(PAGE);
  };

  const years = useMemo(() => tally(all.map((r) => r.year || '—')).sort((a, b) => b[0].localeCompare(a[0])), [all]);
  const statuses = useMemo(() => tally(all.map((r) => r.status || '—')).sort((a, b) => b[1] - a[1]), [all]);
  const maxYear = Math.max(1, ...years.map(([, n]) => n));

  const matches = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (r: ContractRecord) => {
      if (year && (r.year || '—') !== year) return false;
      if (status && (r.status || '—') !== status) return false;
      if (words.length) {
        const hay = `${r.title} ${r.id} ${r.contractor ?? ''}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    };
  }, [q, year, status]);
  const filtered = useMemo(
    () => all.filter(matches).sort((a, b) => b.year.localeCompare(a.year) || (b.amountPhp ?? -1) - (a.amountPhp ?? -1)),
    [all, matches],
  );
  // Contractor profiles exist for names on included records (same rule as /kontratista).
  const profiles = useMemo(() => new Set(all.map((r) => contractorKey(r.contractor)).filter((k): k is string => Boolean(k))), [all]);
  const reviewFiltered = useMemo(() => snap.reviewRecords.filter(matches), [snap.reviewRecords, matches]);
  const narrowed = filtered.length !== all.length;
  const listed = filtered.filter((r) => r.amountPhp != null);
  // A deep link to a record under review opens that section.
  const reviewHasOpen = Boolean(openId) && snap.reviewRecords.some((r) => r.id === openId);

  return (
    <>
      <section className="section contracts-overview" aria-labelledby="c-years-h">
        <dl className="figures figures-2">
          <div className="figure figure-lead">
            <dt>Mga record na nakatalaga sa bayan</dt>
            <dd className="figure-n num">{count(snap.counts.included ?? all.length)}</dd>
            <dd className="figure-sub">Kasama sa listahan sa ibaba.</dd>
          </div>
          <div className="figure">
            <dt>Sinusuri pa ang lokasyon</dt>
            <dd className="figure-n num">{count(snap.counts.review ?? snap.reviewRecords.length)}</dd>
            <dd className="figure-sub">Hiwalay na nakalista; hindi kasama sa bilang sa itaas.</dd>
          </div>
        </dl>
        {snap.counts.fetched > 0 && (
          <p className="fine">
            Sa {count(snap.counts.fetched)} na nakuha mula sa DPWH, {count(snap.counts.rejected ?? 0)} ang hindi isinama: ibang
            lugar, kaparehong pangalan, o kulang ang tugma. Ang halaga sa bawat record ay ang budget field nito, hindi presyo ng
            kontrata o gastos. <Link to="/para-sa-bayan#mga-salita">Kahulugan ng mga salita</Link>
          </p>
        )}

        {statuses.length > 0 && (
          <div className="cstatus">
            <h2 className="section-h section-h-sm">Status ayon sa DPWH</h2>
            <p className="fine">Gaya ng iniulat ng pinagmulan sa snapshot na kinuha noong {date(snap.checkedAt)}; hindi pa independiyenteng nasuri sa lugar.</p>
            <ul className="cstatus-list">
              {statuses.map(([s, n]) => (
                <li key={s}>
                  <button type="button" className={`cstatus-item${status === s ? ' active' : ''}`} aria-pressed={status === s} onClick={() => setParam('status', status === s ? '' : s)}>
                    <span className="cstatus-name"><span lang="en">{s}</span>{dpwhStatusGloss(s) && <small> · {dpwhStatusGloss(s)}</small>}</span><span className="num">{count(n)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {years.length > 1 && (
          <>
            <h2 id="c-years-h" className="section-h section-h-sm">Bilang ng record bawat taon (taon ng proyekto ayon sa DPWH)</h2>
            <div className="cyears" role="group" aria-label="Pumili ng taon">
              {years.map(([y, n]) => (
                <button key={y} type="button" className={`cyear${year === y ? ' active' : ''}`} aria-pressed={year === y} onClick={() => setParam('year', year === y ? '' : y)}>
                  <span className="cyear-bar" aria-hidden="true"><span style={{ height: `${(n / maxYear) * 100}%` }} /></span>
                  <span className="cyear-n num">{count(n)}</span>
                  <span className="cyear-y">{y}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="section" id="kontrata" aria-labelledby="c-list-h">
        <div className="list-head">
          <div>
            <h2 id="c-list-h" className="section-h">Mga record</h2>
            <p className="list-count" aria-live="polite">
              {narrowed ? `${count(filtered.length)} sa ${count(all.length)} ang tugma` : `${count(all.length)} record`}
            </p>
          </div>
        </div>
        <div className="toolbar">
          <label className="field field-grow">
            <span className="label">Hanapin</span>
            <input type="search" name="q" autoComplete="off" spellCheck={false} value={q} placeholder="Pamagat, contract ID, kontratista…" onChange={(e) => setParam('q', e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Taon</span>
            <select value={year} onChange={(e) => setParam('year', e.target.value)}>
              <option value="">Lahat ng taon</option>
              {years.map(([y, n]) => <option key={y} value={y}>{y} ({count(n)})</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Status ayon sa DPWH</span>
            <select value={status} onChange={(e) => setParam('status', e.target.value)}>
              <option value="">Lahat ng status</option>
              {statuses.map(([s, n]) => <option key={s} value={s}>{s}{dpwhStatusGloss(s) ? ` · ${dpwhStatusGloss(s)}` : ''} ({count(n)})</option>)}
            </select>
          </label>
        </div>
        {narrowed && (
          <p className="filter-sums">
            Halaga sa record (budget field ng DPWH) ng {count(listed.length)} sa {count(filtered.length)} na ito: {contractPeso(listed.reduce((n, r) => n + (r.amountPhp ?? 0), 0))}. Hindi presyo ng kontrata o aktuwal na gastos.{' '}
            <button type="button" className="link-button" onClick={() => { setParams(new URLSearchParams(), { replace: true }); setShown(PAGE); }}>Alisin ang mga filter</button>
          </p>
        )}

        <ul className="contracts">
          {filtered.slice(0, shown).map((r) => <ContractItem key={r.id} r={r} defaultOpen={r.id === openId} profiles={profiles} />)}
        </ul>
        {filtered.length === 0 && <p className="state">Walang tumugmang record. Bawasan ang mga salita o alisin ang mga filter.</p>}
        {filtered.length > shown && (
          <div className="more">
            <span className="muted">Ipinapakita ang {count(shown)} sa {count(filtered.length)}</span>
            <button type="button" className="button" onClick={() => setShown((n) => n + PAGE)}>Ipakita ang {count(Math.min(PAGE, filtered.length - shown))} pa</button>
            <button type="button" className="button button-quiet" onClick={() => setShown(filtered.length)}>Ipakita lahat</button>
          </div>
        )}
      </section>

      {snap.reviewRecords.length > 0 && (
        <section className="section review" id="suriin-kontrata" aria-labelledby="c-review-h">
          <details className="review-box" open={reviewHasOpen || undefined}>
            <summary>
              <span className="review-sum-title" id="c-review-h">Sinusuri pa ang lokasyon <span className="count-badge">{count(snap.reviewRecords.length)}</span></span>
              <span className="review-sum-why">
                Maaaring nasa Montalban, kahati ng ibang bayan, o magkasalungat ang pangalan at coordinates. Hindi kasama sa
                listahan at bilang sa itaas hanggang makumpirma.
              </span>
            </summary>
            {narrowed && (
              <p className="list-count" aria-live="polite">
                Sinusunod din ng listahang ito ang paghahanap at filter: {count(reviewFiltered.length)} sa {count(snap.reviewRecords.length)} ang tugma.
              </p>
            )}
            {reviewFiltered.length > 0 ? (
              <ul className="contracts">
                {reviewFiltered.map((r) => <ContractItem key={r.id} r={r} defaultOpen={r.id === openId} profiles={profiles} />)}
              </ul>
            ) : (
              <p className="state">Walang record na sinusuri pa ang tumugma sa paghahanap.</p>
            )}
          </details>
        </section>
      )}

      <section className="section source-block" aria-labelledby="c-source-h">
        <h2 id="c-source-h" className="section-h section-h-sm">Pinagmulan ng datos</h2>
        <dl className="details">
          <div><dt className="label">Pinagmulan</dt><dd><External href={snap.source.url}>{snap.source.name}</External></dd></div>
          {snap.source.originalUrl && <div><dt className="label">Opisyal na portal ng DPWH</dt><dd><External href={snap.source.originalUrl}>{hostOf(snap.source.originalUrl)}</External> <small className="muted">· pangunahing pahina; hanapin doon ang contract ID</small></dd></div>}
          <div><dt className="label">Kinuha ng portal noong</dt><dd>{date(snap.checkedAt)} <small className="muted">· petsa ng pagkuha, hindi petsa ng update ng DPWH</small></dd></div>
          <div><dt className="label">I-download</dt><dd><a href="/data/dpwh-contracts.json" download>Snapshot ng mga record ng DPWH (JSON)</a> · <a href="/data/budget-coverage-audit.json" download>Audit ng saklaw (JSON)</a></dd></div>
          {snap.source.note && (
            <div>
              <dt className="label">Tala ng pinagmulan</dt>
              <dd>
                {knownTextFil(snap.source.note)
                  ? <>{knownTextFil(snap.source.note)}<OriginalEnglish><p>{snap.source.note}</p></OriginalEnglish></>
                  : <span lang="en">{snap.source.note}</span>}
              </dd>
            </div>
          )}
          {snap.source.queriedUrls?.length > 0 && (
            <div>
              <dt className="label">Mga hiniling na URL</dt>
              <dd>
                <details className="url-box">
                  <summary>{count(snap.source.queriedUrls.length)} teknikal na URL ng API · buksan para makita</summary>
                  <ul className="url-list">{snap.source.queriedUrls.map((u) => <li key={u}><a href={u} target="_blank" rel="noopener">{u}</a></li>)}</ul>
                </details>
              </dd>
            </div>
          )}
        </dl>
      </section>
    </>
  );
}

function ContractItem({ r, defaultOpen = false, profiles }: { r: ContractRecord; defaultOpen?: boolean; profiles: Set<string> }) {
  const ref = useRef<HTMLDetailsElement>(null);
  // A deep link (?open=ID) expands the record once and brings it into view.
  useEffect(() => {
    if (defaultOpen && ref.current) { ref.current.open = true; ref.current.scrollIntoView({ block: 'start' }); }
  }, [defaultOpen]);
  const pct = r.progress != null && Number.isFinite(r.progress) ? Math.max(0, Math.min(100, r.progress)) : null;
  const hasPoint = r.latitude != null && r.longitude != null;
  const pr = r.procurement ?? null;
  const { lead, context } = splitTitle(r.title);
  return (
    <li>
      <details className="contract" ref={ref} id={`record-${r.id}`}>
        <summary>
          <span className="contract-main">
            <span className="contract-title" lang="en">{lead}</span>
            {context && <span className="contract-context" lang="en">{context}</span>}
            <span className="contract-meta">
              <span>{r.year || 'Walang taon'}</span>
              <span>ID <span translate="no">{r.id}</span></span>
              <span className={`loc loc-${r.location?.confidence === 'named' || r.location?.confidence === 'coordinates' ? 'named' : r.location?.confidence === 'shared' ? 'shared' : 'review'}`}>
                {CONTRACT_LOCATION_LABEL[r.location?.confidence] ?? r.location?.confidence}
              </span>
            </span>
          </span>
          <span className="contract-side">
            <span className="contract-amount">
              {r.amountPhp == null
                ? <Money stage="record" missing>hindi ibinigay</Money>
                : <Money stage="record">{contractPeso(r.amountPhp)}</Money>}
            </span>
            <span className="contract-status">
              <span lang="en">{r.status || '—'}</span>
              {dpwhStatusGloss(r.status) && <small className="status-gloss">{dpwhStatusGloss(r.status)}</small>}
              {pct != null && <span className="progress" aria-label={`Progreso ayon sa DPWH: ${pct}%`}><span style={{ width: `${pct}%` }} /></span>}
              {pct != null && <span className="num">{pct}%</span>}
            </span>
          </span>
        </summary>
        <dl className="contract-details">
          {context && <div className="contract-full"><dt>Buong pamagat ayon sa DPWH</dt><dd lang="en">{r.title}</dd></div>}
          <div><dt>Halaga sa record (budget field ng DPWH)</dt><dd className="num">{r.amountPhp == null ? 'Hindi ibinigay' : contractPeso(r.amountPhp)} <small>· hindi presyo ng kontrata o aktuwal na gastos</small></dd></div>
          {pr && (
            <>
              <div><dt>ABC (pinakamataas na pinapayagang halaga)</dt><dd className="num">{pr.abcPhp == null ? 'Hindi ibinigay' : contractPeso(pr.abcPhp)} <small>· kisame ng bidding, hindi presyo</small></dd></div>
              <div><dt>Halaga ng award</dt><dd className="num">{pr.awardAmountPhp == null ? 'Hindi ibinigay ng pinagmulan' : contractPeso(pr.awardAmountPhp)}</dd></div>
            </>
          )}
          <div>
            <dt>Kontratista</dt>
            <dd>
              {r.contractor && profiles.has(contractorKey(r.contractor) ?? '')
                ? <Link to={`/kontratista/${encodeURIComponent(contractorKey(r.contractor)!)}`}>{r.contractor}</Link>
                : r.contractor ?? 'Hindi ibinigay'}
            </dd>
          </div>
          {r.program && <div><dt>Programa</dt><dd lang="en">{r.program}</dd></div>}
          {r.fundingSource && <div><dt>Pinagmulan ng pondo</dt><dd lang="en">{r.fundingSource}</dd></div>}
          {pr?.advertisementDate && <div><dt>Inanunsyo ang bidding</dt><dd>{dateOr(pr.advertisementDate)}</dd></div>}
          {pr?.bidSubmissionDeadline && <div><dt>Huling araw ng bid</dt><dd>{dateOr(pr.bidSubmissionDeadline)}</dd></div>}
          {pr?.dateOfAward && <div><dt>Petsa ng award</dt><dd>{dateOr(pr.dateOfAward)}</dd></div>}
          <div><dt>Simula</dt><dd>{r.startDate ? dateOr(r.startDate) : 'Hindi ibinigay'}</dd></div>
          {r.expiryDate && <div><dt>Planong pagtatapos</dt><dd>{dateOr(r.expiryDate)}</dd></div>}
          <div><dt>Natapos ayon sa DPWH</dt><dd>{r.completionDate ? dateOr(r.completionDate) : 'Hindi ibinigay'}</dd></div>
          <div><dt>Status at progreso</dt><dd><span lang="en">{r.status || '—'}</span>{dpwhStatusGloss(r.status) && <> ({dpwhStatusGloss(r.status)})</>}{pct != null && <> · {pct}%</>} <small>· iniulat ng DPWH, hindi nasuri</small></dd></div>
          <div><dt>Lokasyon</dt><dd>{r.location?.note || '—'}</dd></div>
          {hasPoint && (
            <div><dt>Coordinates</dt><dd><External href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=16/${r.latitude}/${r.longitude}`}>{r.latitude!.toFixed(5)}, {r.longitude!.toFixed(5)} sa mapa</External></dd></div>
          )}
          <div>
            <dt>Pinagmulan ng record</dt>
            <dd className="contract-source">
              {r.recordPageUrl && (
                <External href={r.recordPageUrl}>{r.recordPageLabel || `Tingnan ang record sa ${hostOf(r.recordPageUrl)}`}</External>
              )}
              <span>
                <a href={r.sourceUrl} target="_blank" rel="noopener" type="application/json">
                  Teknikal na datos (JSON) <span aria-hidden="true">↗</span>
                </a>
                <small className="muted">
                  {' '}Raw na API record mula sa <span translate="no">{hostOf(r.sourceUrl)}</span>, ang BetterGov mirror ng DPWH. Para sa
                  pagsusuri; hindi ito opisyal na dokumento. Nasa itaas na ang mga detalye sa nababasang anyo.
                </small>
              </span>
            </dd>
          </div>
        </dl>
      </details>
    </li>
  );
}

/** Source dates arrive in mixed formats; show them as given when they do not parse. */
function dateOr(v: string): string {
  return Number.isNaN(new Date(v).getTime()) ? v : date(v);
}

function tally(values: string[]): [string, number][] {
  const n = new Map<string, number>();
  for (const v of values) n.set(v, (n.get(v) ?? 0) + 1);
  return [...n.entries()];
}
