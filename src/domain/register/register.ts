import raw from '../../../content/fixtures/g08-register-responsibility.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';
export type RegisterStudy={id:string;version:1;domain:'G08';band:'C1'|'C2';title:string;focus:string;paragraphs:{id:string;text:string}[];anchor:{paragraphId:string;quote:string};task:string;transfer:string;revision:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const registerStudies=raw as RegisterStudy[];
export const registerId=(id:string)=>'register:'+id;
export const isRegisterEntry=(e:ProductionEntry)=>e.kind==='REGISTER_RESPONSIBILITY_STUDY'&&e.id===registerId(e.itemId);
export const registerSource=(e:ProductionEntry)=>isRegisterEntry(e)?registerStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const norm=(t:string)=>t.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(t:string,min:number,max:number)=>typeof t==='string'&&t.trim().length>=min&&t.length<=max;
const MARK='\n\nEigene Begründung:\n';
export function independentRegister(s:RegisterStudy,text:string,reason:string):boolean{
 return valid(text,360,3500)&&valid(reason,110,1300)&&text.trim().split(/\n\s*\n/).filter(Boolean).length>=2&&
 !norm(text).includes(norm(s.anchor.quote))&&norm(text)!==norm(reason)&&
 s.paragraphs.some(p=>p.id===s.anchor.paragraphId&&p.text.includes(s.anchor.quote));
}
export function beginRegister(s:RegisterStudy,text:string,reason:string,at:number):ProductionEntry{
 const source=registerStudies.find(x=>x.id===s.id&&x.version===s.version);
 if(!source||!independentRegister(source,text,reason)||!Number.isFinite(at))throw Error('Eigenständige zweigliedrige Antwort und Quellenbegründung erforderlich.');
 return {id:registerId(s.id),kind:'REGISTER_RESPONSIBILITY_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:s.anchor.paragraphId,createdAt:at,original:text.trim()+MARK+reason.trim(),revisions:[],evaluated:'UNASSESSED'};
}
export function firstRegister(e:ProductionEntry):{text:string;reason:string}|null{
 const s=registerSource(e);if(!s||e.decisionId!==s.anchor.paragraphId)return null;
 const i=e.original.indexOf(MARK);if(i<0||e.original.indexOf(MARK,i+MARK.length)!==-1)return null;
 const text=e.original.slice(0,i),reason=e.original.slice(i+MARK.length);
 return independentRegister(s,text,reason)?{text,reason}:null;
}
export function registerStage(e:ProductionEntry):'FIRST'|'TRANSFER'|'REWRITE'{
 if(!firstRegister(e))return 'FIRST';
 return e.revisions.some(x=>x.questionId==='TRANSFER')?'REWRITE':'TRANSFER';
}
export function appendRegister(e:ProductionEntry,s:RegisterStudy,stage:'TRANSFER'|'REWRITE',text:string,reason:string,revId:string,at:number):ProductionEntry{
 const source=registerSource(e),first=firstRegister(e);
 if(!source||source.id!==s.id||!first||registerStage(e)!==stage||!independentRegister(source,text,reason)||!revId||!Number.isFinite(at))throw Error('Quellenbeleg oder Arbeitsschritt ungültig.');
 const previous=stage==='TRANSFER'?first.text:[...e.revisions].reverse().find(x=>x.questionId==='TRANSFER'||x.questionId==='REWRITE')?.text;
 if(previous&&norm(previous)===norm(text))throw Error('Unveränderte Fassung ist keine Überarbeitung.');
 const revision:ProductionRevision={id:revId,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId:source.anchor.paragraphId,lens:stage==='TRANSFER'?'REGISTER':'KOHÄRENZ',selfChecks:['SOURCE:'+source.id]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function registerProgress(entries:readonly ProductionEntry[]){
 const rows=registerStudies.map(s=>entries.find(e=>isRegisterEntry(e)&&e.itemId===s.id&&e.itemVersion===s.version));
 return {started:rows.filter(e=>e&&firstRegister(e)).length,transferred:rows.filter(e=>e?.revisions.some(r=>r.questionId==='TRANSFER')).length,revised:rows.reduce((n,e)=>n+(e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:registerStudies.length};
}
