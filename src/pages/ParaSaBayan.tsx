/**
 * "/" — Para sa Bayan: the citizen-first page. Plain language, three separate
 * source stages (never added together), barangay search, the money's path from
 * proposal to audit, a real end-to-end record, a glossary and what you can do.
 * Every figure is derived from data the portal already publishes.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { shortNameOf } from '../config';
import { MunicipalHero, OfficeYearsMini } from '../components/BudgetOverview';
import { Money } from '../components/Bits';
import ContextPhoto from '../components/ContextPhoto';
import { DataStatusLine } from '../components/DataStatus';
import ReadingMode from '../components/ReadingMode';
import { contractPeso, coverage, manilaTime, officeWithHistory, shortOffice, STATUS_LABEL, type StageKey } from '../components/data-shapes';
import { useDirectory } from '../components/useDirectory';
import { contractorKey, dpwhStatusGloss, SOURCE_STAGES, splitTitle } from '../lib/display';
import { count, php } from '../lib/format';
import { useHashScroll } from '../lib/use-hash-scroll';
import { PHOTOS } from '../lib/photos';
import { gaaYearTotals, loadGaa, type GaaResult } from '../lib/gaa';
import type { ContractRecord } from '../lib/contracts';
import type { ProjectDirectory } from '../lib/project-directory';
import { usePortal, type Async } from '../lib/portal-context';
import { summarise } from '../lib/scope';
import { useTitle } from '../lib/use-title';

/** Rodriguez (Montalban), Rizal's barangays. Tiles appear only for names found in record titles. */
const BARANGAYS = ['Balite', 'Burgos', 'Geronimo', 'Macabud', 'Manggahan', 'Mascap', 'Puray', 'Rosario', 'San Isidro', 'San Jose', 'San Rafael'];

/** Old links to "?q=…#projects" belong to the 2027 page, which once lived at "/". */
const LEGACY_HASHES = ['#projects', '#offices', '#saklaw', '#suriin'];

export default function ParaSaBayan() {
  const { config } = usePortal();
  const { search, hash } = useLocation();
  useTitle(`Para sa Bayan · ${shortNameOf(config)}`);
  const dir = useDirectory();
  useHashScroll();
  if (search || LEGACY_HASHES.includes(hash)) return <Navigate to={`/panukala-2027${search}${hash}`} replace />;
  const d = dir.status === 'ready' ? dir.value : null;
  return (
    <main className="page main psb">
      <ReadingMode />
      <MunicipalHero mode="simple" meta={d ? `${count(d.coverage.included)} DPWH project record · ${count(d.coverage.mapped)} may lokasyon sa mapa` : undefined} />

      <section className="section psb-intro" aria-labelledby="psb-h">
        <h2 id="psb-h" className="section-h">Ang budget ng Montalban, <em>ipinaliwanag nang simple</em></h2>
        <p className="section-intro">
          Hindi mo kailangang maging eksperto. Tatlong magkakaibang listahan ang nasa portal na ito, bawat isa may sariling
          pinagmulan at taon. Kaya hindi pinagsasama ang mga bilang at halaga nila.
        </p>
        <AtAGlance dir={dir} />
        <DataStatusLine />
        <p className="fine">
          Saklaw at mga alam nating kulang: <Link to="/panukala-2027#saklaw">tingnan ang detalye</Link>. Paano binuo ang mga
          listahan: <Link to="/about">Tungkol sa datos</Link>.
        </p>
      </section>

      <FindProject dir={d} />
      <MoneyPath />
      {d && <OneRecord dir={d} />}
      <Glossary />
      <Actions />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sa isang tingin: three stages as tabs, never added together
// ---------------------------------------------------------------------------

type Tab = 'dpwh' | 'gaa' | 'nep';
/** The same names and order as the stage switch on the list pages. */
const TABS: { id: Tab; label: string; sub: string }[] = SOURCE_STAGES.map((st) => ({ id: st.id, label: st.name, sub: st.sub }));

function AtAGlance({ dir }: { dir: Async<ProjectDirectory> }) {
  const [tab, setTab] = useState<Tab>('dpwh');
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ dpwh: null, gaa: null, nep: null });
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    refs.current[TABS[next].id]?.focus();
  };
  return (
    <div className="glance">
      <h3 className="glance-h">Sa isang tingin</h3>
      <div className="glance-tabs" role="tablist" aria-label="Pumili ng listahan" onKeyDown={onKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="glance-tab"
            onClick={() => setTab(t.id)}
          >
            <span className="gt-label">{t.label}</span>
            <span className="gt-sub">{t.sub}</span>
          </button>
        ))}
      </div>
      <div className="glance-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'dpwh' && <DpwhGlance dir={dir} />}
        {tab === 'gaa' && <GaaGlance />}
        {tab === 'nep' && <NepGlance />}
      </div>
    </div>
  );
}

