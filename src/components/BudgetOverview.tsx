import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { compactAmount, contractsLoader, officeWithHistory, type ContractSnapshot } from './data-shapes';
import { Link } from 'react-router-dom';
import { count, php, phpFull } from '../lib/format';
import { usePortal } from '../lib/portal-context';
import { categoryOf, CATEGORIES, type Category } from '../lib/project-insights';
import type { ScopedProject, Summary } from '../lib/scope';
import { GROUP_FIL } from '../lib/display';

const projectHref = (p: ScopedProject) => `/projects/${p.dataset}/${encodeURIComponent(p.id)}`;

/**
 * The Wawa Dam hero, shared by both reading modes. Detailed mode leads to the
 * records; simple mode keeps the citizen guide's own two actions.
 */
export function MunicipalHero({ meta, mode = 'simple' }: { meta?: string; mode?: 'detailed' | 'simple' }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <img className="hero-bg" src="/images/wawa-dam.jpg" alt="" fetchPriority="high" width="1800" height="1200" />
      <div className="hero-copy">
        <h1 id="hero-title">Pondo ng bayan.<br /><em>Malinaw sa lahat.</em></h1>
        {mode === 'detailed' ? (
          <p className="hero-lede">
            Ang pondo para sa Montalban (Rodriguez), Rizal, sa tatlong magkakahiwalay na listahan: mga project record ng DPWH,
            ang naisabatas na budget 2020–2026, at ang panukala para sa 2027. Bawat numero ay may pinagmulan.
          </p>
        ) : (
          <p className="hero-lede">
            Ang pondo para sa Montalban (Rodriguez), Rizal, sa simpleng salita: anong proyekto ang nasa barangay mo, sino
            ang kontratista, at saan galing ang bawat numero.
          </p>
        )}
        <div className="hero-actions">
          <Link className="button button-primary" to="/contracts">{mode === 'detailed' ? 'Buksan ang mga record ng DPWH' : 'Hanapin ang mga proyekto'}</Link>
          {mode === 'detailed'
            ? <Link className="hero-text-link" to="/para-sa-bayan">Basahin sa simpleng salita <span aria-hidden="true">→</span></Link>
            : <Link className="hero-text-link" to="/about">Saan galing ang mga numero <span aria-hidden="true">→</span></Link>}
        </div>
        <p className="hero-meta">
          <span><span className="hero-dot" aria-hidden="true" />Montalban (Rodriguez), Rizal{meta ? ` · ${meta}` : ''}</span>
          <span>Larawan: Wawa Dam, Montalban · FroyR, CC BY-SA 4.0</span>
        </p>
      </div>
    </section>
  );
}

