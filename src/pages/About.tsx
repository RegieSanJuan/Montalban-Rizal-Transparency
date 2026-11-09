import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Disclaimer, Overview } from '../api/types';
import { shortNameOf } from '../config';
import { Await, Disclaimers, External } from '../components/Bits';
import { PageHead } from '../components/Chrome';
import DataStatus from '../components/DataStatus';
import { count, date, plural } from '../lib/format';
import { SOURCE_CODE_URL } from '../lib/links';
import { usePortal } from '../lib/portal-context';
import type { ScopeResult } from '../lib/scope';
import { departmentShort, loadGaa, type GaaResult } from '../lib/gaa';
import type { Async } from '../lib/portal-context';
import { useHashScroll } from '../lib/use-hash-scroll';
import { useTitle } from '../lib/use-title';

/** The API's `rules`, in words for readers rather than developers. */
const READING_RULES = [
  'Mga halaga ito sa mga dokumento ng budget, hindi perang nagastos.',
  'Piso ang mga halaga, gaya ng pagkakalathala sa bawat dokumento. Ang gitling ay nangangahulugang walang ganoong linya sa dokumentong iyon; hindi ito zero.',
  'Dalawang bersyon ng iisang budget ang NEP at House bill. Ihambing ang mga ito; huwag pagsamahin.',
  'Ang “nasa House bill lang” at “nasa NEP lang” ay mga kandidato: dapat suriin, hindi kumpirmadong dagdag o tanggal. May ilan na pinalitan lang ng pangalan o saklaw.',
  'Ang “hindi kumpirmadong tugma” ay pagpapares batay sa kahawig na pangalan, hindi eksaktong pareho.',
  'Ang DPWH office na naglilingkod sa ilang distrito (Tier B) ay ipinapakita nang buo; hindi hinahati ang pondo nito. Ang pondong nasa DPWH Central Office o regional office ay wala sa anumang district card.',
];

export default function About() {
  const { scope, overview, config } = usePortal();
  useTitle(`Tungkol sa datos · ${shortNameOf(config)}`);
  return (
    <main className="page main">
      <Await state={scope} what="mga query ng portal">
        {(s) => (
          <Await state={overview} what="mga tala sa datos">
            {(ov) => <AboutView scope={s} overview={ov.data} />}
          </Await>
        )}
      </Await>
    </main>
  );
}

