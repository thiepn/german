import raw from '../../../content/fixtures/g06-definition.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';
export type DefinitionChoice='A'|'B';
export type DefinitionDistinction={id:string;paragraphId:string;term:string;nearTerm:string;quote:string;question:string;options:{id:DefinitionChoice;text:string}[];preferredId:DefinitionChoice;model:string;trap:string};
export type DefinitionStudy={id:string;version:1;domain:'G06';band:'C1'|'C2';title:string;focus:string;brief:string;paragraphs:{id:string;text:string}[];distinctions:DefinitionDistinction[];status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const definitionStudies:DefinitionStudy[]=raw as DefinitionStudy[];
export const definitionId=(id:string)=>'definition:'+id;
export const isDefinitionEntry=(e:ProductionEntry)=>e.kind==='DEFINITION_STUDY'&&e.id===definitionId(e.itemId);
export const definitionSource=(e:ProductionEntry):DefinitionStudy|null=>isDefinitionEntry(e)?definitionStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const MARK_CONTRAST='\n\nAbgrenzung zum Nachbarbegriff:\n',MARK_EXAMPLE='\n\nAnwendungsbeispiel oder Grenzfall:\n';
const normalize=(t:string)=>t.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(t:string,min:number,max:number)=>typeof t==='string'&&t.trim().length>=min&&t.length<=max;
const choiceValid=(c:DefinitionDistinction,v:string):v is DefinitionChoice=>(v==='A'||v==='B')&&c.options.some(o=>o.id===v);
function parts(t:string):{definition:string;contrast:string}|null{
 const i=t.indexOf(MARK_CONTRAST);if(i<=0||t.indexOf(MARK_CONTRAST,i+MARK_CONTRAST.length)>=0)return null;
 const definition=t.slice(0,i).trim(),contrast=t.slice(i+MARK_CONTRAST.length).trim();return definition&&contrast?{definition,contrast}:null;
}
function firstParts(t:string):{definition:string;contrast:string;application:string}|null{
 const i=t.indexOf(MARK_EXAMPLE);if(i<=0||t.indexOf(MARK_EXAMPLE,i+MARK_EXAMPLE.length)>=0)return null;
 const pair=parts(t.slice(0,i)),application=t.slice(i+MARK_EXAMPLE.length).trim();return pair&&application?{...pair,application}:null;
}
const serialize=(a:string,b:string)=>a.trim()+MARK_CONTRAST+b.trim();
export function independentDefinition(c:DefinitionDistinction,definition:string,contrast:string,application:string):boolean{
 return valid(definition,90,1450)&&valid(contrast,75,1200)&&valid(application,85,1300)&&
 normalize(definition)!==normalize(contrast)&&normalize(definition)!==normalize(application)&&normalize(contrast)!==normalize(application)&&
 ![definition,contrast,application].some(x=>normalize(x)===normalize(c.options[0].text)||normalize(x)===normalize(c.options[1].text)||normalize(x)===normalize(c.model)||normalize(x)===normalize(c.trap))&&
 !normalize(definition).includes(normalize(c.quote));
}
export type DefinitionEvidence={distinctionId:string;paragraphId:string;choice:DefinitionChoice;definition:string;contrast:string;application:string;initial:boolean};
export function firstDefinitionEvidence(e:ProductionEntry):DefinitionEvidence|null{
 const s=definitionSource(e),c=s?.distinctions[0],items=e.decisionId?.split('|'),p=firstParts(e.original);
 if(!c||!p||!items||items.length!==3||items[0]!==c.id||items[2]!==c.paragraphId||!choiceValid(c,items[1])||!independentDefinition(c,p.definition,p.contrast,p.application))return null;
 return {distinctionId:c.id,paragraphId:c.paragraphId,choice:items[1],...p,initial:true};
}
export function savedDefinitionEvidence(e:ProductionEntry,c:DefinitionDistinction):DefinitionEvidence|null{
 const s=definitionSource(e),first=firstDefinitionEvidence(e);
 if(!s||!first||!s.distinctions.some(x=>x.id===c.id&&x.paragraphId===c.paragraphId))return null;
 if(c.id===s.distinctions[0].id)return first;
 const r=e.revisions.find(x=>x.questionId==='DEFINITION:'+c.id),p=r?parts(r.text):null,v=r?.selfChecks?.[0];
 if(!r||!p||r.paragraphId!==c.paragraphId||!v||!choiceValid(c,v)||!independentDefinition(c,p.definition,p.contrast,r.reflection))return null;
 return {distinctionId:c.id,paragraphId:c.paragraphId,choice:v,...p,application:r.reflection,initial:false};
}
export function nextDefinitionDistinction(s:DefinitionStudy,e:ProductionEntry|null):DefinitionDistinction|null{
 if(!e)return s.distinctions[0]??null;
 if(definitionSource(e)?.id!==s.id||!firstDefinitionEvidence(e))return null;
 return s.distinctions.find(c=>!savedDefinitionEvidence(e,c))??null;
}
export function beginDefinition(s:DefinitionStudy,id:string,choice:DefinitionChoice,definition:string,contrast:string,application:string,at:number):ProductionEntry{
 const source=definitionStudies.find(x=>x.id===s.id&&x.version===s.version),c=source?.distinctions[0];
 if(!c||c.id!==id||!choiceValid(c,choice)||!independentDefinition(c,definition,contrast,application)||!Number.isFinite(at))throw Error('Begriffsdefinition, Kontrast und Anwendungsfall fehlen.');
 const original=serialize(definition,contrast)+MARK_EXAMPLE+application.trim();if(original.length>4000)throw Error('Erstantwort zu lang.');
 return {id:definitionId(s.id),kind:'DEFINITION_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:id+'|'+choice+'|'+c.paragraphId,createdAt:at,original,revisions:[],evaluated:'UNASSESSED'};
}
export function appendDefinitionDistinction(e:ProductionEntry,s:DefinitionStudy,id:string,choice:DefinitionChoice,definition:string,contrast:string,application:string,revId:string,at:number):ProductionEntry{
 const source=definitionSource(e),c=source?.distinctions.find(x=>x.id===id);
 if(!source||source.id!==s.id||!firstDefinitionEvidence(e)||!c||nextDefinitionDistinction(s,e)?.id!==id||!choiceValid(c,choice)||!independentDefinition(c,definition,contrast,application)||!revId||!Number.isFinite(at))throw Error('Begriffsbeleg fehlt oder wurde außerhalb der Reihenfolge gespeichert.');
 const rev:ProductionRevision={id:revId,at,text:serialize(definition,contrast),reflection:application.trim(),questionId:'DEFINITION:'+id,paragraphId:c.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,rev]};
}
export function latestDefinitionReport(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendDefinitionReport(e:ProductionEntry,s:DefinitionStudy,stage:'TRANSFER'|'REWRITE',report:string,why:string,id:string,revId:string,at:number):ProductionEntry{
 const source=definitionSource(e),c=source?.distinctions.find(x=>x.id===id),prev=latestDefinitionReport(e);
 if(!source||source.id!==s.id||!firstDefinitionEvidence(e)||nextDefinitionDistinction(s,e)!==null||!c||!valid(report,480,3800)||!valid(why,75,1250)||!revId||!Number.isFinite(at)||
 (stage==='TRANSFER'&&prev!==null)||(stage==='REWRITE'&&prev===null)||!['TRANSFER','REWRITE'].includes(stage)||(prev&&normalize(prev.text)===normalize(report)))throw Error('Eigenständiger fachsprachlicher Vermerk oder echte Revision fehlt.');
 const rev:ProductionRevision={id:revId,at,text:report.trim(),reflection:why.trim(),questionId:stage,paragraphId:c.paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'BEDEUTUNG',selfChecks:['DENOMINATOR:'+id]};
 return {...e,revisions:[...e.revisions,rev]};
}
export function definitionProgress(entries:readonly ProductionEntry[]){
 const rows=definitionStudies.map(s=>({s,e:entries.find(e=>isDefinitionEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstDefinitionEvidence(x.e)).length,distinctions:rows.reduce((n,x)=>n+(x.e?x.s.distinctions.filter(c=>savedDefinitionEvidence(x.e!,c)).length:0),0),transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,revised:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:definitionStudies.length};
}
export function nextDefinitionStudy(entries:readonly ProductionEntry[]):DefinitionStudy{
 return definitionStudies.find(s=>entries.some(e=>isDefinitionEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))||definitionStudies.find(s=>!entries.some(e=>isDefinitionEntry(e)&&e.itemId===s.id))||definitionStudies[0];
}
