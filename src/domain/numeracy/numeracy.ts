import raw from '../../../content/fixtures/g09-numeracy.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';
export type NumericChoice='A'|'B';
export type NumericClaim={id:string;paragraphId:string;quote:string;question:string;options:{id:NumericChoice;text:string}[];preferredId:NumericChoice;model:string;trap:string};
export type NumericStudy={id:string;version:1;domain:'G09';band:'C1'|'C2';title:string;focus:string;brief:string;paragraphs:{id:string;text:string}[];claims:NumericClaim[];status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const numericStudies:NumericStudy[]=raw as NumericStudy[];
export const numericId=(id:string)=>'numeracy:'+id;
export const isNumericEntry=(e:ProductionEntry)=>e.kind==='NUMERIC_STUDY'&&e.id===numericId(e.itemId);
export const numericSource=(e:ProductionEntry):NumericStudy|null=>isNumericEntry(e)?numericStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const MARK_DENOM='\n\nBezugsgröße und Einheit:\n',MARK_LIMIT='\n\nUnzulässiger Schluss:\n';
const normalize=(t:string)=>t.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(t:string,min:number,max:number)=>typeof t==='string'&&t.trim().length>=min&&t.length<=max;
const choiceValid=(c:NumericClaim,v:string):v is NumericChoice=>(v==='A'||v==='B')&&c.options.some(o=>o.id===v);
function parts(t:string):{statement:string;denominator:string}|null{
 const i=t.indexOf(MARK_DENOM);if(i<=0||t.indexOf(MARK_DENOM,i+MARK_DENOM.length)>=0)return null;
 const statement=t.slice(0,i).trim(),denominator=t.slice(i+MARK_DENOM.length).trim();return statement&&denominator?{statement,denominator}:null;
}
function firstParts(t:string):{statement:string;denominator:string;limit:string}|null{
 const i=t.indexOf(MARK_LIMIT);if(i<=0||t.indexOf(MARK_LIMIT,i+MARK_LIMIT.length)>=0)return null;
 const pair=parts(t.slice(0,i)),limit=t.slice(i+MARK_LIMIT.length).trim();return pair&&limit?{...pair,limit}:null;
}
const serialize=(a:string,b:string)=>a.trim()+MARK_DENOM+b.trim();
export function independentNumeric(c:NumericClaim,statement:string,denominator:string,limit:string):boolean{
 return valid(statement,90,1450)&&valid(denominator,75,1200)&&valid(limit,85,1300)&&
 normalize(statement)!==normalize(denominator)&&normalize(statement)!==normalize(limit)&&normalize(denominator)!==normalize(limit)&&
 ![statement,denominator,limit].some(x=>normalize(x)===normalize(c.options[0].text)||normalize(x)===normalize(c.options[1].text)||normalize(x)===normalize(c.model)||normalize(x)===normalize(c.trap))&&
 !normalize(statement).includes(normalize(c.quote));
}
export type NumericEvidence={claimId:string;paragraphId:string;choice:NumericChoice;statement:string;denominator:string;limit:string;initial:boolean};
export function firstNumericEvidence(e:ProductionEntry):NumericEvidence|null{
 const s=numericSource(e),c=s?.claims[0],items=e.decisionId?.split('|'),p=firstParts(e.original);
 if(!c||!p||!items||items.length!==3||items[0]!==c.id||items[2]!==c.paragraphId||!choiceValid(c,items[1])||!independentNumeric(c,p.statement,p.denominator,p.limit))return null;
 return {claimId:c.id,paragraphId:c.paragraphId,choice:items[1],...p,initial:true};
}
export function savedNumericEvidence(e:ProductionEntry,c:NumericClaim):NumericEvidence|null{
 const s=numericSource(e),first=firstNumericEvidence(e);
 if(!s||!first||!s.claims.some(x=>x.id===c.id&&x.paragraphId===c.paragraphId))return null;
 if(c.id===s.claims[0].id)return first;
 const r=e.revisions.find(x=>x.questionId==='NUMERIC:'+c.id),p=r?parts(r.text):null,v=r?.selfChecks?.[0];
 if(!r||!p||r.paragraphId!==c.paragraphId||!v||!choiceValid(c,v)||!independentNumeric(c,p.statement,p.denominator,r.reflection))return null;
 return {claimId:c.id,paragraphId:c.paragraphId,choice:v,...p,limit:r.reflection,initial:false};
}
export function nextNumericClaim(s:NumericStudy,e:ProductionEntry|null):NumericClaim|null{
 if(!e)return s.claims[0]??null;
 if(numericSource(e)?.id!==s.id||!firstNumericEvidence(e))return null;
 return s.claims.find(c=>!savedNumericEvidence(e,c))??null;
}
export function beginNumeric(s:NumericStudy,id:string,choice:NumericChoice,statement:string,denominator:string,limit:string,at:number):ProductionEntry{
 const source=numericStudies.find(x=>x.id===s.id&&x.version===s.version),c=source?.claims[0];
 if(!c||c.id!==id||!choiceValid(c,choice)||!independentNumeric(c,statement,denominator,limit)||!Number.isFinite(at))throw Error('Numerische Wiedergabe, Bezugsgröße und Grenze erforderlich.');
 const original=serialize(statement,denominator)+MARK_LIMIT+limit.trim();if(original.length>4000)throw Error('Erstantwort zu lang.');
 return {id:numericId(s.id),kind:'NUMERIC_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:id+'|'+choice+'|'+c.paragraphId,createdAt:at,original,revisions:[],evaluated:'UNASSESSED'};
}
export function appendNumericClaim(e:ProductionEntry,s:NumericStudy,id:string,choice:NumericChoice,statement:string,denominator:string,limit:string,revId:string,at:number):ProductionEntry{
 const source=numericSource(e),c=source?.claims.find(x=>x.id===id);
 if(!source||source.id!==s.id||!firstNumericEvidence(e)||!c||nextNumericClaim(s,e)?.id!==id||!choiceValid(c,choice)||!independentNumeric(c,statement,denominator,limit)||!revId||!Number.isFinite(at))throw Error('Quellenbezogene numerische Wiedergabe fehlt oder falsche Reihenfolge.');
 const rev:ProductionRevision={id:revId,at,text:serialize(statement,denominator),reflection:limit.trim(),questionId:'NUMERIC:'+id,paragraphId:c.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,rev]};
}
export function latestNumericReport(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendNumericReport(e:ProductionEntry,s:NumericStudy,stage:'TRANSFER'|'REWRITE',report:string,why:string,id:string,revId:string,at:number):ProductionEntry{
 const source=numericSource(e),c=source?.claims.find(x=>x.id===id),prev=latestNumericReport(e);
 if(!source||source.id!==s.id||!firstNumericEvidence(e)||nextNumericClaim(s,e)!==null||!c||!valid(report,480,3800)||!valid(why,75,1250)||!revId||!Number.isFinite(at)||
 (stage==='TRANSFER'&&prev!==null)||(stage==='REWRITE'&&prev===null)||!['TRANSFER','REWRITE'].includes(stage)||(prev&&normalize(prev.text)===normalize(report)))throw Error('Eigenständiger zahlenpräziser Bericht oder Überarbeitung fehlt.');
 const rev:ProductionRevision={id:revId,at,text:report.trim(),reflection:why.trim(),questionId:stage,paragraphId:c.paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'BEDEUTUNG',selfChecks:['DENOMINATOR:'+id]};
 return {...e,revisions:[...e.revisions,rev]};
}
export function numericProgress(entries:readonly ProductionEntry[]){
 const rows=numericStudies.map(s=>({s,e:entries.find(e=>isNumericEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstNumericEvidence(x.e)).length,claims:rows.reduce((n,x)=>n+(x.e?x.s.claims.filter(c=>savedNumericEvidence(x.e!,c)).length:0),0),transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,revised:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:numericStudies.length};
}
export function nextNumericStudy(entries:readonly ProductionEntry[]):NumericStudy{
 return numericStudies.find(s=>entries.some(e=>isNumericEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))||numericStudies.find(s=>!entries.some(e=>isNumericEntry(e)&&e.itemId===s.id))||numericStudies[0];
}
