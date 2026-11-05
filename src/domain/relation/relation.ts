import raw from '../../../content/fixtures/g04-relations.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type RelationChoice='A'|'B';
export type RelationPoint={
 id:string;paragraphId:string;relation:string;quote:string;question:string;
 options:{id:RelationChoice;text:string}[];preferredId:RelationChoice;model:string;trap:string;
};
export type RelationStudy={
 id:string;version:1;domain:'G04';band:'C1'|'C2';title:string;focus:string;brief:string;
 paragraphs:{id:string;text:string}[];relations:RelationPoint[];
 status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;
 rights:{kind:'ORIGINAL_DRAFT';source:string};
};
export type RelationEvidence={
 relationId:string;paragraphId:string;choice:RelationChoice;
 rewrite:string;alternative:string;context:string;boundary:string;initial:boolean;
};
export const relationStudies:RelationStudy[]=raw as RelationStudy[];
export const relationId=(id:string)=>'relation:'+id;
export const isRelationEntry=(e:ProductionEntry):boolean=>e.kind==='RELATION_STUDY'&&e.id===relationId(e.itemId);
export const relationSource=(e:ProductionEntry):RelationStudy|null=>
 isRelationEntry(e)?relationStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const ALT='\n\nFalsche Relation:\n',CONTEXT='\n\nQuellenkontext:\n',LIMIT='\n\nNicht belegte Folgerung:\n';
