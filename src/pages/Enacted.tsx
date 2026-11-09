/**
 * /gaa — the enacted budgets, 2020–2026, for the portal's area:
 * - each DPWH office's whole budget by year, from its district page, with the
 *   2027 NEP and House bill beside it but apart (they are not law);
 * - every program, activity or project in any department whose name names one
 *   of the portal's places, with its appropriation in each year.
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import type { DistrictCard, DistrictOffice, Envelope } from '../api/types';
import { GAA_YEARS } from '../api/types';
import { shortNameOf } from '../config';
import { Await, Disclaimers, External } from '../components/Bits';
import { PageHead } from '../components/Chrome';
import StageSwitch from '../components/StageSwitch';
import ReviewPanel, { LocationChip } from '../components/ReviewPanel';
import { compactAmount, locationOf, reviewRows } from '../components/data-shapes';
import { downloadText } from '../lib/csv';
import { tierTextFil, yearScopeFil } from '../lib/display';
import { count, date, php, phpFull, plural } from '../lib/format';
import { departmentShort, gaaCsv, gaaYearTotals, hasYear, loadGaa, type GaaResult, type GaaRow } from '../lib/gaa';
import { usePortal, type Async } from '../lib/portal-context';
import { useTitle } from '../lib/use-title';

const PAGE = 25;
const FIRST = GAA_YEARS[0];
const LAST = GAA_YEARS[GAA_YEARS.length - 1];

export default function Enacted() {
  const { config, client, districts } = usePortal();
  const name = shortNameOf(config);
  useTitle(`Naisabatas na budget ${FIRST}–${LAST} · ${name}`);
  const places = config.scope.places ?? [];

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [state, setState] = useState<Async<GaaResult>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!places.length) return;
    let live = true;
    loadGaa(client, config, (done, total) => live && setProgress({ done, total })).then(
      (value) => live && setState({ status: 'ready', value }),
      (error) => live && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      live = false;
    };
  }, [client, config, places.length, attempt]);

  // #office-… links from the main page land on the office once it has rendered.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash, districts.status]);

  const placeList = places.map((p) => p.label).join(', ');
  return (
    <main className="page main">
      <PageHead
        title={`Ano ang naisabatas para sa ${name}, ${FIRST}–${LAST}`}
      >
        <p>
          Ang General Appropriations Act (GAA) ang budget na ipinasa ng Kongreso at nilagdaan ng Pangulo. Pahintulot ito na
          gumastos, hindi tala ng nagastos. Nandito ang mga programang tumutukoy sa bayan sa pangalan
          {state.status === 'ready' && <> ({plural(state.value.rows.length, 'programa', 'programa')})</>}, at ang budget ng
          DPWH office bawat taon. Hiwalay at hindi idinadagdag dito ang mga panukala para sa 2027.
        </p>
      </PageHead>
      <StageSwitch />

      <OfficeHistories />

      {places.length === 0 ? (
        <p className="fine section-gap">
          DPWH offices lang ang sinusundan ng portal na ito. Pangalan, hindi opisina, ang batayan ng GAA, kaya ang taunang
          kabuuan lang ng bawat opisina ang makikita rito.
        </p>
      ) : state.status === 'loading' ? (
        <div className="state" role="status">
          <span className="spinner" aria-hidden="true" /> Hinahanap ang {placeList} sa programa ng bawat departamento
          {progress && progress.total > 0 && <> · {count(progress.done)} sa {count(progress.total)}</>}… Maaaring tumagal nang ilang segundo.
        </div>
      ) : state.status === 'error' ? (
        <div className="state state-error" role="alert">
          <p><strong>Hindi makuha ang naisabatas na budget.</strong> Subukang muli maya-maya.</p>
          <p className="state-detail">Teknikal na detalye: <span lang="en">{state.error.message}</span></p>
          <button type="button" className="button" onClick={() => { setState({ status: 'loading' }); setAttempt((n) => n + 1); }}>Subukang muli</button>
        </div>
      ) : (
        <Programs result={state.value} />
      )}

      <section className="section" aria-labelledby="gaa-notes-h">
        <h2 id="gaa-notes-h" className="section-h">Paano basahin ang mga numerong ito</h2>
        <ul className="plain-list fine-list">
          <li>Ang halaga ay ang appropriation sa GAA ng bawat taon, sa piso. Sa libo inilalathala ng GAA ang mga ito.</li>
          {places.length > 0 && (
            <>
              <li>Nakalista ang isang programa kapag binabanggit ng pangalan nito ang {placeList}. Pangalan ang itinutugma, hindi lugar na sinukat; wala rito ang proyektong hindi nagsasabi kung saan ito.</li>
              <li>Ang isang hilera ay isang pangalan sa isang ahensya sa lahat ng taon. Bagong hilera ang proyektong pinalitan ng pangalan. Ang gitling ay walang appropriation sa pangalang iyon nang taong iyon.</li>
            </>
          )}
          <li>Ang taunang halaga ng DPWH office ay ang buong budget nito sa GAA. Ang opisinang naglilingkod sa ilang distrito ay ipinapakita nang buo, hindi hinahati.</li>
          <li>Ang mga numero ng 2027 ay ang NEP at House bill, hindi pa batas. Nakahiwalay sila sa mga naisabatas na taon, hindi idinadagdag.</li>
          <li>Magkaibang sukatan ang kabuuan ng mga programang nakapangalan sa bayan (mula sa lahat ng departamento) at ang budget ng DPWH office. Hindi bahagi ng isa ang isa, at hindi sila pinagsasama.</li>
        </ul>
        <p className="fine"><Link to="/para-sa-bayan#mga-salita">Kahulugan ng NEP, GAA, ABC at iba pang salita</Link></p>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// DPWH offices, year by year
// ---------------------------------------------------------------------------

function OfficeHistories() {
  const { districts, config } = usePortal();
  if (!config.scope.offices?.length && !config.scope.districts?.length) return null;
  return (
    <Await state={districts} what="budget ng DPWH office">
      {(list) => <OfficeHistoryList list={list} />}
    </Await>
  );
}

function OfficeHistoryList({ list }: { list: Envelope<DistrictCard>[] }) {
  const offices = useMemo(() => {
    const byId = new Map<string, DistrictOffice>();
    for (const env of list) for (const o of env.data.offices) if (!byId.has(o.id)) byId.set(o.id, o);
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  }, [list]);
  const officeDisclaimer = list.flatMap((e) => e.disclaimers).filter((d) => d.id === 'disclaimer-offices').slice(0, 1);
  if (!offices.length) return null;
  return (
    <section className="section" aria-labelledby="office-years-h">
      <h2 id="office-years-h" className="section-h">
        {offices.length === 1 ? 'Budget ng DPWH office bawat taon' : `Budget ng ${count(offices.length)} DPWH office bawat taon`}
      </h2>
      <p className="legend">
        <span><i className="sw sw-gaa" /> GAA 2020–2026: naisabatas, buong opisina</span>
        <span><i className="sw sw-nep" /> NEP 2027: panukala pa, buong opisina</span>
        <span><i className="sw sw-house" /> House bill 2027: panukala pa, mga nakapangalang proyekto lang</span>
      </p>
      <div className="hgrid">
        {offices.map((o) => <OfficeHistory key={o.id} office={o} />)}
      </div>
      <Disclaimers items={officeDisclaimer} compact />
    </section>
  );
}

/** Vertical bars on wide screens, horizontal rows on phones (editorial.css reads --w). */
const barStyle = (pct: number) => ({ height: `${pct}%`, '--w': `${pct}%` }) as CSSProperties;

