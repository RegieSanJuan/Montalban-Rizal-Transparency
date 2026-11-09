import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { BridgeGroup, Disclaimer } from '../api/types';
import type { Async } from '../lib/portal-context';
import { usePortal } from '../lib/portal-context';
import type { Reason } from '../lib/scope';
import { DISCLAIMER_FIL, GROUP_FIL, MONEY_STAGE, type MoneyStage } from '../lib/display';

/**
 * How the House bill compares with the NEP, in Filipino by the API's group,
 * with the API's own English label kept beside it.
 */
export function StatusChip({ group, label, held }: { group: BridgeGroup; label: string; held?: boolean }) {
  const fil = GROUP_FIL[group];
  return (
    <span className="status">
      <span className={`status-dot g-${group}`} aria-hidden="true" />
      {fil ? <span>{fil} <small className="api-label" lang="en">{label}</small></span> : <span lang="en">{label}</span>}
      {held && (
        <span className="tag tag-warn" title="Hindi pa kumpirmado ang pagtutugma ng NEP at House bill na linya.">
          hindi kumpirmadong tugma
        </span>
      )}
    </span>
  );
}

export function ReasonTags({ reasons }: { reasons: Reason[] }) {
  return (
    <span className="reasons">
      {reasons.map((r) => (
        <span
          key={r.kind + r.label}
          className={`tag ${r.kind === 'office' ? 'tag-office' : 'tag-place'}`}
          title={r.kind === 'office' ? `Nakalista sa ilalim ng ${r.label}` : `Binabanggit ng pamagat ang ${r.label}`}
        >
          {r.kind === 'office' ? 'opisina ng DPWH' : `binabanggit ang ${r.label}`}
        </span>
      ))}
    </span>
  );
}

/**
 * The API's disclaimers: a Filipino summary for each one we have reviewed,
 * and the English printed verbatim from the response (so its wording cannot
 * drift) inside a disclosure. A disclaimer we have not reviewed is shown in
 * English, in full.
 */
export function Disclaimers({ items, compact }: { items: Disclaimer[]; compact?: boolean }) {
  if (!items.length) return null;
  return (
    <aside className={`disclaimers${compact ? ' compact' : ''}`} aria-label="Mga paalala mula sa pinagmulan ng datos">
      {items.map((d) => {
        const fil = DISCLAIMER_FIL[d.id];
        const link = (
          <a href={d.restrictions_url ?? d.url} target="_blank" rel="noopener">
            Basahin sa pinagmulan <span aria-hidden="true">↗</span>
          </a>
        );
        if (!fil) {
          return (
            <div key={d.id} className="disclaimer">
              <p lang="en"><strong>{d.title}</strong> {d.body}</p>
              <p>{link}</p>
            </div>
          );
        }
        return (
          <div key={d.id} className="disclaimer">
            <p><strong>{fil.title}</strong> {fil.summary}</p>
            <OriginalEnglish label="Buong paalala ng pinagmulan (Ingles)">
              <p><strong>{d.title}</strong> {d.body}</p>
              <p>{link}</p>
            </OriginalEnglish>
          </div>
        );
      })}
    </aside>
  );
}

/** Upstream English kept verbatim and reachable, behind a Filipino-labelled disclosure. */
export function OriginalEnglish({ label = 'Orihinal na teksto (Ingles)', children }: { label?: string; children: ReactNode }) {
  return (
    <details className="orig-en">
      <summary>{label}</summary>
      <div lang="en">{children}</div>
    </details>
  );
}

/**
 * A peso figure with its money stage in the same element: "Halaga sa record
 * ₱47,767,500", "GAA ₱1.19B". One fixed vocabulary (MONEY_STAGE) everywhere.
 */
export function Money({ stage, children, missing }: { stage: MoneyStage; children: ReactNode; missing?: boolean }) {
  return (
    <span className={`money${missing ? ' is-missing' : ''}`}>
      <span className="money-stage">{MONEY_STAGE[stage]}</span> <span className="num">{children}</span>
    </span>
  );
}

/** Render `ready`, or a loading line, or the error with a retry. */
export function Await<T>({ state, children, what }: { state: Async<T>; children: (value: T) => ReactNode; what: string }) {
  const { retry } = usePortal();
  if (state.status === 'ready') return <>{children(state.value)}</>;
  if (state.status === 'loading') {
    return (
      <div className="state" role="status">
        <span className="spinner" aria-hidden="true" /> Kinukuha ang {what} mula sa Budget API… Maaaring tumagal nang ilang segundo.
      </div>
    );
  }
  return (
    <div className="state state-error" role="alert">
      <p className="state-title">Hindi makuha ang {what} mula sa BetterGov Budget API.</p>
      <p>
        Maaaring pansamantalang hindi available ang pinagmulan. Subukang muli maya-maya. Gumagana pa rin ang mga
        bahaging naka-save sa portal: ang <Link to="/contracts">mga project record ng DPWH</Link> at ang{' '}
        <Link to="/gaa">kasaysayan 2020–2026</Link>.
      </p>
      <p className="state-detail">Teknikal na detalye: <span lang="en">{state.error.message}</span></p>
      <button type="button" className="button" onClick={retry}>
        Subukang kunin muli
      </button>
    </div>
  );
}

export function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener">
      {children} <span aria-hidden="true">↗</span>
    </a>
  );
}
