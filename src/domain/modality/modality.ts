import raw from '../../../content/fixtures/g05-modality.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type ModalityFamily='KI_REPORT'|'TEMPORAL'|'KII_HYPOTHESIS'|'MODAL_REPORT'|'MODAL_INFERENCE'|'MODAL_OBLIGATION'|'PASSIVE_AGENT'|'PASSIVE_STATE'|'KII_COUNTERFACTUAL';
export type ModalityContrast={id:string;paragraphId:string;family:ModalityFamily;quote:string;prompt:string;options:{id:'A'|'B';text:string}[];preferredId:'A'|'B';model:string;reason:string};
export type ModalityCase={id:string;version:1;domain:'G05';band:'C1'|'C2';title:string;focus:string;paragraphs:{id:string;text:string}[];contrasts:ModalityContrast[];transfer:string;editorialApproval:false;reviewedBy:null;status:'DEMO_ONLY';author:string;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const modalityCases:ModalityCase[]=raw as ModalityCase[];
export const modalityId=(id:string)=>'modality:'+id;
export const isModalityEntry=(entry:ProductionEntry):boolean=>entry.kind==='MODALITY_STUDY'&&entry.id===modalityId(entry.itemId);
export function sourceForModality(entry:ProductionEntry):ModalityCase|null{
 return isModalityEntry(entry)?modalityCases.find(x=>x.id===entry.itemId&&x.id===entry.sourceId&&x.version===entry.itemVersion)??null:null;
}
function canonicalCase(c:ModalityCase){return modalityCases.find(x=>x.id===c.id&&x.version===c.version)??null}
function validChoice(c:ModalityContrast,id:string){return c.options.some(o=>o.id===id)}
export function firstInterpretation(entry:ProductionEntry):{contrastId:string;optionId:string;paragraphId:string}|null{
 const c=sourceForModality(entry);
 if(!c||!entry.decisionId)return null;
 const parts=entry.decisionId.split('|');
 const contrast=c.contrasts[0];
 return parts.length===3&&contrast?.id===parts[0]&&contrast.paragraphId===parts[2]&&validChoice(contrast,parts[1])?
 {contrastId:parts[0],optionId:parts[1],paragraphId:parts[2]}:null;
}
export type StoredContrast={contrastId:string;optionId:string;paragraphId:string;text:string;limit:string;original:boolean};
export function recordedContrast(entry:ProductionEntry,c:ModalityContrast):StoredContrast|null{
 const source=sourceForModality(entry);
 if(!source||!source.contrasts.some(x=>x.id===c.id&&x.paragraphId===c.paragraphId))return null;
 if(c.id===source.contrasts[0].id){
  const first=firstInterpretation(entry);
  return first?{contrastId:c.id,optionId:first.optionId,paragraphId:first.paragraphId,text:entry.original,limit:'',original:true}:null;
 }
 const r=entry.revisions.find(x=>x.questionId==='CONTRAST:'+c.id);
 const id=r?.selfChecks?.[0]??'';
 return r&&r.paragraphId===c.paragraphId&&validChoice(c,id)?{contrastId:c.id,optionId:id,paragraphId:c.paragraphId,text:r.text,limit:r.reflection,original:false}:null;
}
export function nextModalityContrast(c:ModalityCase,e:ProductionEntry|null):ModalityContrast|null{
 if(!e)return c.contrasts[0]??null;
 if(!sourceForModality(e)||e.itemId!==c.id||e.itemVersion!==c.version||!firstInterpretation(e))return null;
 return c.contrasts.find(x=>!recordedContrast(e,x))??null;
}
export function modalityFirst(c:ModalityCase,contrastId:string,optionId:string,interpretation:string,at:number):ProductionEntry{
 const canonical=canonicalCase(c),first=canonical?.contrasts[0];
 if(!first||first.id!==contrastId||!validChoice(first,optionId)||!interpretation.trim()||interpretation.length>2900||!Number.isFinite(at))throw Error('Quellenlesart unvollständig.');
 return {id:modalityId(c.id),itemId:c.id,itemVersion:c.version,kind:'MODALITY_STUDY',sourceId:c.id,decisionId:contrastId+'|'+optionId+'|'+first.paragraphId,createdAt:at,original:interpretation.trim(),revisions:[],evaluated:'UNASSESSED'};
}
function validBase(entry:ProductionEntry,c:ModalityCase):boolean{
 const source=sourceForModality(entry);
 return Boolean(source&&source.id===c.id&&source.version===c.version&&firstInterpretation(entry));
}
export function modalityContrastRevision(entry:ProductionEntry,c:ModalityCase,contrastId:string,optionId:string,interpretation:string,limit:string,id:string,at:number):ProductionEntry{
 const source=canonicalCase(c),contrast=source?.contrasts.find(x=>x.id===contrastId);
 if(!validBase(entry,c)||!contrast||contrast.id===source?.contrasts[0].id||nextModalityContrast(c,entry)?.id!==contrast.id||
 !validChoice(contrast,optionId)||!interpretation.trim()||interpretation.length>2900||!limit.trim()||limit.length>1150||
 !id||!Number.isFinite(at))throw Error('Kontrastantwort oder Quelleneinschränkung unvollständig.');
 const r:ProductionRevision={id,at,text:interpretation.trim(),reflection:limit.trim(),questionId:'CONTRAST:'+contrast.id,paragraphId:contrast.paragraphId,lens:'BEDEUTUNG',selfChecks:[optionId]};
 return {...entry,revisions:[...entry.revisions,r]};
}
export function lastModalityOutput(entry:ProductionEntry){return [...entry.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null}
export function modalityWrittenRevision(entry:ProductionEntry,c:ModalityCase,stage:'TRANSFER'|'REWRITE',text:string,reason:string,paragraphId:string,id:string,at:number):ProductionEntry{
 const source=canonicalCase(c),previous=lastModalityOutput(entry);
 if(!validBase(entry,c)||!source||nextModalityContrast(c,entry)!==null||
 !source.paragraphs.some(p=>p.id===paragraphId)||!text.trim()||text.length>2900||!reason.trim()||reason.length>1150||
 !id||!Number.isFinite(at)||!['TRANSFER','REWRITE'].includes(stage)||
 (stage==='TRANSFER'&&previous!==null)||(stage==='REWRITE'&&previous===null)||
 (previous!==null&&previous.text.trim()===text.trim()))throw Error('Eigene Textfassung oder Quellenbegründung unvollständig.');
 const r:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId,lens:stage==='REWRITE'?'REGISTER':'KOHÄRENZ',selfChecks:[]};
 return {...entry,revisions:[...entry.revisions,r]};
}
export function modalityProgress(entries:readonly ProductionEntry[]){
 const current=modalityCases.map(c=>({c,e:entries.find(x=>isModalityEntry(x)&&x.itemId===c.id&&x.itemVersion===c.version&&x.sourceId===c.id)}));
 return {started:current.filter(x=>x.e&&firstInterpretation(x.e)).length,
 contrasts:current.reduce((n,x)=>n+(x.e?x.c.contrasts.filter(k=>recordedContrast(x.e!,k)).length:0),0),
 finished:current.filter(x=>x.e&&nextModalityContrast(x.c,x.e)===null&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,
 revised:current.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:modalityCases.length};
}
export function nextModalityCase(entries:readonly ProductionEntry[]):ModalityCase{
 return modalityCases.find(c=>{const e=entries.find(x=>isModalityEntry(x)&&x.itemId===c.id);return e&&!e.revisions.some(r=>r.questionId==='TRANSFER')})??
 modalityCases.find(c=>!entries.some(x=>isModalityEntry(x)&&x.itemId===c.id))??modalityCases[0];
}
