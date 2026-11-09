import { ApiError, type Client } from '../api/client';
import { GAA_YEARS, type GaaEnvelope } from '../api/types';
import type { GaaResult } from './gaa';
export interface GaaReconciliation {
  query: string; place: string; departmentId: string; year: number;
  loadedAmount: number; sourceAmount: number; matches: boolean; sourceUrl: string;
  method: 'source-year-total' | 'empty-all-years-query';
}
/** Reconcile the fetched universe, including records correctly excluded from local totals. */
export async function reconcileGaa(client: Client, result: GaaResult): Promise<GaaReconciliation[]> {
  const universe=[...result.rows,...result.reviewRows,...result.rejectedRows.map(x=>x.row),...result.excluded.flatMap(x=>x.row?[x.row]:[])];
  const checks:GaaReconciliation[]=[];
  const jobs=result.queries.flatMap(query=>GAA_YEARS.map(year=>({query,year})));
  for(let i=0;i<jobs.length;i+=2){
    const batch=await Promise.all(jobs.slice(i,i+2).map(async({query,year}):Promise<GaaReconciliation>=>{
      if(query.truncated || query.fetched!==query.matched) throw new Error(`Incomplete query ${query.q} / ${query.department_id}`);
      const rows=universe.filter(r=>r.department_id===query.department_id && r.reasons.includes(query.place));
      const loadedAmount=rows.reduce((sum,row)=>sum+(row.years[String(year)]?.amount??0),0);
      // matched counts families across ALL years: a zero-family response proves no
      // amount for these same query terms in any year, without seven redundant GETs.
      if(query.matched===0) return {query:query.q,place:query.place,departmentId:query.department_id,year,loadedAmount,sourceAmount:0,matches:loadedAmount===0,sourceUrl:query.api,method:'empty-all-years-query'};
      const path=`/api/v1/gaa/departments/${query.department_id}/programs`;
      const params={q:query.q,limit:1,year};
      let response:GaaEnvelope<unknown[]>|undefined;
      for(let attempt=0;attempt<3;attempt++){
        try { response=await client.json<GaaEnvelope<unknown[]>>(path,params); break; }
        catch(error){
          if(attempt===2 || (error instanceof ApiError && error.status!==429 && error.status<500)) throw error;
          await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));
        }
      }
      if(!response)throw new Error('No source reconciliation response.');
      const sourceAmount=response.meta.matched_amount;
      if(typeof sourceAmount!=='number'||!Number.isFinite(sourceAmount)) throw new Error('Missing source reconciliation amount: '+query.api);
      return {query:query.q,place:query.place,departmentId:query.department_id,year,loadedAmount,sourceAmount,matches:sourceAmount===loadedAmount,sourceUrl:client.href(path,params),method:'source-year-total'};
    }));
    checks.push(...batch);
  }
  return checks;
}
