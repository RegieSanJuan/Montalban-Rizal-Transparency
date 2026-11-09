import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import type { BridgeGroup, DatasetInfo, Disclaimer, GroupInfo } from '../api/types';
import { BRIDGE_GROUPS } from '../api/types';
import { shortNameOf, type DatasetKey } from '../config';
import { Await, Disclaimers } from '../components/Bits';
import BudgetOverview, { SummaryBand } from '../components/BudgetOverview';
import { PageHead } from '../components/Chrome';
import StageSwitch from '../components/StageSwitch';
import ComparisonBar from '../components/ComparisonBar';
import CoveragePanel from '../components/CoveragePanel';
import LocalOfficials from '../components/LocalOfficials';
import OfficesSection from '../components/OfficesSection';
import ProjectTable from '../components/ProjectTable';
import ReviewPanel from '../components/ReviewPanel';
import { locationOf, reviewProjects, shortOffice } from '../components/data-shapes';
import { GROUP_FIL, PANUKALA_RETURN_KEY } from '../lib/display';
import { categoryOf, CATEGORIES, type Category } from '../lib/project-insights';
import { projectsCsv, downloadText } from '../lib/csv';
import { count, php } from '../lib/format';
import { usePortal } from '../lib/portal-context';
import { summarise, type ScopedProject, type ScopeResult } from '../lib/scope';
import { useTitle } from '../lib/use-title';

const PAGE = 100;
/** At or below this many records the charts repeat the table, so they start collapsed. */
const FEW = 10;


type Sort = 'house' | 'nep' | 'change' | 'title';
const SORTS: Record<Sort, { label: string; cmp: (a: ScopedProject, b: ScopedProject) => number }> = {
  house: { label: 'Halaga sa House bill', cmp: (a, b) => (b.house_php ?? -1) - (a.house_php ?? -1) },
  nep: { label: 'Halaga sa NEP', cmp: (a, b) => (b.nep_php ?? -1) - (a.nep_php ?? -1) },
  change: { label: 'Laki ng pagbabago', cmp: (a, b) => Math.abs(b.delta_php ?? 0) - Math.abs(a.delta_php ?? 0) },
  title: { label: 'Pangalan (A–Z)', cmp: (a, b) => a.title.localeCompare(b.title) },
};

export default function Home() {
  const { scope, overview, config } = usePortal();
  useTitle(`Panukala para sa 2027 · ${shortNameOf(config)}`);
  const datasets = overview.status === 'ready' ? overview.value.data.datasets : [];
  return (
    <main className="page main home">
      <PageHead title="Panukala para sa 2027">
        <p>
          Ang mga linyang tumutukoy sa Montalban (Rodriguez) sa panukalang pambansang budget para sa 2027: ang NEP ng
          Pangulo at ang bersyon ng Kamara. Panukala pa lang ito, hindi pa batas at hindi gastos. Para sa mga proyektong
          naipatupad na, tingnan ang mga project record ng DPWH.
        </p>
      </PageHead>
      <StageSwitch />
      <Await state={scope} what="mga proyekto">
        {(s) => <Projects scope={s} datasets={datasets} />}
      </Await>
    </main>
  );
}

/** Group wording from the API (label, sub, help), falling back to the row's own label. */
type GroupWords = Pick<GroupInfo, 'label' | 'sub' | 'help'>;

function groupInfo(datasets: DatasetInfo[], rows: ScopedProject[]): Record<BridgeGroup, GroupWords> {
  const fromApi = datasets[0]?.bridge.groups;
  const out = {} as Record<BridgeGroup, GroupWords>;
  for (const g of BRIDGE_GROUPS) {
    out[g] = fromApi?.[g] ?? { label: rows.find((r) => r.bridge_group === g)?.group_label ?? g, sub: '', help: '' };
  }
  return out;
}