const markers=[ALT,CONTEXT,LIMIT];
const norm=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const isChoice=(p:RelationPoint,x:string):x is RelationChoice=>(x==='A'||x==='B')&&p.options.some(o=>o.id===x);
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
export function independentRelation(p:RelationPoint,rewrite:string,alternative:string,context:string,boundary:string):boolean{
 const parts=[rewrite,alternative,context,boundary];
 if(!valid(rewrite,90,1450)||!valid(alternative,90,1450)||!valid(context,110,1650)||!valid(boundary,90,1400))return false;
 if(parts.some(s=>markers.some(m=>s.includes(m))))return false;
 const normalized=parts.map(norm);
 if(new Set(normalized).size!==4)return false;
 const copied=[p.quote,p.model,p.trap,...p.options.map(o=>o.text)].map(norm);
 return normalized.every(s=>!s.includes(norm(p.quote))&&!copied.includes(s));
}
export function beginRelation(s:RelationStudy,pointId:string,choice:RelationChoice,rewrite:string,alternative:string,context:string,boundary:string,at:number):ProductionEntry{
 const source=relationStudies.find(x=>x.id===s.id&&x.version===s.version),p=source?.relations[0];
 if(!p||p.id!==pointId||!isChoice(p,choice)||!independentRelation(p,rewrite,alternative,context,boundary)||!Number.isFinite(at))throw Error('Eigenständige Relationsanalyse, Gegenlesart, Quellenbeleg und Grenze erforderlich.');
 return {id:relationId(s.id),kind:'RELATION_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,
  decisionId:p.id+'|'+choice+'|'+p.paragraphId,createdAt:at,original:encoded(rewrite,alternative,context,boundary),revisions:[],evaluated:'UNASSESSED'};
}
export function firstRelation(e:ProductionEntry):RelationEvidence|null{
 const s=relationSource(e),p=s?.relations[0],parts=e.decisionId?.split('|'),parsed=decoded(e.original);
 if(!p||!parts||parts.length!==3||parts[0]!==p.id||parts[2]!==p.paragraphId||!isChoice(p,parts[1])||!parsed||
 !independentRelation(p,parsed.rewrite,parsed.alternative,parsed.context,parsed.boundary))return null;
 return {relationId:p.id,paragraphId:p.paragraphId,choice:parts[1],...parsed,initial:true};
}
export function savedRelation(e:ProductionEntry,p:RelationPoint):RelationEvidence|null{
 const s=relationSource(e),first=firstRelation(e);
 if(!s||!first||!s.relations.some(q=>q.id===p.id&&q.paragraphId===p.paragraphId))return null;
 if(s.relations[0].id===p.id)return first;
 const rev=e.revisions.find(r=>r.questionId==='RELATION:'+p.id),parts=rev?decoded(rev.text):null,c=rev?.selfChecks?.[0];
 if(!rev||!parts||rev.paragraphId!==p.paragraphId||!c||!isChoice(p,c)||!independentRelation(p,parts.rewrite,parts.alternative,parts.context,parts.boundary))return null;
 return {relationId:p.id,paragraphId:p.paragraphId,choice:c,...parts,initial:false};
}
export function nextRelation(s:RelationStudy,e:ProductionEntry|null):RelationPoint|null{
 if(!e)return s.relations[0]??null;
 if(relationSource(e)?.id!==s.id||!firstRelation(e))return null;
 return s.relations.find(p=>!savedRelation(e,p))??null;
}
export function appendRelation(e:ProductionEntry,s:RelationStudy,pointId:string,choice:RelationChoice,rewrite:string,alternative:string,context:string,boundary:string,revisionId:string,at:number):ProductionEntry{
 const source=relationSource(e),p=source?.relations.find(x=>x.id===pointId);
 if(!source||source.id!==s.id||!firstRelation(e)||!p||nextRelation(s,e)?.id!==pointId||!isChoice(p,choice)||
 !independentRelation(p,rewrite,alternative,context,boundary)||!revisionId||e.revisions.some(r=>r.id===revisionId)||!Number.isFinite(at))throw Error('Relationsbeleg fehlt oder ist außerhalb der Reihenfolge.');
 const revision:ProductionRevision={id:revisionId,at,text:encoded(rewrite,alternative,context,boundary),reflection:'Relationsanalyse: '+p.relation,questionId:'RELATION:'+p.id,paragraphId:p.paragraphId,lens:'SYNTAX',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,revision]};
}
export const latestRelationMemo=(e:ProductionEntry):ProductionRevision|null=>
 [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
const wordSet=(text:string)=>new Set(norm(text).match(/[\p{L}]{3,}/gu)??[]);
export function substantialRelationRevision(a:string,b:string):boolean{
 if(norm(a)===norm(b))return false;
 const x=wordSet(a),y=wordSet(b);
 return [...x].filter(z=>!y.has(z)).length+[...y].filter(z=>!x.has(z)).length>=8;
}
export function appendRelationMemo(e:ProductionEntry,s:RelationStudy,stage:'TRANSFER'|'REWRITE',memo:string,reason:string,anchorId:string,revisionId:string,at:number):ProductionEntry{
 const source=relationSource(e),prior=latestRelationMemo(e),p=source?.relations.find(x=>x.id===anchorId);
 if(!source||source.id!==s.id||!firstRelation(e)||nextRelation(s,e)!==null||!p||
 !valid(memo,560,3900)||memo.trim().split(/\n\s*\n/).filter(Boolean).length<2||!valid(reason,110,1500)||
 !revisionId||e.revisions.some(r=>r.id===revisionId)||!Number.isFinite(at)||
 (stage==='TRANSFER'&&prior!==null)||(stage==='REWRITE'&&(!prior||!substantialRelationRevision(prior.text,memo))))throw Error('Ein vollständiger eigenständiger Relationsvermerk oder eine substantielle Revision fehlt.');
 const revision:ProductionRevision={id:revisionId,at,text:memo.trim(),reflection:reason.trim(),questionId:stage,paragraphId:p.paragraphId,lens:stage==='REWRITE'?'REGISTER':'SYNTAX',selfChecks:['RELATION:'+p.id]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function relationProgress(entries:readonly ProductionEntry[]){
 const rows=relationStudies.map(s=>({s,e:entries.find(e=>isRelationEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstRelation(x.e)).length,analyses:rows.reduce((n,x)=>n+(x.e?x.s.relations.filter(p=>savedRelation(x.e!,p)).length:0),0),
  transferred:rows.filter(x=>x.e?.revisions.some(r=>r.questionId==='TRANSFER')).length,
  revised:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:relationStudies.length};
}
export function nextRelationStudy(entries:readonly ProductionEntry[]):RelationStudy{
 return relationStudies.find(s=>entries.some(e=>isRelationEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))||
 relationStudies.find(s=>!entries.some(e=>isRelationEntry(e)&&e.itemId===s.id))||relationStudies[0];
}
