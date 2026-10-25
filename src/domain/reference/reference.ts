import raw from '../../../content/fixtures/g01-reference.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type ReferenceChoice='A'|'B';
export type ReferenceDecision={id:string;paragraphId:string;family:string;topic:string;quote:string;alternate:string;question:string;options:{id:ReferenceChoice;text:string}[];preferredId:ReferenceChoice;model:string;explanation:string;repairPrompt:string};
export type ReferenceStudy={id:string;version:1;domain:'G01';band:'C1'|'C2';title:string;focus:string;paragraphs:{id:string;text:string}[];decisions:ReferenceDecision[];transfer:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const referenceStudies:ReferenceStudy[]=raw as ReferenceStudy[];
export const referenceEntryId=(id:string)=>'reference:'+id;
export function isReferenceEntry(e:ProductionEntry):boolean{return e.kind==='REFERENCE_STUDY'&&e.id===referenceEntryId(e.itemId)}
export function referenceSource(e:ProductionEntry):ReferenceStudy|null{
 return isReferenceEntry(e)?referenceStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
}
const separator='\n\nReferenzbegründung: ';
const valid=(s:string,min:number,max:number)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
const normalized=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const choiceValid=(d:ReferenceDecision,id:string)=>id==='A'||id==='B'?d.options.some(o=>o.id===id):false;
export function isIndependentReferenceRewrite(d:ReferenceDecision,text:string):boolean{
 if(!valid(text,50,2900))return false;
 return normalized(d.quote)!==normalized(text)&&normalized(d.alternate)!==normalized(text);
}
function unpack(text:string):{rewrite:string;reason:string}|null{
 const i=text.indexOf(separator);if(i<1)return null;
 const rewrite=text.slice(0,i).trim(),reason=text.slice(i+separator.length).trim();
 return rewrite&&reason?{rewrite,reason}:null;
}
export type ReferenceAnswer={decisionId:string;paragraphId:string;choice:ReferenceChoice;rewrite:string;reason:string;initial:boolean};
export function firstReferenceAnswer(entry:ProductionEntry):ReferenceAnswer|null{
 const s=referenceSource(entry),d=s?.decisions[0],p=entry.decisionId?.split('|'),v=unpack(entry.original);
 if(!s||!d||!p||p.length!==3||p[0]!==d.id||p[2]!==d.paragraphId||!choiceValid(d,p[1])||!v)return null;
 return {decisionId:d.id,paragraphId:d.paragraphId,choice:p[1] as ReferenceChoice,...v,initial:true};
}
export function savedReferenceDecision(entry:ProductionEntry,d:ReferenceDecision):ReferenceAnswer|null{
 const s=referenceSource(entry),first=firstReferenceAnswer(entry);
 if(!s||!first||!s.decisions.some(x=>x.id===d.id&&x.paragraphId===d.paragraphId))return null;
 if(d.id===s.decisions[0].id)return first;
 const r=entry.revisions.find(r=>r.questionId==='DECISION:'+d.id);
 const selected=r?.selfChecks?.[0];
 if(!r||r.paragraphId!==d.paragraphId||!selected||!choiceValid(d,selected)||!isIndependentReferenceRewrite(d,r.text)||!valid(r.reflection,18,1150))return null;
 return {decisionId:d.id,paragraphId:d.paragraphId,choice:selected as ReferenceChoice,rewrite:r.text,reason:r.reflection,initial:false};
}
export function nextReferenceDecision(study:ReferenceStudy,entry:ProductionEntry|null):ReferenceDecision|null{
 if(!entry)return study.decisions[0]??null;
 const s=referenceSource(entry);
 if(!s||s.id!==study.id||s.version!==study.version||!firstReferenceAnswer(entry))return null;
 return s.decisions.find(d=>!savedReferenceDecision(entry,d))??null;
}
export function beginReference(study:ReferenceStudy,id:string,choice:ReferenceChoice,text:string,reason:string,at:number):ProductionEntry{
 const s=referenceStudies.find(s=>s.id===study.id&&s.version===study.version),d=s?.decisions[0];
 const packed=text.trim()+separator+reason.trim();
 if(!s||!d||d.id!==id||!choiceValid(d,choice)||!isIndependentReferenceRewrite(d,text)||!valid(text,50,1800)||!valid(reason,18,900)||packed.length>3000||!Number.isFinite(at))
  throw Error('Eigenständige Referenzfassung und Begründung erforderlich.');
 return {id:referenceEntryId(s.id),itemId:s.id,itemVersion:s.version,kind:'REFERENCE_STUDY',sourceId:s.id,decisionId:d.id+'|'+choice+'|'+d.paragraphId,createdAt:at,original:packed,revisions:[],evaluated:'UNASSESSED'};
}
export function appendReferenceDecision(entry:ProductionEntry,study:ReferenceStudy,id:string,choice:ReferenceChoice,text:string,reason:string,revisionId:string,at:number):ProductionEntry{
 const s=referenceSource(entry),d=s?.decisions.find(x=>x.id===id);
 if(!s||s.id!==study.id||s.version!==study.version||!firstReferenceAnswer(entry)||!d||d.id===s.decisions[0].id||
 nextReferenceDecision(study,entry)?.id!==id||!choiceValid(d,choice)||!isIndependentReferenceRewrite(d,text)||!valid(reason,18,1150)||!revisionId||!Number.isFinite(at))
  throw Error('Quellenbezogene Referenzanalyse oder Umformulierung unvollständig.');
 const r:ProductionRevision={id:revisionId,at,text:text.trim(),reflection:reason.trim(),questionId:'DECISION:'+id,paragraphId:d.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...entry,revisions:[...entry.revisions,r]};
}
export function latestReferenceTransfer(entry:ProductionEntry):ProductionRevision|null{
 return [...entry.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendReferenceTransfer(entry:ProductionEntry,study:ReferenceStudy,stage:'TRANSFER'|'REWRITE',text:string,reason:string,paragraphId:string,id:string,at:number):ProductionEntry{
 const s=referenceSource(entry),previous=latestReferenceTransfer(entry);
 if(!s||s.id!==study.id||s.version!==study.version||!firstReferenceAnswer(entry)||nextReferenceDecision(study,entry)!==null||
 !s.paragraphs.some(p=>p.id===paragraphId)||!valid(text,100,2900)||!valid(reason,25,1150)||!id||!Number.isFinite(at)||
 !['TRANSFER','REWRITE'].includes(stage)||(stage==='TRANSFER'&&previous!==null)||(stage==='REWRITE'&&previous===null)||
 (previous&&normalized(previous.text)===normalized(text)))throw Error('Eigenständiger Referenztransfer oder begründete Überarbeitung unvollständig.');
 const r:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'BEDEUTUNG',selfChecks:[]};
 return {...entry,revisions:[...entry.revisions,r]};
}
export function referenceProgress(entries:readonly ProductionEntry[]){
 const rows=referenceStudies.map(s=>({s,e:entries.find(e=>isReferenceEntry(e)&&e.itemId===s.id&&e.itemVersion===s.version&&e.sourceId===s.id)}));
 return {started:rows.filter(x=>x.e&&firstReferenceAnswer(x.e)).length,
 decisions:rows.reduce((n,x)=>n+(x.e?x.s.decisions.filter(d=>savedReferenceDecision(x.e!,d)).length:0),0),
 transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,
 rewritten:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),
 total:referenceStudies.length};
}
export function nextReferenceStudy(entries:readonly ProductionEntry[]):ReferenceStudy{
 return referenceStudies.find(s=>{const e=entries.find(e=>isReferenceEntry(e)&&e.itemId===s.id);return e&&!e.revisions.some(r=>r.questionId==='TRANSFER')})??
 referenceStudies.find(s=>!entries.some(e=>isReferenceEntry(e)&&e.itemId===s.id))??referenceStudies[0];
}
