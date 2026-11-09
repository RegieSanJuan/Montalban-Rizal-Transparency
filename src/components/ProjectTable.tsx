import { Link } from 'react-router-dom';
import type { DatasetKey } from '../config';
import { PANUKALA_RETURN_KEY } from '../lib/display';
import { php, phpDelta } from '../lib/format';
import type { ScopedProject } from '../lib/scope';
import { ReasonTags, StatusChip } from './Bits';
import { shortOffice } from './data-shapes';
import { LocationChip } from './ReviewPanel';

/** Remember the opened row, so "back" can return to it (see Home). */
function remember(key: string) {
  try { sessionStorage.setItem(PANUKALA_RETURN_KEY, key); } catch { /* storage blocked: back still keeps the filters */ }
}

/** One row per project; on narrow screens each row becomes a labelled card. */
export default function ProjectTable({ rows, programName }: { rows: ScopedProject[]; programName: (k: DatasetKey) => string }) {
  if (!rows.length) return null;
  return (
    <div className="table" role="table" aria-label="Mga proyekto">
      <div className="tr th" role="row">
        <span role="columnheader">Proyekto</span>
        <span role="columnheader">Paghahambing</span>
        <span role="columnheader" className="r">NEP</span>
        <span role="columnheader" className="r">House bill</span>
        <span role="columnheader" className="r">Pagbabago</span>
      </div>
      {rows.map((p) => (
        <div className="tr" role="row" key={p.key} data-key={p.key}>
          <span role="cell" className="td-project">
            <Link to={`/projects/${p.dataset}/${encodeURIComponent(p.id)}`} className="project-title" lang="en" onClick={() => remember(p.key)}>{p.title}</Link>
            <span className="project-meta">
              <span className="meta-program">{programName(p.dataset)}</span>
              {p.office && <span>{shortOffice(p.office)}</span>}
              {p.region && <span>{p.region}</span>}
              <ReasonTags reasons={p.reasons} />
              <LocationChip row={p} />
            </span>
          </span>
          <span role="cell" className="td-status"><StatusChip group={p.bridge_group} label={p.status_label} held={p.held} /></span>
          <span role="cell" className="r num" data-label="NEP">{php(p.nep_php)}</span>
          <span role="cell" className="r num strong" data-label="House bill">{php(p.house_php)}</span>
          <span role="cell" className={`r num delta ${(p.delta_php ?? 0) > 0 ? 'up' : (p.delta_php ?? 0) < 0 ? 'down' : ''}`} data-label="Pagbabago">
            {phpDelta(p.delta_php)}
          </span>
        </div>
      ))}
    </div>
  );
}
