import original from '../../../content/fixtures/g08-stance.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type StanceChoice='A'|'B';
export type StanceDecision={id:string;paragraphId:string;family:string;move:string;quote:string;alternate:string;question:string;options:{id:StanceChoice;text:string}[];preferredId:StanceChoice;explanation:string;repairPrompt:string};
export type StanceStudy={id:string;version:1;domain:'G08';band:'C1'|'C2';title:string;focus:string;paragraphs:{id:string;text:string}[];decisions:StanceDecision[];transfer:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const stanceStudies:StanceStudy[]=original as StanceStudy[];
export const stanceEntryId=(id:string)=>'stance:'+id;
export const isStanceEntry=(e:ProductionEntry):boolean=>e.kind==='STANCE_STUDY'&&e.id===stanceEntryId(e.itemId);
export function stanceSource(e:ProductionEntry):StanceStudy|null{
 return isStanceEntry(e)?stanceStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
}
const separator='\n\nAusgeschlossene Lesart: ';
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const normalize=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const acceptable=(d:StanceDecision,c:string):c is StanceChoice=>(c==='A'||c==='B')&&d.options.some(o=>o.id===c);
export function independentStanceRewrite(d:StanceDecision,text:string):boolean{
 return valid(text,50,2900)&&normalize(text)!==normalize(d.quote)&&normalize(text)!==normalize(d.alternate);
}
function unpack(original:string):{rewrite:string;boundary:string}|null{
 const i=original.indexOf(separator);if(i<1)return null;
 const rewrite=original.slice(0,i).trim(),boundary=original.slice(i+separator.length).trim();
 return rewrite&&boundary?{rewrite,boundary}:null;
}
export type StanceEvidence={decisionId:string;paragraphId:string;choice:StanceChoice;rewrite:string;boundary:string;initial:boolean};
export function firstStanceEvidence(e:ProductionEntry):StanceEvidence|null{
 const s=stanceSource(e),d=s?.decisions[0],parts=e.decisionId?.split('|'),text=unpack(e.original);
 if(!s||!d||!parts||parts.length!==3||parts[0]!==d.id||parts[2]!==d.paragraphId||!acceptable(d,parts[1])||!text)return null;
 return {decisionId:d.id,paragraphId:d.paragraphId,choice:parts[1],...text,initial:true};
}
export function savedStanceDecision(e:ProductionEntry,d:StanceDecision):StanceEvidence|null{
 const s=stanceSource(e),first=firstStanceEvidence(e);
 if(!s||!first||!s.decisions.some(x=>x.id===d.id&&x.paragraphId===d.paragraphId))return null;
 if(d.id===s.decisions[0].id)return first;
 const r=e.revisions.find(x=>x.questionId==='DECISION:'+d.id),c=r?.selfChecks?.[0];
 if(!r||r.paragraphId!==d.paragraphId||!c||!acceptable(d,c)||!independentStanceRewrite(d,r.text)||!valid(r.reflection,20,1150))return null;
 return {decisionId:d.id,paragraphId:d.paragraphId,choice:c,rewrite:r.text,boundary:r.reflection,initial:false};
}
export function nextStanceDecision(s:StanceStudy,e:ProductionEntry|null):StanceDecision|null{
 if(!e)return s.decisions[0]??null;
 const source=stanceSource(e);
 if(!source||source.id!==s.id||source.version!==s.version||!firstStanceEvidence(e))return null;
 return source.decisions.find(d=>!savedStanceDecision(e,d))??null;
}
export function beginStance(s:StanceStudy,id:string,choice:StanceChoice,text:string,boundary:string,at:number):ProductionEntry{
 const originalSource=stanceStudies.find(x=>x.id===s.id&&x.version===s.version),d=originalSource?.decisions[0];
 const combined=text.trim()+separator+boundary.trim();
 if(!originalSource||!d||d.id!==id||!acceptable(d,choice)||!independentStanceRewrite(d,text)||!valid(text,50,1800)||!valid(boundary,20,900)||combined.length>3000||!Number.isFinite(at))throw Error('Eigenständige Argumentationsparaphrase und Kontextabgrenzung erforderlich.');
 return {id:stanceEntryId(s.id),itemId:s.id,itemVersion:s.version,kind:'STANCE_STUDY',sourceId:s.id,decisionId:id+'|'+choice+'|'+d.paragraphId,createdAt:at,original:combined,revisions:[],evaluated:'UNASSESSED'};
}
export function appendStanceDecision(e:ProductionEntry,s:StanceStudy,id:string,choice:StanceChoice,text:string,boundary:string,revisionId:string,at:number):ProductionEntry{
 const source=stanceSource(e),d=source?.decisions.find(x=>x.id===id);
 if(!source||source.id!==s.id||source.version!==s.version||!firstStanceEvidence(e)||!d||d.id===source.decisions[0].id||
 nextStanceDecision(s,e)?.id!==id||!acceptable(d,choice)||!independentStanceRewrite(d,text)||!valid(boundary,20,1150)||!revisionId||!Number.isFinite(at))throw Error('Quellenbezogene Haltungsanalyse oder eigene Paraphrase unvollständig.');
 const revision:ProductionRevision={id:revisionId,at,text:text.trim(),reflection:boundary.trim(),questionId:'DECISION:'+id,paragraphId:d.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function latestStanceTransfer(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendStanceTransfer(e:ProductionEntry,s:StanceStudy,stage:'TRANSFER'|'REWRITE',text:string,reason:string,paragraphId:string,id:string,at:number):ProductionEntry{
 const source=stanceSource(e),previous=latestStanceTransfer(e);
 if(!source||source.id!==s.id||source.version!==s.version||!firstStanceEvidence(e)||nextStanceDecision(s,e)!==null||
 !source.paragraphs.some(p=>p.id===paragraphId)||!valid(text,100,2900)||!valid(reason,25,1150)||!id||!Number.isFinite(at)||
 !['TRANSFER','REWRITE'].includes(stage)||(stage==='TRANSFER'&&previous!==null)||(stage==='REWRITE'&&previous===null)||
 (previous&&normalize(previous.text)===normalize(text)))throw Error('Eigenständiger Positionierungstransfer oder belegte Revision unvollständig.');
 const r:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'BEDEUTUNG',selfChecks:[]};
 return {...e,revisions:[...e.revisions,r]};
}
export function stanceProgress(entries:readonly ProductionEntry[]){
 const rows=stanceStudies.map(s=>({s,e:entries.find(e=>isStanceEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstStanceEvidence(x.e)).length,
 decisions:rows.reduce((n,x)=>n+(x.e?x.s.decisions.filter(d=>savedStanceDecision(x.e!,d)).length:0),0),
 transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,
 rewritten:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:stanceStudies.length};
}
export function nextStanceStudy(entries:readonly ProductionEntry[]):StanceStudy{
 return stanceStudies.find(s=>{const e=entries.find(e=>isStanceEntry(e)&&e.itemId===s.id);return e&&!e.revisions.some(r=>r.questionId==='TRANSFER')})??
 stanceStudies.find(s=>!entries.some(e=>isStanceEntry(e)&&e.itemId===s.id))??stanceStudies[0];
}
