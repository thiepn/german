import raw from '../../../content/fixtures/mediation-briefs.demo.json';
import {readingStudies,type ReadingUnit} from '../reading/reading';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type MediationAudience={id:string;label:string;purpose:string};
export type MediationBrief={id:string;version:1;unitId:string;band:'C1'|'C2';title:string;task:string;argumentTask:string;audiences:MediationAudience[];status:'DEMO_ONLY';authorship:'AI_DRAFT';editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const mediationBriefs=raw as MediationBrief[];
export const mediationId=(briefId:string)=>'mediation:'+briefId;
export const isMediationEntry=(entry:ProductionEntry)=>entry.kind==='MEDIATION_STUDY'&&entry.id===mediationId(entry.itemId);
export const sourceForMediation=(brief:MediationBrief):ReadingUnit|null=>readingStudies.find(u=>u.id===brief.unitId&&u.version===brief.version)??null;
export function firstEvidence(entry:ProductionEntry):{audienceId:string;paragraphId:string}|null{
 if(!isMediationEntry(entry)||!entry.decisionId)return null;
 const parts=entry.decisionId.split('|');if(parts.length!==2||!parts[0]||!parts[1])return null;
 return {audienceId:parts[0],paragraphId:parts[1]};
}
export function mediationOriginal(brief:MediationBrief,audienceId:string,paragraphId:string,text:string,at:number):ProductionEntry{
 const source=sourceForMediation(brief);
 if(!source||!brief.audiences.some(a=>a.id===audienceId)||!source.paragraphs.some(p=>p.id===paragraphId)||!text.trim())throw Error('Quelle, Zielgruppe oder Textbeleg ungültig.');
 return {id:mediationId(brief.id),itemId:brief.id,itemVersion:brief.version,kind:'MEDIATION_STUDY',sourceId:brief.unitId,decisionId:audienceId+'|'+paragraphId,createdAt:at,original:text.trim(),revisions:[],evaluated:'UNASSESSED'};
}
export type MediationStage='ADAPTATION'|'ARGUMENT';
export function addMediationRevision(entry:ProductionEntry,brief:MediationBrief,stage:MediationStage,text:string,paragraphId:string,uncertainty:string,id:string,at:number,selfChecks:string[]=[]):ProductionEntry{
 const source=sourceForMediation(brief);
 if(!source||!isMediationEntry(entry)||entry.itemId!==brief.id||entry.itemVersion!==brief.version||entry.sourceId!==brief.unitId||
 !firstEvidence(entry)||!brief.audiences.some(a=>a.id===firstEvidence(entry)?.audienceId)||
 !source.paragraphs.some(p=>p.id===paragraphId)||!text.trim()||!uncertainty.trim()||!id)throw Error('Quellenbeleg oder Formulierung nicht vollständig.');
 const revision:ProductionRevision={id,at,text:text.trim(),reflection:uncertainty.trim(),questionId:stage,paragraphId,lens:stage==='ADAPTATION'?'REGISTER':'KOHÄRENZ',selfChecks:[...selfChecks]};
 return {...entry,revisions:[...entry.revisions,revision]};
}
export function mediationProgress(entries:readonly ProductionEntry[]){
 const own=entries.filter(isMediationEntry);
 const current=mediationBriefs.filter(b=>own.some(e=>e.itemId===b.id&&e.itemVersion===b.version&&e.sourceId===b.unitId));
 return {started:current.length,adapted:current.filter(b=>own.some(e=>e.itemId===b.id&&e.revisions.some(r=>r.questionId==='ADAPTATION'))).length,
 argued:current.filter(b=>own.some(e=>e.itemId===b.id&&e.revisions.some(r=>r.questionId==='ARGUMENT'))).length,
 revisions:current.reduce((n,b)=>n+(own.find(e=>e.itemId===b.id)?.revisions.length??0),0),total:mediationBriefs.length};
}
export function nextMediationBrief(entries:readonly ProductionEntry[]):MediationBrief{
 const saved=entries.filter(isMediationEntry);
 return mediationBriefs.find(b=>saved.some(e=>e.itemId===b.id&&!e.revisions.some(r=>r.questionId==='ADAPTATION'||r.questionId==='ARGUMENT')))??mediationBriefs.find(b=>!saved.some(e=>e.itemId===b.id))??mediationBriefs[0];
}
