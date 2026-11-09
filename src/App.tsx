import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Footer, Masthead } from './components/Chrome';
import RouteBoundary from './components/RouteBoundary';
import ScrollToTop from './components/ScrollToTop';
import { configProblems } from './config';
import { usePortal } from './lib/portal-context';
import About from './pages/About';
import Home from './pages/Home';
import ParaSaBayan from './pages/ParaSaBayan';
import Project from './pages/Project';
import Enacted from './pages/Enacted';
import NotFound from './pages/NotFound';
import Overview from './pages/Overview';

const Contracts = lazy(() => import('./pages/Contracts'));
const MapPage = lazy(() => import('./pages/MapPage'));
const Contractors = lazy(() => import('./pages/Contractors'));

const Loading = () => <main className="page main"><div className="state" role="status"><span className="spinner" aria-hidden="true" /> Binubuksan…</div></main>;

export default function App() {
  const { config } = usePortal();
  const { pathname } = useLocation();
  const problems = import.meta.env.DEV ? configProblems(config) : [];
  return (
    <>
      <ScrollToTop />
      <Masthead />
      {problems.length > 0 && (
        <div className="page config-warning" role="alert">
          <strong>portal.config.ts needs attention</strong> (shown in development only):
          <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      <div id="main-content" tabIndex={-1}><RouteBoundary resetKey={pathname}><Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/para-sa-bayan" element={<ParaSaBayan />} />
        <Route path="/panukala-2027" element={<Home />} />
        {/* Offices and their districts are a section of the 2027 page; old links land there. */}
        <Route path="/districts" element={<Navigate to="/panukala-2027#offices" replace />} />
        <Route path="/mapa" element={<Suspense fallback={<Loading />}><MapPage /></Suspense>} />
        <Route path="/kontratista" element={<Suspense fallback={<Loading />}><Contractors /></Suspense>} />
        <Route path="/kontratista/:id" element={<Suspense fallback={<Loading />}><Contractors /></Suspense>} />
        <Route path="/gaa" element={<Enacted />} />
        <Route path="/contracts" element={<Suspense fallback={<Loading />}><Contracts /></Suspense>} />
        <Route path="/about" element={<About />} />
        <Route path="/projects/:dataset/:id" element={<Project />} />
        <Route path="*" element={<NotFound />} />
      </Routes></RouteBoundary></div>
      <Footer />
    </>
  );
}
