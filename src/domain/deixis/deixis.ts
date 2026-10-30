import raw from '../../../content/fixtures/g01-deixis.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type DeixisChoice='A'|'B';
export type DeixisPoint={
 id:string;paragraphId:string;phenomenon:string;quote:string;question:string;
 options:{id:DeixisChoice;text:string}[];preferredId:DeixisChoice;model:string;trap:string;
};
export type DeixisStudy={
 id:string;version:1;domain:'G01';band:'C1'|'C2';title:string;focus:string;brief:string;
 paragraphs:{id:string;text:string}[];anchors:DeixisPoint[];
 status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;
 rights:{kind:'ORIGINAL_DRAFT';source:string};
};
export type DeixisEvidence={
 deixisId:string;paragraphId:string;choice:DeixisChoice;
 report:string;misreading:string;origo:string;boundary:string;initial:boolean;
};
export const deixisStudies:DeixisStudy[]=raw as DeixisStudy[];
export const deixisId=(id:string)=>'deixis:'+id;
export const isDeixisEntry=(e:ProductionEntry):boolean=>e.kind==='DEIXIS_STUDY'&&e.id===deixisId(e.itemId);
export const deixisSource=(e:ProductionEntry):DeixisStudy|null=>
 isDeixisEntry(e)?deixisStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const ALT='\n\nFalsche Perspektive:\n',CONTEXT='\n\nQuellenkontext:\n',LIMIT='\n\nNicht gedeckte Perspektive:\n';
