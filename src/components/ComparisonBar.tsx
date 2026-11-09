import type { BridgeGroup, GroupInfo } from '../api/types';
import { BRIDGE_GROUPS } from '../api/types';
import { count, php, phpDelta } from '../lib/format';
import type { Summary } from '../lib/scope';
import { GROUP_FIL as GLOSS } from '../lib/display';

type GroupWords = Pick<GroupInfo, 'label' | 'sub' | 'help'>;

/** Lowercase only the first letter, so proper nouns such as “Kamara” keep their capital. */
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

function groupAmount(g: BridgeGroup, c: { nep_php: number; house_php: number; rows: number }): string {
  if (!c.rows) return '—';
  switch (g) {
    case 'nep_only': return php(c.nep_php);
    case 'increased':
    case 'decreased':
    case 'scope_review': return phpDelta(c.house_php - c.nep_php);
    default: return php(c.house_php);
  }
}

/**
 * How the House bill compares with the NEP, record by record: one bar by
 * count, a legend that filters, and the empty groups named in one line.
 */
export default function ComparisonBar({ summary, groups, active, onPick }: {
  summary: Summary;
  groups: Record<BridgeGroup, GroupWords>;
  active: BridgeGroup | '';
  onPick: (g: BridgeGroup | '') => void;
}) {
  const present = BRIDGE_GROUPS.filter((g) => summary.groups[g].rows > 0);
  const empty = BRIDGE_GROUPS.filter((g) => summary.groups[g].rows === 0);
  const total = present.reduce((n, g) => n + summary.groups[g].rows, 0);
  return (
    <section className="section" aria-labelledby="compare-h">
      <h2 id="compare-h" className="section-h">Ano ang ginawa ng Kamara sa panukala</h2>
      <p className="section-intro">
        Paghahambing ito ng dalawang bersyon ng budget, hindi status ng konstruksiyon. Ang “nasa House bill lang” at “nasa NEP
        lang” ay mga dapat suriin sa orihinal na dokumento, hindi patunay ng iregularidad.
      </p>
      {total > 0 && (
        <div className="cbar" aria-hidden="true">
          {present.map((g) => (
            <span key={g} className={`cbar-seg g-${g}${active && active !== g ? ' dim' : ''}`} style={{ flexGrow: summary.groups[g].rows }} />
          ))}
        </div>
      )}
      <div className="clegend" role="group" aria-label="Salain ayon sa paghahambing">
        {present.map((g) => {
          const on = active === g;
          return (
            <button key={g} type="button" className={`clegend-item${on ? ' active' : ''}`} aria-pressed={on} title={groups[g].help || undefined} onClick={() => onPick(on ? '' : g)}>
              <span className={`status-dot g-${g}`} aria-hidden="true" />
              <span className="clegend-text">
                <span className="clegend-label">{GLOSS[g]}</span>
                <span className="clegend-api" lang="en">{groups[g].label}</span>
              </span>
              <span className="clegend-n num">{count(summary.groups[g].rows)}</span>
              <span className="clegend-php num">{groupAmount(g, summary.groups[g])}</span>
            </button>
          );
        })}
      </div>
      {total > 0 && (
        <p className="takeaway">
          <strong>Sa madaling salita:</strong> sa {count(total)} record,{' '}
          {present.map((g, i) => (
            <span key={g}>{i > 0 && (i === present.length - 1 ? ' at ' : ', ')}{count(summary.groups[g].rows)} ang {lowerFirst(GLOSS[g])}</span>
          ))}
          .{(summary.groups.house_only.rows > 0 || summary.groups.nep_only.rows > 0) && ' Ang “nasa House bill lang” at “nasa NEP lang” ay mga dapat suriin sa dokumento, hindi patunay ng mali.'}
        </p>
      )}
      {empty.length > 0 && present.length > 0 && (
        <p className="fine">Walang record sa: {empty.map((g) => lowerFirst(GLOSS[g])).join(', ')}.</p>
      )}
    </section>
  );
}