/** The enacted years (2020–2026) and, apart from them, the two 2027 proposals. */
function OfficeHistory({ office }: { office: DistrictOffice }) {
  const years = office.years ?? [];
  const slot = (fy: number, stage: string) => years.find((y) => y.fy === fy && y.stage === stage);
  const enacted = GAA_YEARS.map((fy) => ({ key: `${fy}`, label: String(fy), kind: 'gaa', v: slot(fy, 'gaa') }));
  const proposed = [
    { key: '2027-nep', label: 'NEP', kind: 'nep', v: slot(2027, 'nep') },
    { key: '2027-house', label: 'House', kind: 'house', v: slot(2027, 'hgab3') },
  ];
  const all = [...enacted, ...proposed];
  const max = Math.max(1, ...all.map((b) => b.v?.php ?? 0));
  const tier = tierTextFil(office.tier_text);
  const col = (b: (typeof all)[number]) => {
    const scope = yearScopeFil(b.v?.scope);
    return (
      <div key={b.key} className={`bar-col k-${b.kind}`} title={b.v?.php != null ? `${b.label === 'NEP' || b.label === 'House' ? `${b.label} 2027` : `GAA ${b.label}`}: ${phpFull(b.v.php)}${scope ? ` (${scope})` : ''}` : 'Hindi nakita ang opisina nang taong iyon'}>
        <span className="bar-v num">{compactAmount(b.v?.php)}</span>
        <span className="bar-track"><span className="bar-fill" style={barStyle(((b.v?.php ?? 0) / max) * 100)} /></span>
        <span className="bar-x">{b.label}</span>
      </div>
    );
  };
  return (
    <article className="hcard" id={office.id}>
      <header>
        <h3>DPWH {office.name}</h3>
        {tier ? <span className={`tag tier tier-${office.tier}`}>{tier}</span> : <span className={`tag tier tier-${office.tier}`} lang="en">{office.tier_text}</span>}
      </header>
      <div className="bars-split" role="img" aria-label={`Budget ng opisina: ${all.map((b) => `${b.kind === 'gaa' ? `GAA ${b.label}` : `${b.label} 2027`} ${b.v?.php != null ? phpFull(b.v.php) : 'walang nakita'}`).join('; ')}`}>
        <div className="bars-group">
          <div className="bars bars-gaa">{enacted.map(col)}</div>
          <p className="bars-cap">GAA 2020–2026 · naisabatas</p>
        </div>
        <div className="bars-group bars-group-2027">
          <div className="bars bars-2027">{proposed.map(col)}</div>
          <p className="bars-cap">2027 · panukala pa, hindi pa batas</p>
        </div>
      </div>
      {office.co_served_districts.length > 0 && (
        <p className="fine">Buong opisina, kahati ng {office.co_served_districts.map((d) => d.label).join('; ')}; hindi hinahati.</p>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Programs and projects that name the place
// ---------------------------------------------------------------------------

function Programs({ result }: { result: GaaResult }) {
  const { config } = usePortal();
  const all = result.rows;
  const totals = useMemo(() => gaaYearTotals(all), [all]);
  const maxTotal = Math.max(1, ...totals.map((t) => t.amount));

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const dept = params.get('dept') ?? '';
  const yearParam = Number(params.get('year'));
  const year = (GAA_YEARS as readonly number[]).includes(yearParam) ? yearParam : null;
  const [shown, setShown] = useState(PAGE);
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setShown(PAGE);
  };

  const departments = useMemo(() => {
    const n = new Map<string, { label: string; rows: number }>();
    for (const r of all) {
      const d = n.get(r.department_id) ?? { label: departmentShort(r.department), rows: 0 };
      d.rows++;
      n.set(r.department_id, d);
    }
    return [...n.entries()].sort((a, b) => b[1].rows - a[1].rows);
  }, [all]);

  const filtered = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const y = year ? String(year) : null;
    const rows = all.filter((r) => {
      if (dept && r.department_id !== dept) return false;
      if (y && !hasYear(r, y)) return false;
      if (words.length) {
        const hay = `${r.name} ${r.department}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    return y ? [...rows].sort((a, b) => (b.years[y]?.amount ?? 0) - (a.years[y]?.amount ?? 0)) : rows;
  }, [all, q, dept, year]);
  const narrowed = filtered.length !== all.length;

  return (
    <>
      <section className="section" aria-labelledby="gaa-years-h">
        <h2 id="gaa-years-h" className="section-h">Bawat taon: mga programang tumutukoy sa bayan</h2>
        <div className="ystrip" role="group" aria-label="Pumili ng taon">
          {totals.map((t) => (
            <button
              key={t.year}
              type="button"
              className={`ycell${year === t.year ? ' active' : ''}`}
              aria-pressed={year === t.year}
              onClick={() => setParam('year', year === t.year ? '' : String(t.year))}
            >
              <span className="label">GAA {t.year}</span>
              <span className="ybar"><span style={{ height: `${(t.amount / maxTotal) * 100}%` }} /></span>
              <span className="yv num">{php(t.amount)}</span>
              <span className="ysub">{plural(t.programs, 'programang', 'programang')} pinondohan</span>
            </button>
          ))}
        </div>
        {result.checkedAt && (
          <p className="fine snapshot-note">
            Mula sa naka-save na snapshot ng Budget API na kinuha noong {date(result.checkedAt)}. Petsa ito ng pagkuha, hindi
            petsa ng huling update ng pinagmulan.
          </p>
        )}
        <p className="fine">
          Ang kabuuan ng bawat taon ay para lang sa mga programang nakapangalan ang bayan nang taong iyon, mula sa lahat ng
          departamento. Magkakatabi ang mga taon, hindi pinagsasama. Hindi ito lahat ng pondong napunta sa bayan, at hindi ito
          bahagi ng budget ng DPWH office sa itaas: magkaibang sukatan ang dalawa.
        </p>
      </section>

      <section className="section" id="programs" aria-labelledby="gaa-list-h">
        <div className="list-head">
          <h2 id="gaa-list-h" className="section-h">
            {narrowed ? `${count(filtered.length)} sa ${count(all.length)} na programa` : `Mga programang tumutukoy sa bayan (${count(all.length)})`}
          </h2>
          <button type="button" className="button button-quiet" disabled={!filtered.length} onClick={() => downloadText(`${config.id}-gaa-${FIRST}-${LAST}.csv`, gaaCsv(filtered))}>
            I-download ang CSV{narrowed ? ` (${count(filtered.length)})` : ''}
          </button>
        </div>
        <div className="toolbar">
          <label className="field field-grow">
            <span className="label">Hanapin</span>
            <input type="search" name="q" autoComplete="off" value={q} placeholder="Kalsada, paaralan, barangay, ahensya…" onChange={(e) => setParam('q', e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Departamento</span>
            <select value={dept} onChange={(e) => setParam('dept', e.target.value)}>
              <option value="">Lahat ng departamento</option>
              {departments.map(([id, d]) => <option key={id} value={id}>{d.label} ({count(d.rows)})</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Taon</span>
            <select value={year ?? ''} onChange={(e) => setParam('year', e.target.value)}>
              <option value="">Lahat ng taon</option>
              {totals.map((t) => <option key={t.year} value={t.year}>{t.year} ({count(t.programs)})</option>)}
            </select>
          </label>
        </div>
        {narrowed && (
          <p className="filter-sums">
            {year ? <>GAA {year}: {php(filtered.reduce((a, r) => a + (r.years[String(year)]?.amount ?? 0), 0))} sa {count(filtered.length)} na ito</> : <>{count(filtered.length)} ang ipinapakita</>}
            <span className="sep">·</span>
            <button type="button" className="link-button" onClick={() => { setParams(new URLSearchParams(), { replace: true }); setShown(PAGE); }}>Alisin ang mga filter</button>
          </p>
        )}

        {filtered.length > 0 && (
          <div className="table gtable" role="table" aria-label="Mga programa at proyekto, bawat taon">
            <div className="tr th" role="row">
              <span role="columnheader">Programa o proyekto <small>· halaga sa GAA bawat taon</small></span>
              {GAA_YEARS.map((y) => <span role="columnheader" key={y} className={`r${year === y ? ' ycol' : ''}`}>{y}</span>)}
            </div>
            {filtered.slice(0, shown).map((r) => <ProgramRow key={r.key} r={r} year={year} many={(config.scope.places?.length ?? 0) > 1} />)}
          </div>
        )}
        {filtered.length === 0 && <p className="state">Walang tumugmang programa. Bawasan ang mga salita o alisin ang mga filter.</p>}
        {filtered.length > shown && (
          <div className="more">
            <span className="muted">Ipinapakita ang {count(shown)} sa {count(filtered.length)}</span>
            <button type="button" className="button" onClick={() => setShown((n) => n + PAGE)}>Ipakita ang {count(Math.min(PAGE, filtered.length - shown))} pa</button>
            <button type="button" className="button button-quiet" onClick={() => setShown(filtered.length)}>Ipakita lahat</button>
          </div>
        )}
        {result.queries.some((x) => x.truncated) && (
          <p className="fine">May mga paghahanap na nakatugma ng mas maraming programa kaysa sa nailo-load ng pahinang ito; tingnan ang Tungkol sa datos.</p>
        )}
      </section>

      <ReviewPanel
        id="suriin-gaa"
        title="Sinusuri pa ang lokasyon"
        intro="Mga programang maaaring para sa Montalban, kahati ng ibang lugar, o may kaparehong pangalan sa ibang lugar. Hindi kasama sa mga kabuuan sa itaas hanggang makumpirma."
        items={reviewRows(result).map((r) => ({
          key: r.key,
          title: r.name,
          href: `https://budget.bettergov.ph/d/${r.department_id}`,
          meta: <>{departmentShort(r.department)} · {GAA_YEARS.filter((y) => hasYear(r, y)).join(', ') || 'walang taong may halaga'}</>,
          amount: <>{GAA_YEARS.filter((y) => hasYear(r, y)).map((y) => <span key={y}>GAA {y}: {php(r.years[String(y)]?.amount ?? 0)}<br /></span>)}</>,
          location: locationOf(r),
        }))}
      />
    </>
  );
}

function ProgramRow({ r, year, many }: { r: GaaRow; year: number | null; many: boolean }) {
  return (
    <div className="tr" role="row">
      <span role="cell" className="td-project">
        <span className="gname" lang="en">{r.name}</span>
        <span className="project-meta">
          <External href={`https://budget.bettergov.ph/d/${r.department_id}`}>{departmentShort(r.department)} sa budget.bettergov.ph</External>
          {many && r.reasons.map((p) => <span key={p} className="tag tag-place">binabanggit ang {p}</span>)}
          <LocationChip row={r} />
        </span>
      </span>
      {GAA_YEARS.map((y) => {
        const has = hasYear(r, y);
        const amount = r.years[String(y)]?.amount ?? 0;
        return (
          <span role="cell" key={y} data-label={String(y)} className={`r num gcell${has ? '' : ' none'}${year === y ? ' ycol' : ''}`} title={has ? phpFull(amount) : `Walang appropriation sa pangalang ito noong ${y}`}>
            {has ? php(amount) : '—'}
          </span>
        );
      })}
    </div>
  );
}