/** The whole-Montalban figures for 2027, each tagged with its stage. */
export function SummaryBand({ summary, programs }: { summary: Summary; programs: string }) {
  return (
    <section className="summary" aria-labelledby="summary-h">
      <div className="summary-head">
        <h2 id="summary-h">Buod ng 2027 para sa buong bayan</h2>
        <span className="stage-pill">Panukala pa lang · hindi pa batas, hindi gastos</span>
      </div>
      <dl className="figures">
        <div className="figure figure-lead">
          <dt>Panukala ng Pangulo (NEP)</dt>
          <dd className="figure-n num">{summary.nep.rows ? php(summary.nep.php) : '—'}</dd>
          <dd className="figure-sub">
            {summary.nep.rows ? `Sa ${count(summary.nep.rows)} proyekto. Ang budget na isinumite sa Kongreso.` : 'Walang linya sa NEP para sa mga record na ito.'}
          </dd>
        </div>
        <div className="figure">
          <dt>Bersyon ng Kamara (House bill)</dt>
          <dd className="figure-n num">{summary.house.rows ? php(summary.house.php) : '—'}</dd>
          <dd className="figure-sub">
            {summary.house.rows ? `Sa ${count(summary.house.rows)} proyekto. Ihambing sa NEP, huwag idagdag.` : 'Walang linya sa House bill para sa mga record na ito.'}
          </dd>
        </div>
        <div className="figure">
          <dt>Mga record na nakita</dt>
          <dd className="figure-n num">{count(summary.rows)}</dd>
          <dd className="figure-sub">{programs || 'Wala pang record'}. Nakapangalan ang bayan sa pamagat.</dd>
        </div>
        <div className="figure">
          <dt>Nasa House bill lang</dt>
          <dd className="figure-n num">{count(summary.groups.house_only.rows)}</dd>
          <dd className="figure-sub">
            {summary.groups.house_only.rows ? `${php(summary.groups.house_only.house_php)}. Mga dapat suriin.` : 'Walang idinagdag ng Kamara sa mga record na ito.'}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** NEP and House bill per category, side by side; never summed together. */
function categoryRows(rows: ScopedProject[]) {
  return CATEGORIES.map((c) => {
    const match = rows.filter((r) => categoryOf(r.title) === c.id);
    const sum = (k: 'nep_php' | 'house_php') => match.reduce((n, r) => n + (r[k] ?? 0), 0);
    const has = (k: 'nep_php' | 'house_php') => match.some((r) => r[k] != null);
    return { ...c, rows: match.length, nep: has('nep_php') ? sum('nep_php') : null, house: has('house_php') ? sum('house_php') : null };
  }).filter((c) => c.rows > 0).sort((a, b) => Math.max(b.nep ?? 0, b.house ?? 0) - Math.max(a.nep ?? 0, a.house ?? 0));
}

export default function BudgetOverview({ rows, onCategory }: { rows: ScopedProject[]; onCategory: (category: Category) => void }) {
  const categories = useMemo(() => categoryRows(rows), [rows]);
  const scale = Math.max(1, ...categories.map((c) => Math.max(c.nep ?? 0, c.house ?? 0)));
  const biggest = useMemo(
    () => rows.filter((p) => p.house_php != null || p.nep_php != null)
      .sort((a, b) => Math.max(b.house_php ?? 0, b.nep_php ?? 0) - Math.max(a.house_php ?? 0, a.nep_php ?? 0))
      .slice(0, 5),
    [rows],
  );
  return (
    <section className="section insights" aria-labelledby="insights-h">
      <h2 id="insights-h" className="section-h">Para saan <em>ang pondo</em></h2>
      <div className="insights-grid">
        <article className="panel">
          <h3>Ayon sa uri ng proyekto</h3>
          <p className="panel-intro">Pinagpangkat batay sa mga salita sa pamagat, hindi opisyal na klasipikasyon. Piliin ang isang uri para makita ang mga proyekto.</p>
          <div className="cat-key" aria-hidden="true"><span><i className="k k-nep" />NEP</span><span><i className="k k-house" />House bill</span></div>
          <ul className="cats">
            {categories.map((c) => (
              <li key={c.id}>
                <button type="button" className="cat" onClick={() => onCategory(c.id)}>
                  <span className="cat-name">{c.label}<small>{count(c.rows)} record</small></span>
                  <span className="cat-bars" aria-hidden="true">
                    {c.nep ? <span className="cat-bar k-nep" style={{ width: `${(c.nep / scale) * 100}%` }} /> : <span className="cat-bar-none">walang NEP</span>}
                    {c.house ? <span className="cat-bar k-house" style={{ width: `${(c.house / scale) * 100}%` }} /> : <span className="cat-bar-none">walang House bill</span>}
                  </span>
                  <span className="cat-figs num">
                    <span>NEP {php(c.nep)}</span>
                    <span>House bill {php(c.house)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <CategoryTakeaway categories={categories} />
        </article>

        <article className="panel">
          <h3>Pinakamalalaking linya</h3>
          <p className="panel-intro">Ayon sa mas malaking halaga sa NEP o House bill. Buksan para makita ang pahina sa bawat dokumento.</p>
          <ol className="biggest">
            {biggest.map((p) => (
              <li key={p.key}>
                <Link to={projectHref(p)}>
                  <span className="biggest-title" lang="en">{p.title}</span>
                  <span className="biggest-figs num">
                    <span>NEP {php(p.nep_php)}</span>
                    <span>House bill {php(p.house_php)}</span>
                  </span>
                  <span className="biggest-status">{GROUP_FIL[p.bridge_group] ?? p.status_label}</span>
                </Link>
              </li>
            ))}
          </ol>
          {!biggest.length && <p className="state">Walang halagang nakalista sa mga record na ito.</p>}
        </article>
      </div>
    </section>
  );
}

/**
 * Beyond the 2027 proposal: what was enacted, and what DPWH has contracted.
 * Separate stages, each on its own page; nothing here is added together.
 */
export function Pathways() {
  const [contracts, setContracts] = useState<ContractSnapshot | null>(null);
  useEffect(() => {
    const load = contractsLoader();
    if (!load) return;
    let live = true;
    load().then((v) => live && setContracts(v), () => undefined);
    return () => { live = false; };
  }, []);
  const years = contracts ? contracts.records.map((r) => r.year).filter((y) => /^\d{4}$/.test(y)).sort() : [];
  const statuses = useMemo(() => {
    const n = new Map<string, number>();
    for (const r of contracts?.records ?? []) n.set(r.status || '—', (n.get(r.status || '—') ?? 0) + 1);
    return [...n.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5);
  }, [contracts]);
  const statusMax = Math.max(1, ...statuses.map(([, n]) => n));
  return (
    <section className="section pathways" aria-labelledby="pathways-h">
      <h2 id="pathways-h" className="section-h">Higit pa <em>sa panukala para sa 2027</em></h2>
      <div className="pathways-grid">
        <Link className="pathway pathway-contracts" to="/contracts">
          <strong>Mga proyekto ng DPWH sa bayan, mula procurement hanggang natapos</strong>
          <span className="pathway-body">
            {contracts
              ? <>{count(contracts.records.length)} record na nakatalaga sa bayan{years.length ? `, ${years[0]}–${years[years.length - 1]}` : ''}, may status at progreso ayon sa DPWH. {contracts.reviewRecords.length > 0 && <>{count(contracts.reviewRecords.length)} pa ang sinusuri ang lokasyon.</>}</>
              : 'Mga record mula sa DPWH: kontratista, petsa, status at progreso ayon sa DPWH.'}
          </span>
          {statuses.length > 0 && (
            <span className="pstatus">
              <span className="pstatus-title">Status ayon sa DPWH (iniulat, hindi pa nasuri sa lugar)</span>
              {statuses.map(([st, n]) => (
                <span key={st} className="pstatus-row">
                  <span className="pstatus-name" lang="en">{st}</span>
                  <span className="pstatus-track" aria-hidden="true"><span style={{ width: `${(n / statusMax) * 100}%` }} /></span>
                  <span className="pstatus-n num">{count(n)}</span>
                </span>
              ))}
            </span>
          )}
          {contracts && statuses.length > 0 && (
            <span className="takeaway">
              <strong>Sa madaling salita:</strong> {count(statuses[0][1])} sa {count(contracts.records.length)} record ang may status na
              “<span lang="en">{statuses[0][0]}</span>” ayon sa DPWH. Iniulat ito ng pinagmulan at hindi pa nasuri sa lugar.
            </span>
          )}
          <span className="pathway-cta">Tingnan ang mga DPWH record <span aria-hidden="true">→</span></span>
        </Link>
        <Link className="pathway" to="/gaa">
          <strong>Ano ang ipinasa ng Kongreso, 2020–2026</strong>
          <span className="pathway-body">Mga programang tumutukoy sa Montalban sa GAA bawat taon, at ang budget ng DPWH office.</span>
          <OfficeYearsMini />
          <span className="pathway-cta">Buksan ang kasaysayan <span aria-hidden="true">→</span></span>
        </Link>
      </div>
      <p className="fine">Magkakaibang yugto ang panukala, batas at DPWH record. Hindi pinagsasama ang kanilang mga halaga.</p>
    </section>
  );
}

const GAA_FY = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

/**
 * The DPWH office's whole enacted budget by year, with the 2027 NEP set apart
 * (a proposal, not law). It is a shared office's total, labelled as such:
 * never Montalban's alone, and a different measure from the town-named programs.
 */
export function OfficeYearsMini({ takeaway = true }: { takeaway?: boolean }) {
  const { districts } = usePortal();
  const office = useMemo(() => officeWithHistory(districts), [districts]);
  if (!office) return null;
  const at = (fy: number, stage: string) => office.years?.find((y) => y.fy === fy && y.stage === stage)?.php ?? null;
  const gaa = GAA_FY.map((fy) => ({ key: String(fy), label: `’${String(fy).slice(2)}`, v: at(fy, 'gaa') }));
  const nep = { key: '2027', label: 'NEP', v: at(2027, 'nep') };
  const max = Math.max(1, ...[...gaa, nep].map((b) => b.v ?? 0));
  const shared = office.co_served_districts.map((d) => d.label);
  const gaaVals = gaa.filter((b) => b.v != null && b.v > 0).map((b) => b.v as number);
  const col = (b: { key: string; label: string; v: number | null }, isNep = false) => (
    <span key={b.key} className={`mini-col${isNep ? ' is-nep' : ''}`}>
      <span className="mini-v num">{compactAmount(b.v)}</span>
      <span className="mini-track"><span className="mini-fill" style={{ height: `${((b.v ?? 0) / max) * 100}%`, '--w': `${((b.v ?? 0) / max) * 100}%` } as CSSProperties} /></span>
      <span className="mini-x">{b.label}</span>
    </span>
  );
  return (
    <span className="mini">
      <span className="mini-title">DPWH {office.name}: buong budget ng opisina bawat taon</span>
      <span className="mini-split" role="img" aria-label={`Buong budget ng DPWH ${office.name}: ${gaa.map((b) => `GAA ${b.key} ${b.v != null ? phpFull(b.v) : 'walang datos'}`).join('; ')}; NEP 2027 ${nep.v != null ? phpFull(nep.v) : 'walang datos'}, panukala pa`}>
        <span className="mini-group">
          <span className="mini-bars">{gaa.map((b) => col(b))}</span>
          <span className="mini-cap">GAA 2020–2026 · naisabatas</span>
        </span>
        <span className="mini-group mini-group-2027">
          <span className="mini-bars mini-bars-2027">{col(nep, true)}</span>
          <span className="mini-cap">2027 · panukala pa</span>
        </span>
      </span>
      <span className="mini-note">
        Kabuuan ng buong opisina{shared.length ? `, kahati ng ${shared.join(' at ')}` : ''}. Hindi ito budget ng Montalban lamang.
      </span>
      {takeaway && gaaVals.length > 1 && (
        <span className="takeaway">
          <strong>Sa madaling salita:</strong> mula {php(Math.min(...gaaVals))} hanggang {php(Math.max(...gaaVals))} bawat taon ang
          naisabatas para sa buong opisina noong 2020–2026, para sa lahat ng distritong pinagsisilbihan nito. Ang NEP 2027 ay
          panukala pa lang, hindi pa batas.
        </span>
      )}
    </span>
  );
}

/** One sentence from the category figures: which kind of work takes the largest share of each version. */
function CategoryTakeaway({ categories }: { categories: { label: string; nep: number | null; house: number | null }[] }) {
  const share = (k: 'nep' | 'house') => {
    const total = categories.reduce((n, c) => n + (c[k] ?? 0), 0);
    if (!total) return null;
    const top = [...categories].sort((a, b) => (b[k] ?? 0) - (a[k] ?? 0))[0];
    return { top, pct: Math.round(((top[k] ?? 0) / total) * 100), total };
  };
  const nep = share('nep');
  const house = share('house');
  if (!nep && !house) return null;
  return (
    <p className="takeaway">
      <strong>Sa madaling salita:</strong>{' '}
      {nep && <>sa NEP, {nep.pct}% ng {php(nep.total)} ay para sa {nep.top.label.toLowerCase()}. </>}
      {house ? <>Sa House bill, {house.pct}% ng {php(house.total)} ay para sa {house.top.label.toLowerCase()}.</> : <>Walang katapat na halaga sa House bill ang mga record na ito.</>}
    </p>
  );
}
