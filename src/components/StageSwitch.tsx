import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { SOURCE_STAGES, type SourceStage } from '../lib/display';
import { count } from '../lib/format';
import { loadGaa } from '../lib/gaa';
import { usePortal } from '../lib/portal-context';
import { useDirectory } from './useDirectory';

/** Each list's size, read from the same cached loaders the pages use. null while loading or on error. */
function useStageCounts(): Record<SourceStage, { n: number | null; years?: string }> {
  const { scope, client, config } = usePortal();
  const dir = useDirectory();
  const [gaa, setGaa] = useState<number | null>(null);
  useEffect(() => {
    if (!config.scope.places?.length) return;
    let live = true;
    loadGaa(client, config).then((v) => live && setGaa(v.rows.length), () => undefined);
    return () => { live = false; };
  }, [client, config]);
  const dpwh = dir.status === 'ready' ? dir.value : null;
  const years = useMemo(() => {
    const ys = (dpwh?.records ?? []).map((r) => r.year).filter((y) => /^\d{4}$/.test(y)).sort();
    return ys.length ? `${ys[0]}–${ys[ys.length - 1]}` : undefined;
  }, [dpwh]);
  return {
    dpwh: { n: dpwh ? dpwh.coverage.included : null, years },
    gaa: { n: gaa },
    nep: { n: scope.status === 'ready' ? scope.value.projects.length : null },
  };
}

/**
 * Three ways into "projects", each a different source with its own unit and
 * years. Shown at the top of every list page so a short list in one stage
 * (e.g. the FY 2027 proposals) is never read as the whole picture, and each
 * stage is one click from the other two. Counts are never summed.
 */
export default function StageSwitch() {
  const counts = useStageCounts();
  return (
    <nav className="stageswitch" aria-label="Tatlong magkakahiwalay na listahan">
      <ul>
        {SOURCE_STAGES.map((it) => {
          const c = counts[it.id];
          return (
            <li key={it.id}>
              <NavLink to={it.to} className={({ isActive }) => (isActive ? 'active' : undefined)} end>
                <span className="ss-name">{it.name}</span>
                <span className="ss-unit">
                  <strong className="num">{c.n != null ? count(c.n) : '…'}</strong> {it.unit}
                  {' · '}{it.id === 'dpwh' ? `${c.years ?? '…'} · ${it.sub}` : it.sub}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
      <p className="ss-note">Magkakaibang pinagmulan, yunit at taon. Hindi pinagsasama ang mga bilang o halaga.</p>
    </nav>
  );
}
