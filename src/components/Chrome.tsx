import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { shortNameOf } from '../config';
import { usePortal } from '../lib/portal-context';
import { date } from '../lib/format';
import { knownTextFil } from '../lib/display';
import { NATIONAL_URL, SOURCE_CODE_URL } from '../lib/links';
import BrandMark from './BrandMark';
import { OriginalEnglish } from './Bits';

const BETTERGOV_LOGO = '/brand/bettergov-horizontal-primary.png';

/** Four primary destinations; history and data notes live in the footer and in context. */
const NAV: { to: string; label: string; match: (p: string) => boolean }[] = [
  { to: '/para-sa-bayan', label: 'Para sa Bayan', match: (p) => p === '/para-sa-bayan' },
  // The detailed overview ("/") is where the three project lists start.
  { to: '/', label: 'Mga proyekto', match: (p) => p === '/' || p === '/contracts' || p === '/gaa' || p === '/panukala-2027' || p.startsWith('/projects/') },
  { to: '/mapa', label: 'Mapa', match: (p) => p === '/mapa' },
  { to: '/kontratista', label: 'Kontratista', match: (p) => p.startsWith('/kontratista') },
];

export function Masthead() {
  const { config } = usePortal();
  const { pathname } = useLocation();
  return (
    <>
    <a className="skip-link" href="#main-content">Lumaktaw sa nilalaman</a>
    <header className="masthead">
      <div className="page masthead-inner">
        <Link to="/" className="masthead-title" onClick={() => pathname === '/' && window.scrollTo(0, 0)}>
          <BrandMark className="brand-mark" />
          <span className="masthead-text">
            <span className="masthead-name">{shortNameOf(config)} <em>Transparency</em></span>
            <span className="masthead-kicker">Malayang portal ng mamamayan · Rizal</span>
          </span>
        </Link>
        <nav className="subnav" aria-label="Mga bahagi ng portal">
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <Link
                key={n.label}
                to={n.to}
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
                onClick={() => pathname === n.to && window.scrollTo(0, 0)}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <a className="masthead-with" href="https://bettergov.ph" target="_blank" rel="noopener">
          <span>Datos mula sa</span>
          <img src={BETTERGOV_LOGO} alt="BetterGov.ph" width="128" height="28" />
        </a>
      </div>
    </header>
    </>
  );
}

export function Footer() {
  const { scope, client } = usePortal();
  const meta = scope.status === 'ready' ? scope.value.meta : null;
  return (
    <footer className="footer">
      <div className="page footer-inner">
        <p className="footer-statement">Pondo ng bayan.<br /><em>Karapatan mong malaman.</em></p>
        <p className="footer-independent">
          Malayang inisyatiba ng mamamayan. Hindi ito opisyal na website ng Pamahalaang Bayan ng Rodriguez o ng anumang ahensya.
        </p>
        <p className="footer-source">
          Pinagmulan: GAA 2020–2026, NEP FY 2027 at House Bill 10858, sa pamamagitan ng BetterGov.ph Budget API
          {meta && <>. Datos noong {date(meta.built_at)}.</>}
        </p>
        {meta && (knownTextFil(meta.notice)
          ? (
            <div className="footer-notice">
              <p>{knownTextFil(meta.notice)}</p>
              <OriginalEnglish label="Buong paalala ng pinagmulan (Ingles)"><p>{meta.notice}</p></OriginalEnglish>
            </div>
          )
          : <p className="footer-notice" lang="en">{meta.notice}</p>)}
        <p className="fine">
          Larawan sa itaas: <a href="https://commons.wikimedia.org/wiki/File:Wawa_Dam.jpg">Wawa Dam, FroyR</a>,{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>; binago ang laki.
        </p>
        <nav className="footer-nav" aria-label="Iba pang bahagi ng portal">
          <Link to="/">Buod ng budget (detalyado)</Link>
          <Link to="/para-sa-bayan">Para sa Bayan (sa simpleng salita)</Link>
          <Link to="/contracts">Mga project record ng DPWH</Link>
          <Link to="/gaa">Naisabatas na budget, 2020–2026</Link>
          <Link to="/panukala-2027">Panukala para sa 2027</Link>
          <Link to="/mapa">Mapa</Link>
          <Link to="/kontratista">Mga kontratista</Link>
          <Link to="/#mga-opisyal">Mga opisyal at DPWH office</Link>
          <Link to="/about">Tungkol sa datos</Link>
        </nav>
        <ul className="footer-links">
          <li lang="en">
            <span className="label">This portal</span>
            <span>Run by Montalban citizens, on BetterGov.ph data</span>
          </li>
          <li>
            <span className="label">Lahat ng proyekto sa bansa</span>
            <a href={NATIONAL_URL} target="_blank" rel="noopener">budget.bettergov.ph ↗</a>
          </li>
          <li>
            <span className="label">Datos</span>
            <a href={`${client.base}/docs`} target="_blank" rel="noopener">Budget API at MCP ↗</a>
          </li>
          <li>
            <span className="label">Bukas na source code</span>
            <a href={SOURCE_CODE_URL} target="_blank" rel="noopener">Gumawa ng portal para sa inyong LGU ↗</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

export function PageHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children && <div className="lede">{children}</div>}
    </div>
  );
}
