import raw from '../../../content/fixtures/g03-attachment.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type AttachmentChoice='A'|'B';
export type AttachmentPoint={
 id:string;paragraphId:string;type:string;quote:string;question:string;
 options:{id:AttachmentChoice;text:string}[];preferredId:AttachmentChoice;model:string;trap:string;
};
export type AttachmentStudy={
 id:string;version:1;domain:'G03';band:'C1'|'C2';title:string;focus:string;brief:string;
 paragraphs:{id:string;text:string}[];attachments:AttachmentPoint[];
 status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;
 rights:{kind:'ORIGINAL_DRAFT';source:string};
};
export type AttachmentEvidence={
 attachmentId:string;paragraphId:string;choice:AttachmentChoice;
 rewrite:string;alternative:string;context:string;boundary:string;initial:boolean;
};
export const attachmentStudies:AttachmentStudy[]=raw as AttachmentStudy[];
export const attachmentId=(id:string)=>'attachment:'+id;
export const isAttachmentEntry=(e:ProductionEntry):boolean=>e.kind==='ATTACHMENT_STUDY'&&e.id===attachmentId(e.itemId);
export const attachmentSource=(e:ProductionEntry):AttachmentStudy|null=>
 isAttachmentEntry(e)?attachmentStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const ALT='\n\nAlternative Anbindung:\n',CONTEXT='\n\nQuellenkontext:\n',LIMIT='\n\nNicht belegte Folgerung:\n';
