import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Envelope, ProjectDetail, Version } from '../api/types';
import { DATASET_KEYS, shortNameOf, type DatasetKey } from '../config';
import { Await, Disclaimers, External, OriginalEnglish, ReasonTags, StatusChip } from '../components/Bits';
import { LocationChip } from '../components/ReviewPanel';
import { LOCATION_LABEL, locationOf } from '../components/data-shapes';
import { apiLabel, VERSION_FIL } from '../lib/display';
import { phpDelta, phpFull } from '../lib/format';
import { usePortal, type Async } from '../lib/portal-context';
import { projectKey } from '../lib/scope';
import { reportHref } from '../lib/report';
import { useTitle } from '../lib/use-title';

const VERSIONS: Version[] = ['nep', 'hgab2', 'hgab3', 'api'];
const FALLBACK_VERSION_LABELS: Record<Version, string> = {
  nep: 'NEP',
  hgab2: 'House bill, second reading',
  hgab3: 'House bill, third reading',
  api: 'DPWH transparency website listing',
};

export default function Project() {
  const { dataset = '', id = '' } = useParams();
  const { client } = usePortal();
  const valid = (DATASET_KEYS as readonly string[]).includes(dataset);
  const [state, setState] = useState<{ key: string; value: Async<Envelope<ProjectDetail>> } | null>(null);
  const key = `${dataset}/${id}`;

  useEffect(() => {
    if (!valid) return;
    let live = true;
    client.project(dataset as DatasetKey, id).then(
      (value) => live && setState({ key, value: { status: 'ready', value } }),
      (error) => live && setState({ key, value: { status: 'error', error: error instanceof Error ? error : new Error(String(error)) } }),
    );
    return () => {
      live = false;
    };
  }, [client, dataset, id, key, valid]);

  if (!valid) {
    return (
      <main className="page main">
        <p className="state">Walang programang “{dataset}”. <Link to="/panukala-2027">Bumalik sa mga proyekto</Link></p>
      </main>
    );
  }
  const current: Async<Envelope<ProjectDetail>> = state?.key === key ? state.value : { status: 'loading' };
  return (
    <main className="page main">
      <BackLink />
      <Await state={current} what="proyekto">
        {(env) => <ProjectView env={env} />}
      </Await>
    </main>
  );
}

