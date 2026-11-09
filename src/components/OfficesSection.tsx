/**
 * DPWH offices first, legislative districts under them: the hierarchy the
 * budget documents use. DPWH lists its money by district engineering office
 * (DEO); each office serves one or more legislative districts.
 *
 * Each office's figures are shown once, whole. A shared (Tier B) office's
 * districts are listed under it and its money is never split between them.
 * Figures are the API's office figures (named projects, NEP against House
 * bill on the same ledger); lines whose two versions name different offices
 * are held out of them, as the API holds them out.
 */
import { Link } from 'react-router-dom';
import type { DistrictCard, DistrictOffice, Envelope } from '../api/types';
import { BRIDGE_GROUPS } from '../api/types';
import { count, php, phpDelta, plural } from '../lib/format';
import { usePortal } from '../lib/portal-context';
import type { QueryReport, ScopedProject } from '../lib/scope';
import { GROUP_FIL, knownTextFil, TERM_FIL, tierTextFil } from '../lib/display';
import { Await, External, OriginalEnglish } from './Bits';

interface DistrictRow {
  id: string;
  label: string;
  card: DistrictCard | null;
  /** Other offices that also build in this district. */
  alsoServedBy: string[];
}

interface OfficeView {
  office: DistrictOffice;
  /** The office as the documents publish it ("Bohol 1st District Engineering Office"). */
  printed: string;
  /** The portal's query for this office, when all of its lines are in the portal. */
  query: QueryReport | null;
  /** How many of the portal's lines the documents list under this office. */
  lines: number;
  districts: DistrictRow[];
}

export default function OfficesSection() {
  const { districts, scope, config } = usePortal();
  // Nothing to show for a scope with neither offices nor districts.
  if (!config.scope.offices?.length && !config.scope.districts?.length) return null;
  const queries = scope.status === 'ready' ? scope.value.queries.filter((q) => q.kind === 'office') : [];
  const projects = scope.status === 'ready' ? scope.value.projects : [];
  return (
    <section className="section" id="offices" aria-labelledby="offices-h">
      <Await state={districts} what="mga DPWH office at distrito">
        {(list) => <Offices list={list} queries={queries} projects={projects} />}
      </Await>
    </section>
  );
}

function buildOffices(cards: DistrictCard[], queries: QueryReport[], projects: ScopedProject[]): { offices: OfficeView[]; noOffice: DistrictCard[] } {
  const linesByOffice = new Map<string, number>();
  for (const p of projects) if (p.office) linesByOffice.set(p.office, (linesByOffice.get(p.office) ?? 0) + 1);
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const queryByOffice = new Map<string, QueryReport>();
  for (const q of queries) for (const o of q.officeLens?.offices ?? []) queryByOffice.set(o.id, q);

  const officeById = new Map<string, DistrictOffice>();
  for (const c of cards) for (const o of c.offices) if (!officeById.has(o.id)) officeById.set(o.id, o);

  const offices = [...officeById.values()].map((office): OfficeView => {
    const query = queryByOffice.get(office.id) ?? null;
    const printed =
      query?.label ??
      office.years?.find((y) => y.fy === 2027 && y.stage === 'hgab3' && y.matched_label)?.matched_label ??
      office.name;
    const labels = new Map(office.co_served_districts.map((d) => [d.id, d.label]));
    const districts = office.district_ids.map((id): DistrictRow => {
      const card = cardById.get(id) ?? null;
      return {
        id,
        label: card?.label ?? labels.get(id) ?? id,
        card,
        alsoServedBy: card ? card.offices.filter((o) => o.id !== office.id).map((o) => o.name) : [],
      };
    });
    return { office, printed, query, lines: linesByOffice.get(printed) ?? 0, districts };
  });

  // The portal's own offices first, then any that only serve a district it names.
  offices.sort((a, b) => Number(!a.query) - Number(!b.query) || a.printed.localeCompare(b.printed, 'en', { numeric: true }));
  return { offices, noOffice: cards.filter((c) => !c.offices.length) };
}