function DpwhGlance({ dir }: { dir: Async<ProjectDirectory> & { retry?: () => void } }) {
  if (dir.status === 'loading') return <p className="state" role="status"><span className="spinner" aria-hidden="true" /> Kinukuha ang mga record ng DPWH… Maaaring tumagal nang ilang segundo.</p>;
  if (dir.status === 'error') return <p className="state state-error" role="alert">Hindi makuha ang mga record ng DPWH. <button type="button" className="link-button" onClick={dir.retry}>Subukang muli</button></p>;
  const d = dir.value;
  const statuses = tally(d.records.map((r) => r.status || '—'));
  const years = d.records.map((r) => r.year).filter((y) => /^\d{4}$/.test(y)).sort();
  return (
    <>
      <dl className="glance-figs">
        <div><dt>Mga record ng DPWH</dt><dd className="num">{count(d.coverage.included)}</dd><dd className="gf-sub">{years.length ? `${years[0]}–${years[years.length - 1]}` : ''}, nakatalaga sa bayan</dd></div>
        <div><dt>Status na “<span lang="en">{statuses[0]?.[0] ?? '—'}</span>”{dpwhStatusGloss(statuses[0]?.[0]) && ` (${dpwhStatusGloss(statuses[0]?.[0])})`} ayon sa DPWH</dt><dd className="num">{count(statuses[0]?.[1] ?? 0)}</dd><dd className="gf-sub">iniulat ng pinagmulan, hindi nasuri sa lugar</dd></div>
        <div><dt>Halaga sa record (budget field ng DPWH), kabuuan</dt><dd className="num">{php(d.coverage.sourceBudgetPhp)}</dd><dd className="gf-sub">{count(d.coverage.unknownAmountCount)} record ang walang halaga; hindi ito presyo ng kontrata o gastos</dd></div>
      </dl>
      <p className="takeaway">
        <strong>Sa madaling salita:</strong> ito ang mga proyektong may record na sa DPWH, mula procurement hanggang natapos.
        Ito ang pinakamahabang listahan sa portal. {count(d.coverage.reviewExcluded)} pa ang sinusuri ang lokasyon at hindi kasama rito.
      </p>
      <p className="glance-links"><Link to="/contracts">Buksan ang listahan</Link> · <Link to="/mapa">Tingnan sa mapa</Link> · <Link to="/kontratista">Mga kontratista</Link></p>
    </>
  );
}

function GaaGlance() {
  const { client, config, districts } = usePortal();
  const office = officeWithHistory(districts);
  const [state, setState] = useState<Async<GaaResult>>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    loadGaa(client, config).then(
      (value) => live && setState({ status: 'ready', value }),
      (error) => live && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => { live = false; };
  }, [client, config]);
  if (state.status === 'loading') return <p className="state" role="status"><span className="spinner" aria-hidden="true" /> Kinukuha ang naisabatas na budget… Maaaring tumagal nang ilang segundo.</p>;
  if (state.status === 'error') return <p className="state state-error" role="alert">Hindi makuha ang naisabatas na budget. <Link to="/gaa">Buksan ang kasaysayan</Link></p>;
  const totals = gaaYearTotals(state.value.rows).filter((t) => t.programs > 0);
  const top = [...totals].sort((a, b) => b.amount - a.amount)[0];
  return (
    <>
      <dl className="glance-figs">
        <div><dt>Mga programang nakapangalan sa bayan</dt><dd className="num">{count(state.value.rows.length)}</dd><dd className="gf-sub">sa GAA 2020–2026, mula sa lahat ng departamento</dd></div>
        {top && <div><dt>Pinakamalaking taon, mga programang nakapangalan sa bayan</dt><dd className="num">GAA {php(top.amount)}</dd><dd className="gf-sub">{top.year}, sa {count(top.programs)} programa</dd></div>}
        <div><dt>Sinusuri pa ang lokasyon</dt><dd className="num">{count(state.value.reviewRows.length)}</dd><dd className="gf-sub">hindi kasama sa mga bilang</dd></div>
      </dl>
      <OfficeYearsMini takeaway={false} />
      <p className="takeaway">
        <strong>Sa madaling salita:</strong> ito ang pinahintulutang gastusin ng batas bawat taon para sa mga programang tumutukoy sa
        bayan. Pahintulot ito, hindi patunay na nagastos o natapos.
        {office && <>
          {' '}Ibang sukatan ang mga bar ng DPWH {office.name}: buong budget iyon ng isang opisinang naglilingkod din sa ibang
          distrito. Hindi bahagi ng isa ang isa, kaya puwedeng mas malaki ang kabuuang nakapangalan sa bayan kaysa sa isang taon
          ng opisina. Hindi sila pinagsasama, at panukala pa lang ang NEP 2027.
        </>}
      </p>
      <p className="glance-links"><Link to="/gaa">Buksan ang kasaysayan 2020–2026</Link></p>
    </>
  );
}

