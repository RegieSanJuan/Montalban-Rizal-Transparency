import { Link } from 'react-router-dom';
import { count, date } from '../lib/format';
import { coverage, STAGE_LABEL, STATUS_LABEL } from './data-shapes';
import DataStatus from './DataStatus';

/**
 * The five stages public money passes through, and which of them this portal
 * can see. The page's one deliberate visual statement: it keeps readers from
 * mistaking a proposal for spending.
 */
export default function CoveragePanel({ reviewCount }: { reviewCount: number }) {
  const c = coverage();
  const withData = c.stages.filter((s) => s.status !== 'unavailable').length;
  const complete = c.stages.filter((s) => s.status === 'available').length;
  const spendingMissing = c.stages.find((s) => s.key === 'spending')?.status !== 'available';
  return (
    <section className="section coverage" id="saklaw" aria-labelledby="coverage-h">
      <div className="coverage-head">
        <h2 id="coverage-h">Ano ang kayang ipakita <em>ng portal na ito</em></h2>
        <p>
          Dumadaan ang pondo sa limang yugto bago maging proyekto sa lupa. May datos ang portal na ito sa{' '}
          {withData === 0 ? 'wala pa sa mga ito' : `${withData} sa ${c.stages.length}`}
          {complete === withData ? '' : ', at hindi pa kumpleto ang mga iyon'}.
          {spendingMissing && ' Hindi rito makikita kung magkano talaga ang nagastos.'} Pinasimpleng bersyon ito ng{' '}
          <Link to="/para-sa-bayan#hakbang">pitong hakbang sa Para sa Bayan</Link>.
        </p>
      </div>

      <ol className="lifecycle">
        {c.stages.map((s, i) => (
          <li key={s.key} className={`stage stage-${s.status}`}>
            <span className="stage-step" aria-hidden="true">{i + 1}</span>
            <span className="stage-name">{STAGE_LABEL[s.key].name}</span>
            <span className="stage-doc">{STAGE_LABEL[s.key].short} · <span lang={/^(National|General)/.test(STAGE_LABEL[s.key].who) ? 'en' : undefined}>{STAGE_LABEL[s.key].who}</span></span>
            <span className={`stage-status s-${s.status}`}>
              <span className="stage-dot" aria-hidden="true" />
              {STATUS_LABEL[s.status]}
            </span>
            <span className="stage-note">{s.note}</span>
            {s.source && (
              <a className="stage-source" href={s.source} target="_blank" rel="noopener">
                Pinagmulan <span aria-hidden="true">↗</span>
              </a>
            )}
          </li>
        ))}
      </ol>

      <DataStatus compact />

      <div className="coverage-foot">
        {c.gaps.length > 0 && (
          <details className="gaps">
            <summary>
              <span className="gaps-title">Mga alam nating kulang</span>
              <span className="gaps-count">{count(c.gaps.length)} paksa · buksan para basahin</span>
            </summary>
            <ul>
              {c.gaps.map((g) => (
                <li key={g.label}>
                  <strong>{g.label}.</strong> {g.detail}
                  {g.url && <> <a href={g.url} target="_blank" rel="noopener">Tingnan <span aria-hidden="true">↗</span></a></>}
                </li>
              ))}
            </ul>
          </details>
        )}
        <ul className="coverage-facts">
          {reviewCount > 0 && (
            <li>
              <a href="#suriin">{count(reviewCount)} record na sinusuri pa ang lokasyon</a>: hiwalay na nakalista at hindi kasama sa mga kabuuan.
            </li>
          )}
          {c.aliases.length > 0 && <li>Mga pangalang hinanap: {c.aliases.join(', ')}.</li>}
          <li>
            Hindi ito ang budget ng pamahalaang bayan (LGU). <Link to="/about">Paano binuo ang listahan</Link>
          </li>
          {c.checkedAt && <li>Huling sinuri ang saklaw: {date(c.checkedAt)}.</li>}
          <li>
            I-download ang datos: <a href="/data/budget-coverage-audit.json" download>audit ng saklaw (JSON)</a> ·{' '}
            <a href="/data/dpwh-contracts.json" download>snapshot ng mga record ng DPWH (JSON)</a>
          </li>
        </ul>
      </div>
    </section>
  );
}
