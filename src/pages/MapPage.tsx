/**
 * /mapa — DPWH project records for Montalban that carry source coordinates.
 * Points are the DPWH record's own latitude/longitude; nothing is geocoded or
 * guessed. Records without coordinates are listed, not placed. The list is the
 * accessible alternative to the map and works when map tiles fail to load.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { shortNameOf } from '../config';
import { PageHead } from '../components/Chrome';
import { Money } from '../components/Bits';
import { CONTRACT_LOCATION_LABEL, contractPeso } from '../components/data-shapes';
import { useDirectory } from '../components/useDirectory';
import { dpwhStatusGloss, MONEY_STAGE, splitTitle } from '../lib/display';
import { count } from '../lib/format';
import type { ContractRecord } from '../lib/contracts';
import type { ProjectDirectory } from '../lib/project-directory';
import { usePortal } from '../lib/portal-context';
import { useTitle } from '../lib/use-title';

type Group = 'done' | 'ongoing' | 'pending' | 'stopped' | 'other';
const GROUPS: Record<Group, { label: string; color: string }> = {
  done: { label: 'Natapos ayon sa DPWH', color: '#4cc28a' },
  ongoing: { label: 'Ipinapatupad', color: '#6f9bff' },
  pending: { label: 'Procurement o hindi pa nasisimulan', color: '#f2cf8a' },
  stopped: { label: 'Itinigil', color: '#ff7a6a' },
  other: { label: 'Iba pa', color: '#8ea1cb' },
};
function groupOf(status: string): Group {
  if (/complet/i.test(status)) return 'done';
  if (/on-?going/i.test(status)) return 'ongoing';
  if (/procure|not yet|pending/i.test(status)) return 'pending';
  if (/terminat|suspend|cancel/i.test(status)) return 'stopped';
  return 'other';
}

const PAGE = 20;
const recordHref = (r: ContractRecord) => `/contracts?q=${encodeURIComponent(r.id)}&open=${encodeURIComponent(r.id)}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export default function MapPage() {
  const { config } = usePortal();
  useTitle(`Mapa ng mga proyekto · ${shortNameOf(config)}`);
  const dir = useDirectory();
  return (
    <main className="page main">
      <PageHead title="Mapa ng mga proyekto ng DPWH sa Montalban">
        <p>
          Bawat punto ay ang lokasyong nakatala sa mismong record ng DPWH. Hindi ito nasuri sa lugar, at maaaring ito ay
          isang punto lang ng mas mahabang proyekto. Ang mga record na walang lokasyon ay nakalista sa ibaba, hindi
          hinulaan ang puwesto.
        </p>
      </PageHead>
      {dir.status === 'loading' ? (
        <div className="state" role="status"><span className="spinner" aria-hidden="true" /> Kinukuha ang mga record ng DPWH… Maaaring tumagal nang ilang segundo.</div>
      ) : dir.status === 'error' ? (
        <div className="state state-error" role="alert">
          <p className="state-title">Hindi makuha ang mga record ng DPWH.</p>
          <p className="state-detail"><span lang="en">{dir.error.message}</span></p>
          <button type="button" className="button" onClick={dir.retry}>Subukang kunin muli</button>
        </div>
      ) : (
        <MapView dir={dir.value} />
      )}
    </main>
  );
}

function MapView({ dir }: { dir: ProjectDirectory }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const group = (params.get('status') ?? '') as Group | '';
  const year = params.get('year') ?? '';
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const match = (r: ContractRecord) => {
    if (group && groupOf(r.status) !== group) return false;
    if (year && r.year !== year) return false;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = `${r.title} ${r.id} ${r.contractor ?? ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  };
  const mapped = useMemo(() => dir.mapRecords.filter(match), [dir, q, group, year]); // eslint-disable-line react-hooks/exhaustive-deps
  const unmapped = useMemo(() => dir.unmappedRecords.filter(match), [dir, q, group, year]); // eslint-disable-line react-hooks/exhaustive-deps
  const years = useMemo(() => [...new Set(dir.records.map((r) => r.year))].sort().reverse(), [dir]);
  const counts = useMemo(() => {
    const m = new Map<Group, number>();
    for (const r of dir.mapRecords) m.set(groupOf(r.status), (m.get(groupOf(r.status)) ?? 0) + 1);
    return m;
  }, [dir]);

  // ---- Leaflet map ----
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.CircleMarker>());
  const [tilesFailed, setTilesFailed] = useState(false);
  /** The list button that opened the current popup; focus goes back to it on Escape or ×. */
  const returnTo = useRef<HTMLButtonElement | null>(null);
  // The list shows PAGE rows at a time; a new filter starts again from the first page.
  const filterKey = `${q}|${group}|${year}`;
  const [paged, setPaged] = useState({ key: filterKey, shown: PAGE });
  const shown = paged.key === filterKey ? paged.shown : PAGE;
  const showMore = (n: number) => setPaged({ key: filterKey, shown: n });

  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const map = L.map(el.current, { zoomAnimation: !reduced, fadeAnimation: !reduced, markerZoomAnimation: !reduced, scrollWheelZoom: false });
    let errors = 0;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).on('tileerror', () => { errors += 1; if (errors >= 4) setTilesFailed(true); }).addTo(map);
    layer.current = L.layerGroup().addTo(map);
    map.setView([14.74, 121.17], 12);
    mapRef.current = map;
    // Internal links inside popups use the router, not a full reload.
    const back = () => {
      const btn = returnTo.current;
      returnTo.current = null;
      if (btn?.isConnected) btn.focus();
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const a = target.closest('a[data-to]');
      if (a) { e.preventDefault(); navigate(a.getAttribute('data-to')!); return; }
      // The popup's × pressed from the keyboard (detail 0): return to the list.
      if (target.closest('.leaflet-popup-close-button') && e.detail === 0) setTimeout(back, 0);
    };
    // Escape inside a popup closes it and returns focus to the list row that opened it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !(e.target as HTMLElement).closest('.leaflet-popup')) return;
      e.preventDefault();
      e.stopPropagation();
      map.closePopup();
      back();
    };
    el.current.addEventListener('click', onClick);
    el.current.addEventListener('keydown', onKey, true);
    const node = el.current;
    return () => { node.removeEventListener('click', onClick); node.removeEventListener('keydown', onKey, true); map.remove(); mapRef.current = null; };
  }, [navigate]);

  useEffect(() => {
    const map = mapRef.current;
    const lg = layer.current;
    if (!map || !lg) return;
    lg.clearLayers();
    markers.current.clear();
    for (const r of mapped) {
      const g = groupOf(r.status);
      const m = L.circleMarker([r.latitude, r.longitude], { radius: 7, color: '#050d22', weight: 1.5, fillColor: GROUPS[g].color, fillOpacity: 0.95 })
        .bindPopup(
          `<div class="pop"><p class="pop-meta">${esc(r.year)} · ID ${esc(r.id)}</p>` +
          `<p class="pop-title" lang="en">${esc(lead(r.title))}</p>` +
          `<p class="pop-meta"><span lang="en">${esc(r.status)}</span>${dpwhStatusGloss(r.status) ? ` (${esc(dpwhStatusGloss(r.status)!)})` : ''}${r.progress != null ? ` · ${r.progress}%` : ''}</p>` +
          `<p class="pop-meta">${esc(MONEY_STAGE.record)}: <span class="num">${esc(r.amountPhp != null ? contractPeso(r.amountPhp) : 'hindi ibinigay')}</span></p>` +
          `<p class="pop-meta">${esc(CONTRACT_LOCATION_LABEL[r.location.confidence] ?? '')}</p>` +
          `<a href="${recordHref(r)}" data-to="${recordHref(r)}">Buksan ang record</a></div>`,
        )
        .addTo(lg);
      markers.current.set(r.id, m);
    }
    if (mapped.length) map.fitBounds(L.latLngBounds(mapped.map((r) => [r.latitude, r.longitude] as [number, number])), { padding: [24, 24], maxZoom: 15 });
  }, [mapped]);

  const showOnMap = (r: ContractRecord, button: HTMLButtonElement) => {
    const m = markers.current.get(r.id);
    if (!m || !mapRef.current) return;
    el.current?.scrollIntoView({ block: 'center' });
    mapRef.current.setView(m.getLatLng(), Math.max(mapRef.current.getZoom(), 15), { animate: false });
    m.openPopup();
    returnTo.current = button;
    // Keyboard and screen-reader users land on the popup's link, not on the list below.
    m.getPopup()?.getElement()?.querySelector<HTMLElement>('a[data-to]')?.focus({ preventScroll: true });
  };

  const narrowed = Boolean(q || group || year);
  return (
    <>
      <dl className="figures figures-3">
        <div className="figure figure-lead"><dt>May lokasyon sa record</dt><dd className="figure-n num">{count(dir.coverage.mapped)}</dd><dd className="figure-sub">sa {count(dir.coverage.included)} record ng DPWH</dd></div>
        <div className="figure"><dt>Walang lokasyon</dt><dd className="figure-n num">{count(dir.coverage.unmapped)}</dd><dd className="figure-sub">nakalista sa ibaba, hindi hinulaan</dd></div>
        <div className="figure"><dt>Sinusuri pa ang lokasyon</dt><dd className="figure-n num">{count(dir.coverage.reviewExcluded)}</dd><dd className="figure-sub">hindi ipinapakita sa mapa</dd></div>
      </dl>

      <div className="toolbar map-toolbar">
        <label className="field field-grow">
          <span className="label">Hanapin</span>
          <input type="search" name="q" autoComplete="off" value={q} placeholder="Barangay, kalsada, contract ID, kontratista…" onChange={(e) => set('q', e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Status ayon sa DPWH</span>
          <select value={group} onChange={(e) => set('status', e.target.value)}>
            <option value="">Lahat</option>
            {(Object.keys(GROUPS) as Group[]).filter((g) => counts.get(g)).map((g) => <option key={g} value={g}>{GROUPS[g].label} ({count(counts.get(g) ?? 0)} may lokasyon)</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Taon</span>
          <select value={year} onChange={(e) => set('year', e.target.value)}>
            <option value="">Lahat ng taon</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>
      <p className="list-count" aria-live="polite">
        {narrowed ? `${count(mapped.length)} sa mapa at ${count(unmapped.length)} walang lokasyon ang tugma` : `${count(mapped.length)} punto sa mapa`}
        {narrowed && <> · <button type="button" className="link-button" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Alisin ang mga filter</button></>}
      </p>

      <div className="map-wrap">
        <div ref={el} className="map" role="region" aria-label="Mapa ng mga record ng DPWH na may lokasyon. Ang listahan sa ibaba ay may parehong impormasyon." />
        {tilesFailed && (
          <p className="map-notice" role="status">
            Hindi ma-load ang background ng mapa. Nakikita pa rin ang mga punto, at nasa listahan sa ibaba ang lahat ng record.
          </p>
        )}
        {mapped.length === 0 && <p className="map-notice">Walang record na may lokasyon ang tumugma sa filter.</p>}
      </div>
      <ul className="map-legend" aria-label="Kahulugan ng kulay">
        {(Object.keys(GROUPS) as Group[]).filter((g) => counts.get(g)).map((g) => (
          <li key={g}><span className="lg-dot" style={{ background: GROUPS[g].color }} aria-hidden="true" />{GROUPS[g].label}</li>
        ))}
      </ul>
      <p className="fine">
        Mapa: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>. Ang
        status at lokasyon ay iniulat ng DPWH at hindi nasuri sa lugar. Ang “halaga sa record” ay budget field ng DPWH record,
        hindi presyo ng kontrata o gastos. Ang bilang sa filter ng status ay para lang sa mga record na may lokasyon.
      </p>

      <section className="section" aria-labelledby="maplist-h">
        <h2 id="maplist-h" className="section-h section-h-sm">Listahan ng mga punto sa mapa ({count(mapped.length)})</h2>
        <ul className="maplist">
          {mapped.slice(0, shown).map((r) => (
            <li key={r.id}>
              <span className="lg-dot" style={{ background: GROUPS[groupOf(r.status)].color }} aria-hidden="true" />
              <span className="ml-main">
                <Link to={recordHref(r)} lang="en">{lead(r.title)}</Link>
                <span className="ml-meta">{r.year} · <span lang="en">{r.status}</span>{dpwhStatusGloss(r.status) && ` (${dpwhStatusGloss(r.status)})`} · {r.amountPhp != null ? <Money stage="record">{contractPeso(r.amountPhp)}</Money> : <Money stage="record" missing>hindi ibinigay</Money>}</span>
              </span>
              <button type="button" className="link-button ml-show" onClick={(e) => showOnMap(r, e.currentTarget)} aria-label={`Ipakita sa mapa: ${lead(r.title)}`}>Ipakita sa mapa</button>
            </li>
          ))}
        </ul>
        {mapped.length > shown && (
          <div className="more">
            <span className="muted">Ipinapakita ang {count(shown)} sa {count(mapped.length)} sa listahan; nasa mapa ang lahat ng {count(mapped.length)}</span>
            <button type="button" className="button" onClick={() => showMore(shown + PAGE)}>Ipakita ang {count(Math.min(PAGE, mapped.length - shown))} pa</button>
            <button type="button" className="button button-quiet" onClick={() => showMore(mapped.length)}>Ipakita lahat</button>
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="nocoord-h">
        <details className="gaps nocoord">
          <summary>
            <span className="gaps-title" id="nocoord-h">Walang lokasyon sa record ({count(unmapped.length)})</span>
            <span className="gaps-count">wala sa mapa · buksan para makita</span>
          </summary>
          <ul className="maplist">
            {unmapped.map((r) => (
              <li key={r.id}>
                <span className="ml-main">
                  <Link to={recordHref(r)} lang="en">{lead(r.title)}</Link>
                  <span className="ml-meta">{r.year} · <span lang="en">{r.status}</span>{dpwhStatusGloss(r.status) && ` (${dpwhStatusGloss(r.status)})`} · {r.amountPhp != null ? <Money stage="record">{contractPeso(r.amountPhp)}</Money> : <Money stage="record" missing>hindi ibinigay</Money>}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </>
  );
}

/** Same rule as the records list: lead with the part that tells records apart. */
const lead = (title: string) => splitTitle(title).lead;
