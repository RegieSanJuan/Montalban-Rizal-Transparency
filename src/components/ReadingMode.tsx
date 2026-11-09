import { NavLink } from 'react-router-dom';

/**
 * Two ways to read the same overview: the detailed figures (/) or the plain
 * guide (/para-sa-bayan). One click either way; the URL is the state.
 */
export default function ReadingMode() {
  return (
    <nav className="reading-mode" aria-label="Paraan ng pagbasa">
      <span className="reading-mode-label" id="reading-mode-label">Basahin:</span>
      <ul aria-labelledby="reading-mode-label">
        <li><NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>Detalyado</NavLink></li>
        <li><NavLink to="/para-sa-bayan" className={({ isActive }) => (isActive ? 'active' : undefined)}>Sa simpleng salita</NavLink></li>
      </ul>
    </nav>
  );
}
