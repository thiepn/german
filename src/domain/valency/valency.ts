import raw from '../../../content/fixtures/g03-valency.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type ValencyFamily='FRAME_SHIFT'|'SOURCE_AUTHORITY'|'DEPENDENCY'|'EXPECTATION'|'DOUBT_DENIAL'|'POSSESSION_ORDER'|'RELINQUISH_AVOID'|'CLASSIFICATION'|'BASIS_INVOCATION'|'RECIPROCAL_NOTIFY'|'INSIST_ADVOCATE'|'ADVOCATE_ENGAGE'|'INFERENCE_EXCLUSION'|'CAUSE_ASCRIPTION'|'ASSUMPTION_ASSERTION'|'REFRAIN_OVERLOOK'|'RESUME_REFER'|'OPPOSE_DISCUSS';
export type ValencyChoice='A'|'B';
export type ValencyFrame={id:string;paragraphId:string;family:ValencyFamily;quote:string;governor:string;alternate:string;question:string;options:{id:ValencyChoice;text:string}[];preferredId:ValencyChoice;model:string;explanation:string;repairPrompt:string};
export type ValencyStudy={id:string;version:1;domain:'G03';band:'C1'|'C2';title:string;focus:string;paragraphs:{id:string;text:string}[];frames:ValencyFrame[];transfer:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const valencyStudies:ValencyStudy[]=raw as ValencyStudy[];
export const valencyEntryId=(id:string)=>'valency:'+id;
export const isValencyEntry=(entry:ProductionEntry):boolean=>entry.kind==='VALENCY_STUDY'&&entry.id===valencyEntryId(entry.itemId);
export function valencySource(entry:ProductionEntry):ValencyStudy|null{
 return isValencyEntry(entry)?valencyStudies.find(s=>s.id===entry.itemId&&s.id===entry.sourceId&&s.version===entry.itemVersion)??null:null;
}
function known(s:ValencyStudy):ValencyStudy|null{return valencyStudies.find(x=>x.id===s.id&&x.version===s.version)??null}
const LIMIT=2900,REFLECTION_LIMIT=1150;
function textValid(value:string,max=LIMIT):boolean{return typeof value==='string'&&value.trim().length>0&&value.length<=max}
const marker='\n\nAbgrenzung: ';
function encodeFirst(interpretation:string,boundary:string):string{return interpretation.trim()+marker+boundary.trim()}
function decodeFirst(original:string):{interpretation:string;boundary:string}|null{
 const pos=original.indexOf(marker);
 if(pos<1)return null;
 const interpretation=original.slice(0,pos).trim(),boundary=original.slice(pos+marker.length).trim();
 return interpretation&&boundary?{interpretation,boundary}:null;
}
export type FrameResponse={frameId:string;paragraphId:string;choice:ValencyChoice;interpretation:string;boundary:string;initial:boolean};
export function firstValencyResponse(entry:ProductionEntry):FrameResponse|null{
 const study=valencySource(entry),frame=study?.frames[0],parts=entry.decisionId?.split('|'),note=decodeFirst(entry.original);
 if(!study||!frame||!parts||parts.length!==3||parts[0]!==frame.id||parts[2]!==frame.paragraphId||!frame.options.some(o=>o.id===parts[1])||!note)return null;
 return {frameId:frame.id,paragraphId:frame.paragraphId,choice:parts[1] as ValencyChoice,interpretation:note.interpretation,boundary:note.boundary,initial:true};
}
export function savedValencyFrame(entry:ProductionEntry,frame:ValencyFrame):FrameResponse|null{
 const study=valencySource(entry),first=firstValencyResponse(entry);
 if(!study||!first||!study.frames.some(f=>f.id===frame.id&&f.paragraphId===frame.paragraphId))return null;
 if(frame.id===study.frames[0].id)return first;
 const r=entry.revisions.find(r=>r.questionId==='FRAME:'+frame.id);
 const choice=r?.selfChecks?.[0];
 if(!r||r.paragraphId!==frame.paragraphId||!choice||!frame.options.some(o=>o.id===choice)||!textValid(r.text)||!textValid(r.reflection,REFLECTION_LIMIT))return null;
 return {frameId:frame.id,paragraphId:frame.paragraphId,choice:choice as ValencyChoice,interpretation:r.text,boundary:r.reflection,initial:false};
}
export function nextValencyFrame(study:ValencyStudy,entry:ProductionEntry|null):ValencyFrame|null{
 if(!entry)return study.frames[0]??null;
 const source=valencySource(entry);
 if(!source||source.id!==study.id||source.version!==study.version||!firstValencyResponse(entry))return null;
 return source.frames.find(frame=>!savedValencyFrame(entry,frame))??null;
}
export function beginValency(study:ValencyStudy,frameId:string,choice:ValencyChoice,interpretation:string,boundary:string,at:number):ProductionEntry{
 const source=known(study),first=source?.frames[0],original=encodeFirst(interpretation,boundary);
 if(!first||first.id!==frameId||!first.options.some(o=>o.id===choice)||!textValid(interpretation,1800)||!textValid(boundary,900)||original.length>LIMIT||!Number.isFinite(at))
  throw Error('Quellenbezogene Erstdeutung und Abgrenzung erforderlich.');
 return {id:valencyEntryId(source.id),itemId:source.id,itemVersion:source.version,kind:'VALENCY_STUDY',sourceId:source.id,decisionId:first.id+'|'+choice+'|'+first.paragraphId,createdAt:at,original,revisions:[],evaluated:'UNASSESSED'};
}
export function appendValencyFrame(entry:ProductionEntry,study:ValencyStudy,frameId:string,choice:ValencyChoice,interpretation:string,boundary:string,id:string,at:number):ProductionEntry{
 const source=valencySource(entry),frame=source?.frames.find(f=>f.id===frameId);
 if(!source||source.id!==study.id||source.version!==study.version||!firstValencyResponse(entry)||!frame||frame===source.frames[0]||
 nextValencyFrame(study,entry)?.id!==frameId||!frame.options.some(o=>o.id===choice)||!textValid(interpretation)||!textValid(boundary,REFLECTION_LIMIT)||!id||!Number.isFinite(at))
  throw Error('Kontrastdeutung oder Bedeutungseinschränkung unvollständig.');
 const revision:ProductionRevision={id,at,text:interpretation.trim(),reflection:boundary.trim(),questionId:'FRAME:'+frameId,paragraphId:frame.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...entry,revisions:[...entry.revisions,revision]};
}
export function latestValencyTransfer(entry:ProductionEntry):ProductionRevision|null{
 return [...entry.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendValencyTransfer(entry:ProductionEntry,study:ValencyStudy,stage:'TRANSFER'|'REWRITE',text:string,reason:string,paragraphId:string,id:string,at:number):ProductionEntry{
 const source=valencySource(entry),prev=latestValencyTransfer(entry);
 if(!source||source.id!==study.id||source.version!==study.version||!firstValencyResponse(entry)||nextValencyFrame(study,entry)!==null||
 !source.paragraphs.some(p=>p.id===paragraphId)||!textValid(text)||text.trim().length<60||!textValid(reason,REFLECTION_LIMIT)||!id||!Number.isFinite(at)||
 !['TRANSFER','REWRITE'].includes(stage)||(stage==='TRANSFER'&&prev!==null)||(stage==='REWRITE'&&prev===null)||(prev&&prev.text.trim()===text.trim()))
  throw Error('Eigenständige Valenzübertragung oder Revision unvollständig.');
 const revision:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId,lens:stage==='REWRITE'?'REGISTER':'BEDEUTUNG',selfChecks:[]};
 return {...entry,revisions:[...entry.revisions,revision]};
}
export function valencyProgress(entries:readonly ProductionEntry[]){
 const current=valencyStudies.map(s=>({study:s,entry:entries.find(e=>isValencyEntry(e)&&e.itemId===s.id&&e.itemVersion===s.version&&e.sourceId===s.id)}));
 return {started:current.filter(x=>x.entry&&firstValencyResponse(x.entry)).length,
 frames:current.reduce((n,x)=>n+(x.entry?x.study.frames.filter(f=>savedValencyFrame(x.entry!,f)).length:0),0),
 transferred:current.filter(x=>x.entry&&x.entry.revisions.some(r=>r.questionId==='TRANSFER')).length,
 revisions:current.reduce((n,x)=>n+(x.entry?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:valencyStudies.length};
}
export function nextValencyStudy(entries:readonly ProductionEntry[]):ValencyStudy{
 const active=valencyStudies.find(s=>{const e=entries.find(e=>isValencyEntry(e)&&e.itemId===s.id);return e&&!e.revisions.some(r=>r.questionId==='TRANSFER')});
 return active??valencyStudies.find(s=>!entries.some(e=>isValencyEntry(e)&&e.itemId===s.id))??valencyStudies[0];
}
