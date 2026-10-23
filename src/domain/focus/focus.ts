import raw from '../../../content/fixtures/g04-information-structure.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type FocusFamily='VORFELD_TIME'|'OBJECT_TOPIC'|'NEGATION_QUANTIFIER'|'FOCUS_NEW_TIME'|'OBJECT_CONTINUITY'|'ADDITIVE_TOPIC'|'CONTRAST_FOCUS'|'NEGATION_CORRECTION'|'NEGATION_DISTRIBUTION'|'NACHFELD_CONDITION'|'NACHFELD_CONCESSION'|'NACHFELD_TEMPORAL'|'MITTELFELD_FOCUS'|'FOCUS_PARTICLE'|'CONTRAST_OBJECT_FRONT'|'ONLY_SCOPE'|'NOT_BUT_SCOPE'|'ADDITIVE_FOCUS';
export type FocusChoice='A'|'B';
export type FocusContrast={id:string;paragraphId:string;family:FocusFamily;quote:string;question:string;options:{id:FocusChoice;text:string}[];preferredId:FocusChoice;model:string;explanation:string;repairPrompt:string};
export type FocusStudy={id:string;version:1;domain:'G04';band:'C1'|'C2';title:string;focus:string;paragraphs:{id:string;text:string}[];contrasts:FocusContrast[];transfer:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const focusStudies:FocusStudy[]=raw as FocusStudy[];
export const focusEntryId=(id:string)=>'focus:'+id;
export const isFocusEntry=(e:ProductionEntry):boolean=>e.kind==='FOCUS_STUDY'&&e.id===focusEntryId(e.itemId);
export function focusSource(e:ProductionEntry):FocusStudy|null{
 return isFocusEntry(e)?focusStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
}
const sep='\n\nBegründung: ';
const choices=['A','B'];
const choiceValid=(c:FocusContrast,id:string)=>c.options.some(x=>x.id===id)&&choices.includes(id);
const valid=(s:string,max:number,min=1)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
function distinctRewrite(c:FocusContrast,text:string):boolean{
 const norm=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
 return text.trim().length>=30&&!([c.quote,...c.options.map(x=>x.text)].some(x=>norm(x)===norm(text)));
}
function decode(text:string):{rewrite:string;reason:string}|null{
 const i=text.indexOf(sep);if(i<1)return null;
 const rewrite=text.slice(0,i).trim(),reason=text.slice(i+sep.length).trim();
 return rewrite&&reason?{rewrite,reason}:null;
}
export type FocusResponse={contrastId:string;paragraphId:string;choice:FocusChoice;rewrite:string;reason:string;initial:boolean};
export function firstFocusResponse(entry:ProductionEntry):FocusResponse|null{
 const s=focusSource(entry),c=s?.contrasts[0],parts=entry.decisionId?.split('|'),answer=decode(entry.original);
 if(!s||!c||!parts||parts.length!==3||parts[0]!==c.id||parts[2]!==c.paragraphId||!choiceValid(c,parts[1])||!answer)return null;
 return {contrastId:c.id,paragraphId:c.paragraphId,choice:parts[1] as FocusChoice,...answer,initial:true};
}
export function savedFocusContrast(entry:ProductionEntry,c:FocusContrast):FocusResponse|null{
 const study=focusSource(entry);if(!study||!firstFocusResponse(entry)||!study.contrasts.some(x=>x.id===c.id&&x.paragraphId===c.paragraphId))return null;
 if(c.id===study.contrasts[0].id)return firstFocusResponse(entry);
 const revision=entry.revisions.find(x=>x.questionId==='CONTRAST:'+c.id),selected=revision?.selfChecks?.[0];
 if(!revision||revision.paragraphId!==c.paragraphId||!selected||!choiceValid(c,selected)||!valid(revision.text,2900,30)||!valid(revision.reflection,1150,12))return null;
 return {contrastId:c.id,paragraphId:c.paragraphId,choice:selected as FocusChoice,rewrite:revision.text,reason:revision.reflection,initial:false};
}
export function nextFocusContrast(study:FocusStudy,entry:ProductionEntry|null):FocusContrast|null{
 if(!entry)return study.contrasts[0]??null;
 const source=focusSource(entry);
 if(!source||source.id!==study.id||source.version!==study.version||!firstFocusResponse(entry))return null;
 return source.contrasts.find(c=>!savedFocusContrast(entry,c))??null;
}
export function beginFocus(study:FocusStudy,contrastId:string,choice:FocusChoice,text:string,reason:string,at:number):ProductionEntry{
 const source=focusStudies.find(s=>s.id===study.id&&s.version===study.version),c=source?.contrasts[0];
 const original=text.trim()+sep+reason.trim();
 if(!c||contrastId!==c.id||!choiceValid(c,choice)||!valid(text,1800,30)||!distinctRewrite(c,text)||!valid(reason,850,12)||original.length>2900||!Number.isFinite(at))throw Error('Eigenständige Quellenumformung und Fokusbegründung erforderlich.');
 return {id:focusEntryId(source.id),itemId:source.id,itemVersion:source.version,kind:'FOCUS_STUDY',sourceId:source.id,decisionId:contrastId+'|'+choice+'|'+c.paragraphId,createdAt:at,original,revisions:[],evaluated:'UNASSESSED'};
}
export function appendFocusContrast(entry:ProductionEntry,study:FocusStudy,contrastId:string,choice:FocusChoice,text:string,reason:string,id:string,at:number):ProductionEntry{
 const source=focusSource(entry),c=source?.contrasts.find(x=>x.id===contrastId);
 if(!source||source.id!==study.id||source.version!==study.version||!firstFocusResponse(entry)||!c||c===source.contrasts[0]||nextFocusContrast(study,entry)?.id!==contrastId||!choiceValid(c,choice)||!valid(text,2900,30)||!distinctRewrite(c,text)||!valid(reason,1150,12)||!id||!Number.isFinite(at))throw Error('Quellenbezug, eigener Satz oder Diskursbegründung unvollständig.');
 const revision:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:'CONTRAST:'+contrastId,paragraphId:c.paragraphId,lens:'SYNTAX',selfChecks:[choice]};
 return {...entry,revisions:[...entry.revisions,revision]};
}
export function latestFocusTransfer(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(x=>x.questionId==='TRANSFER'||x.questionId==='REWRITE')??null;
}
export function appendFocusTransfer(entry:ProductionEntry,study:FocusStudy,stage:'TRANSFER'|'REWRITE',text:string,reason:string,paragraphId:string,id:string,at:number):ProductionEntry{
 const source=focusSource(entry),previous=latestFocusTransfer(entry);
 if(!source||source.id!==study.id||source.version!==study.version||!firstFocusResponse(entry)||nextFocusContrast(study,entry)!==null||!source.paragraphs.some(x=>x.id===paragraphId)||
 !valid(text,2900,80)||!valid(reason,1150,20)||!id||!Number.isFinite(at)||!['TRANSFER','REWRITE'].includes(stage)||
 (stage==='TRANSFER'&&previous!==null)||(stage==='REWRITE'&&previous===null)||(previous&&previous.text.trim()===text.trim()))throw Error('Eigenständiger Text oder nachweisbare Überarbeitung unvollständig.');
 const r:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'SYNTAX',selfChecks:[]};
 return {...entry,revisions:[...entry.revisions,r]};
}
export function focusProgress(entries:readonly ProductionEntry[]){
 const cases=focusStudies.map(s=>({s,e:entries.find(e=>isFocusEntry(e)&&e.itemId===s.id&&e.itemVersion===s.version&&e.sourceId===s.id)}));
 return {started:cases.filter(x=>x.e&&firstFocusResponse(x.e)).length,
 contrasts:cases.reduce((n,x)=>n+(x.e?x.s.contrasts.filter(c=>savedFocusContrast(x.e!,c)).length:0),0),
 transfers:cases.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,
 rewrites:cases.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:focusStudies.length};
}
export function nextFocusStudy(entries:readonly ProductionEntry[]):FocusStudy{
 return focusStudies.find(s=>{const e=entries.find(e=>isFocusEntry(e)&&e.itemId===s.id);return e&&!e.revisions.some(r=>r.questionId==='TRANSFER')})??
 focusStudies.find(s=>!entries.some(e=>isFocusEntry(e)&&e.itemId===s.id))??focusStudies[0];
}
