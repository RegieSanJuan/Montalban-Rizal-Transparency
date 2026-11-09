import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { count } from '../lib/format';
import { LOCATION_LABEL, locationOf, type LocationInfo } from './data-shapes';

export interface ReviewItem {
  key: string;
  title: string;
  /** Internal link (project page) or external source. */
  to?: string;
  href?: string;
  meta?: ReactNode;
  amount?: ReactNode;
  location?: LocationInfo;
}

/** Location chip: the data layer's confidence label plus its note. */
export function LocationChip({ row }: { row: Parameters<typeof locationOf>[0] }) {
  const loc = locationOf(row);
  if (!loc) return null;
  return (
    <span className={`loc loc-${loc.confidence}`} title={loc.note || undefined}>
      {LOCATION_LABEL[loc.confidence] ?? loc.confidence}
    </span>
  );
}

/**
 * Records whose location is shared or uncertain. Shown apart from the main
 * list, left out of every total on the page, and collapsed by default: the
 * summary carries the count and the reason once. A row repeats a location
 * note only when its note differs from the most common one.
 */
export default function ReviewPanel({ id, title, intro, items }: { id: string; title: string; intro: ReactNode; items: ReviewItem[] }) {
  if (!items.length) return null;
  const notes = new Map<string, number>();
  for (const it of items) if (it.location?.note) notes.set(it.location.note, (notes.get(it.location.note) ?? 0) + 1);
  const common = [...notes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return (
    <section className="section review" id={id} aria-labelledby={`${id}-h`}>
      <details className="review-box">
        <summary>
          <span className="review-sum-title" id={`${id}-h`}>{title} <span className="count-badge">{count(items.length)}</span></span>
          <span className="review-sum-why">{intro}</span>
        </summary>
        {common && <p className="review-common">Tala sa lokasyon ng karamihan: {common}</p>}
        <ul className="review-list">
          {items.map((it) => (
            <li key={it.key}>
              <div className="review-main">
                {it.to ? <Link to={it.to} className="project-title" lang="en">{it.title}</Link>
                  : it.href ? <a href={it.href} target="_blank" rel="noopener" className="project-title" lang="en">{it.title} <span aria-hidden="true">↗</span></a>
                  : <span className="project-title" lang="en">{it.title}</span>}
                {it.meta && <span className="project-meta">{it.meta}</span>}
                {it.location?.note && it.location.note !== common && <span className="review-note">{it.location.note}</span>}
              </div>
              {it.amount && <div className="review-amount num">{it.amount}</div>}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
