import raw from '../../../content/fixtures/editorial-cases.demo.json';
import type {ProductionEntry,ProductionRevision,RevisionLens} from '../production/types';

export type EditorialIssue={id:string;paragraphId:string;label:string;question:string;focus:'KOHÄRENZ'|'BEDEUTUNG'};
export type EditorialCase={id:string;version:1;domain:'G11';band:'C1'|'C2';title:string;genre:string;audience:string;objective:string;paragraphs:{id:string;text:string}[];issues:EditorialIssue[];status:'DEMO_ONLY';authorship:'AI_DRAFT';editorialApproval:false;reviewedBy:null;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const editorialCases:EditorialCase[]=raw as EditorialCase[];
export const editorialId=(id:string)=>'editorial:'+id;
export const isEditorialEntry=(e:ProductionEntry)=>e.kind==='EDITORIAL_STUDY'&&e.id===editorialId(e.itemId);
export const editorialCaseFor=(e:ProductionEntry)=>isEditorialEntry(e)?editorialCases.find(c=>c.id===e.itemId&&c.version===e.itemVersion&&c.id===e.sourceId)??null:null;
export function selectedIssue(entry:ProductionEntry):EditorialIssue|null{
 const c=editorialCaseFor(entry);
 if(!c||!entry.decisionId)return null;
 const parts=entry.decisionId.split('|');
 return parts.length===2?c.issues.find(i=>i.id===parts[0]&&i.paragraphId===parts[1])??null:null;
}
export function editorialSource(c:EditorialCase){return c.paragraphs.map(p=>p.text).join('\n\n')}
export function editorialFirst(c:EditorialCase,issueId:string,paragraphId:string,diagnosis:string,at:number):ProductionEntry{
 const actual=editorialCases.find(x=>x.id===c.id&&x.version===c.version);
 if(!actual||!actual.issues.some(i=>i.id===issueId&&i.paragraphId===paragraphId)||!diagnosis.trim()||diagnosis.length>2900||!Number.isFinite(at))throw Error('Redaktioneller Erstbefund unvollständig.');
 return {id:editorialId(c.id),kind:'EDITORIAL_STUDY',itemId:c.id,itemVersion:c.version,sourceId:c.id,decisionId:issueId+'|'+paragraphId,createdAt:at,original:diagnosis.trim(),revisions:[],evaluated:'UNASSESSED'};
}
export type EditorialStage='REDRAFT'|'RECONSIDER';
export function appendEditorialRevision(entry:ProductionEntry,c:EditorialCase,stage:EditorialStage,text:string,rationale:string,checks:readonly string[],id:string,at:number):ProductionEntry{
 const issue=selectedIssue(entry);
 if(!issue||c.id!==entry.itemId||c.version!==entry.itemVersion||!editorialCaseFor(entry)||!['REDRAFT','RECONSIDER'].includes(stage)||
 (stage==='RECONSIDER'&&!entry.revisions.some(r=>r.questionId==='REDRAFT'))||
 !text.trim()||text.length>2900||!rationale.trim()||rationale.length>1150||!id||!Number.isFinite(at)||
 !Array.isArray(checks)||checks.some(x=>!(EDITORIAL_CHECKS as readonly string[]).includes(x)))throw Error('Textfassung oder Begründung unvollständig.');
 const comparison=stage==='REDRAFT'?(entry.revisions.at(-1)?.text??editorialSource(c)):entry.revisions.at(-1)?.text;
 if(text.trim()===editorialSource(c).trim()||text.trim()===comparison?.trim())throw Error('Der Text ist unverändert. Überarbeite den Entwurf vor dem Speichern.');
 const rev:ProductionRevision={id,at,text:text.trim(),reflection:rationale.trim(),questionId:stage,paragraphId:issue.paragraphId,lens:issue.focus as RevisionLens,selfChecks:[...new Set(checks)]};
 return {...entry,revisions:[...entry.revisions,rev]};
}
export const EDITORIAL_CHECKS=['Bezüge eindeutig','Aussage und Beleg getrennt','Einwände fair gewichtet','Schlussfolgerung begrenzt'] as const;
export function editorialProgress(entries:readonly ProductionEntry[]){
 const own=entries.filter(isEditorialEntry);
 const current=editorialCases.map(c=>own.find(e=>e.itemId===c.id&&e.itemVersion===c.version&&e.sourceId===c.id));
 return {started:current.filter(Boolean).length,rewritten:current.filter(e=>e?.revisions.some(r=>r.questionId==='REDRAFT')).length,reconsidered:current.filter(e=>e?.revisions.some(r=>r.questionId==='RECONSIDER')).length,revisions:current.reduce((n,e)=>n+(e?.revisions.length??0),0),total:editorialCases.length};
}
export function nextEditorialCase(entries:readonly ProductionEntry[]){
 const own=entries.filter(isEditorialEntry);
 return editorialCases.find(c=>own.some(e=>e.itemId===c.id&&!e.revisions.some(r=>r.questionId==='REDRAFT')))??
 editorialCases.find(c=>!own.some(e=>e.itemId===c.id))??editorialCases[0];
}
