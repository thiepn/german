import raw from '../../../content/fixtures/g02-case-tracing.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type CaseRole='NOMINATIV'|'AKKUSATIV'|'DATIV'|'GENITIV';
export const caseRoles:CaseRole[]=['NOMINATIV','AKKUSATIV','DATIV','GENITIV'];
export type CaseFamily='GOVERNED_CASE'|'N_DECLENSION'|'GENITIVE_PLURAL'|'MIXED_INFLECTION'|'PLURAL_AGREEMENT'|'NOMINATIVE_AGREEMENT'|'GENDER_CASE'|'NOMINALIZED_ADJECTIVE'|'GENITIVE_CHAIN';
export type CaseRepair={id:string;paragraphId:string;family:CaseFamily;quote:string;governor:string;role:CaseRole;solution:string;explanation:string;transferHint:string};
export type CaseStudy={id:string;version:1;domain:'G02';band:'C1'|'C2';title:string;context:string;paragraphs:{id:string;text:string}[];repairs:CaseRepair[];transfer:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const caseStudies:CaseStudy[]=raw as CaseStudy[];
export const caseStudyId=(id:string)=>'case-tracing:'+id;
export const isCaseStudyEntry=(e:ProductionEntry):boolean=>e.kind==='CASE_TRACING_STUDY'&&e.id===caseStudyId(e.itemId);
export function sourceForCaseStudy(e:ProductionEntry):CaseStudy|null{
 return isCaseStudyEntry(e)?caseStudies.find(c=>c.id===e.itemId&&c.id===e.sourceId&&c.version===e.itemVersion)??null:null;
}
const separator='\n\nBegründung: ';
function packFirst(text:string,reason:string){return text.trim()+separator+reason.trim()}
function firstParts(text:string):{text:string;reason:string}|null{
 const mark=text.indexOf(separator);
 if(mark<1)return null;
 const solution=text.slice(0,mark).trim(),reason=text.slice(mark+separator.length).trim();
 return solution&&reason?{text:solution,reason}:null;
}
export function firstCaseEvidence(e:ProductionEntry):{repairId:string;paragraphId:string;role:CaseRole;text:string;reason:string}|null{
 const c=sourceForCaseStudy(e);if(!c||!e.decisionId)return null;
 const parts=e.decisionId.split('|'),first=c.repairs[0],answer=firstParts(e.original);
 if(parts.length!==3||parts[0]!==first?.id||parts[2]!==first.paragraphId||!caseRoles.includes(parts[1] as CaseRole)||!answer)return null;
 return {repairId:first.id,paragraphId:first.paragraphId,role:parts[1] as CaseRole,...answer};
}
export type RecordedRepair={repairId:string;paragraphId:string;role:CaseRole;text:string;reason:string;original:boolean};
export function recordedCaseRepair(e:ProductionEntry,r:CaseRepair):RecordedRepair|null{
 const c=sourceForCaseStudy(e);
 if(!c||!c.repairs.some(t=>t.id===r.id&&t.paragraphId===r.paragraphId)||!firstCaseEvidence(e))return null;
 if(r.id===c.repairs[0].id){
  const f=firstCaseEvidence(e)!;
  return {repairId:r.id,paragraphId:f.paragraphId,role:f.role,text:f.text,reason:f.reason,original:true};
 }
 const revision=e.revisions.find(v=>v.questionId==='REPAIR:'+r.id);
 const role=revision?.selfChecks?.[0] as CaseRole|undefined;
 if(!revision||revision.paragraphId!==r.paragraphId||!role||!caseRoles.includes(role))return null;
 return {repairId:r.id,paragraphId:r.paragraphId,role,text:revision.text,reason:revision.reflection,original:false};
}
export function nextCaseRepair(c:CaseStudy,e:ProductionEntry|null):CaseRepair|null{
 if(!e)return c.repairs[0]??null;
 const actual=sourceForCaseStudy(e);
 if(!actual||actual.id!==c.id||actual.version!==c.version||!firstCaseEvidence(e))return null;
 return actual.repairs.find(r=>!recordedCaseRepair(e,r))??null;
}
function validText(value:string,max:number){return typeof value==='string'&&Boolean(value.trim())&&value.length<=max}
export function caseStudyFirst(c:CaseStudy,repairId:string,role:CaseRole,text:string,reason:string,at:number):ProductionEntry{
 const source=caseStudies.find(s=>s.id===c.id&&s.version===c.version);
 const first=source?.repairs[0],packed=packFirst(text,reason);
 if(!first||repairId!==first.id||!caseRoles.includes(role)||!validText(text,2200)||!validText(reason,650)||packed.length>3000||
 !Number.isFinite(at)||text.trim()===first.quote.trim())throw Error('Erste Kasusreparatur oder Begründung unvollständig.');
 return {id:caseStudyId(c.id),itemId:c.id,itemVersion:c.version,kind:'CASE_TRACING_STUDY',sourceId:c.id,decisionId:repairId+'|'+role+'|'+first.paragraphId,createdAt:at,original:packed,revisions:[],evaluated:'UNASSESSED'};
}
export function appendCaseRepair(e:ProductionEntry,c:CaseStudy,repairId:string,role:CaseRole,text:string,reason:string,id:string,at:number):ProductionEntry{
 const source=sourceForCaseStudy(e),task=source?.repairs.find(t=>t.id===repairId);
 if(!source||source.id!==c.id||source.version!==c.version||!firstCaseEvidence(e)||!task||task.id===source.repairs[0].id||
 nextCaseRepair(c,e)?.id!==repairId||!caseRoles.includes(role)||!validText(text,2900)||!validText(reason,1150)||text.trim()===task.quote.trim()||
 !id||!Number.isFinite(at))throw Error('Reparatur oder grammatische Begründung unvollständig.');
 const revision:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:'REPAIR:'+repairId,paragraphId:task.paragraphId,lens:'SYNTAX',selfChecks:[role]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function latestCaseTransfer(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendCaseTransfer(e:ProductionEntry,c:CaseStudy,stage:'TRANSFER'|'REWRITE',text:string,reason:string,paragraphId:string,id:string,at:number):ProductionEntry{
 const source=sourceForCaseStudy(e),latest=latestCaseTransfer(e);
 if(!source||source.id!==c.id||source.version!==c.version||!firstCaseEvidence(e)||nextCaseRepair(c,e)!==null||
 !source.paragraphs.some(p=>p.id===paragraphId)||!validText(text,2900)||!validText(reason,1150)||text.trim().length<35||
 !id||!Number.isFinite(at)||(stage==='TRANSFER'&&latest!==null)||(stage==='REWRITE'&&latest===null)||
 (latest&&latest.text.trim()===text.trim()))throw Error('Eigenständige Übertragung oder Begründung unvollständig.');
 const revision:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'SYNTAX',selfChecks:[]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function caseStudyProgress(entries:readonly ProductionEntry[]){
 const current=caseStudies.map(c=>({c,e:entries.find(e=>isCaseStudyEntry(e)&&e.itemId===c.id&&e.itemVersion===c.version&&e.sourceId===c.id)}));
 return {started:current.filter(x=>x.e&&firstCaseEvidence(x.e)).length,
 repairs:current.reduce((n,x)=>n+(x.e?x.c.repairs.filter(t=>recordedCaseRepair(x.e!,t)).length:0),0),
 transferred:current.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,
 rewritten:current.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),
 total:caseStudies.length};
}
export function nextCaseStudy(entries:readonly ProductionEntry[]):CaseStudy{
 return caseStudies.find(c=>{const e=entries.find(x=>isCaseStudyEntry(x)&&x.itemId===c.id);return e&&!e.revisions.some(r=>r.questionId==='TRANSFER')})??
 caseStudies.find(c=>!entries.some(e=>isCaseStudyEntry(e)&&e.itemId===c.id))??caseStudies[0];
}