const markers=[ALT,CONTEXT,LIMIT];
const norm=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const isChoice=(p:DeixisPoint,x:string):x is DeixisChoice=>(x==='A'||x==='B')&&p.options.some(o=>o.id===x);
function encoded(report:string,misreading:string,origo:string,boundary:string){
 return report.trim()+ALT+misreading.trim()+CONTEXT+origo.trim()+LIMIT+boundary.trim();
}
function decoded(text:string):{report:string;misreading:string;origo:string;boundary:string}|null{
 const a=text.indexOf(ALT);if(a<=0||text.indexOf(ALT,a+ALT.length)!==-1)return null;
 const b=text.indexOf(CONTEXT,a+ALT.length);if(b<0||text.indexOf(CONTEXT,b+CONTEXT.length)!==-1)return null;
 const c=text.indexOf(LIMIT,b+CONTEXT.length);if(c<0||text.indexOf(LIMIT,c+LIMIT.length)!==-1)return null;
 const report=text.slice(0,a).trim(),misreading=text.slice(a+ALT.length,b).trim(),
  origo=text.slice(b+CONTEXT.length,c).trim(),boundary=text.slice(c+LIMIT.length).trim();
 return report&&misreading&&origo&&boundary?{report,misreading,origo,boundary}:null;
}
export function independentDeixis(p:DeixisPoint,report:string,misreading:string,origo:string,boundary:string):boolean{
 const parts=[report,misreading,origo,boundary];
 if(!valid(report,90,1450)||!valid(misreading,90,1450)||!valid(origo,110,1650)||!valid(boundary,90,1400))return false;
 if(parts.some(s=>markers.some(m=>s.includes(m))))return false;
 const normalized=parts.map(norm);
 if(new Set(normalized).size!==4)return false;
 const copied=[p.quote,p.model,p.trap,...p.options.map(o=>o.text)].map(norm);
 return normalized.every(s=>!s.includes(norm(p.quote))&&!copied.includes(s));
}
export function beginDeixis(s:DeixisStudy,pointId:string,choice:DeixisChoice,report:string,misreading:string,origo:string,boundary:string,at:number):ProductionEntry{
 const source=deixisStudies.find(x=>x.id===s.id&&x.version===s.version),p=source?.anchors[0];
 if(!p||p.id!==pointId||!isChoice(p,choice)||!independentDeixis(p,report,misreading,origo,boundary)||!Number.isFinite(at))throw Error('Eigenständige Deixisrekonstruktion, Gegenlesart, Quellenbeleg und Grenze erforderlich.');
 return {id:deixisId(s.id),kind:'DEIXIS_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,
  decisionId:p.id+'|'+choice+'|'+p.paragraphId,createdAt:at,original:encoded(report,misreading,origo,boundary),revisions:[],evaluated:'UNASSESSED'};
}
export function firstDeixis(e:ProductionEntry):DeixisEvidence|null{
 const s=deixisSource(e),p=s?.anchors[0],parts=e.decisionId?.split('|'),parsed=decoded(e.original);
 if(!p||!parts||parts.length!==3||parts[0]!==p.id||parts[2]!==p.paragraphId||!isChoice(p,parts[1])||!parsed||
 !independentDeixis(p,parsed.report,parsed.misreading,parsed.origo,parsed.boundary))return null;
 return {deixisId:p.id,paragraphId:p.paragraphId,choice:parts[1],...parsed,initial:true};
}
export function savedDeixis(e:ProductionEntry,p:DeixisPoint):DeixisEvidence|null{
 const s=deixisSource(e),first=firstDeixis(e);
 if(!s||!first||!s.anchors.some(q=>q.id===p.id&&q.paragraphId===p.paragraphId))return null;
 if(s.anchors[0].id===p.id)return first;
 const rev=e.revisions.find(r=>r.questionId==='ATTACH:'+p.id),parts=rev?decoded(rev.text):null,c=rev?.selfChecks?.[0];
 if(!rev||!parts||rev.paragraphId!==p.paragraphId||!c||!isChoice(p,c)||!independentDeixis(p,parts.report,parts.misreading,parts.origo,parts.boundary))return null;
 return {deixisId:p.id,paragraphId:p.paragraphId,choice:c,...parts,initial:false};
}
export function nextDeixis(s:DeixisStudy,e:ProductionEntry|null):DeixisPoint|null{
 if(!e)return s.anchors[0]??null;
 if(deixisSource(e)?.id!==s.id||!firstDeixis(e))return null;
 return s.anchors.find(p=>!savedDeixis(e,p))??null;
}
export function appendDeixis(e:ProductionEntry,s:DeixisStudy,pointId:string,choice:DeixisChoice,report:string,misreading:string,origo:string,boundary:string,revisionId:string,at:number):ProductionEntry{
 const source=deixisSource(e),p=source?.anchors.find(x=>x.id===pointId);
 if(!source||source.id!==s.id||!firstDeixis(e)||!p||nextDeixis(s,e)?.id!==pointId||!isChoice(p,choice)||
 !independentDeixis(p,report,misreading,origo,boundary)||!revisionId||e.revisions.some(r=>r.id===revisionId)||!Number.isFinite(at))throw Error('Deixisbeleg fehlt oder ist außerhalb der Reihenfolge.');
 const revision:ProductionRevision={id:revisionId,at,text:encoded(report,misreading,origo,boundary),reflection:'Deixisrekonstruktion: '+p.phenomenon,questionId:'ATTACH:'+p.id,paragraphId:p.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,revision]};
}
export const latestDeixisMemo=(e:ProductionEntry):ProductionRevision|null=>
 [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
const wordSet=(text:string)=>new Set(norm(text).match(/[\p{L}]{3,}/gu)??[]);
export function substantialDeixisRevision(a:string,b:string):boolean{
 if(norm(a)===norm(b))return false;
 const x=wordSet(a),y=wordSet(b);
 return [...x].filter(z=>!y.has(z)).length+[...y].filter(z=>!x.has(z)).length>=8;
}
export function appendDeixisMemo(e:ProductionEntry,s:DeixisStudy,stage:'TRANSFER'|'REWRITE',memo:string,reason:string,anchorId:string,revisionId:string,at:number):ProductionEntry{
 const source=deixisSource(e),prior=latestDeixisMemo(e),p=source?.anchors.find(x=>x.id===anchorId);
 if(!source||source.id!==s.id||!firstDeixis(e)||nextDeixis(s,e)!==null||!p||
 !valid(memo,560,3900)||memo.trim().split(/\n\s*\n/).filter(Boolean).length<2||!valid(reason,110,1500)||
 !revisionId||e.revisions.some(r=>r.id===revisionId)||!Number.isFinite(at)||
 (stage==='TRANSFER'&&prior!==null)||(stage==='REWRITE'&&(!prior||!substantialDeixisRevision(prior.text,memo))))throw Error('Ein vollständiger eigenständiger Vermerk oder eine substantielle Revision fehlt.');
 const revision:ProductionRevision={id:revisionId,at,text:memo.trim(),reflection:reason.trim(),questionId:stage,paragraphId:p.paragraphId,lens:stage==='REWRITE'?'REGISTER':'BEDEUTUNG',selfChecks:['ATTACH:'+p.id]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function deixisProgress(entries:readonly ProductionEntry[]){
 const rows=deixisStudies.map(s=>({s,e:entries.find(e=>isDeixisEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstDeixis(x.e)).length,analyses:rows.reduce((n,x)=>n+(x.e?x.s.anchors.filter(p=>savedDeixis(x.e!,p)).length:0),0),
  transferred:rows.filter(x=>x.e?.revisions.some(r=>r.questionId==='TRANSFER')).length,
  revised:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:deixisStudies.length};
}
export function nextDeixisStudy(entries:readonly ProductionEntry[]):DeixisStudy{
 return deixisStudies.find(s=>entries.some(e=>isDeixisEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))||
 deixisStudies.find(s=>!entries.some(e=>isDeixisEntry(e)&&e.itemId===s.id))||deixisStudies[0];
}