function AboutView({ scope, overview }: { scope: ScopeResult; overview: Overview }) {
  const { config, districts } = usePortal();
  const label = (k: string) => overview.datasets.find((d) => d.key === k)?.short ?? k.toUpperCase();
  const disclaimers = new Map<string, Disclaimer>();
  for (const d of scope.disclaimers) disclaimers.set(d.id, d);
  if (districts.status === 'ready') for (const env of districts.value) for (const d of env.disclaimers) disclaimers.set(d.id, d);
  const meta = scope.meta;
  useHashScroll();

  return (
    <>
      <PageHead
        title={`Saan galing ang mga numero ng ${shortNameOf(config)}`}
      >
        <p>
          Galing sa BetterGov.ph Budget API ang bawat halaga ng budget, na naghahambing ng House bill at NEP kada proyekto.
          Itinatanong ng portal ang mga query sa ibaba. Pagkatapos, sinusuri ang pamagat ng bawat linya: ang nakapangalan
          sa bayan ang nasa pangunahing listahan ({count(scope.projects.length)} ngayon), ang hindi tiyak ay nakahiwalay
          para suriin, at ang ibang lugar o kaparehong pangalan ay hindi isinasama.
        </p>
      </PageHead>

      <DataStatus />

      <section className="section" aria-labelledby="q-h">
        <h2 id="q-h" className="section-h">Ang mga query para sa FY 2027</h2>
        <div className="table queries" role="table" aria-label="Mga query">
          <div className="tr th" role="row">
            <span role="columnheader">Mga linyang…</span>
            <span role="columnheader">Programa</span>
            <span role="columnheader" className="r">Nakita</span>
            <span role="columnheader" className="r">Tugma sa rehiyon</span>
            <span role="columnheader" className="r">Suriin</span>
          </div>
          {scope.queries.map((q, i) => (
            <div className="tr" role="row" key={i}>
              <span role="cell">
                {q.kind === 'office' ? <>nakalista sa ilalim ng <strong>{q.label}</strong></> : <>may pamagat na bumabanggit ng <strong>{String(q.params.q)}</strong></>}
                {q.region && <span className="muted small"> · rehiyon {q.region} lang, o walang nakasaad na rehiyon</span>}
              </span>
              <span role="cell">{label(q.dataset)}</span>
              <span role="cell" className="r num">{count(q.total)}</span>
              <span role="cell" className="r num">{count(q.kept)}</span>
              <span role="cell" className="r"><External href={q.api}>API</External></span>
            </div>
          ))}
        </div>
        <p className="fine">
          Ang “Tugma sa rehiyon” ay bilang bago suriin ang lokasyon sa pamagat; hindi ito ang bilang na kasama sa mga kabuuan
          ng bayan. Isang beses lang ipinapakita ang linyang nakita ng ilang query. Hindi makikita sa paghahanap ng pangalan ang
          proyektong hindi nagsasabi ng lugar sa pamagat.
        </p>
      </section>

      <GaaQuestions />

      <section className="section" aria-labelledby="x-h">
        <h2 id="x-h" className="section-h">Mga linya ng 2027 na inalis nang mano-mano: {count(scope.excluded.length)}</h2>
        {scope.excluded.length === 0 ? (
          <p>Wala. Ipinapakita ang bawat linyang ibinabalik ng mga query.</p>
        ) : (
          <ul className="plain-list">
            {scope.excluded.map(({ exclusion, project }) => (
              <li key={exclusion.key}>
                {project ? (
                  <External href={project.url}>{project.title}</External>
                ) : (
                  <code>{exclusion.key}</code>
                )}
                <span className="muted"> — {exclusion.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section two-col" aria-labelledby="r-h">
        <div>
          <h2 id="r-h" className="section-h">Paano basahin ang mga numero</h2>
          <ul className="plain-list">
            {READING_RULES.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="section-h">Mga salita mula sa Budget API</h2>
          <p className="fine">Gaya ng pagkakasulat ng API, sa Ingles. Nasa <Link to="/para-sa-bayan#mga-salita">Para sa Bayan</Link> ang paliwanag sa Filipino.</p>
          <dl className="terms" lang="en">
            {Object.entries(overview.terms).map(([k, t]) => (
              <div key={k}>
                <dt>{t.term}</dt>
                <dd>{t.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section" aria-labelledby="d-h">
        <h2 id="d-h" className="section-h">Ang mga dokumento</h2>
        <ul className="docs">
          {overview.documents.map((d) => (
            <li key={d.key}>
              <External href={d.pdf_url}><span lang="en">{d.title}</span></External>
              {d.source_url && <span className="muted small"> · <a href={d.source_url} target="_blank" rel="noopener">kung saan ito inilathala</a></span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="n-h">
        <h2 id="n-h" className="section-h">Mga paalala</h2>
        <Disclaimers items={[...disclaimers.values()]} />
        <p className="fine">
          Bersyon ng datos: paghahambing <a href={`${meta.source_repo}/tree/${meta.source_commit}`} target="_blank" rel="noopener">{meta.source_commit.slice(0, 7)}</a>,
          binuo noong {date(meta.built_at)}. Lahat ng proyekto sa bansa: <External href={overview.url}>budget.bettergov.ph</External>.
        </p>
      </section>

      <section className="section build-own" aria-labelledby="b-h">
        <h2 id="b-h" className="section-h">Gumawa ng ganitong portal para sa inyong LGU o DPWH office</h2>
        <p>
          Bukas ang source code ng portal na ito. I-fork ito, patakbuhin ang <code>npm run setup</code> para piliin ang inyong
          probinsya, lungsod, bayan o district engineering office, at i-deploy sa Cloudflare, Vercel o Netlify. Hindi ito
          kailangan ng database: sa parehong API galing ang datos. <External href={SOURCE_CODE_URL}>Source code</External> · <Link to="/panukala-2027">Bumalik sa mga proyekto</Link>
        </p>
      </section>
    </>
  );
}

/** The 2020–2026 searches, published like the 2027 ones: every department with a match, and how to check it. */
function GaaQuestions() {
  const { client, config } = usePortal();
  const places = config.scope.places ?? [];
  const [state, setState] = useState<Async<GaaResult>>({ status: 'loading' });
  useEffect(() => {
    if (!places.length) return;
    let live = true;
    loadGaa(client, config).then(
      (value) => live && setState({ status: 'ready', value }),
      (error) => live && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      live = false;
    };
  }, [client, config, places.length]);

  return (
    <section className="section" aria-labelledby="g-h">
      <h2 id="g-h" className="section-h">Ang mga query para sa 2020–2026</h2>
      {!places.length ? (
        <p>Wala: walang lugar na pinangalanan ang portal na ito, at sa pangalan, hindi sa opisina, inililista ng naisabatas na budget ang mga proyekto.</p>
      ) : state.status === 'loading' ? (
        <p className="state" role="status"><span className="spinner" aria-hidden="true" /> Kinukuha ang mga query…</p>
      ) : state.status === 'error' ? (
        <p className="state state-error">Hindi makuha ang mga query: {state.error.message}</p>
      ) : (
        <>
          <div className="table queries" role="table" aria-label="Mga query sa naisabatas na budget">
            <div className="tr th" role="row">
              <span role="columnheader">Mga programang may pangalang…</span>
              <span role="columnheader">Departamento</span>
              <span role="columnheader" className="r">Nakita</span>
              <span role="columnheader" className="r">Nakuha</span>
              <span role="columnheader" className="r">Suriin</span>
            </div>
            {state.value.queries.filter((q) => q.matched > 0).map((q) => (
              <div className="tr" role="row" key={q.place + q.department_id}>
                <span role="cell"><strong>{q.q}</strong></span>
                <span role="cell">{departmentShort(q.department)}</span>
                <span role="cell" className="r num">{count(q.matched)}</span>
                <span role="cell" className="r num">{count(q.fetched)}</span>
                <span role="cell" className="r"><External href={q.api}>API</External></span>
              </div>
            ))}
          </div>
          <p className="fine">
            Hinanap ang bawat termino sa lahat ng {count(state.value.searched)} departamento sa GAA. Ang may tugma lang ang
            nakalista rito; nasa audit JSON ang lahat ng {count(state.value.queries.length)} kombinasyon, kasama ang walang tugma. Kasama sa “Nakuha” ang mga hindi isinama dahil ibang lugar o kaparehong pangalan; nasa audit JSON ang
            bawat desisyon.
            {state.value.excluded.length > 0 ? ` ${plural(state.value.excluded.length, 'programa', 'programa')} ang inalis nang mano-mano:` : ' Walang inalis nang mano-mano.'}
          </p>
          {state.value.excluded.length > 0 && (
            <ul className="plain-list">
              {state.value.excluded.map(({ exclusion, row }) => (
                <li key={exclusion.key}>
                  {row ? row.name : <code>{exclusion.key}</code>}
                  <span className="muted"> — {exclusion.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
