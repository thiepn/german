import raw from '../../../content/fixtures/g04-scope.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';
export type ScopeChoice='A'|'B';
export type ScopeClaim={id:string;paragraphId:string;particle:string;quote:string;question:string;options:{id:ScopeChoice;text:string}[];preferredId:ScopeChoice;model:string;trap:string};
export type ScopeStudy={id:string;version:1;domain:'G04';band:'C1'|'C2';title:string;focus:string;brief:string;paragraphs:{id:string;text:string}[];scopes:ScopeClaim[];status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const scopeStudies:ScopeStudy[]=raw as ScopeStudy[];
export const scopeId=(id:string)=>'scope:'+id;
export const isScopeEntry=(e:ProductionEntry)=>e.kind==='SCOPE_STUDY'&&e.id===scopeId(e.itemId);
export const scopeSource=(e:ProductionEntry):ScopeStudy|null=>isScopeEntry(e)?scopeStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
export type ScopeEvidence={claimId:string;paragraphId:string;choice:ScopeChoice;interpretation:string;boundary:string;example:string;initial:boolean};
const LIMIT='\n\nUnzulässige Schlussfolgerung:\n',EXAMPLE='\n\nGegenbeispiel:\n';
const norm=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const choices=(c:ScopeClaim,v:string):v is ScopeChoice=>(v==='A'||v==='B')&&c.options.some(o=>o.id===v);
const join=(a:string,b:string)=>a.trim()+LIMIT+b.trim();
function pair(t:string):{interpretation:string;boundary:string}|null{
 const i=t.indexOf(LIMIT);if(i<=0||t.indexOf(LIMIT,i+LIMIT.length)!==-1)return null;
 const interpretation=t.slice(0,i).trim(),boundary=t.slice(i+LIMIT.length).trim();
 return interpretation&&boundary?{interpretation,boundary}:null;
}
function firstParts(t:string):{interpretation:string;boundary:string;example:string}|null{
 const i=t.indexOf(EXAMPLE);if(i<=0||t.indexOf(EXAMPLE,i+EXAMPLE.length)!==-1)return null;
 const first=pair(t.slice(0,i)),example=t.slice(i+EXAMPLE.length).trim();
 return first&&example?{...first,example}:null;
}
export function independentScope(c:ScopeClaim,interpretation:string,boundary:string,example:string):boolean{
 if(!valid(interpretation,105,1500)||!valid(boundary,95,1400)||!valid(example,95,1500))return false;
 const all=[interpretation,boundary,example],n=all.map(norm);
 if(new Set(n).size!==3||all.some(x=>x.includes(LIMIT)||x.includes(EXAMPLE)))return false;
 const copied=[c.quote,c.model,c.trap,...c.options.map(o=>o.text)].map(norm);
 return n.every(x=>!x.includes(norm(c.quote))&&!copied.includes(x));
}
export function beginScope(s:ScopeStudy,id:string,choice:ScopeChoice,a:string,b:string,c:string,at:number):ProductionEntry{
 const source=scopeStudies.find(x=>x.id===s.id&&x.version===s.version),q=source?.scopes[0];
 if(!q||q.id!==id||!choices(q,choice)||!independentScope(q,a,b,c)||!Number.isFinite(at))throw Error('Skopusanalyse, Aussagegrenze und Gegenbeispiel fehlen.');
 return {id:scopeId(s.id),kind:'SCOPE_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:id+'|'+choice+'|'+q.paragraphId,createdAt:at,original:join(a,b)+EXAMPLE+c.trim(),revisions:[],evaluated:'UNASSESSED'};
}
export function firstScopeEvidence(e:ProductionEntry):ScopeEvidence|null{
 const s=scopeSource(e),q=s?.scopes[0],parts=e.decisionId?.split('|'),p=firstParts(e.original);
 if(!q||!parts||parts.length!==3||parts[0]!==q.id||parts[2]!==q.paragraphId||!choices(q,parts[1])||!p||!independentScope(q,p.interpretation,p.boundary,p.example))return null;
 return {claimId:q.id,paragraphId:q.paragraphId,choice:parts[1],...p,initial:true};
}
export function savedScopeEvidence(e:ProductionEntry,q:ScopeClaim):ScopeEvidence|null{
 const s=scopeSource(e),first=firstScopeEvidence(e);
 if(!s||!first||!s.scopes.some(x=>x.id===q.id&&x.paragraphId===q.paragraphId))return null;
 if(s.scopes[0].id===q.id)return first;
 const rev=e.revisions.find(x=>x.questionId==='SCOPE:'+q.id),p=rev?pair(rev.text):null,c=rev?.selfChecks?.[0];
 if(!rev||!p||rev.paragraphId!==q.paragraphId||!c||!choices(q,c)||!independentScope(q,p.interpretation,p.boundary,rev.reflection))return null;
 return {claimId:q.id,paragraphId:q.paragraphId,choice:c,...p,example:rev.reflection,initial:false};
}
export function nextScope(s:ScopeStudy,e:ProductionEntry|null):ScopeClaim|null{
 if(!e)return s.scopes[0]??null;
 if(scopeSource(e)?.id!==s.id||!firstScopeEvidence(e))return null;
 return s.scopes.find(q=>!savedScopeEvidence(e,q))??null;
}
export function appendScopeEvidence(e:ProductionEntry,s:ScopeStudy,id:string,choice:ScopeChoice,a:string,b:string,c:string,revisionId:string,at:number):ProductionEntry{
 const source=scopeSource(e),q=source?.scopes.find(x=>x.id===id);
 if(!source||source.id!==s.id||!firstScopeEvidence(e)||!q||nextScope(s,e)?.id!==id||!choices(q,choice)||!independentScope(q,a,b,c)||!revisionId||e.revisions.some(x=>x.id===revisionId)||!Number.isFinite(at))throw Error('Skopusbeleg fehlt oder steht außerhalb der Reihenfolge.');
 const rev:ProductionRevision={id:revisionId,at,text:join(a,b),reflection:c.trim(),questionId:'SCOPE:'+id,paragraphId:q.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,rev]};
}
export const latestScopeDocument=(e:ProductionEntry):ProductionRevision|null=>[...e.revisions].reverse().find(x=>x.questionId==='TRANSFER'||x.questionId==='REWRITE')??null;
const words=(s:string)=>new Set(norm(s).match(/[\p{L}]{3,}/gu)??[]);
export function substantialScopeRevision(previous:string,next:string):boolean{
 if(norm(previous)===norm(next))return false;
 const a=words(previous),b=words(next);
 return [...a].filter(x=>!b.has(x)).length+[...b].filter(x=>!a.has(x)).length>=8;
}
export function appendScopeDocument(e:ProductionEntry,s:ScopeStudy,stage:'TRANSFER'|'REWRITE',document:string,why:string,anchorId:string,revisionId:string,at:number):ProductionEntry{
 const source=scopeSource(e),previous=latestScopeDocument(e),q=source?.scopes.find(x=>x.id===anchorId);
 if(!source||source.id!==s.id||!firstScopeEvidence(e)||nextScope(s,e)!==null||!q||!valid(document,520,3900)||
 document.trim().split(/\n\s*\n/).filter(Boolean).length<2||!valid(why,95,1300)||!revisionId||e.revisions.some(x=>x.id===revisionId)||!Number.isFinite(at)||
 (stage==='TRANSFER'&&previous!==null)||(stage==='REWRITE'&&(!previous||!substantialScopeRevision(previous.text,document)))||!['TRANSFER','REWRITE'].includes(stage))throw Error('Eigenständiger Quellenvermerk oder substanzielle mehrabsätzige Revision fehlt.');
 const rev:ProductionRevision={id:revisionId,at,text:document.trim(),reflection:why.trim(),questionId:stage,paragraphId:q.paragraphId,lens:stage==='REWRITE'?'REGISTER':'BEDEUTUNG',selfChecks:['SCOPE:'+q.id]};
 return {...e,revisions:[...e.revisions,rev]};
}
export function scopeProgress(entries:readonly ProductionEntry[]){
 const rows=scopeStudies.map(s=>({s,e:entries.find(e=>isScopeEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstScopeEvidence(x.e)).length,analyses:rows.reduce((n,x)=>n+(x.e?x.s.scopes.filter(q=>savedScopeEvidence(x.e!,q)).length:0),0),transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,revised:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:scopeStudies.length};
}
export function nextScopeStudy(entries:readonly ProductionEntry[]):ScopeStudy{
 return scopeStudies.find(s=>entries.some(e=>isScopeEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))||scopeStudies.find(s=>!entries.some(e=>isScopeEntry(e)&&e.itemId===s.id))||scopeStudies[0];
}
