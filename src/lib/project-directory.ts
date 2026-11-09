import type {ContractRecord,ContractSnapshot} from './contracts';
export interface DirectoryTotals { contractCount:number; sourceBudgetPhp:number; unknownAmountCount:number }
export interface ContractorProfile extends DirectoryTotals {
  /** Exact source-name identity, normalized only for Unicode/case/spacing. Not a legal entity ID. */
  id:string; name:string; aliases:string[]; records:ContractRecord[];
  years: (DirectoryTotals & {year:string})[];
}
export interface ProjectDirectory {
  checkedAt:string;
  records:ContractRecord[];
  mapRecords:(ContractRecord & {latitude:number;longitude:number})[];
  unmappedRecords:ContractRecord[];
  contractorProfiles:ContractorProfile[];
  coverage:{included:number;mapped:number;unmapped:number;contractors:number;unnamedContractorCount:number;reviewExcluded:number;sourceBudgetPhp:number;unknownAmountCount:number};
}
function totals(records:readonly ContractRecord[]):DirectoryTotals {
  let cents=0,unknownAmountCount=0;
  for(const r of records){
    if(typeof r.amountPhp==='number'&&Number.isFinite(r.amountPhp)&&r.amountPhp>0)cents+=Math.round(r.amountPhp*100);
    else unknownAmountCount++;
  }
  return {contractCount:records.length,sourceBudgetPhp:cents/100,unknownAmountCount};
}
function contractorName(value:string|null):string|null {
  const name=value?.normalize('NFKC').trim().replace(/\s+/g,' ');
  return name&&!/^(?:n\/?a|none|unknown|not specified|for procurement|-+)$/i.test(name)?name:null;
}
/** Only included contracts. Source budget amounts are not payments or GAA appropriations.
 * JV source strings remain whole groups; no full amount is attributed to every partner. */
export function buildProjectDirectory(snapshot:ContractSnapshot):ProjectDirectory {
  const unique=new Map<string,ContractRecord>();
  for(const r of snapshot.records)if(['named','coordinates'].includes(r.location.confidence)&&!unique.has(r.id))unique.set(r.id,r);
  const records=[...unique.values()].sort((a,b)=>b.year.localeCompare(a.year)||a.id.localeCompare(b.id));
  const mapRecords:ProjectDirectory['mapRecords']=[],unmappedRecords:ContractRecord[]=[];
  const groups=new Map<string,{name:string;aliases:Set<string>;records:ContractRecord[]}>();
  let unnamedContractorCount=0;
  for(const r of records){
    if(typeof r.latitude==='number'&&Number.isFinite(r.latitude)&&r.latitude>=4&&r.latitude<=22&&typeof r.longitude==='number'&&Number.isFinite(r.longitude)&&r.longitude>=115&&r.longitude<=128)mapRecords.push({...r,latitude:r.latitude,longitude:r.longitude});
    else unmappedRecords.push(r);
    const name=contractorName(r.contractor);
    if(!name){unnamedContractorCount++;continue;}
    const id=name.toLowerCase();
    let group=groups.get(id);if(!group){group={name,aliases:new Set(),records:[]};groups.set(id,group);}
    group.aliases.add(r.contractor!.trim());group.records.push(r);
  }
  const contractorProfiles=[...groups].map(([id,g]):ContractorProfile=>({id,name:g.name,aliases:[...g.aliases].sort(),records:g.records,...totals(g.records),years:[...new Set(g.records.map(r=>r.year))].sort().reverse().map(year=>({year,...totals(g.records.filter(r=>r.year===year))}))})).sort((a,b)=>b.contractCount-a.contractCount||a.name.localeCompare(b.name));
  const sums=totals(records);
  return {checkedAt:snapshot.checkedAt,records,mapRecords,unmappedRecords,contractorProfiles,coverage:{included:records.length,mapped:mapRecords.length,unmapped:unmappedRecords.length,contractors:contractorProfiles.length,unnamedContractorCount,reviewExcluded:snapshot.reviewRecords.length,sourceBudgetPhp:sums.sourceBudgetPhp,unknownAmountCount:sums.unknownAmountCount}};
}
