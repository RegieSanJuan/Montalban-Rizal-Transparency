/**
 * "/" — the detailed overview, read first. Three separate sources (never added
 * together), each with its count, one stage-labelled money figure and a way
 * into its full list; then one short section per source. The plain-language
 * guide is one click away at /para-sa-bayan.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { shortNameOf } from '../config';
import { Money } from '../components/Bits';
import { MunicipalHero, OfficeYearsMini } from '../components/BudgetOverview';
import ContextPhoto from '../components/ContextPhoto';
import { DataStatusLine } from '../components/DataStatus';
import LocalOfficials from '../components/LocalOfficials';
import OfficesSection from '../components/OfficesSection';
import ReadingMode from '../components/ReadingMode';
import { useDirectory } from '../components/useDirectory';
import { dpwhStatusGloss, GROUP_FIL, splitTitle } from '../lib/display';
import { count, php } from '../lib/format';
import { gaaYearTotals, loadGaa, type GaaResult } from '../lib/gaa';
import { PHOTOS } from '../lib/photos';
import type { ProjectDirectory } from '../lib/project-directory';
import { usePortal, type Async } from '../lib/portal-context';
import { summarise } from '../lib/scope';
import { useHashScroll } from '../lib/use-hash-scroll';
import { useTitle } from '../lib/use-title';

/** Old links to "/?q=…#projects" belong to the 2027 page that used to live here. */
const LEGACY_2027_HASHES = ['#projects', '#saklaw', '#suriin'];
/** Old links to the citizen guide's sections, from when it lived at "/". */
const GUIDE_HASHES = ['#mga-salita', '#hakbang', '#hanapin'];

