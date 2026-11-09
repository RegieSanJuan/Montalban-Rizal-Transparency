/**
 * /kontratista and /kontratista/:id — contractors named on the DPWH project
 * records included for Montalban. Grouped by the exact source name only
 * (case and spacing normalised): not a legal identity, no fuzzy merging, and a
 * joint venture stays its own group. Amounts are the DPWH record budget field.
 */
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { shortNameOf } from '../config';
import { PageHead } from '../components/Chrome';
import { Money } from '../components/Bits';
import { contractPeso } from '../components/data-shapes';
import { useDirectory } from '../components/useDirectory';
import { bracketNotes, dpwhStatusGloss, splitTitle } from '../lib/display';
import { count, php } from '../lib/format';
import type { ContractorProfile, ProjectDirectory } from '../lib/project-directory';
import { usePortal } from '../lib/portal-context';
import { useTitle } from '../lib/use-title';

export default function Contractors() {
  const { id } = useParams();
  const dir = useDirectory();
  return (
    <main className="page main">
      {dir.status === 'loading' ? (
        <div className="state" role="status"><span className="spinner" aria-hidden="true" /> Kinukuha ang mga record ng DPWH… Maaaring tumagal nang ilang segundo.</div>
      ) : dir.status === 'error' ? (
        <div className="state state-error" role="alert">
          <p className="state-title">Hindi makuha ang mga record ng DPWH.</p>
          <p className="state-detail"><span lang="en">{dir.error.message}</span></p>
          <button type="button" className="button" onClick={dir.retry}>Subukang kunin muli</button>
        </div>
      ) : id ? (
        <Profile dir={dir.value} id={decodeURIComponent(id)} />
      ) : (
        <Directory dir={dir.value} />
      )}
    </main>
  );
}

/** The short version, shown before any figure. */
const ShortCaveat = () => (
  <p className="ctr-caveat">
    Pinagsama lang ang mga record na eksaktong pareho ang pangalan; hindi ito legal na pagkakakilanlan. Hindi patunay ng
    anumang mali ang pagkakalista rito.
  </p>
);

/**
 * Directly under a contractor's name: the name is the DPWH record's own text,
 * notes and number included, and the portal has not checked or interpreted them.
 */
function SourceName({ name }: { name: string }) {
  const notes = bracketNotes(name);
  const numbers = [...name.matchAll(/\((?:\[[^\]]+\]\s*)?(\d{3,})\)/g)].map((m) => m[1]);
  const parts = [
    notes.length ? `ang ${notes.length === 1 ? 'talang' : 'mga talang'} ${notes.map((n) => `“${n}”`).join(', ')}` : null,
    numbers.length ? `ang ${numbers.length === 1 ? 'numerong' : 'mga numerong'} ${numbers.join(', ')}` : null,
  ].filter(Boolean);
  return (
    <p className="source-name-note">
      Isinulat ang pangalan gaya ng nasa record ng DPWH{parts.length ? `, kasama ${parts.join(' at ')}` : ''}. Hindi ito
      sinuri o binigyang-kahulugan ng portal na ito.
    </p>
  );
}

const Caveat = ({ dir }: { dir: ProjectDirectory }) => (
  <p className="fine">
    Pinagsama lang ang mga record na eksaktong pareho ang pangalan ng kontratista (hindi pinapansin ang laki ng titik at
    espasyo). Hindi ito legal na pagkakakilanlan: ang joint venture ay hiwalay na grupo, at ang pangalang may kaunting
    pagkakaiba ay maaaring hiwalay. {count(dir.coverage.unnamedContractorCount)} record ang walang nakasaad na kontratista. Ang
    halaga ay budget field ng DPWH record, hindi bayad o aktuwal na gastos. Hindi patunay ng anumang mali ang pagkakalista rito.
  </p>
);

type Sort = 'count' | 'amount' | 'name';

