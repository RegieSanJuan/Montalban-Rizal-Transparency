import { montalbanLocation } from './location-policy';
export type BoundaryGeometry = { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] };
export interface ContractRecord {
  id: string; title: string; year: string; amountPhp: number | null;
  status: string; progress: number | null; contractor: string | null;
  startDate: string | null; completionDate: string | null;
  latitude: number | null; longitude: number | null;
  location: { confidence: 'named' | 'coordinates' | 'shared' | 'review' | 'conflict'; note: string };
  sourceUrl: string;
  fundingSource?: string | null;
  program?: string | null;
  expiryDate?: string | null;
  procurement?: { abcPhp: number | null; awardAmountPhp: number | null; advertisementDate: string | null; bidSubmissionDeadline: string | null; dateOfAward: string | null };
}
export interface ContractSnapshot {
  checkedAt: string;
  source: { name: string; url: string; originalUrl: string; queriedUrls: string[]; note: string };
  counts: { included: number; review: number; rejected: number; fetched: number };
  records: ContractRecord[]; reviewRecords: ContractRecord[];
}
function onSegment(x: number, y: number, a: number[], b: number[]) {
  const cross = (x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
  return Math.abs(cross) < 1e-10 && x >= Math.min(a[0],b[0])-1e-10 && x <= Math.max(a[0],b[0])+1e-10 && y >= Math.min(a[1],b[1])-1e-10 && y <= Math.max(a[1],b[1])+1e-10;
}
function inRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i], b=ring[j];
    if(onSegment(x,y,a,b)) return true;
    if((a[1]>y)!==(b[1]>y) && x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
export function pointInGeometry(longitude: number, latitude: number, geometry: BoundaryGeometry): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(rings => rings.length > 0 && inRing(longitude,latitude,rings[0]) && !rings.slice(1).some(hole => inRing(longitude,latitude,hole)));
}
function numeric(value: unknown): number | null {
  if(typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}
function optionalText(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null; }
/** Normalize only published values. The API's amountPaid=0 is not evidence of zero spending. */
export function normalizeContract(raw: Record<string, unknown>, geometry: BoundaryGeometry): { bucket: 'included' | 'review' | 'rejected'; record?: ContractRecord; note?: string } {
  const id=optionalText(raw.contractId), title=optionalText(raw.description);
  if(!id || !title) return { bucket:'rejected',note:'Missing contract ID or description.' };
  const latitude=numeric(raw.latitude), longitude=numeric(raw.longitude);
  const hasCoordinates=latitude !== null && longitude !== null && latitude>=4 && latitude<=22 && longitude>=115 && longitude<=128;
  const inside=hasCoordinates && pointInGeometry(longitude!,latitude!,geometry);
  const decision=montalbanLocation(title);
  const sourceLocation=raw.location && typeof raw.location==='object' ? raw.location as Record<string,unknown> : {};
  const region=optionalText(sourceLocation.region);
  // Central Office describes an implementing organization, not a geographic region.
  const outsideRegion=region !== null && !/^central\s+office$/i.test(region) && !/^region\s+(?:iv[- ]?a|4a)$/i.test(region);
  if(outsideRegion && !inside && decision.confidence !== 'named' && decision.confidence !== 'shared') return {bucket:'rejected',note:'Source region is outside CALABARZON and has no Montalban point or explicit municipal location.'};
  let location: ContractRecord['location'];
  if(outsideRegion && inside) location={confidence:'conflict',note:'Nasa loob ang source coordinate ngunit ibang region ang source record. Kailangang i-verify; hindi kasama sa totals.'};
  else if(decision.confidence==='shared') location=decision;
  else if(decision.confidence==='named') location=(hasCoordinates && !inside) || outsideRegion
    ? {confidence:'conflict',note:'Pinangalanan ang bayan sa title, ngunit may salungat na source region o coordinate. Kailangang i-verify; hindi kasama sa totals.'}
    : decision;
  else if(inside) location=decision.confidence==='excluded' && decision.note.startsWith('Ibang')
    ? {confidence:'conflict',note:'Nasa loob ang source coordinate, ngunit ibang lugar o namesake ang title. Kailangang i-verify.'}
    : {confidence:'coordinates',note:'Ang DPWH source point ay nasa loob ng Rodriguez boundary (PSGC/NAMRIA-derived map). Hindi nito pinatutunayang buong project footprint ay nasa bayan.'};
  else if(decision.confidence==='review') location=decision;
  else return {bucket:'rejected',note:decision.note};
  const amount=numeric(raw.budget), progress=numeric(raw.progress);
  const procurement=raw.procurement && typeof raw.procurement==='object' ? raw.procurement as Record<string,unknown> : null;
  const positiveMoney=(value:unknown) => { const n=typeof value==='string' && value.trim() ? Number(value) : numeric(value); return n !== null && Number.isFinite(n) && n>0 ? n : null; };
  return {bucket:['shared','review','conflict'].includes(location.confidence)?'review':'included',record:{
    id,title,year:optionalText(raw.infraYear)??'Hindi nakasaad',amountPhp:amount !== null && amount>0?amount:null,
    status:optionalText(raw.status)??'Hindi nakasaad',progress:progress!==null && progress>=0 && progress<=100?progress:null,
    contractor:optionalText(raw.contractor),startDate:optionalText(raw.startDate),completionDate:optionalText(raw.completionDate),
    latitude:hasCoordinates?latitude:null,longitude:hasCoordinates?longitude:null,location,
    sourceUrl:'https://api.dpwh.bettergov.ph/projects/'+encodeURIComponent(id),
    fundingSource:optionalText(raw.sourceOfFunds),program:optionalText(raw.programName),expiryDate:optionalText(raw.expiryDate),
    ...(procurement ? {procurement:{abcPhp:positiveMoney(procurement.abc),awardAmountPhp:positiveMoney(procurement.awardAmount),advertisementDate:optionalText(procurement.advertisementDate),bidSubmissionDeadline:optionalText(procurement.bidSubmissionDeadline),dateOfAward:optionalText(procurement.dateOfAward)}} : {}),
  }};
}
/** Reject schema drift rather than showing incorrect totals from malformed JSON. */
export function readContractSnapshot(value: unknown): ContractSnapshot | null {
  if(!value || typeof value!=='object') return null;
  const x=value as ContractSnapshot;
  if(typeof x.checkedAt!=='string'||!Number.isFinite(Date.parse(x.checkedAt))||!x.source||typeof x.source.note!=='string'||!Array.isArray(x.source.queriedUrls)||!x.counts||!Array.isArray(x.records)||!Array.isArray(x.reviewRecords)) return null;
  if(Object.values(x.counts).some(n=>!Number.isInteger(n)||n<0)||x.counts.included!==x.records.length||x.counts.review!==x.reviewRecords.length||x.counts.fetched!==x.counts.included+x.counts.review+x.counts.rejected) return null;
  const records=[...x.records,...x.reviewRecords];
  if(new Set(records.map(r=>r?.id)).size!==records.length) return null;
  if(records.some(r=>!r||typeof r.id!=='string'||typeof r.title!=='string'||typeof r.year!=='string'||typeof r.sourceUrl!=='string'||(r.amountPhp!==null&&(typeof r.amountPhp!=='number'||!Number.isFinite(r.amountPhp)||r.amountPhp<=0))||!r.location||!['named','coordinates','shared','review','conflict'].includes(r.location.confidence))) return null;
  if(x.records.some(r=>!['named','coordinates'].includes(r.location.confidence))||x.reviewRecords.some(r=>!['shared','review','conflict'].includes(r.location.confidence))) return null;
  return x;
}
let cached: Promise<ContractSnapshot> | undefined;
export function loadContracts(): Promise<ContractSnapshot> {
  if(!cached) {
    cached=fetch('/data/dpwh-contracts.json',{signal:AbortSignal.timeout(15000)}).then(async response=>{
      if(!response.ok) throw new Error('Hindi ma-load ang DPWH contract snapshot. Subukan muli.');
      const snapshot=readContractSnapshot(await response.json());
      if(!snapshot) throw new Error('Hindi valid ang contract snapshot.');
      return snapshot;
    });
    cached.catch(()=>{cached=undefined;});
  }
  return cached;
}