function Offices({ list, queries, projects }: { list: Envelope<DistrictCard>[]; queries: QueryReport[]; projects: ScopedProject[] }) {
  const { overview } = usePortal();
  const cards = list.map((e) => e.data);
  const { offices, noOffice } = buildOffices(cards, queries, projects);
  const districtCount = new Set(offices.flatMap((o) => o.districts.map((d) => d.id)).concat(noOffice.map((c) => c.id))).size;
  const note = list[0]?.meta.representatives_note as string | undefined;
  const residualTerm = overview.status === 'ready' ? overview.value.data.terms.residual : undefined;
  const credits = [...new Set(cards.flatMap((c) => (c.representative?.portrait ? [`${c.representative.portrait.attribution} · ${c.representative.portrait.license}`] : [])))];

  return (
    <>
      <h2 id="offices-h" className="section-h">
        Ang DPWH office na nagpapatupad: {plural(offices.length, 'opisina', 'opisina')} para sa {plural(districtCount, 'distrito', 'distrito')}
      </h2>
      <p className="section-lede">
        Inililista ng DPWH ang pondo ayon sa district engineering office na gumagawa ng proyekto. Ang isang opisina ay maaaring
        maglingkod sa ilang distrito, kaya ang pondo nito ay hindi hinahati at hindi buong para sa Montalban. Ang mga kinatawan
        ay ang nakaupo sa 20th Congress.{note && (knownTextFil(note) ? <> {knownTextFil(note)}</> : <> <span lang="en">{note}</span></>)}
      </p>
      {note && knownTextFil(note) && <OriginalEnglish><p>{note}</p></OriginalEnglish>}

      <div className={`ogrid${offices.length === 1 ? ' one' : ''}`}>
        {offices.map((o) => <Office key={o.office.id} view={o} />)}
      </div>

      {noOffice.length > 0 && (
        <p className="fine">
          Walang nakalistang DPWH district office para sa {noOffice.map((c) => c.label).join('; ')}.
        </p>
      )}
      <p className="fine">
        Ang mga numero ng bawat opisina ay ang mga nakapangalang proyekto nito sa NEP at House bill para sa 2027: ikinukumpara,
        hindi pinagsasama.
        {residualTerm && (TERM_FIL.residual
          ? <> {TERM_FIL.residual.term}: {TERM_FIL.residual.meaning}</>
          : <> <span lang="en">{residualTerm.term}: {residualTerm.meaning}</span></>)}
        {credits.length > 0 && <> Mga larawan: <span lang="en">{credits.join('; ')}</span>.</>}
      </p>
    </>
  );
}

