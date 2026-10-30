import raw from '../../../content/fixtures/g02-relative.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type RelativeChoice='A'|'B';
export type RelativePoint={
 id:string;paragraphId:string;phenomenon:string;quote:string;question:string;
 options:{id:RelativeChoice;text:string}[];preferredId:RelativeChoice;model:string;trap:string;
};
export type RelativeStudy={
 id:string;version:1;domain:'G02';band:'C1'|'C2';title:string;focus:string;brief:string;
 paragraphs:{id:string;text:string}[];anchors:RelativePoint[];
 status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;
 rights:{kind:'ORIGINAL_DRAFT';source:string};
};
export type RelativeEvidence={
 relativeId:string;paragraphId:string;choice:RelativeChoice;
 transformation:string;counterreading:string;syntaxEvidence:string;boundary:string;initial:boolean;
};
export const relativeStudies:RelativeStudy[]=raw as RelativeStudy[];
export const relativeId=(id:string)=>'relative:'+id;
export const isRelativeEntry=(e:ProductionEntry):boolean=>e.kind==='RELATIVE_STUDY'&&e.id===relativeId(e.itemId);
export const relativeSource=(e:ProductionEntry):RelativeStudy|null=>
 isRelativeEntry(e)?relativeStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const ALT='\n\nFalsche Kasuszuordnung:\n',CONTEXT='\n\nSatzinterne Begründung:\n',LIMIT='\n\nNicht gedeckter Rollenwechsel:\n';