function Projects({ scope, datasets }: { scope: ScopeResult; datasets: DatasetInfo[] }) {
  const { config, districts } = usePortal();
  const { hash } = useLocation();

  // #offices, #projects and #saklaw links land on their section once it has rendered.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash, districts.status]);

  // Back from a project: return to the row that was opened (its filters are in the URL already).
  const navType = useNavigationType();
  useEffect(() => {
    let key: string | null = null;
    const forget = () => { try { sessionStorage.removeItem(PANUKALA_RETURN_KEY); } catch { /* storage blocked */ } };
    try { key = sessionStorage.getItem(PANUKALA_RETURN_KEY); } catch { /* storage blocked */ }
    if (!key) return;
    if (navType !== 'POP') { forget(); return; }
    // Cleared only once used, so a re-run of this effect (StrictMode) still finds it.
    const frame = requestAnimationFrame(() => {
      forget();
      const row = document.querySelector<HTMLElement>(`[data-key="${CSS.escape(key!)}"]`);
      const target = row ?? document.getElementById('projects');
      target?.scrollIntoView({ block: row ? 'center' : 'start' });
      row?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [navType]);

  // The disclaimers of every response on this page: the project lists' and the districts'.
  const disclaimers = useMemo(() => {
    const byId = new Map<string, Disclaimer>(scope.disclaimers.map((d) => [d.id, d]));
    if (districts.status === 'ready') for (const env of districts.value) for (const d of env.disclaimers) if (!byId.has(d.id)) byId.set(d.id, d);
    return [...byId.values()];
  }, [scope.disclaimers, districts]);
  const all = scope.projects;
  const review = useMemo(() => reviewProjects(scope), [scope]);
  const summary = useMemo(() => summarise(all), [all]);
  const groups = useMemo(() => groupInfo(datasets, all), [datasets, all]);
  const programName = (k: DatasetKey) => datasets.find((d) => d.key === k)?.short ?? k.toUpperCase();
  const programs = (Object.entries(summary.byDataset) as [DatasetKey, { rows: number }][])
    .sort((a, b) => b[1].rows - a[1].rows)
    .map(([k, c]) => `${programName(k)} ${count(c.rows)}`)
    .join(', ');

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const program = (params.get('program') ?? '') as DatasetKey | '';
  const status = (params.get('status') ?? '') as BridgeGroup | '';
  const why = params.get('why') ?? '';
  const office = params.get('office') ?? '';
  const category = params.get('category') ?? '';
  const sort = (params.get('sort') as Sort) in SORTS ? (params.get('sort') as Sort) : 'house';
  const [shown, setShown] = useState(PAGE);
  const moreOpen = Boolean(program || why || office || params.get('sort'));

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setShown(PAGE);
  };
  const toList = () => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // DPWH offices among the rows, largest first, for the Office filter.
  const offices = useMemo(() => {
    const n = new Map<string, number>();
    for (const p of all) if (p.office) n.set(p.office, (n.get(p.office) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en', { numeric: true }));
  }, [all]);

  const reasons = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of all) for (const r of p.reasons) seen.set(`${r.kind}:${r.label}`, r.kind === 'office' ? `Opisina: ${shortOffice(r.label)}` : `Binabanggit ang ${r.label}`);
    return [...seen.entries()];
  }, [all]);

  const filtered = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = all.filter((p) => {
      if (program && p.dataset !== program) return false;
      if (category && categoryOf(p.title) !== category) return false;
      if (status && p.bridge_group !== status) return false;
      if (why && !p.reasons.some((r) => `${r.kind}:${r.label}` === why)) return false;
      if (office && p.office !== office) return false;
      if (words.length) {
        const hay = [p.title, p.program, p.pap, p.office, p.region].join(' ').toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    return rows.sort((a, b) => SORTS[sort].cmp(a, b) || a.title.localeCompare(b.title));
  }, [all, q, program, status, why, office, sort, category]);
  const filteredSummary = useMemo(() => summarise(filtered), [filtered]);
  const narrowed = filtered.length !== all.length;

  const chips: { key: string; label: string }[] = [
    q && { key: 'q', label: `“${q}”` },
    category && { key: 'category', label: CATEGORIES.find((c) => c.id === category)?.label ?? category },
    status && { key: 'status', label: GROUP_FIL[status] ?? groups[status]?.label ?? status },
    program && { key: 'program', label: programName(program) },
    office && { key: 'office', label: shortOffice(office) },
    why && { key: 'why', label: reasons.find(([k]) => k === why)?.[1] ?? why },
  ].filter(Boolean) as { key: string; label: string }[];

  const few = all.length <= FEW;
  const charts = (
    <>
      <BudgetOverview rows={all} onCategory={(c: Category) => { setParam('category', c); toList(); }} />
      <ComparisonBar summary={summary} groups={groups} active={status} onPick={(g) => { setParam('status', g); if (g) toList(); }} />
    </>
  );

  return (
    <>
      <SummaryBand summary={summary} programs={programs} />
      {!few && <CoveragePanel reviewCount={review.length} />}
      {!few && charts}

      <section className="section explorer" id="projects" aria-labelledby="list-h">
        <div className="list-head">
          <div>
            <h2 id="list-h" className="section-h">Mga proyektong tumutukoy sa Montalban</h2>
            <p className="list-count" aria-live="polite">
              {narrowed ? `${count(filtered.length)} sa ${count(all.length)} record ang tugma` : `${count(all.length)} record na nakita sa FY 2027`}
            </p>
          </div>
          <button type="button" className="button button-quiet" disabled={!filtered.length} onClick={() => downloadText(`${config.id}-fy2027-projects.csv`, projectsCsv(filtered))}>
            I-download ang CSV{narrowed ? ` (${count(filtered.length)})` : ''}
          </button>
        </div>
        <p className="section-intro">
          Buong bayan muna ang ipinapakita. Hanapin ang barangay, kalsada o ilog para paliitin ang listahan, at buksan
          ang isang proyekto para sa eksaktong halaga at pahina ng dokumento.
        </p>

        <div className="toolbar">
          <label className="field field-grow">
            <span className="label">Hanapin</span>
            <input type="search" name="q" autoComplete="off" value={q} placeholder="Barangay, kalsada, ilog, paaralan…" onChange={(e) => setParam('q', e.target.value)} />
          </label>
          {(!few || category) && (
            <label className="field">
              <span className="label">Uri ng proyekto</span>
              <select value={category} onChange={(e) => setParam('category', e.target.value)}>
                <option value="">Lahat ng uri</option>
                {CATEGORIES.map((c) => <option value={c.id} key={c.id}>{c.label}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span className="label">Paghahambing</span>
            <select value={status} onChange={(e) => setParam('status', e.target.value)}>
              <option value="">Lahat</option>
              {BRIDGE_GROUPS.filter((g) => summary.groups[g].rows).map((g) => (
                <option key={g} value={g}>{GROUP_FIL[g] ?? groups[g].label} ({count(summary.groups[g].rows)})</option>
              ))}
            </select>
          </label>
          <details className="more-filters" open={moreOpen || undefined}>
            <summary>Iba pang filter</summary>
            <div className="more-filters-body">
              <label className="field">
                <span className="label">Programa</span>
                <select value={program} onChange={(e) => setParam('program', e.target.value)}>
                  <option value="">Lahat ng programa</option>
                  {(Object.keys(summary.byDataset) as DatasetKey[]).map((k) => (
                    <option key={k} value={k}>{programName(k)} ({count(summary.byDataset[k]!.rows)})</option>
                  ))}
                </select>
              </label>
              {offices.length > 1 && (
                <label className="field">
                  <span className="label">DPWH office</span>
                  <select value={office} onChange={(e) => setParam('office', e.target.value)}>
                    <option value="">Kahit anong opisina</option>
                    {offices.map(([o, n]) => <option key={o} value={o}>{shortOffice(o)} ({count(n)})</option>)}
                  </select>
                </label>
              )}
              {reasons.length > 1 && (
                <label className="field">
                  <span className="label">Bakit kasama</span>
                  <select value={why} onChange={(e) => setParam('why', e.target.value)}>
                    <option value="">Kahit anong dahilan</option>
                    {reasons.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </label>
              )}
              <label className="field">
                <span className="label">Ayusin ayon sa</span>
                <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'house' ? '' : e.target.value)}>
                  {(Object.keys(SORTS) as Sort[]).map((k) => <option key={k} value={k}>{SORTS[k].label}</option>)}
                </select>
              </label>
            </div>
          </details>
        </div>

        {chips.length > 0 && (
          <div className="active-filters">
            <ul aria-label="Mga aktibong filter">
              {chips.map((c) => (
                <li key={c.key}>
                  <button type="button" className="chip-x" onClick={() => setParam(c.key, '')} aria-label={`Alisin ang filter: ${c.label}`}>
                    {c.label} <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="link-button" onClick={() => { setParams(new URLSearchParams(), { replace: true }); setShown(PAGE); }}>
              Alisin lahat
            </button>
          </div>
        )}
        {narrowed && (
          <p className="filter-sums">
            Sa {count(filtered.length)} na ito: NEP {php(filteredSummary.nep.php)} ({count(filteredSummary.nep.rows)} record) · House bill {php(filteredSummary.house.php)} ({count(filteredSummary.house.rows)} record). Ikinukumpara, hindi pinagsasama.
          </p>
        )}

        <ProjectTable rows={filtered.slice(0, shown)} programName={programName} />

        {filtered.length === 0 && <p className="state">Walang tumugmang proyekto. Bawasan ang mga salita sa paghahanap o alisin ang mga filter.</p>}
        {filtered.length > shown && (
          <div className="more">
            <span className="muted">Ipinapakita ang {count(shown)} sa {count(filtered.length)}</span>
            <button type="button" className="button" onClick={() => setShown((n) => n + PAGE)}>Ipakita ang {count(Math.min(PAGE, filtered.length - shown))} pa</button>
            <button type="button" className="button button-quiet" onClick={() => setShown(filtered.length)}>Ipakita lahat</button>
          </div>
        )}

        <p className="fine">
          Piso ang halaga, gaya ng pagkakalathala sa bawat dokumento. Ang gitling (—) ay nangangahulugang walang ganoong linya
          sa dokumentong iyon. Ang NEP at House bill ay dalawang bersyon ng iisang budget: ikinukumpara, hindi pinagsasama.
          Hindi ito listahan ng lahat ng proyekto sa bayan. <Link to="/para-sa-bayan#mga-salita">Kahulugan ng NEP, House bill at iba pang salita</Link>
        </p>
      </section>

      {few && (
        <section className="section" aria-labelledby="more-views-h">
          <details className="more-views">
            <summary>
              <span id="more-views-h" className="more-views-title">Ayon sa uri, pinakamalalaking linya, at ginawa ng Kamara</span>
              <span className="more-views-sub">Parehong {count(all.length)} record sa itaas, sa ibang anyo · buksan para makita</span>
            </summary>
            {charts}
          </details>
        </section>
      )}
      {few && <CoveragePanel reviewCount={review.length} />}

      <ReviewPanel
        id="suriin"
        title="Sinusuri pa ang lokasyon"
        intro="Mga record na maaaring sa Montalban, kahati ng ibang bayan, o may kaparehong pangalan sa ibang lugar. Hiwalay ang mga ito at hindi kasama sa anumang kabuuan sa pahinang ito hanggang makumpirma."
        items={review.map((p) => ({
          key: p.key,
          title: p.title,
          to: `/projects/${p.dataset}/${encodeURIComponent(p.id)}`,
          meta: <>{programName(p.dataset)}{p.office ? ` · ${shortOffice(p.office)}` : ''}{p.region ? ` · ${p.region}` : ''}</>,
          amount: <>NEP {php(p.nep_php)}<br />House {php(p.house_php)}</>,
          location: locationOf(p),
        }))}
      />

      <LocalOfficials />
      <OfficesSection />
      <Disclaimers items={disclaimers} compact />
    </>
  );
}