function Directory({ dir }: { dir: ProjectDirectory }) {
  const { config } = usePortal();
  useTitle(`Mga kontratista · ${shortNameOf(config)}`);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const sort = (['count', 'amount', 'name'] as Sort[]).includes(params.get('sort') as Sort) ? (params.get('sort') as Sort) : 'count';
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = dir.contractorProfiles.filter((c) => words.every((w) => `${c.name} ${c.aliases.join(' ')}`.toLowerCase().includes(w)));
    const cmp: Record<Sort, (a: ContractorProfile, b: ContractorProfile) => number> = {
      count: (a, b) => b.contractCount - a.contractCount || a.name.localeCompare(b.name),
      amount: (a, b) => b.sourceBudgetPhp - a.sourceBudgetPhp || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...rows].sort(cmp[sort]);
  }, [dir, q, sort]);
  const maxCount = Math.max(1, ...dir.contractorProfiles.map((c) => c.contractCount));

  return (
    <>
      <PageHead title="Mga kontratista sa mga proyekto ng DPWH sa Montalban">
        <p>
          Sino ang nakasaad na kontratista sa {count(dir.coverage.included)} project record ng DPWH na nakatalaga sa bayan, ilang
          record ang hawak ng bawat isa, at sa anong mga taon. Buksan ang isang kontratista para makita ang bawat record.
        </p>
        <p>
          Isinulat ang mga pangalan gaya ng nasa record ng DPWH, kasama ang mga tala at numero sa loob nito (halimbawa, ang
          nasa loob ng [ ]). Hindi sinuri o binigyang-kahulugan ng portal ang mga talang ito.
        </p>
      </PageHead>
      <ShortCaveat />

      <dl className="figures figures-3">
        <div className="figure figure-lead"><dt>Mga kontratista (eksaktong pangalan)</dt><dd className="figure-n num">{count(dir.coverage.contractors)}</dd><dd className="figure-sub">mula sa {count(dir.coverage.included)} record</dd></div>
        <div className="figure"><dt>Walang nakasaad na kontratista</dt><dd className="figure-n num">{count(dir.coverage.unnamedContractorCount)}</dd><dd className="figure-sub">walang pangalan sa record ng DPWH</dd></div>
        <div className="figure"><dt>Walang halaga sa record</dt><dd className="figure-n num">{count(dir.coverage.unknownAmountCount)}</dd><dd className="figure-sub">hindi isinama sa mga kabuuang halaga</dd></div>
      </dl>

      <section className="section" aria-labelledby="ctr-h">
        <div className="list-head">
          <div>
            <h2 id="ctr-h" className="section-h">Listahan</h2>
            <p className="list-count" aria-live="polite">{list.length === dir.contractorProfiles.length ? `${count(list.length)} kontratista` : `${count(list.length)} sa ${count(dir.contractorProfiles.length)} ang tugma`}</p>
          </div>
        </div>
        <div className="toolbar">
          <label className="field field-grow">
            <span className="label">Hanapin ang kontratista</span>
            <input type="search" name="q" autoComplete="off" value={q} placeholder="Pangalan ng kontratista…" onChange={(e) => set('q', e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Ayusin ayon sa</span>
            <select value={sort} onChange={(e) => set('sort', e.target.value === 'count' ? '' : e.target.value)}>
              <option value="count">Dami ng record</option>
              <option value="amount">Halaga sa mga record</option>
              <option value="name">Pangalan (A–Z)</option>
            </select>
          </label>
        </div>

        {list.length === 0 ? (
          <p className="state">Walang kontratistang tumugma. Subukan ang ibang bahagi ng pangalan, o <button type="button" className="link-button" onClick={() => set('q', '')}>alisin ang paghahanap</button>.</p>
        ) : (
          <ol className="ctr-list">
            {list.map((c) => {
              const years = c.years.map((y) => y.year).filter((y) => /^\d{4}$/.test(y));
              return (
                <li key={c.id}>
                  <Link to={`/kontratista/${encodeURIComponent(c.id)}`} className="ctr-row">
                    <span className="ctr-name">{c.name}</span>
                    <span className="ctr-years">{years.length ? (years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : years[0]) : 'walang taon'}</span>
                    <span className="ctr-bar" aria-hidden="true"><span style={{ width: `${(c.contractCount / maxCount) * 100}%` }} /></span>
                    <span className="ctr-n num">{count(c.contractCount)} record</span>
                    <span className="ctr-php">{c.sourceBudgetPhp ? <Money stage="record">{php(c.sourceBudgetPhp)}</Money> : <Money stage="record" missing>—</Money>}{c.unknownAmountCount > 0 && <small> · {count(c.unknownAmountCount)} walang halaga</small>}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
        <Caveat dir={dir} />
      </section>
    </>
  );
}

function Profile({ dir, id }: { dir: ProjectDirectory; id: string }) {
  const { config } = usePortal();
  const c = dir.contractorProfiles.find((p) => p.id === id);
  useTitle(`${c ? c.name : 'Kontratista'} · ${shortNameOf(config)}`);
  if (!c) {
    return (
      <>
        <p className="crumbs"><Link to="/kontratista">← Lahat ng kontratista</Link></p>
        <h1 className="project-h">Walang kontratistang ganito ang pangalan</h1>
        <p className="lede">Walang record ng DPWH sa Montalban na may kontratistang “{id}”. Maaaring iba ang baybay sa pinagmulan.</p>
        <p><Link to={`/kontratista?q=${encodeURIComponent(id.split(' ')[0] ?? '')}`}>Hanapin ang kahawig na pangalan</Link></p>
      </>
    );
  }
  const records = [...c.records].sort((a, b) => b.year.localeCompare(a.year) || (b.amountPhp ?? -1) - (a.amountPhp ?? -1));
  return (
    <>
      <p className="crumbs"><Link to="/kontratista">← Lahat ng kontratista</Link></p>
      <h1 className="project-h">{c.name}</h1>
      <SourceName name={c.name} />
      <p className="project-line">Kontratista sa mga project record ng DPWH na nakatalaga sa Montalban (Rodriguez)</p>
      {c.aliases.length > 1 && <p className="fine">Mga baybay sa pinagmulan: {c.aliases.join(' · ')}</p>}
      <ShortCaveat />

      <dl className="figures figures-3 ctr-figs">
        <div className="figure figure-lead"><dt>Mga record</dt><dd className="figure-n num">{count(c.contractCount)}</dd><dd className="figure-sub">sa portal na ito</dd></div>
        <div className="figure"><dt>Halaga sa record (budget field ng DPWH), kabuuan</dt><dd className="figure-n num">{c.sourceBudgetPhp ? php(c.sourceBudgetPhp) : '—'}</dd><dd className="figure-sub">hindi bayad o aktuwal na gastos</dd></div>
        <div className="figure"><dt>Walang halaga sa record</dt><dd className="figure-n num">{count(c.unknownAmountCount)}</dd><dd className="figure-sub">hindi kasama sa halaga</dd></div>
      </dl>

      <section className="section reading ctr-read" aria-labelledby="yr-h">
        <h2 id="yr-h" className="section-h section-h-sm">Bawat taon (taon ng proyekto ayon sa DPWH)</h2>
        <div className="ytable-wrap"><table className="ytable">
          <thead><tr><th scope="col">Taon</th><th scope="col" className="r">Record</th><th scope="col" className="r">Halaga sa record</th><th scope="col" className="r">Walang halaga</th></tr></thead>
          <tbody>
            {c.years.map((y) => (
              <tr key={y.year}><th scope="row">{y.year}</th><td className="r num">{count(y.contractCount)}</td><td className="r num">{y.sourceBudgetPhp ? php(y.sourceBudgetPhp) : '—'}</td><td className="r num">{count(y.unknownAmountCount)}</td></tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section className="section reading ctr-read" aria-labelledby="rec-h">
        <h2 id="rec-h" className="section-h section-h-sm">Mga record</h2>
        <ul className="ctr-records">
          {records.map((r) => {
            const { lead, context } = splitTitle(r.title);
            return (
              <li key={r.id}>
                <Link to={`/contracts?q=${encodeURIComponent(r.id)}&open=${encodeURIComponent(r.id)}`} lang="en">{lead}</Link>
                {context && <span className="ctr-rec-context" lang="en">{context}</span>}
                <span className="ctr-rec-meta">
                  {r.year} · ID <span translate="no">{r.id}</span> · <span lang="en">{r.status}</span>{dpwhStatusGloss(r.status) && ` (${dpwhStatusGloss(r.status)})`}{r.progress != null && ` · ${r.progress}%`}
                  {' · '}{r.amountPhp != null ? <Money stage="record">{contractPeso(r.amountPhp)}</Money> : <Money stage="record" missing>hindi ibinigay</Money>}
                </span>
              </li>
            );
          })}
        </ul>
        <Caveat dir={dir} />
      </section>
    </>
  );
}