const markers=[ALT,CONTEXT,LIMIT];
const norm=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const isChoice=(p:AttachmentPoint,x:string):x is AttachmentChoice=>(x==='A'||x==='B')&&p.options.some(o=>o.id===x);
function encoded(rewrite:string,alternative:string,context:string,boundary:string){
 return rewrite.trim()+ALT+alternative.trim()+CONTEXT+context.trim()+LIMIT+boundary.trim();
}
function decoded(text:string):{rewrite:string;alternative:string;context:string;boundary:string}|null{
 const a=text.indexOf(ALT);if(a<=0||text.indexOf(ALT,a+ALT.length)!==-1)return null;
 const b=text.indexOf(CONTEXT,a+ALT.length);if(b<0||text.indexOf(CONTEXT,b+CONTEXT.length)!==-1)return null;
 const c=text.indexOf(LIMIT,b+CONTEXT.length);if(c<0||text.indexOf(LIMIT,c+LIMIT.length)!==-1)return null;
 const rewrite=text.slice(0,a).trim(),alternative=text.slice(a+ALT.length,b).trim(),
  context=text.slice(b+CONTEXT.length,c).trim(),boundary=text.slice(c+LIMIT.length).trim();
 return rewrite&&alternative&&context&&boundary?{rewrite,alternative,context,boundary}:null;
}
export function independentAttachment(p:AttachmentPoint,rewrite:string,alternative:string,context:string,boundary:string):boolean{
 const parts=[rewrite,alternative,context,boundary];
 if(!valid(rewrite,90,1450)||!valid(alternative,90,1450)||!valid(context,110,1650)||!valid(boundary,90,1400))return false;
 if(parts.some(s=>markers.some(m=>s.includes(m))))return false;
 const normalized=parts.map(norm);
 if(new Set(normalized).size!==4)return false;
 const copied=[p.quote,p.model,p.trap,...p.options.map(o=>o.text)].map(norm);
 return normalized.every(s=>!s.includes(norm(p.quote))&&!copied.includes(s));
}
export function beginAttachment(s:AttachmentStudy,pointId:string,choice:AttachmentChoice,rewrite:string,alternative:string,context:string,boundary:string,at:number):ProductionEntry{
 const source=attachmentStudies.find(x=>x.id===s.id&&x.version===s.version),p=source?.attachments[0];
 if(!p||p.id!==pointId||!isChoice(p,choice)||!independentAttachment(p,rewrite,alternative,context,boundary)||!Number.isFinite(at))throw Error('Eigenständige Anbindungsanalyse, Gegenlesart, Quellenbeleg und Grenze erforderlich.');
 return {id:attachmentId(s.id),kind:'ATTACHMENT_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,
  decisionId:p.id+'|'+choice+'|'+p.paragraphId,createdAt:at,original:encoded(rewrite,alternative,context,boundary),revisions:[],evaluated:'UNASSESSED'};
}
export function firstAttachment(e:ProductionEntry):AttachmentEvidence|null{
 const s=attachmentSource(e),p=s?.attachments[0],parts=e.decisionId?.split('|'),parsed=decoded(e.original);
 if(!p||!parts||parts.length!==3||parts[0]!==p.id||parts[2]!==p.paragraphId||!isChoice(p,parts[1])||!parsed||
 !independentAttachment(p,parsed.rewrite,parsed.alternative,parsed.context,parsed.boundary))return null;
 return {attachmentId:p.id,paragraphId:p.paragraphId,choice:parts[1],...parsed,initial:true};
}
export function savedAttachment(e:ProductionEntry,p:AttachmentPoint):AttachmentEvidence|null{
 const s=attachmentSource(e),first=firstAttachment(e);
 if(!s||!first||!s.attachments.some(q=>q.id===p.id&&q.paragraphId===p.paragraphId))return null;
 if(s.attachments[0].id===p.id)return first;
 const rev=e.revisions.find(r=>r.questionId==='ATTACH:'+p.id),parts=rev?decoded(rev.text):null,c=rev?.selfChecks?.[0];
 if(!rev||!parts||rev.paragraphId!==p.paragraphId||!c||!isChoice(p,c)||!independentAttachment(p,parts.rewrite,parts.alternative,parts.context,parts.boundary))return null;
 return {attachmentId:p.id,paragraphId:p.paragraphId,choice:c,...parts,initial:false};
}
export function nextAttachment(s:AttachmentStudy,e:ProductionEntry|null):AttachmentPoint|null{
 if(!e)return s.attachments[0]??null;
 if(attachmentSource(e)?.id!==s.id||!firstAttachment(e))return null;
 return s.attachments.find(p=>!savedAttachment(e,p))??null;
}
export function appendAttachment(e:ProductionEntry,s:AttachmentStudy,pointId:string,choice:AttachmentChoice,rewrite:string,alternative:string,context:string,boundary:string,revisionId:string,at:number):ProductionEntry{
 const source=attachmentSource(e),p=source?.attachments.find(x=>x.id===pointId);
 if(!source||source.id!==s.id||!firstAttachment(e)||!p||nextAttachment(s,e)?.id!==pointId||!isChoice(p,choice)||
 !independentAttachment(p,rewrite,alternative,context,boundary)||!revisionId||e.revisions.some(r=>r.id===revisionId)||!Number.isFinite(at))throw Error('Anbindungsbeleg fehlt oder ist außerhalb der Reihenfolge.');
 const revision:ProductionRevision={id:revisionId,at,text:encoded(rewrite,alternative,context,boundary),reflection:'Anbindungsanalyse: '+p.type,questionId:'ATTACH:'+p.id,paragraphId:p.paragraphId,lens:'SYNTAX',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,revision]};
}
export const latestAttachmentMemo=(e:ProductionEntry):ProductionRevision|null=>
 [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
const wordSet=(text:string)=>new Set(norm(text).match(/[\p{L}]{3,}/gu)??[]);
export function substantialAttachmentRevision(a:string,b:string):boolean{
 if(norm(a)===norm(b))return false;
 const x=wordSet(a),y=wordSet(b);
 return [...x].filter(z=>!y.has(z)).length+[...y].filter(z=>!x.has(z)).length>=8;
}
export function appendAttachmentMemo(e:ProductionEntry,s:AttachmentStudy,stage:'TRANSFER'|'REWRITE',memo:string,reason:string,anchorId:string,revisionId:string,at:number):ProductionEntry{
 const source=attachmentSource(e),prior=latestAttachmentMemo(e),p=source?.attachments.find(x=>x.id===anchorId);
 if(!source||source.id!==s.id||!firstAttachment(e)||nextAttachment(s,e)!==null||!p||
 !valid(memo,560,3900)||memo.trim().split(/\n\s*\n/).filter(Boolean).length<2||!valid(reason,110,1500)||
 !revisionId||e.revisions.some(r=>r.id===revisionId)||!Number.isFinite(at)||
 (stage==='TRANSFER'&&prior!==null)||(stage==='REWRITE'&&(!prior||!substantialAttachmentRevision(prior.text,memo))))throw Error('Ein vollständiger eigenständiger Vermerk oder eine substantielle Revision fehlt.');
 const revision:ProductionRevision={id:revisionId,at,text:memo.trim(),reflection:reason.trim(),questionId:stage,paragraphId:p.paragraphId,lens:stage==='REWRITE'?'REGISTER':'SYNTAX',selfChecks:['ATTACH:'+p.id]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function attachmentProgress(entries:readonly ProductionEntry[]){
 const rows=attachmentStudies.map(s=>({s,e:entries.find(e=>isAttachmentEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstAttachment(x.e)).length,analyses:rows.reduce((n,x)=>n+(x.e?x.s.attachments.filter(p=>savedAttachment(x.e!,p)).length:0),0),
  transferred:rows.filter(x=>x.e?.revisions.some(r=>r.questionId==='TRANSFER')).length,
  revised:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:attachmentStudies.length};
}
export function nextAttachmentStudy(entries:readonly ProductionEntry[]):AttachmentStudy{
 return attachmentStudies.find(s=>entries.some(e=>isAttachmentEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))||
 attachmentStudies.find(s=>!entries.some(e=>isAttachmentEntry(e)&&e.itemId===s.id))||attachmentStudies[0];
}
