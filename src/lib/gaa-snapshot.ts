import type { PortalConfig } from '../config';
import type { GaaResult } from './gaa';
export function gaaSnapshotKey(base:string, config:PortalConfig):string {
  return JSON.stringify([base.replace(/\/+$/,''),config.scope.places??[],config.scope.discoveryQueries??[],config.scope.locationPolicy,config.scope.exclude??[]]);
}
/** Only use a complete, matching source snapshot; generic forks and stale configs use live queries. */
export function readGaaSnapshot(value:unknown, expectedKey:string):GaaResult|null {
  if(!value||typeof value!=='object')return null;
  const x=value as {schemaVersion?:unknown;key?:unknown;checkedAt?:unknown;result?:Partial<GaaResult>};
  const r=x.result;
  if(x.schemaVersion!==1||x.key!==expectedKey||typeof x.checkedAt!=='string'||!Number.isFinite(Date.parse(x.checkedAt))||!r)return null;
  if(!Array.isArray(r.rows)||!Array.isArray(r.reviewRows)||!Array.isArray(r.rejectedRows)||!Array.isArray(r.queries)||!Array.isArray(r.departments)||!Array.isArray(r.excluded)||typeof r.searched!=='number')return null;
  if(r.queries.some(q=>!q || q.truncated || !Number.isInteger(q.fetched) || q.fetched!==q.matched))return null;
  const rows=[...r.rows,...r.reviewRows,...r.rejectedRows.map(x=>x?.row),...r.excluded.flatMap(x=>x?.row?[x.row]:[])];
  if(rows.some(row=>!row || typeof row.key!=='string' || typeof row.name!=='string' || typeof row.fam_key!=='string' || !Array.isArray(row.reasons) || !row.years || Object.values(row.years).some(y=>!y || typeof y.amount!=='number' || !Number.isFinite(y.amount) || !Number.isInteger(y.count))))return null;
  return {...r,checkedAt:x.checkedAt} as GaaResult;
}