function ProjectView({ env }: { env: Envelope<ProjectDetail> }) {
  const { config, overview, scope, client } = usePortal();
  const location = useLocation();
  const p = env.data;
  useTitle(`${p.title} · ${shortNameOf(config)}`);

  const ov = overview.status === 'ready' ? overview.value.data : null;
  const program = ov?.datasets.find((d) => d.key === p.dataset);
  const versionLabel = (v: Version) => ov?.record_versions.find((r) => r.key === v)?.label ?? FALLBACK_VERSION_LABELS[v];
  const inScope = scope.status === 'ready' ? scope.value.projects.find((x) => x.key === projectKey(p.dataset, p.id)) : undefined;
  const versions = VERSIONS.filter((v) => v !== 'api' || p.dataset === 'dpwh');
  const report = reportHref(config, p, window.location.origin + location.pathname);

  const location2 = inScope ? locationOf(inScope) : undefined;
  // API labels in Filipino by their code; an unknown code keeps the API's English, marked as such.
  const fil = (kind: Parameters<typeof apiLabel>[0], l: { code: string; label: string } | null): ReactNode =>
    l ? apiLabel(kind, l.code)?.label ?? <span lang="en">{l.label}</span> : null;
  const en = (v: string | null) => (v ? <span lang="en">{v}</span> : null);
  const status = apiLabel('status', p.labels.status.code);
  const details: [string, ReactNode][] = [
    ['Programa', en(program?.label ?? p.dataset.toUpperCase())],
    ['Linya ng programa', en(p.program)],
    ['Sub-linya', en(p.pap)],
    ['DPWH office', en(p.office)],
    ['Rehiyon', p.region],
    ['Lokasyon', location2 ? `${LOCATION_LABEL[location2.confidence] ?? location2.confidence}${location2.note ? `. ${location2.note}` : ''}` : null],
    ['Paano itinugma ang dalawang bersyon', fil('match', p.labels.match)],
    ['Sa pagitan ng mga pagbasa sa Kamara', fil('reading', p.labels.reading)],
    ['Website ng DPWH', fil('dpwh_site', p.labels.dpwh_site)],
    ['Haba', p.length_m != null ? `${Math.round(p.length_m).toLocaleString('en-US')} m` : null],
  ];
  // Every API label shown on this page, verbatim, for readers who want the source wording.
  const originals = [
    p.labels.status, p.labels.match, p.labels.reading, p.labels.dpwh_site, ...p.labels.flags,
  ].filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <article className="project">
      <h1 className="project-h" lang="en">{p.title}</h1>
      <p className="project-line">
        {program?.short ?? p.dataset.toUpperCase()} · FY 2027{p.office && <> · <span lang="en">{p.office}</span></>}
      </p>
      <div className="project-status">
        <StatusChip group={p.bridge_group} label={p.status_label} held={p.held} />
        {inScope && <LocationChip row={inScope} />}
        {status?.help ? <p className="muted">{status.help}</p> : p.labels.status.help && <p className="muted" lang="en">{p.labels.status.help}</p>}
      </div>

      <div className="project-grid">
        <section className="project-read" aria-labelledby="amounts-h">
          <h2 id="amounts-h" className="section-h">Halaga sa bawat yugto ng budget</h2>
          <ol className="timeline">
            {versions.map((v) => {
              const amount = p[`${v}_php` as const];
              const pdf = p.pdf_url[v];
              const page = v === 'api' ? null : p[`${v}_page` as const];
              return (
                <li key={v} className={amount == null ? 'is-empty' : undefined}>
                  <span className="tl-dot" aria-hidden="true" />
                  <span className="tl-name">{VERSION_FIL[v].name}<small>{VERSION_FIL[v].gloss}{versionLabel(v) !== VERSION_FIL[v].name && <> · <span lang="en">{versionLabel(v)}</span></>}</small></span>
                  <span className="tl-amount num" title={phpFull(amount)}>{amount == null ? <span className="muted">walang nakalistang halaga</span> : phpFull(amount)}</span>
                  <span className="tl-source">
                    {pdf ? <External href={pdf}>{page ? `Pahina ${page}` : 'Buksan ang dokumento'}</External> : <span className="muted">walang link</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="tl-change">
            <span>Pagbabago, House bill kumpara sa NEP</span>
            <strong className="num">{phpDelta(p.delta_php)}</strong>
          </p>
          <p className="fine">
            Magkaibang bersyon ng iisang budget ang NEP at House bill: ikinukumpara, hindi pinagsasama. Buksan ang pahina ng
            dokumento para makita ang eksaktong nakasulat.
          </p>

          <div className="not-here">
            <h3>Hindi makikita sa portal na ito</h3>
            <ul>
              <li>Kung naisabatas ang halagang ito sa GAA 2027</li>
              <li>Kontrata, kontratista at halaga ng award</li>
              <li>Aktuwal na nagastos at status ng konstruksiyon</li>
            </ul>
            <p>Tingnan ang PhilGEPS, ang DPWH, o ang ulat ng COA para sa mga ito.</p>
          </div>

          {p.labels.flags.length > 0 && (
            <>
              <h3 className="sub-h" lang="fil">Mga tala sa record</h3>
              <ul className="flags">
                {p.labels.flags.map((f) => {
                  const t = apiLabel('flag', f.code);
                  return t
                    ? <li key={f.code}>{t.label}{t.help ? <span className="muted"> {t.help}</span> : null}</li>
                    : <li key={f.code} lang="en">{f.label}{f.help ? <span className="muted"> {f.help}</span> : null}</li>;
                })}
              </ul>
            </>
          )}
        </section>

        <aside className="project-side">
          <dl className="details">
            {details.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="label">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            {p.lat != null && p.lon != null && (
              <div>
                <dt className="label">Coordinates sa dokumento</dt>
                <dd>
                  <External href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=15/${p.lat}/${p.lon}`}>
                    {p.lat.toFixed(5)}, {p.lon.toFixed(5)} sa mapa
                  </External>
                </dd>
              </div>
            )}
            <div>
              <dt className="label">Bakit kasama sa portal</dt>
              <dd>
                {inScope ? (
                  <ReasonTags reasons={inScope.reasons} />
                ) : (
                  <span className="muted">Wala ito sa listahan ng portal; ipinapakita dahil sinundan mo ang isang link.</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="report">
            {report ? (
              <>
                <p className="label">Nakita mo na ba ang proyektong ito?</p>
                <a className="button button-primary" href={report}>Mag-ulat tungkol sa proyektong ito ↗</a>
              </>
            ) : (
              <>
                <p className="label">Gusto mong alamin pa?</p>
                <ul className="report-acts">
                  <li>Humingi ng dokumento sa <External href="https://www.foi.gov.ph/">foi.gov.ph</External></li>
                  <li>Tingnan ang bidding sa <External href="https://notices.philgeps.gov.ph/">PhilGEPS</External></li>
                  <li>Basahin ang mga ulat sa <External href="https://www.coa.gov.ph/">coa.gov.ph</External></li>
                  <li>Magtanong sa DPWH office{p.office ? <> (<span lang="en">{p.office}</span>)</> : null}, dala ang link ng pahinang ito</li>
                </ul>
              </>
            )}
          </div>

          <p className="small links">
            <External href={p.url}>Proyekto sa budget.bettergov.ph</External>
            <br />
            <External href={client.href(p.api_url)}>Orihinal na API record (JSON)</External>
          </p>
          {originals.length > 0 && (
            <OriginalEnglish label="Orihinal na mga label ng API (Ingles)">
              <ul className="plain-list">
                {originals.map((l) => <li key={l.code}>{l.label}{l.help ? `: ${l.help}` : ''}</li>)}
              </ul>
            </OriginalEnglish>
          )}
        </aside>
      </div>

      <Disclaimers items={env.disclaimers} />
    </article>
  );
}

/** Back to the list with its filters when the reader came from it; otherwise to the home page. */
function BackLink() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromApp = location.key !== 'default';
  return (
    <p className="crumbs">
      <Link
        to="/panukala-2027#projects"
        onClick={(e) => {
          if (!fromApp) return;
          e.preventDefault();
          navigate(-1);
        }}
      >
        ← Bumalik sa mga proyekto
      </Link>
    </p>
  );
}
