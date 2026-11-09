export interface RefreshStatus {
  schemaVersion: 1;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  state: 'idle' | 'running' | 'succeeded' | 'failed';
  serving: 'last-known-good' | 'fresh';
  message: string;
  sources: { budget: { checkedAt: string | null }; dpwh: { checkedAt: string | null } };
  retry?: { attempt: number; maxAttempts: 3 };
}
const iso = (x: unknown): x is string | null => x === null || (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(x) && Number.isFinite(Date.parse(x)));
export function readRefreshStatus(value: unknown): RefreshStatus | null {
  if(!value || typeof value!=='object') return null;
  const x=value as RefreshStatus;
  if(x.schemaVersion!==1||!iso(x.lastAttemptAt)||!iso(x.lastSuccessAt)||!['idle','running','succeeded','failed'].includes(x.state)||!['last-known-good','fresh'].includes(x.serving)||typeof x.message!=='string'||x.message.length>500||!x.sources?.budget||!x.sources.dpwh||!iso(x.sources.budget.checkedAt)||!iso(x.sources.dpwh.checkedAt))return null;
  if(x.state==='succeeded' && (!x.lastSuccessAt||!x.lastAttemptAt||x.serving!=='fresh'))return null;
  if(x.state!=='succeeded'&&x.serving!=='last-known-good')return null;
  if(x.state!=='idle'&&!x.lastAttemptAt)return null;
  if(x.retry&&(!Number.isInteger(x.retry.attempt)||x.retry.attempt<1||x.retry.attempt>3||x.retry.maxAttempts!==3))return null;
  return x;
}
/** Null means use published source retrieval dates; never claim a current refresh. */
export async function loadRefreshStatus(): Promise<RefreshStatus | null> {
  try {
    const response=await fetch('/data/refresh-status.json',{cache:'no-store',signal:AbortSignal.timeout(15000)});
    return response.ok ? readRefreshStatus(await response.json()) : null;
  } catch {return null;}
}
export function nextRefreshStatus(previous:RefreshStatus|null,sources:RefreshStatus['sources'],state:RefreshStatus['state'],now:string):RefreshStatus {
  return {schemaVersion:1,lastAttemptAt:state==='running'?now:previous?.lastAttemptAt??null,lastSuccessAt:state==='succeeded'?now:previous?.lastSuccessAt??null,state,serving:state==='succeeded'?'fresh':'last-known-good',message:state==='succeeded'?'Complete refresh published successfully.':state==='running'?'Refresh in progress. Published data remains available.':state==='failed'?'Refresh could not be completed. Showing the last validated data.':'No complete refresh result is recorded. Source dates are retrieval times.',sources};
}
