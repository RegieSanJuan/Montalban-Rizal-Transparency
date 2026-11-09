import { useEffect, useState } from 'react';
import { buildProjectDirectory, type ProjectDirectory } from '../lib/project-directory';
import type { Async } from '../lib/portal-context';
import { contractsLoader } from './data-shapes';
import type { ContractSnapshot } from '../lib/contracts';

/**
 * The DPWH project directory (map records, contractor profiles, coverage),
 * built once from the same cached contracts snapshot the records page uses.
 */
export function useDirectory(): Async<ProjectDirectory> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ attempt: number; value: Async<ProjectDirectory> } | null>(null);
  useEffect(() => {
    const load = contractsLoader();
    if (!load) return;
    let live = true;
    load().then(
      (snap) => live && setState({ attempt, value: { status: 'ready', value: buildProjectDirectory(snap as unknown as ContractSnapshot) } }),
      (e) => live && setState({ attempt, value: { status: 'error', error: e instanceof Error ? e : new Error(String(e)) } }),
    );
    return () => { live = false; };
  }, [attempt]);
  const current: Async<ProjectDirectory> = state?.attempt === attempt ? state.value : { status: 'loading' };
  return Object.assign(current, { retry: () => setAttempt((n) => n + 1) });
}
