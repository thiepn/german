import raw from '../../../content/fixtures/g11-argument.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';
export type ArgumentChoice='A'|'B';
export type ArgumentNode={id:string;paragraphId:string;quote:string;question:string;options:{id:ArgumentChoice;text:string}[];preferredId:ArgumentChoice;model:string;counter:string};
export type ArgumentStudy={id:string;version:1;domain:'G11';band:'C1'|'C2';title:string;focus:string;brief:string;paragraphs:{id:string;text:string}[];arguments:ArgumentNode[];status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const argumentStudies:ArgumentStudy[]=raw as ArgumentStudy[];
export const argumentId=(id:string)=>'argument:'+id;
export const isArgumentEntry=(e:ProductionEntry)=>e.kind==='ARGUMENT_STUDY'&&e.id===argumentId(e.itemId);
export const argumentSource=(e:ProductionEntry):ArgumentStudy|null=>isArgumentEntry(e)?argumentStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const MARK_WARRANT='\n\nVerbindende Annahme:\n',MARK_COUNTER='\n\nErnstzunehmender Einwand:\n';
const norm=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(s:string,min:number,max:number)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
const choiceOK=(a:ArgumentNode,s:string):s is ArgumentChoice=>(s==='A'||s==='B')&&a.options.some(o=>o.id===s);
const serialize=(claim:string,warrant:string)=>claim.trim()+MARK_WARRANT+warrant.trim();
function splitPair(t:string):{claim:string;warrant:string}|null{
 const i=t.indexOf(MARK_WARRANT);if(i<=0||t.indexOf(MARK_WARRANT,i+MARK_WARRANT.length)>=0)return null;
 const claim=t.slice(0,i).trim(),warrant=t.slice(i+MARK_WARRANT.length).trim();return claim&&warrant?{claim,warrant}:null;
}
function splitFirst(t:string):{claim:string;warrant:string;counter:string}|null{
 const i=t.indexOf(MARK_COUNTER);if(i<=0||t.indexOf(MARK_COUNTER,i+MARK_COUNTER.length)>=0)return null;
 const p=splitPair(t.slice(0,i)),counter=t.slice(i+MARK_COUNTER.length).trim();return p&&counter?{...p,counter}:null;
}
export function independentArgument(a:ArgumentNode,claim:string,warrant:string,counter:string):boolean{
 return valid(claim,100,1350)&&valid(warrant,70,1150)&&valid(counter,90,1300)&&
 norm(claim)!==norm(warrant)&&norm(claim)!==norm(counter)&&norm(warrant)!==norm(counter)&&
 !norm(claim).includes(norm(a.quote))&&!norm(warrant).includes(norm(a.quote))&&!norm(counter).includes(norm(a.quote))&&
 ![claim,warrant,counter].some(t=>a.options.some(o=>norm(t)===norm(o.text))||norm(t)===norm(a.model)||norm(t)===norm(a.counter));
}
export type ArgumentEvidence={nodeId:string;paragraphId:string;choice:ArgumentChoice;claim:string;warrant:string;counter:string;initial:boolean};
export function firstArgumentEvidence(e:ProductionEntry):ArgumentEvidence|null{
 const s=argumentSource(e),a=s?.arguments[0],parts=e.decisionId?.split('|'),text=splitFirst(e.original);
 if(!a||!text||!parts||parts.length!==3||parts[0]!==a.id||parts[2]!==a.paragraphId||!choiceOK(a,parts[1])||!independentArgument(a,text.claim,text.warrant,text.counter))return null;
 return {nodeId:a.id,paragraphId:a.paragraphId,choice:parts[1],...text,initial:true};
}
export function savedArgumentEvidence(e:ProductionEntry,a:ArgumentNode):ArgumentEvidence|null{
 const s=argumentSource(e),f=firstArgumentEvidence(e);
 if(!s||!f||!s.arguments.some(x=>x.id===a.id&&x.paragraphId===a.paragraphId))return null;
 if(a.id===s.arguments[0].id)return f;
 const r=e.revisions.find(x=>x.questionId==='ARGUMENT:'+a.id),v=r?splitPair(r.text):null,c=r?.selfChecks?.[0];
 if(!r||!v||r.paragraphId!==a.paragraphId||!c||!choiceOK(a,c)||!independentArgument(a,v.claim,v.warrant,r.reflection))return null;
 return {nodeId:a.id,paragraphId:a.paragraphId,choice:c,...v,counter:r.reflection,initial:false};
}
export function nextArgumentNode(s:ArgumentStudy,e:ProductionEntry|null):ArgumentNode|null{
 if(!e)return s.arguments[0]??null;
 if(argumentSource(e)?.id!==s.id||!firstArgumentEvidence(e))return null;
 return s.arguments.find(a=>!savedArgumentEvidence(e,a))??null;
}
export function beginArgument(s:ArgumentStudy,id:string,choice:ArgumentChoice,claim:string,warrant:string,counter:string,at:number):ProductionEntry{
 const source=argumentStudies.find(x=>x.id===s.id&&x.version===s.version),a=source?.arguments[0];
 if(!a||a.id!==id||!choiceOK(a,choice)||!independentArgument(a,claim,warrant,counter)||!Number.isFinite(at))throw Error('Eigenständige Argumentkette und Gegenposition fehlen.');
 const original=serialize(claim,warrant)+MARK_COUNTER+counter.trim();
 if(original.length>3600)throw Error('Erstfassung zu lang.');
 return {id:argumentId(s.id),kind:'ARGUMENT_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:id+'|'+choice+'|'+a.paragraphId,createdAt:at,original,revisions:[],evaluated:'UNASSESSED'};
}
export function appendArgumentNode(e:ProductionEntry,s:ArgumentStudy,id:string,choice:ArgumentChoice,claim:string,warrant:string,counter:string,revId:string,at:number):ProductionEntry{
 const src=argumentSource(e),a=src?.arguments.find(x=>x.id===id);
 if(!src||src.id!==s.id||!firstArgumentEvidence(e)||!a||nextArgumentNode(s,e)?.id!==id||!choiceOK(a,choice)||!independentArgument(a,claim,warrant,counter)||!revId||!Number.isFinite(at))throw Error('Unabhängige Quellenargumentation fehlt oder falsche Reihenfolge.');
 const revision:ProductionRevision={id:revId,at,text:serialize(claim,warrant),reflection:counter.trim(),questionId:'ARGUMENT:'+id,paragraphId:a.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function latestArgumentEssay(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(x=>x.questionId==='TRANSFER'||x.questionId==='REWRITE')??null;
}
export function appendArgumentEssay(e:ProductionEntry,s:ArgumentStudy,stage:'TRANSFER'|'REWRITE',essay:string,reason:string,nodeId:string,revId:string,at:number):ProductionEntry{
 const src=argumentSource(e),a=src?.arguments.find(x=>x.id===nodeId),prev=latestArgumentEssay(e);
 if(!src||src.id!==s.id||!firstArgumentEvidence(e)||nextArgumentNode(s,e)!==null||!a||!valid(essay,480,3800)||!valid(reason,75,1250)||!revId||!Number.isFinite(at)||
 (stage==='TRANSFER'&&prev!==null)||(stage==='REWRITE'&&prev===null)||!['TRANSFER','REWRITE'].includes(stage)||(prev&&norm(prev.text)===norm(essay)))throw Error('Quellengedeckter Argumenttext oder sinnvolle Überarbeitung fehlt.');
 const revision:ProductionRevision={id:revId,at,text:essay.trim(),reflection:reason.trim(),questionId:stage,paragraphId:a.paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'BEDEUTUNG',selfChecks:['WARRANT:'+nodeId,'COUNTERARGUMENT']};
 return {...e,revisions:[...e.revisions,revision]};
}
export function argumentProgress(entries:readonly ProductionEntry[]){
 const rows=argumentStudies.map(s=>({s,e:entries.find(e=>isArgumentEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstArgumentEvidence(x.e)).length,chains:rows.reduce((n,x)=>n+(x.e?x.s.arguments.filter(a=>savedArgumentEvidence(x.e!,a)).length:0),0),transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,revised:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:argumentStudies.length};
}
export function nextArgumentStudy(entries:readonly ProductionEntry[]):ArgumentStudy{
 return argumentStudies.find(s=>entries.some(e=>isArgumentEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))||argumentStudies.find(s=>!entries.some(e=>isArgumentEntry(e)&&e.itemId===s.id))||argumentStudies[0];
}
