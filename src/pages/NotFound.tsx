import { Link, useLocation } from 'react-router-dom';
import { shortNameOf } from '../config';
import { usePortal } from '../lib/portal-context';
import { useTitle } from '../lib/use-title';

/** Unknown address: say so plainly, show the address, offer the real destinations. */
export default function NotFound() {
  const { config } = usePortal();
  const { pathname } = useLocation();
  useTitle(`Hindi nahanap ang pahina · ${shortNameOf(config)}`);
  return (
    <main className="page main notfound">
      <h1>Walang pahina sa address na ito</h1>
      <p className="lede">
        Hindi nahanap ang <code translate="no">{pathname}</code>. Maaaring mali ang pagkaka-type ng link, o inilipat na ang
        pahina. Narito ang mga pangunahing bahagi ng portal:
      </p>
      <ul className="notfound-links">
        <li><Link to="/para-sa-bayan">Para sa Bayan: ang pondo, sa simpleng salita</Link></li>
        <li><Link to="/">Buod ng budget, detalyado</Link></li>
        <li><Link to="/contracts">Mga project record ng DPWH</Link></li>
        <li><Link to="/gaa">Naisabatas na budget, 2020–2026</Link></li>
        <li><Link to="/panukala-2027">Panukala para sa 2027</Link></li>
        <li><Link to="/mapa">Mapa ng mga proyekto ng DPWH</Link></li>
        <li><Link to="/kontratista">Mga kontratista</Link></li>
        <li><Link to="/about">Saan galing ang mga numero</Link></li>
      </ul>
    </main>
  );
}