function Office({ view }: { view: OfficeView }) {
  const { office, printed, query, lines, districts } = view;
  const f = office.fy2027;
  const wholeNep = office.years?.find((y) => y.fy === 2027 && y.stage === 'nep')?.php ?? null;
  const change = f && f.nep_php != null && f.hgab3_php != null ? f.hgab3_php - f.nep_php : null;
  // The project list, narrowed to this office's lines (and a status).
  const filter = (status?: string) => `/panukala-2027?office=${encodeURIComponent(printed)}${status ? `&status=${status}` : ''}#projects`;
  const groups = f ? BRIDGE_GROUPS.map((g) => f.bridge.groups[g]).filter((c) => c && c.rows > 0) : [];
  const unconfirmed = f?.annotations?.unconfirmed_rows ?? 0;
  const held = f?.office_change?.rows ?? 0;

  return (
    <article className="ocard">
      <header className="ocard-head">
        <div>
          <p className="label"><span lang="en">DPWH {office.kind_label.replace(/ \(DEO\)$/, '')}</span>{office.region && <> · {office.region}</>}</p>
          <h3>{printed}</h3>
        </div>
        {tierTextFil(office.tier_text)
          ? <span className={`tag tier tier-${office.tier}`}>{tierTextFil(office.tier_text)}</span>
          : <span className={`tag tier tier-${office.tier}`} lang="en">{office.tier_text}</span>}
      </header>

      <dl className="ocard-figs">
        <div>
          <dt className="label">Sa portal na ito</dt>
          <dd>{lines ? <Link to={filter()} className="ocard-lines">{plural(lines, 'linya', 'linya')} →</Link> : <span className="muted">wala</span>}</dd>
        </div>
        <div>
          <dt className="label">NEP</dt>
          <dd className="num">{php(f?.nep_php)}</dd>
        </div>
        <div>
          <dt className="label">House bill</dt>
          <dd className="num stat-accent">{php(f?.hgab3_php)}</dd>
        </div>
        <div>
          <dt className="label">Pagbabago</dt>
          <dd className="num">{phpDelta(change)}</dd>
        </div>
      </dl>

      {groups.length > 0 && (
        <p className="ocard-groups">
          {groups.map((c) => {
            const label = GROUP_FIL[c.group] ?? c.label;
            const text = <><span className={`status-dot g-${c.group}`} aria-hidden="true" />{count(c.rows)} {label.charAt(0).toLowerCase() + label.slice(1)}</>;
            // These counts are the whole office's: link them only when all of its lines are in the portal.
            return query ? <Link key={c.group} to={filter(c.group)}>{text}</Link> : <span key={c.group}>{text}</span>;
          })}
        </p>
      )}
      <p className="ocard-note">
        Mga nakapangalang proyekto{f ? <>: {count(f.nep_records)} sa NEP, {count(f.hgab3_records)} sa House bill</> : null}.
        {wholeNep != null && <> Buong opisina sa NEP: {php(wholeNep)}.</>}
        {unconfirmed > 0 && <> Kasama ang {plural(unconfirmed, 'hindi kumpirmadong tugma', 'hindi kumpirmadong tugma')} ({php(f?.annotations?.unconfirmed_php)}).</>}
        {held > 0 && <> Hindi kasama sa mga numerong ito ang {plural(held, 'linya', 'linya')} na magkaiba ang opisina sa dalawang bersyon.</>}{' '}
        <Link to={`/gaa#${office.id}`}>Budget nito bawat taon mula 2020 →</Link>
      </p>

      <div className="ocard-districts">
        <p className="label">
          {districts.length === 1 ? 'Distritong pinagsisilbihan' : `${districts.length} distritong pinagsisilbihan`}
          {office.tier === 'B' && <> · kahati, hindi hinahati ang pondo</>}
        </p>
        <ul>
          {districts.map((d) => <District key={d.id} row={d} />)}
        </ul>
      </div>

      {!query && office.projects_url && (
        <p className="small">
          Ang mga linyang tumutukoy lang sa bayan ang nasa portal na ito. <External href={office.projects_url}>Lahat ng linya ng opisina</External>
        </p>
      )}
    </article>
  );
}

function District({ row }: { row: DistrictRow }) {
  const rep = row.card?.representative ?? null;
  const portrait = rep?.portrait ?? null;
  return (
    <li className="odistrict">
      {portrait ? (
        <img
          className="odistrict-photo"
          src={portrait.url}
          alt={`Larawan ni ${rep?.name ?? row.label}`}
          title={`${portrait.attribution} · ${portrait.license} · ${portrait.source_url}`}
          width="40"
          height="50"
          loading="lazy"
        />
      ) : (
        <span className="odistrict-photo" aria-hidden="true" />
      )}
      <div>
        <p className="odistrict-label">{row.label}</p>
        <p className="small">
          {rep ? rep.name : <span className="muted">Walang nakalistang kinatawan</span>}
        </p>
        <p className="odistrict-links small">
          {rep?.bills_url && <External href={rep.bills_url}>Mga panukalang batas</External>}
          {row.card && <External href={row.card.url}>Pahina ng distrito</External>}
          {row.alsoServedBy.length > 0 && <span className="muted">pinagsisilbihan din ng {row.alsoServedBy.join(', ')}</span>}
        </p>
      </div>
    </li>
  );
}