function NepGlance() {
  const { scope } = usePortal();
  if (scope.status === 'loading') return <p className="state" role="status"><span className="spinner" aria-hidden="true" /> Kinukuha ang panukala para sa 2027… Maaaring tumagal nang ilang segundo.</p>;
  if (scope.status === 'error') return <p className="state state-error" role="alert">Hindi makuha ang panukala mula sa BetterGov Budget API. <Link to="/contracts">Buksan ang mga record ng DPWH</Link></p>;
  const s = summarise(scope.value.projects);
  return (
    <>
      <dl className="glance-figs">
        <div><dt>Mga record na nakapangalan sa bayan</dt><dd className="num">{count(s.rows)}</dd><dd className="gf-sub">sa panukalang budget ng 2027</dd></div>
        <div><dt>Panukala ng Pangulo (NEP)</dt><dd className="num">{s.nep.rows ? php(s.nep.php) : '—'}</dd><dd className="gf-sub">sa {count(s.nep.rows)} record</dd></div>
        <div><dt>Bersyon ng Kamara</dt><dd className="num">{s.house.rows ? php(s.house.php) : '—'}</dd><dd className="gf-sub">{s.house.rows ? `sa ${count(s.house.rows)} record` : 'walang katapat na linya'}</dd></div>
      </dl>
      <p className="takeaway">
        <strong>Sa madaling salita:</strong> {count(s.rows)} linya lang ang tahasang nakapangalan sa bayan sa panukala para sa 2027.
        Hindi ito ang lahat ng proyekto sa Montalban; ang mga naipatupad na ay nasa listahan ng DPWH.
      </p>
      <p className="glance-links"><Link to="/panukala-2027">Buksan ang panukala para sa 2027</Link></p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Ano ang nasa barangay ko?
// ---------------------------------------------------------------------------

function barangayPattern(name: string): RegExp {
  const n = name.replace(/\s+/g, '\\s+');
  return new RegExp(`\\b(?:BARANGAY|BRGY\\.?)\\s+${n}\\b|\\b${n}\\s*,\\s*(?:RODRIGUEZ|MONTALBAN)\\b`, 'i');
}

function FindProject({ dir }: { dir: ProjectDirectory | null }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const tiles = useMemo(() => {
    if (!dir) return [];
    return BARANGAYS.map((b) => {
      const re = barangayPattern(b);
      const recs = dir.records.filter((r) => re.test(r.title));
      const known = recs.filter((r) => r.amountPhp != null);
      return { name: b, n: recs.length, php: known.reduce((s, r) => s + (r.amountPhp ?? 0), 0), unknown: recs.length - known.length };
    }).filter((t) => t.n > 0).sort((a, b) => b.n - a.n);
  }, [dir]);
  return (
    <section className="section" id="hanapin" aria-labelledby="find-h">
      <h2 id="find-h" className="section-h">Ano ang nasa <em>barangay ko?</em></h2>
      <form className="find" role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/contracts?q=${encodeURIComponent(q.trim())}`); }}>
        <label className="field field-grow">
          <span className="label">Hanapin sa mga project record ng DPWH</span>
          <input type="search" name="q" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Barangay, kalsada, paaralan, contract ID…" />
        </label>
        <button type="submit" className="button button-primary">Hanapin</button>
      </form>
      {dir && tiles.length > 0 && (
        <>
          <ul className="brgy">
            {tiles.map((t) => (
              <li key={t.name}>
                <Link to={`/contracts?q=${encodeURIComponent(t.name)}`}>
                  <span className="brgy-name">{t.name}</span>
                  <span className="brgy-n num">{count(t.n)} record</span>
                  <span className="brgy-php">{t.php ? <Money stage="record">{php(t.php)}</Money> : <Money stage="record" missing>—</Money>}{t.unknown > 0 && <small> · {count(t.unknown)} walang halaga</small>}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="fine">
            Batay sa barangay na nakasulat sa pamagat ng record (“Barangay …” o “…, Rodriguez”). Ang record na may dalawang
            barangay ay nabibilang sa dalawa, at may mga record na walang nakasulat na barangay. Ang “halaga sa record” ay kabuuan
            ng budget field ng mga DPWH record, hindi presyo ng kontrata o gastos.
          </p>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Paano nagiging proyekto ang pera?
// ---------------------------------------------------------------------------

const STEPS: { who: string; name: string; does: string; ask: string; stage: StageKey | 'senate' | 'work' | 'audit' }[] = [
  { who: 'Ang Pangulo at DBM', name: 'Panukala (NEP)', does: 'Inililista ng mga ahensya ang gusto nilang pondohan at ipinapadala ito ng Pangulo sa Kongreso.', ask: 'Ano ang orihinal na hiniling para sa Montalban?', stage: 'nep' },
  { who: 'Kamara', name: 'Binabago ng Kamara', does: 'Sinusuri, dinadagdagan o binabawasan ng mga kongresista ang listahan at ipinapasa bilang House bill.', ask: 'Ano ang idinagdag o tinanggal, at bakit?', stage: 'house' },
  { who: 'Senado at Bicameral Conference', name: 'Sinusuri ng Senado', does: 'Gumagawa rin ng bersyon ang Senado; pinag-iisa ng Bicam ang dalawa.', ask: 'May nagbago ba sa huling bersyon?', stage: 'senate' },
  { who: 'Ang Pangulo', name: 'Nagiging batas (GAA)', does: 'Pinipirmahan ng Pangulo. Dito pa lang may pahintulot na gastusin ang pera.', ask: 'Nasa batas ba ang proyekto, at magkano?', stage: 'gaa' },
  { who: 'DPWH', name: 'Bidding at kontrata', does: 'Pumipili ang DPWH ng kontratista. Makikita ang bidding sa PhilGEPS.', ask: 'Sino ang nanalong kontratista, at magkano ang kontrata?', stage: 'award' },
  { who: 'Kontratista', name: 'Paggawa', does: 'Ginagawa ang proyekto. Dapat may karatula sa lugar: ano, magkano at kailan.', ask: 'Tama ba ang ginagawa, at tapos ba sa takdang panahon?', stage: 'work' },
  { who: 'Commission on Audit', name: 'Audit', does: 'Sinusuri ng COA kung tama ang paggastos.', ask: 'Ano ang sinabi ng COA tungkol sa proyekto?', stage: 'audit' },
];

function MoneyPath() {
  const c = coverage();
  const statusOf = (k: (typeof STEPS)[number]['stage']) => {
    if (k === 'senate') return { s: 'unavailable' as const, note: 'Wala sa portal ang bersyon ng Senado.' };
    if (k === 'work') return { s: 'partial' as const, note: 'Status at progreso ayon sa DPWH, hindi nasuri sa lugar.' };
    if (k === 'audit') return { s: 'unavailable' as const, note: 'Wala sa portal ang audit ng COA.' };
    const st = c.stages.find((x) => x.key === k);
    return { s: st?.status ?? 'unavailable', note: '' };
  };
  return (
    <section className="section" id="hakbang" aria-labelledby="path-h">
      <h2 id="path-h" className="section-h">Paano nagiging proyekto <em>ang pera?</em></h2>
      <p className="section-intro">
        Pitong hakbang mula panukala hanggang audit. Nakasaad sa bawat isa kung may datos nito ang portal. Sa pahina ng
        panukala para sa 2027, pinasimple ito sa limang yugto.
      </p>
      <ContextPhoto photo={PHOTOS.highway} className="ctx-photo-wide" />
      <ol className="path">
        {STEPS.map((step, i) => {
          const st = statusOf(step.stage);
          return (
            <li key={step.name} className={`path-step stage-${st.s}`}>
              <span className="path-n" aria-hidden="true">{i + 1}</span>
              <div>
                <p className="path-who">{step.who}</p>
                <h3>{step.name}</h3>
                <p>{step.does}</p>
                <p className="path-ask"><strong>Puwede mong itanong:</strong> {step.ask}</p>
                <p className={`stage-status s-${st.s}`}><span className="stage-dot" aria-hidden="true" />{STATUS_LABEL[st.s]}{st.note && <span className="path-note">{st.note}</span>}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Isang record, mula simula hanggang dulo
// ---------------------------------------------------------------------------

function OneRecord({ dir }: { dir: ProjectDirectory }) {
  const r = useMemo(() => pickExample(dir.records), [dir]);
  if (!r) return null;
  const pr = r.procurement!;
  const { lead, context } = splitTitle(r.title);
  const key = contractorKey(r.contractor);
  // The money stages in order. Missing values say so; nothing is filled in.
  const money: [string, string][] = [
    ['Halaga sa record (budget field ng DPWH)', r.amountPhp != null ? contractPeso(r.amountPhp) : 'Hindi ibinigay ng pinagmulan'],
    ['ABC: kisame ng bidding, hindi presyo', pr.abcPhp != null ? contractPeso(pr.abcPhp) : 'Hindi ibinigay ng pinagmulan'],
    ['Halaga ng award', pr.awardAmountPhp != null ? contractPeso(pr.awardAmountPhp) : 'Hindi ibinigay ng pinagmulan'],
    ['Aktuwal na nagastos', 'Wala sa portal'],
  ];
  const facts: [string, string][] = [
    ['Petsa ng award', manilaTime(pr.dateOfAward) ?? pr.dateOfAward ?? 'Hindi ibinigay'],
    ['Simula', manilaTime(r.startDate) ?? r.startDate ?? 'Hindi ibinigay'],
    ['Status ayon sa DPWH', `${r.status}${dpwhStatusGloss(r.status) ? ` (${dpwhStatusGloss(r.status)})` : ''}${r.progress != null ? ` · ${r.progress}%` : ''}`],
  ];
  return (
    <section className="section" aria-labelledby="one-h">
      <h2 id="one-h" className="section-h">Isang record, <em>mula simula hanggang ngayon</em></h2>
      <article className="reading one">
        <p className="one-meta">{r.year} · ID <span translate="no">{r.id}</span></p>
        <h3 lang="en">{lead}</h3>
        {context && <p className="one-context" lang="en">{context}</p>}
        <dl className="one-dl">
          {money.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={v.startsWith('₱') ? 'num' : 'muted'}>{v}</dd></div>)}
          <div><dt>Kontratista</dt><dd>{key ? <Link to={`/kontratista/${encodeURIComponent(key)}`}>{r.contractor}</Link> : r.contractor ?? 'Hindi ibinigay'}</dd></div>
          {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <p className="takeaway">
          <strong>Sa madaling salita:</strong> magkakaibang halaga ang mga ito. Ang budget field ay ang halagang nakatala sa record
          ng DPWH. Ang ABC ay ang pinakamataas na puwedeng i-bid. Ang award ay ang halaga ng kontratang iginawad, kapag ibinigay
          ng pinagmulan. Wala sa mga ito ang aktuwal na nagastos; nasa mga dokumento ng ahensya at sa audit ng COA iyon.
        </p>
        <p className="one-links">
          <Link to={`/contracts?q=${encodeURIComponent(r.id)}&open=${encodeURIComponent(r.id)}`}>Buksan ang buong record</Link>
        </p>
      </article>
    </section>
  );
}

function pickExample(records: ContractRecord[]): ContractRecord | null {
  const ok = records.filter((r) => r.procurement?.abcPhp != null && r.procurement?.dateOfAward && r.startDate && r.contractor && r.amountPhp != null);
  return ok.find((r) => /on-?going/i.test(r.status)) ?? ok[0] ?? null;
}

// ---------------------------------------------------------------------------
// Mga salita, at ang puwede mong gawin
// ---------------------------------------------------------------------------

function Glossary() {
  const { districts } = usePortal();
  const office = districts.status === 'ready' ? districts.value.flatMap((d) => d.data.offices)[0] : null;
  const terms: [string, string, string][] = [
    ['NEP', 'National Expenditure Program', 'Ang panukalang budget ng Pangulo. Ang unang listahan, bago galawin ng Kongreso.'],
    ['House bill', 'Bersyon ng Kamara', 'Ang budget na binago at ipinasa ng Kamara. Hindi pa ito batas.'],
    ['GAA', 'General Appropriations Act', 'Ang pinal na budget na pinirmahan ng Pangulo. Ito lang ang may bisa bilang batas.'],
    ['Halaga sa record', 'Budget field ng DPWH record', 'Ang halagang nakatala sa record ng DPWH. Hindi ito presyo ng kontrata o aktuwal na gastos.'],
    ['ABC', 'Approved Budget for the Contract', 'Ang pinakamataas na halagang puwedeng i-bid. Kisame ito, hindi presyo.'],
    ['Award', 'Halaga ng kontratang iginawad', 'Ang halaga ng kontratang iginawad sa nanalong kontratista, kapag ibinigay ng pinagmulan. Hindi pa rin ito ang aktuwal na nagastos.'],
    ['DEO', 'District Engineering Office', office ? `Ang opisina ng DPWH na gumagawa ng proyekto. Ang ${shortOffice(office.name)} ay naglilingkod sa ${count(office.district_ids.length)} distrito, kaya hindi buong para sa Montalban ang pondo nito.` : 'Ang opisina ng DPWH na gumagawa ng proyekto, at kadalasang naglilingkod sa ilang distrito.'],
    ['Nasa NEP lang', 'NEP only', 'Nasa panukala ng Pangulo pero walang katapat sa bersyon ng Kamara. Dapat itanong, hindi awtomatikong mali.'],
    ['FOI', 'Freedom of Information', 'Ang karapatan mong humingi ng dokumento sa pamahalaan, gaya ng detalye ng gastos ng isang proyekto.'],
  ];
  return (
    <section className="section" id="mga-salita" aria-labelledby="terms-h">
      <h2 id="terms-h" className="section-h">Mga salitang <em>dapat mong malaman</em></h2>
      <dl className="glossary">
        {terms.map(([abbr, full, meaning]) => (
          <div key={abbr}><dt><span className="g-abbr">{abbr}</span><span className="g-full" lang={/^(National|General|Approved|District|Freedom|NEP only)/.test(full) ? 'en' : undefined}>{full}</span></dt><dd>{meaning}</dd></div>
        ))}
      </dl>
    </section>
  );
}

function Actions() {
  const items: { name: string; body: React.ReactNode }[] = [
    { name: 'Hanapin', body: <>Hanapin ang proyekto sa inyong barangay sa <Link to="/contracts">listahan</Link> o sa <Link to="/mapa">mapa</Link>.</> },
    { name: 'Silipin', body: <>Puntahan ang lugar. Kunan ng litrato na may petsa. May ginagawa ba? May karatula ba ng proyekto?</> },
    { name: 'Humingi ng dokumento', body: <>Mag-FOI request sa <a href="https://www.foi.gov.ph/" target="_blank" rel="noopener">foi.gov.ph <span aria-hidden="true">↗</span></a>. Libre ito at karapatan mo.</> },
    { name: 'Alamin ang kontrata', body: <>Tingnan ang <Link to="/kontratista">mga kontratista</Link> dito, at ang bidding sa <a href="https://notices.philgeps.gov.ph/" target="_blank" rel="noopener">PhilGEPS <span aria-hidden="true">↗</span></a>.</> },
    { name: 'Basahin ang audit', body: <>Tingnan ang mga ulat ng COA sa <a href="https://www.coa.gov.ph/" target="_blank" rel="noopener">coa.gov.ph <span aria-hidden="true">↗</span></a>.</> },
    { name: 'Magtanong', body: <>Magtanong nang magalang sa DPWH district office o sa inyong kinatawan, dala ang record at ang petsa ng datos. Kilalanin sila: <Link to="/#mga-opisyal">mga opisyal</Link> at <Link to="/#offices">ang DPWH office</Link>.</> },
  ];
  return (
    <section className="section" aria-labelledby="act-h">
      <h2 id="act-h" className="section-h">Ano ang puwede <em>mong gawin?</em></h2>
      <ol className="acts">
        {items.map((it, i) => (
          <li key={it.name}><span className="act-n" aria-hidden="true">{i + 1}</span><div><h3>{it.name}</h3><p>{it.body}</p></div></li>
        ))}
      </ol>
    </section>
  );
}

function tally(values: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
