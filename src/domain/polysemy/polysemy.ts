import original from '../../../content/fixtures/g06-polysemy.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type PolysemyChoice='A'|'B';
export type PolysemyDecision={id:string;paragraphId:string;family:string;lemma:string;quote:string;alternate:string;question:string;options:{id:PolysemyChoice;text:string}[];preferredId:PolysemyChoice;explanation:string;repairPrompt:string};
export type PolysemyStudy={id:string;version:1;domain:'G06';band:'C1'|'C2';title:string;focus:string;paragraphs:{id:string;text:string}[];decisions:PolysemyDecision[];transfer:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const polysemyStudies:PolysemyStudy[]=original as PolysemyStudy[];
export const polysemyEntryId=(id:string)=>'polysemy:'+id;
export const isPolysemyEntry=(e:ProductionEntry):boolean=>e.kind==='POLYSEMY_STUDY'&&e.id===polysemyEntryId(e.itemId);
export function polysemySource(e:ProductionEntry):PolysemyStudy|null{
 return isPolysemyEntry(e)?polysemyStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
}
const separator='\n\nAusgeschlossene Lesart: ';
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const normalize=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const acceptable=(d:PolysemyDecision,c:string):c is PolysemyChoice=>(c==='A'||c==='B')&&d.options.some(o=>o.id===c);
export function independentPolysemyRewrite(d:PolysemyDecision,text:string):boolean{
 return valid(text,50,2900)&&normalize(text)!==normalize(d.quote)&&normalize(text)!==normalize(d.alternate);
}
function unpack(original:string):{rewrite:string;boundary:string}|null{
 const i=original.indexOf(separator);if(i<1)return null;
 const rewrite=original.slice(0,i).trim(),boundary=original.slice(i+separator.length).trim();
 return rewrite&&boundary?{rewrite,boundary}:null;
}
export type PolysemyEvidence={decisionId:string;paragraphId:string;choice:PolysemyChoice;rewrite:string;boundary:string;initial:boolean};
export function firstPolysemyEvidence(e:ProductionEntry):PolysemyEvidence|null{
 const s=polysemySource(e),d=s?.decisions[0],parts=e.decisionId?.split('|'),text=unpack(e.original);
 if(!s||!d||!parts||parts.length!==3||parts[0]!==d.id||parts[2]!==d.paragraphId||!acceptable(d,parts[1])||!text)return null;
 return {decisionId:d.id,paragraphId:d.paragraphId,choice:parts[1],...text,initial:true};
}
export function savedPolysemyDecision(e:ProductionEntry,d:PolysemyDecision):PolysemyEvidence|null{
 const s=polysemySource(e),first=firstPolysemyEvidence(e);
 if(!s||!first||!s.decisions.some(x=>x.id===d.id&&x.paragraphId===d.paragraphId))return null;
 if(d.id===s.decisions[0].id)return first;
 const r=e.revisions.find(x=>x.questionId==='DECISION:'+d.id),c=r?.selfChecks?.[0];
 if(!r||r.paragraphId!==d.paragraphId||!c||!acceptable(d,c)||!independentPolysemyRewrite(d,r.text)||!valid(r.reflection,20,1150))return null;
 return {decisionId:d.id,paragraphId:d.paragraphId,choice:c,rewrite:r.text,boundary:r.reflection,initial:false};
}
export function nextPolysemyDecision(s:PolysemyStudy,e:ProductionEntry|null):PolysemyDecision|null{
 if(!e)return s.decisions[0]??null;
 const source=polysemySource(e);
 if(!source||source.id!==s.id||source.version!==s.version||!firstPolysemyEvidence(e))return null;
 return source.decisions.find(d=>!savedPolysemyDecision(e,d))??null;
}
export function beginPolysemy(s:PolysemyStudy,id:string,choice:PolysemyChoice,text:string,boundary:string,at:number):ProductionEntry{
 const originalSource=polysemyStudies.find(x=>x.id===s.id&&x.version===s.version),d=originalSource?.decisions[0];
 const combined=text.trim()+separator+boundary.trim();
 if(!originalSource||!d||d.id!==id||!acceptable(d,choice)||!independentPolysemyRewrite(d,text)||!valid(text,50,1800)||!valid(boundary,20,900)||combined.length>3000||!Number.isFinite(at))throw Error('Eigenständige Bedeutungsparaphrase und Kontextabgrenzung erforderlich.');
 return {id:polysemyEntryId(s.id),itemId:s.id,itemVersion:s.version,kind:'POLYSEMY_STUDY',sourceId:s.id,decisionId:id+'|'+choice+'|'+d.paragraphId,createdAt:at,original:combined,revisions:[],evaluated:'UNASSESSED'};
}
export function appendPolysemyDecision(e:ProductionEntry,s:PolysemyStudy,id:string,choice:PolysemyChoice,text:string,boundary:string,revisionId:string,at:number):ProductionEntry{
 const source=polysemySource(e),d=source?.decisions.find(x=>x.id===id);
 if(!source||source.id!==s.id||source.version!==s.version||!firstPolysemyEvidence(e)||!d||d.id===source.decisions[0].id||
 nextPolysemyDecision(s,e)?.id!==id||!acceptable(d,choice)||!independentPolysemyRewrite(d,text)||!valid(boundary,20,1150)||!revisionId||!Number.isFinite(at))throw Error('Quellenbezogene Mehrdeutigkeitsanalyse oder eigene Paraphrase unvollständig.');
 const revision:ProductionRevision={id:revisionId,at,text:text.trim(),reflection:boundary.trim(),questionId:'DECISION:'+id,paragraphId:d.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function latestPolysemyTransfer(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendPolysemyTransfer(e:ProductionEntry,s:PolysemyStudy,stage:'TRANSFER'|'REWRITE',text:string,reason:string,paragraphId:string,id:string,at:number):ProductionEntry{
 const source=polysemySource(e),previous=latestPolysemyTransfer(e);
 if(!source||source.id!==s.id||source.version!==s.version||!firstPolysemyEvidence(e)||nextPolysemyDecision(s,e)!==null||
 !source.paragraphs.some(p=>p.id===paragraphId)||!valid(text,100,2900)||!valid(reason,25,1150)||!id||!Number.isFinite(at)||
 !['TRANSFER','REWRITE'].includes(stage)||(stage==='TRANSFER'&&previous!==null)||(stage==='REWRITE'&&previous===null)||
 (previous&&normalize(previous.text)===normalize(text)))throw Error('Eigenständiger Bedeutungstransfer oder belegte Revision unvollständig.');
 const r:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'BEDEUTUNG',selfChecks:[]};
 return {...e,revisions:[...e.revisions,r]};
}
export function polysemyProgress(entries:readonly ProductionEntry[]){
 const rows=polysemyStudies.map(s=>({s,e:entries.find(e=>isPolysemyEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstPolysemyEvidence(x.e)).length,
 decisions:rows.reduce((n,x)=>n+(x.e?x.s.decisions.filter(d=>savedPolysemyDecision(x.e!,d)).length:0),0),
 transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,
 rewritten:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:polysemyStudies.length};
}
export function nextPolysemyStudy(entries:readonly ProductionEntry[]):PolysemyStudy{
 return polysemyStudies.find(s=>{const e=entries.find(e=>isPolysemyEntry(e)&&e.itemId===s.id);return e&&!e.revisions.some(r=>r.questionId==='TRANSFER')})??
 polysemyStudies.find(s=>!entries.some(e=>isPolysemyEntry(e)&&e.itemId===s.id))??polysemyStudies[0];
}
