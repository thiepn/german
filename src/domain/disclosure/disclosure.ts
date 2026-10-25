import raw from '../../../content/fixtures/g13-disclosure.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';
export type DisclosureChoice='A'|'B';
export type DisclosureDecision={id:string;paragraphId:string;quote:string;restricted:string;question:string;options:{id:DisclosureChoice;text:string}[];preferredId:DisclosureChoice;action:string;boundary:string};
export type DisclosureStudy={id:string;version:1;domain:'G13';band:'C1'|'C2';title:string;focus:string;brief:string;audiences:{id:string;label:string;purpose:string}[];paragraphs:{id:string;text:string}[];decisions:DisclosureDecision[];status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const disclosureStudies:DisclosureStudy[]=raw as DisclosureStudy[];
export const disclosureId=(id:string)=>'disclosure:'+id;
export const isDisclosureEntry=(e:ProductionEntry)=>e.kind==='DISCLOSURE_STUDY'&&e.id===disclosureId(e.itemId);
export const disclosureSource=(e:ProductionEntry):DisclosureStudy|null=>isDisclosureEntry(e)?disclosureStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const MARK_ACTION='\n\nNächster Schritt:\n',MARK_LIMIT='\n\nAusgelassene Einzelangabe:\n';
const norm=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(s:string,min:number,max:number)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
const acceptable=(d:DisclosureDecision,v:string):v is DisclosureChoice=>(v==='A'||v==='B')&&d.options.some(o=>o.id===v);
export function hasRestricted(s:DisclosureStudy,text:string):boolean{return s.decisions.some(d=>norm(text).includes(norm(d.restricted)))}
function separate(t:string):{rewrite:string;action:string}|null{
 const i=t.indexOf(MARK_ACTION);if(i<1||t.indexOf(MARK_ACTION,i+MARK_ACTION.length)>=0)return null;
 const rewrite=t.slice(0,i).trim(),action=t.slice(i+MARK_ACTION.length).trim();
 return rewrite&&action?{rewrite,action}:null;
}
function firstParts(t:string):{rewrite:string;action:string;omission:string}|null{
 const i=t.indexOf(MARK_LIMIT);if(i<1||t.indexOf(MARK_LIMIT,i+MARK_LIMIT.length)>=0)return null;
 const p=separate(t.slice(0,i)),omission=t.slice(i+MARK_LIMIT.length).trim();
 return p&&omission?{...p,omission}:null;
}
const join=(rewrite:string,action:string)=>rewrite.trim()+MARK_ACTION+action.trim();
export function independentDisclosure(s:DisclosureStudy,d:DisclosureDecision,rewrite:string,action:string,omission:string):boolean{
 return valid(rewrite,95,1400)&&valid(action,75,1100)&&valid(omission,65,1050)&&
 !hasRestricted(s,rewrite+' '+action+' '+omission)&&
 !norm(rewrite).includes(norm(d.quote))&&
 ![rewrite,action,omission].some(v=>norm(v)===norm(d.options[0].text)||norm(v)===norm(d.options[1].text)||norm(v)===norm(d.action)||norm(v)===norm(d.boundary))&&
 norm(rewrite)!==norm(action)&&norm(rewrite)!==norm(omission)&&norm(action)!==norm(omission);
}
export type DisclosureEvidence={decisionId:string;paragraphId:string;choice:DisclosureChoice;rewrite:string;action:string;omission:string;initial:boolean};
export function firstDisclosureEvidence(e:ProductionEntry):DisclosureEvidence|null{
 const s=disclosureSource(e),d=s?.decisions[0],a=e.decisionId?.split('|'),p=firstParts(e.original);
 if(!s||!d||!a||a.length!==3||a[0]!==d.id||a[2]!==d.paragraphId||!acceptable(d,a[1])||!p||!independentDisclosure(s,d,p.rewrite,p.action,p.omission))return null;
 return {decisionId:d.id,paragraphId:d.paragraphId,choice:a[1],...p,initial:true};
}
export function savedDisclosureEvidence(e:ProductionEntry,d:DisclosureDecision):DisclosureEvidence|null{
 const s=disclosureSource(e),first=firstDisclosureEvidence(e);
 if(!s||!first||!s.decisions.some(x=>x.id===d.id&&x.paragraphId===d.paragraphId))return null;
 if(d.id===s.decisions[0].id)return first;
 const rev=e.revisions.find(r=>r.questionId==='DISCLOSE:'+d.id),p=rev?separate(rev.text):null,v=rev?.selfChecks?.[0];
 if(!rev||!p||rev.paragraphId!==d.paragraphId||!v||!acceptable(d,v)||!independentDisclosure(s,d,p.rewrite,p.action,rev.reflection))return null;
 return {decisionId:d.id,paragraphId:d.paragraphId,choice:v,...p,omission:rev.reflection,initial:false};
}
export function nextDisclosureDecision(s:DisclosureStudy,e:ProductionEntry|null):DisclosureDecision|null{
 if(!e)return s.decisions[0]??null;
 if(disclosureSource(e)?.id!==s.id||!firstDisclosureEvidence(e))return null;
 return s.decisions.find(d=>!savedDisclosureEvidence(e,d))??null;
}
export function beginDisclosure(s:DisclosureStudy,id:string,choice:DisclosureChoice,rewrite:string,action:string,omission:string,at:number):ProductionEntry{
 const actual=disclosureStudies.find(x=>x.id===s.id&&x.version===s.version),d=actual?.decisions[0];
 if(!actual||!d||d.id!==id||!acceptable(d,choice)||!independentDisclosure(actual,d,rewrite,action,omission)||!Number.isFinite(at))throw Error('Quellenbezogene, datensparsame Übertragung fehlt.');
 const original=join(rewrite,action)+MARK_LIMIT+omission.trim();
 return {id:disclosureId(s.id),kind:'DISCLOSURE_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:d.id+'|'+choice+'|'+d.paragraphId,createdAt:at,original,revisions:[],evaluated:'UNASSESSED'};
}
export function appendDisclosureDecision(e:ProductionEntry,s:DisclosureStudy,id:string,choice:DisclosureChoice,rewrite:string,action:string,omission:string,revisionId:string,at:number):ProductionEntry{
 const source=disclosureSource(e),d=source?.decisions.find(x=>x.id===id);
 if(!source||source.id!==s.id||!firstDisclosureEvidence(e)||!d||nextDisclosureDecision(s,e)?.id!==id||!acceptable(d,choice)||!independentDisclosure(source,d,rewrite,action,omission)||!revisionId||!Number.isFinite(at))throw Error('Quellenspezifische Weitergabe oder Reihenfolge ungültig.');
 const rev:ProductionRevision={id:revisionId,at,text:join(rewrite,action),reflection:omission.trim(),questionId:'DISCLOSE:'+id,paragraphId:d.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,rev]};
}
export function latestAudience(e:ProductionEntry,audience:string):ProductionRevision|null{
 return [...e.revisions].reverse().find(r=>r.questionId==='AUDIENCE:'+audience||r.questionId==='REWRITE:'+audience)??null;
}
export function appendAudience(e:ProductionEntry,s:DisclosureStudy,audience:string,text:string,why:string,revisionId:string,at:number):ProductionEntry{
 const source=disclosureSource(e),a=source?.audiences.find(x=>x.id===audience),previous=latestAudience(e,audience);
 if(!source||source.id!==s.id||!firstDisclosureEvidence(e)||nextDisclosureDecision(s,e)!==null||!a||!valid(text,420,3700)||!valid(why,75,1200)||
 !revisionId||!Number.isFinite(at)||hasRestricted(source,text+' '+why)||(previous&&norm(previous.text)===norm(text)))throw Error('Adressatengerechter, datensparsamer Text oder unabhängige Revision fehlt.');
 const questionId=(previous?'REWRITE:':'AUDIENCE:')+audience;
 const rev:ProductionRevision={id:revisionId,at,text:text.trim(),reflection:why.trim(),questionId,paragraphId:source.decisions[0].paragraphId,lens:previous?'KOHÄRENZ':'REGISTER',selfChecks:['DISCLOSURE:'+audience]};
 return {...e,revisions:[...e.revisions,rev]};
}
export function disclosureProgress(entries:readonly ProductionEntry[]){
 const rows=disclosureStudies.map(s=>({s,e:entries.find(e=>isDisclosureEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstDisclosureEvidence(x.e)).length,decisions:rows.reduce((n,x)=>n+(x.e?x.s.decisions.filter(d=>savedDisclosureEvidence(x.e!,d)).length:0),0),
 audiences:rows.reduce((n,x)=>n+(x.e?x.s.audiences.filter(a=>latestAudience(x.e!,a.id)).length:0),0),
 revised:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId?.startsWith('REWRITE:')).length??0),0),total:disclosureStudies.length};
}
export function nextDisclosureStudy(entries:readonly ProductionEntry[]):DisclosureStudy{
 return disclosureStudies.find(s=>entries.some(e=>isDisclosureEntry(e)&&e.itemId===s.id&&!s.audiences.every(a=>latestAudience(e,a.id))))||
 disclosureStudies.find(s=>!entries.some(e=>isDisclosureEntry(e)&&e.itemId===s.id))||disclosureStudies[0];
}