function useGaa(): Async<GaaResult> {
  const { client, config } = usePortal();
  const [state, setState] = useState<Async<GaaResult>>({ status: 'loading' });
  useEffect(() => {
    if (!config.scope.places?.length) return;
    let live = true;
    loadGaa(client, config).then(
      (value) => live && setState({ status: 'ready', value }),
      (error) => live && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => { live = false; };
  }, [client, config]);
  return state;
}

export default function Overview() {
  const { config } = usePortal();
  const { search, hash } = useLocation();
  useTitle(`Buod ng budget · ${shortNameOf(config)}`);
  const dir = useDirectory();
  const gaa = useGaa();
  useHashScroll(dir.status === 'ready');
  if (search || LEGACY_2027_HASHES.includes(hash)) return <Navigate to={`/panukala-2027${search}${hash}`} replace />;
  if (GUIDE_HASHES.includes(hash)) return <Navigate to={`/para-sa-bayan${hash}`} replace />;
  const d = dir.status === 'ready' ? dir.value : null;
  return (
    <main className="page main overview">
      <ReadingMode />
      <MunicipalHero mode="detailed" meta={d ? `${count(d.coverage.included)} DPWH project record · ${count(d.coverage.mapped)} may lokasyon sa mapa` : undefined} />
      <SourceCards dir={dir} gaa={gaa} />
      <SimpleCallout />
      <nav className="ov-jump" aria-label="Sa pahinang ito">
        <span className="ov-jump-label">Sa pahinang ito:</span>
        <a href="#ov-dpwh-h">Mga record ng DPWH</a>
        <a href="#ov-gaa-h">Naisabatas na budget</a>
        <a href="#ov-2027-h">Panukala para sa 2027</a>
        <a href="#mga-opisyal">Mga opisyal</a>
        <a href="#offices">DPWH office at mga distrito</a>
      </nav>
      <DpwhSection dir={dir} />
      <GaaSection gaa={gaa} />
      <ProposalSection />
      <LocalOfficials />
      <OfficesSection />
      <section className="section overview-foot" aria-labelledby="ov-more-h">
        <h2 id="ov-more-h" className="section-h section-h-sm">Saklaw at pinagmulan</h2>
        <p className="fine">
          Ano ang kaya at hindi kayang ipakita ng portal: <Link to="/panukala-2027#saklaw">saklaw at mga alam nating kulang</Link>.
          Paano binuo ang mga listahan at ang buong kalagayan ng datos: <Link to="/about">Tungkol sa datos</Link>.
        </p>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// The three sources, side by side, never added together
// ---------------------------------------------------------------------------

function SourceCards({ dir, gaa }: { dir: Async<ProjectDirectory>; gaa: Async<GaaResult> }) {
  const { scope } = usePortal();
  const d = dir.status === 'ready' ? dir.value : null;
  const years = useMemo(() => {
    const ys = (d?.records ?? []).map((r) => r.year).filter((y) => /^\d{4}$/.test(y)).sort();
    return ys.length ? `${ys[0]}–${ys[ys.length - 1]}` : null;
  }, [d]);
  const latest = useMemo(() => {
    if (gaa.status !== 'ready') return null;
    return gaaYearTotals(gaa.value.rows).filter((t) => t.programs > 0).at(-1) ?? null;
  }, [gaa]);
  const s = scope.status === 'ready' ? summarise(scope.value.projects) : null;
  const wait = <span className="src-wait">Kinukuha…</span>;
  const failed = <span className="src-wait">Hindi makuha ngayon</span>;

  return (
    <section className="section sources" aria-labelledby="sources-h">
      <div className="sources-head">
        <h2 id="sources-h" className="section-h">Tatlong listahan, <em>hiwalay ang bilang</em></h2>
        <p className="section-intro">
          Magkakaiba ang pinagmulan, yunit at taon ng bawat listahan, kaya hindi pinagsasama ang kanilang mga bilang o halaga.
          Piliin ang isa para makita ang buong listahan.
        </p>
      </div>
      <ol className="src-cards">
        <li className="src-card src-dpwh">
          <Link to="/contracts" className="src-link">
            <span className="src-name">Mga project record ng DPWH</span>
            <span className="src-count"><strong className="num">{d ? count(d.coverage.included) : '…'}</strong> record{years && <> · {years}</>}</span>
            <span className="src-money">
              {d ? <Money stage="record">{php(d.coverage.sourceBudgetPhp)}</Money> : dir.status === 'error' ? failed : wait}
            </span>
            <span className="src-note">
              Kabuuan ng budget field ng mga record{d ? `; ${count(d.coverage.unknownAmountCount)} ang walang halaga` : ''}. Hindi presyo ng kontrata o gastos.
            </span>
            <span className="src-cta">Buksan ang mga record <span aria-hidden="true">→</span></span>
          </Link>
        </li>
        <li className="src-card">
          <Link to="/gaa" className="src-link">
            <span className="src-name">Naisabatas na budget</span>
            <span className="src-count"><strong className="num">{gaa.status === 'ready' ? count(gaa.value.rows.length) : '…'}</strong> programa · GAA 2020–2026</span>
            <span className="src-money">
              {latest ? <Money stage="gaa">{php(latest.amount)}</Money> : gaa.status === 'error' ? failed : wait}
            </span>
            <span className="src-note">
              {latest ? `Para sa ${count(latest.programs)} programang nakapangalan sa bayan noong ${latest.year}. ` : ''}Pahintulot na gumastos, hindi tala ng nagastos.
            </span>
            <span className="src-cta">Buksan ang kasaysayan <span aria-hidden="true">→</span></span>
          </Link>
        </li>
        <li className="src-card">
          <Link to="/panukala-2027" className="src-link">
            <span className="src-name">Panukala para sa 2027</span>
            <span className="src-count"><strong className="num">{s ? count(s.rows) : '…'}</strong> record · NEP at House bill</span>
            <span className="src-money">
              {s ? <Money stage="nep">{s.nep.rows ? php(s.nep.php) : '—'}</Money> : scope.status === 'error' ? failed : wait}
            </span>
            <span className="src-note">
              {s ? (s.house.rows ? <>House bill: {php(s.house.php)}. </> : <>Walang katapat na linya sa House bill. </>) : null}
              Panukala pa lang, hindi pa batas. Ang mga linyang tahasang nakapangalan sa bayan lang.
            </span>
            <span className="src-cta">Buksan ang panukala <span aria-hidden="true">→</span></span>
          </Link>
        </li>
      </ol>
      <DataStatusLine />
    </section>
  );
}

/** The plain-language guide, offered early and plainly. */
function SimpleCallout() {
  return (
    <aside className="simple-callout" aria-labelledby="simple-h">
      <div>
        <h2 id="simple-h">Bago rito? <em>Basahin sa simpleng salita.</em></h2>
        <p>
          Ang parehong datos, ipinaliwanag nang hakbang-hakbang: ano ang nasa barangay mo, paano nagiging proyekto ang pera,
          isang halimbawang record, mga salitang dapat mong malaman, at ano ang puwede mong gawin.
        </p>
      </div>
      <Link className="button button-primary" to="/para-sa-bayan">Sa simpleng salita <span aria-hidden="true">→</span></Link>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// DPWH records in brief
// ---------------------------------------------------------------------------

function DpwhSection({ dir }: { dir: Async<ProjectDirectory> & { retry?: () => void } }) {
  if (dir.status === 'loading') return <div className="section state" role="status"><span className="spinner" aria-hidden="true" /> Kinukuha ang mga record ng DPWH… Maaaring tumagal nang ilang segundo.</div>;
  if (dir.status === 'error') {
    return (
      <div className="section state state-error" role="alert">
        <p className="state-title">Hindi makuha ang mga record ng DPWH.</p>
        <button type="button" className="button" onClick={dir.retry}>Subukang kunin muli</button>
      </div>
    );
  }
  return <DpwhBrief dir={dir.value} />;
}

function DpwhBrief({ dir }: { dir: ProjectDirectory }) {
  const statuses = useMemo(() => tally(dir.records.map((r) => r.status || '—')), [dir]);
  const years = useMemo(() => tally(dir.records.map((r) => r.year || '—')).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8).reverse(), [dir]);
  const top = dir.contractorProfiles.slice(0, 5);
  const maxStatus = Math.max(1, ...statuses.map(([, n]) => n));
  const maxYear = Math.max(1, ...years.map(([, n]) => n));
  return (
    <section className="section ov-section" aria-labelledby="ov-dpwh-h">
      <div className="ov-head">
        <h2 id="ov-dpwh-h" className="section-h">Mga project record <em>ng DPWH</em></h2>
        <p className="section-intro">
          {count(dir.coverage.included)} record na nakatalaga sa bayan, mula procurement hanggang natapos. Ang status at progreso ay
          iniulat ng DPWH at hindi pa nasuri sa lugar; {count(dir.coverage.reviewExcluded)} pa ang sinusuri ang lokasyon at hindi kasama rito.
        </p>
      </div>
      <div className="ov-grid">
        <div className="ov-panel">
          <h3>Status ayon sa DPWH</h3>
          <ul className="ov-bars">
            {statuses.map(([s, n]) => (
              <li key={s}>
                <Link to={`/contracts?status=${encodeURIComponent(s)}`}>
                  <span className="ov-bar-label"><span lang="en">{s}</span>{dpwhStatusGloss(s) && <small> · {dpwhStatusGloss(s)}</small>}</span>
                  <span className="ov-bar-track" aria-hidden="true"><span style={{ width: `${(n / maxStatus) * 100}%` }} /></span>
                  <span className="ov-bar-n num">{count(n)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <h3>Record bawat taon <small>(taon ng proyekto ayon sa DPWH, huling {years.length})</small></h3>
          <ul className="ov-bars">
            {years.map(([y, n]) => (
              <li key={y}>
                <Link to={`/contracts?year=${encodeURIComponent(y)}`}>
                  <span className="ov-bar-label">{y}</span>
                  <span className="ov-bar-track" aria-hidden="true"><span style={{ width: `${(n / maxYear) * 100}%` }} /></span>
                  <span className="ov-bar-n num">{count(n)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="ov-panel">
          <h3>Mga kontratistang may pinakamaraming record</h3>
          <ol className="ov-top">
            {top.map((c) => (
              <li key={c.id}>
                <Link to={`/kontratista/${encodeURIComponent(c.id)}`} className="ov-top-name">{c.name}</Link>
                <span className="ov-top-meta">
                  <span className="num">{count(c.contractCount)} record</span>
                  {c.sourceBudgetPhp ? <Money stage="record">{php(c.sourceBudgetPhp)}</Money> : null}
                </span>
              </li>
            ))}
          </ol>
          <p className="fine">
            Pinagsama lang ang eksaktong parehong pangalan; hindi ito legal na pagkakakilanlan at hindi patunay ng anumang mali.{' '}
            <Link to="/kontratista">Lahat ng {count(dir.coverage.contractors)} kontratista</Link>
          </p>
          <ContextPhoto photo={PHOTOS.highway} />
        </div>
      </div>
      <p className="ov-links">
        <Link to="/contracts">Buong listahan ng record</Link>
        <Link to="/mapa">{count(dir.coverage.mapped)} record sa mapa</Link>
        <Link to="/kontratista">Mga kontratista</Link>
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Enacted budget in brief
// ---------------------------------------------------------------------------

function GaaSection({ gaa }: { gaa: Async<GaaResult> }) {
  const totals = useMemo(() => (gaa.status === 'ready' ? gaaYearTotals(gaa.value.rows) : []), [gaa]);
  const max = Math.max(1, ...totals.map((t) => t.amount));
  return (
    <section className="section ov-section" aria-labelledby="ov-gaa-h">
      <div className="ov-head">
        <h2 id="ov-gaa-h" className="section-h">Naisabatas na budget, <em>2020–2026</em></h2>
        <p className="section-intro">
          Ang General Appropriations Act (GAA) ay pahintulot na gumastos, hindi tala ng nagastos. Dalawang magkaibang sukatan ang
          nasa ibaba: ang mga programang nakapangalan sa bayan (mula sa lahat ng departamento), at ang buong budget ng DPWH
          office na kahati ng ibang distrito. Hindi bahagi ng isa ang isa, at hindi sila pinagsasama.
        </p>
      </div>
      {gaa.status === 'loading' && <p className="state" role="status"><span className="spinner" aria-hidden="true" /> Kinukuha ang naisabatas na budget… Maaaring tumagal nang ilang segundo.</p>}
      {gaa.status === 'error' && <p className="state state-error" role="alert">Hindi makuha ang naisabatas na budget. <Link to="/gaa">Buksan ang kasaysayan</Link></p>}
      <div className="ov-grid">
        {totals.length > 0 && (
          <div className="ov-panel">
            <h3>Mga programang nakapangalan sa bayan, bawat taon</h3>
            <ul className="ov-bars">
              {totals.map((t) => (
                <li key={t.year}>
                  <Link to={`/gaa?year=${t.year}`}>
                    <span className="ov-bar-label">GAA {t.year}</span>
                    <span className="ov-bar-track" aria-hidden="true"><span style={{ width: `${(t.amount / max) * 100}%` }} /></span>
                    <span className="ov-bar-n num">{t.programs ? php(t.amount) : '—'}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="fine">Magkakatabi ang mga taon, hindi pinagsasama. Hindi ito lahat ng pondong napunta sa bayan.</p>
          </div>
        )}
        <div className="ov-panel">
          <h3>Ang DPWH office, buong opisina</h3>
          <OfficeYearsMini />
        </div>
      </div>
      <p className="ov-links"><Link to="/gaa">Lahat ng programa at ang budget ng opisina bawat taon</Link></p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2027 proposal in brief
// ---------------------------------------------------------------------------

function ProposalSection() {
  const { scope } = usePortal();
  return (
    <section className="section ov-section" aria-labelledby="ov-2027-h">
      <div className="ov-head">
        <h2 id="ov-2027-h" className="section-h">Panukala para <em>sa 2027</em></h2>
        <p className="section-intro">
          Ang mga linyang tahasang nakapangalan sa bayan sa panukala ng Pangulo (NEP) at sa bersyon ng Kamara (House bill).
          Panukala pa lang ito: hindi pa batas at hindi gastos. Hindi ito ang lahat ng proyekto sa Montalban.
        </p>
      </div>
      <div className="ov-grid ov-grid-photo">
        <div className="ov-panel">
          {scope.status === 'loading' && <p className="state" role="status"><span className="spinner" aria-hidden="true" /> Kinukuha ang panukala mula sa Budget API… Maaaring tumagal nang ilang segundo.</p>}
          {scope.status === 'error' && (
            <p className="state state-error" role="alert">
              Hindi makuha ang panukala mula sa BetterGov Budget API. Gumagana pa rin ang <Link to="/contracts">mga project record ng DPWH</Link>.
            </p>
          )}
          {scope.status === 'ready' && (
            <ul className="ov-lines">
              {scope.value.projects.map((p) => (
                <li key={p.key}>
                  <Link to={`/projects/${p.dataset}/${encodeURIComponent(p.id)}`} lang="en" className="ov-line-title">{splitTitle(p.title).lead}</Link>
                  <span className="ov-line-meta">
                    <Money stage="nep">{php(p.nep_php)}</Money>
                    <Money stage="house">{php(p.house_php)}</Money>
                    <span className="ov-line-group">{GROUP_FIL[p.bridge_group] ?? p.status_label}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="ov-links"><Link to="/panukala-2027">Buksan ang panukala para sa 2027</Link></p>
        </div>
        <ContextPhoto photo={PHOTOS.river} />
      </div>
    </section>
  );
}

function tally(values: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