const markers=[ALT,CONTEXT,LIMIT];
const norm=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const isChoice=(p:RelativePoint,x:string):x is RelativeChoice=>(x==='A'||x==='B')&&p.options.some(o=>o.id===x);
function encoded(transformation:string,counterreading:string,syntaxEvidence:string,boundary:string){
 return transformation.trim()+ALT+counterreading.trim()+CONTEXT+syntaxEvidence.trim()+LIMIT+boundary.trim();
}
function decoded(text:string):{transformation:string;counterreading:string;syntaxEvidence:string;boundary:string}|null{
 const a=text.indexOf(ALT);if(a<=0||text.indexOf(ALT,a+ALT.length)!==-1)return null;
 const b=text.indexOf(CONTEXT,a+ALT.length);if(b<0||text.indexOf(CONTEXT,b+CONTEXT.length)!==-1)return null;
 const c=text.indexOf(LIMIT,b+CONTEXT.length);if(c<0||text.indexOf(LIMIT,c+LIMIT.length)!==-1)return null;
 const transformation=text.slice(0,a).trim(),counterreading=text.slice(a+ALT.length,b).trim(),
  syntaxEvidence=text.slice(b+CONTEXT.length,c).trim(),boundary=text.slice(c+LIMIT.length).trim();
 return transformation&&counterreading&&syntaxEvidence&&boundary?{transformation,counterreading,syntaxEvidence,boundary}:null;
}
export function independentRelative(p:RelativePoint,transformation:string,counterreading:string,syntaxEvidence:string,boundary:string):boolean{
 const parts=[transformation,counterreading,syntaxEvidence,boundary];
 if(!valid(transformation,90,1450)||!valid(counterreading,90,1450)||!valid(syntaxEvidence,110,1650)||!valid(boundary,90,1400))return false;
 if(parts.some(s=>markers.some(m=>s.includes(m))))return false;
 const normalized=parts.map(norm);
 if(new Set(normalized).size!==4)return false;
 const copied=[p.quote,p.model,p.trap,...p.options.map(o=>o.text)].map(norm);
 return normalized.every(s=>!s.includes(norm(p.quote))&&!copied.includes(s));
}
export function beginRelative(s:RelativeStudy,pointId:string,choice:RelativeChoice,transformation:string,counterreading:string,syntaxEvidence:string,boundary:string,at:number):ProductionEntry{
 const source=relativeStudies.find(x=>x.id===s.id&&x.version===s.version),p=source?.anchors[0];
 if(!p||p.id!==pointId||!isChoice(p,choice)||!independentRelative(p,transformation,counterreading,syntaxEvidence,boundary)||!Number.isFinite(at))throw Error('Eigenständige Relativerekonstruktion, Gegenlesart, Quellenbeleg und Grenze erforderlich.');
 return {id:relativeId(s.id),kind:'RELATIVE_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,
  decisionId:p.id+'|'+choice+'|'+p.paragraphId,createdAt:at,original:encoded(transformation,counterreading,syntaxEvidence,boundary),revisions:[],evaluated:'UNASSESSED'};
}
export function firstRelative(e:ProductionEntry):RelativeEvidence|null{
 const s=relativeSource(e),p=s?.anchors[0],parts=e.decisionId?.split('|'),parsed=decoded(e.original);
 if(!p||!parts||parts.length!==3||parts[0]!==p.id||parts[2]!==p.paragraphId||!isChoice(p,parts[1])||!parsed||
 !independentRelative(p,parsed.transformation,parsed.counterreading,parsed.syntaxEvidence,parsed.boundary))return null;
 return {relativeId:p.id,paragraphId:p.paragraphId,choice:parts[1],...parsed,initial:true};
}
export function savedRelative(e:ProductionEntry,p:RelativePoint):RelativeEvidence|null{
 const s=relativeSource(e),first=firstRelative(e);
 if(!s||!first||!s.anchors.some(q=>q.id===p.id&&q.paragraphId===p.paragraphId))return null;
 if(s.anchors[0].id===p.id)return first;
 const rev=e.revisions.find(r=>r.questionId==='RELATIVE:'+p.id),parts=rev?decoded(rev.text):null,c=rev?.selfChecks?.[0];
 if(!rev||!parts||rev.paragraphId!==p.paragraphId||!c||!isChoice(p,c)||!independentRelative(p,parts.transformation,parts.counterreading,parts.syntaxEvidence,parts.boundary))return null;
 return {relativeId:p.id,paragraphId:p.paragraphId,choice:c,...parts,initial:false};
}
export function nextRelative(s:RelativeStudy,e:ProductionEntry|null):RelativePoint|null{
 if(!e)return s.anchors[0]??null;
 if(relativeSource(e)?.id!==s.id||!firstRelative(e))return null;
 return s.anchors.find(p=>!savedRelative(e,p))??null;
}
export function appendRelative(e:ProductionEntry,s:RelativeStudy,pointId:string,choice:RelativeChoice,transformation:string,counterreading:string,syntaxEvidence:string,boundary:string,revisionId:string,at:number):ProductionEntry{
 const source=relativeSource(e),p=source?.anchors.find(x=>x.id===pointId);
 if(!source||source.id!==s.id||!firstRelative(e)||!p||nextRelative(s,e)?.id!==pointId||!isChoice(p,choice)||
 !independentRelative(p,transformation,counterreading,syntaxEvidence,boundary)||!revisionId||e.revisions.some(r=>r.id===revisionId)||!Number.isFinite(at))throw Error('Relativebeleg fehlt oder ist außerhalb der Reihenfolge.');
 const revision:ProductionRevision={id:revisionId,at,text:encoded(transformation,counterreading,syntaxEvidence,boundary),reflection:'Relativerekonstruktion: '+p.phenomenon,questionId:'RELATIVE:'+p.id,paragraphId:p.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,revision]};
}
export const latestRelativeMemo=(e:ProductionEntry):ProductionRevision|null=>
 [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
const wordSet=(text:string)=>new Set(norm(text).match(/[\p{L}]{3,}/gu)??[]);
export function substantialRelativeRevision(a:string,b:string):boolean{
 if(norm(a)===norm(b))return false;
 const x=wordSet(a),y=wordSet(b);
 return [...x].filter(z=>!y.has(z)).length+[...y].filter(z=>!x.has(z)).length>=8;
}
export function appendRelativeMemo(e:ProductionEntry,s:RelativeStudy,stage:'TRANSFER'|'REWRITE',memo:string,reason:string,anchorId:string,revisionId:string,at:number):ProductionEntry{
 const source=relativeSource(e),prior=latestRelativeMemo(e),p=source?.anchors.find(x=>x.id===anchorId);
 if(!source||source.id!==s.id||!firstRelative(e)||nextRelative(s,e)!==null||!p||
 !valid(memo,560,3900)||memo.trim().split(/\n\s*\n/).filter(Boolean).length<2||!valid(reason,110,1500)||
 !revisionId||e.revisions.some(r=>r.id===revisionId)||!Number.isFinite(at)||
 (stage==='TRANSFER'&&prior!==null)||(stage==='REWRITE'&&(!prior||!substantialRelativeRevision(prior.text,memo))))throw Error('Ein vollständiger eigenständiger Vermerk oder eine substantielle Revision fehlt.');
 const revision:ProductionRevision={id:revisionId,at,text:memo.trim(),reflection:reason.trim(),questionId:stage,paragraphId:p.paragraphId,lens:stage==='REWRITE'?'REGISTER':'BEDEUTUNG',selfChecks:['RELATIVE:'+p.id]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function relativeProgress(entries:readonly ProductionEntry[]){
 const rows=relativeStudies.map(s=>({s,e:entries.find(e=>isRelativeEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstRelative(x.e)).length,analyses:rows.reduce((n,x)=>n+(x.e?x.s.anchors.filter(p=>savedRelative(x.e!,p)).length:0),0),
  transferred:rows.filter(x=>x.e?.revisions.some(r=>r.questionId==='TRANSFER')).length,
  revised:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:relativeStudies.length};
}
export function nextRelativeStudy(entries:readonly ProductionEntry[]):RelativeStudy{
 return relativeStudies.find(s=>entries.some(e=>isRelativeEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))||
 relativeStudies.find(s=>!entries.some(e=>isRelativeEntry(e)&&e.itemId===s.id))||relativeStudies[0];
}
