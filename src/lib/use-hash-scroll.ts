import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Client-side routes do not get the browser's own jump to "#id". Bring the
 * target into view once it exists; `ready` lets a page wait for its data.
 */
export function useHashScroll(ready: unknown = true): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash || !ready) return;
    const id = decodeURIComponent(hash.slice(1));
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [hash, ready]);
}
