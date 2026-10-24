import raw from '../../../content/fixtures/g12-repair.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type RepairChoice='A'|'B';
export type RepairTurn={id:string;paragraphId:string;speaker:string;quote:string;question:string;options:{id:RepairChoice;text:string}[];preferredId:RepairChoice;clarified:string;model:string};
export type RepairStudy={id:string;version:1;domain:'G12';band:'C1'|'C2';title:string;focus:string;brief:string;paragraphs:{id:string;text:string}[];repairs:RepairTurn[];status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const repairStudies:RepairStudy[]=raw as RepairStudy[];
export const repairId=(id:string)=>'repair:'+id;
export const isRepairEntry=(e:ProductionEntry)=>e.kind==='REPAIR_STUDY'&&e.id===repairId(e.itemId);
export const repairSource=(e:ProductionEntry):RepairStudy|null=>isRepairEntry(e)?repairStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const MARK_REPLY='\n\nVorbehaltliche Antwort:\n',MARK_LIMIT='\n\nOffene Festlegung:\n';
const clean=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const allowed=(r:RepairTurn,choice:string):choice is RepairChoice=>(choice==='A'||choice==='B')&&r.options.some(x=>x.id===choice);
function splitPair(text:string):{clarification:string;reply:string}|null{
 const i=text.indexOf(MARK_REPLY);if(i<=0||text.indexOf(MARK_REPLY,i+MARK_REPLY.length)>=0)return null;
 const clarification=text.slice(0,i).trim(),reply=text.slice(i+MARK_REPLY.length).trim();
 return clarification&&reply?{clarification,reply}:null;
}
function splitFirst(text:string):{clarification:string;reply:string;open:string}|null{
 const i=text.indexOf(MARK_LIMIT);if(i<=0||text.indexOf(MARK_LIMIT,i+MARK_LIMIT.length)>=0)return null;
 const pair=splitPair(text.slice(0,i)),open=text.slice(i+MARK_LIMIT.length).trim();
 return pair&&open?{...pair,open}:null;
}
const serialize=(question:string,reply:string)=>question.trim()+MARK_REPLY+reply.trim();
export function independentRepair(t:RepairTurn,question:string,reply:string,open:string):boolean{
 return valid(question,48,800)&&/[?？]$/.test(question.trim())&&valid(reply,75,1400)&&valid(open,55,1100)&&
 clean(question)!==clean(reply)&&!clean(question).includes(clean(t.quote))&&!clean(reply).includes(clean(t.quote))&&
 !t.options.some(o=>clean(question)===clean(o.text)||clean(reply)===clean(o.text));
}
export type RepairEvidence={turnId:string;paragraphId:string;choice:RepairChoice;clarification:string;reply:string;open:string;initial:boolean};
export function firstRepairEvidence(e:ProductionEntry):RepairEvidence|null{
 const s=repairSource(e),t=s?.repairs[0],parts=e.decisionId?.split('|'),p=splitFirst(e.original);
 if(!s||!t||!p||!parts||parts.length!==3||parts[0]!==t.id||parts[2]!==t.paragraphId||!allowed(t,parts[1])||
 !independentRepair(t,p.clarification,p.reply,p.open))return null;
 return {turnId:t.id,paragraphId:t.paragraphId,choice:parts[1],...p,initial:true};
}
export function savedRepairEvidence(e:ProductionEntry,t:RepairTurn):RepairEvidence|null{
 const s=repairSource(e),first=firstRepairEvidence(e);
 if(!s||!first||!s.repairs.some(x=>x.id===t.id&&x.paragraphId===t.paragraphId))return null;
 if(t.id===s.repairs[0].id)return first;
 const rev=e.revisions.find(r=>r.questionId==='REPAIR:'+t.id),p=rev?splitPair(rev.text):null,choice=rev?.selfChecks?.[0];
 if(!rev||!p||rev.paragraphId!==t.paragraphId||!choice||!allowed(t,choice)||!independentRepair(t,p.clarification,p.reply,rev.reflection))return null;
 return {turnId:t.id,paragraphId:t.paragraphId,choice,...p,open:rev.reflection,initial:false};
}
export function nextRepairTurn(s:RepairStudy,e:ProductionEntry|null):RepairTurn|null{
 if(!e)return s.repairs[0]??null;
 if(repairSource(e)?.id!==s.id||!firstRepairEvidence(e))return null;
 return s.repairs.find(t=>!savedRepairEvidence(e,t))??null;
}
export function beginRepair(s:RepairStudy,id:string,choice:RepairChoice,question:string,reply:string,open:string,at:number):ProductionEntry{
 const actual=repairStudies.find(x=>x.id===s.id&&x.version===s.version),t=actual?.repairs[0];
 if(!t||t.id!==id||!allowed(t,choice)||!independentRepair(t,question,reply,open)||!Number.isFinite(at))throw Error('Klärungsfrage, Vorbehalt und offener Beschluss fehlen.');
 const original=serialize(question,reply)+MARK_LIMIT+open.trim();
 if(original.length>3500)throw Error('Gesprächsarbeit ist zu lang.');
 return {id:repairId(s.id),kind:'REPAIR_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:t.id+'|'+choice+'|'+t.paragraphId,createdAt:at,original,revisions:[],evaluated:'UNASSESSED'};
}
export function appendRepairTurn(e:ProductionEntry,s:RepairStudy,id:string,choice:RepairChoice,question:string,reply:string,open:string,revisionId:string,at:number):ProductionEntry{
 const source=repairSource(e),t=source?.repairs.find(x=>x.id===id);
 if(!source||source.id!==s.id||!firstRepairEvidence(e)||!t||nextRepairTurn(s,e)?.id!==t.id||!allowed(t,choice)||!independentRepair(t,question,reply,open)||!revisionId||!Number.isFinite(at))throw Error('Weitere vollständige Klärung oder korrekter Gesprächsbezug fehlt.');
 const rev:ProductionRevision={id:revisionId,at,text:serialize(question,reply),reflection:open.trim(),questionId:'REPAIR:'+id,paragraphId:t.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,rev]};
}
export function latestRepairSummary(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendRepairSummary(e:ProductionEntry,s:RepairStudy,stage:'TRANSFER'|'REWRITE',text:string,reflection:string,turnId:string,revisionId:string,at:number):ProductionEntry{
 const source=repairSource(e),latest=latestRepairSummary(e),turn=source?.repairs.find(r=>r.id===turnId);
 if(!source||source.id!==s.id||!firstRepairEvidence(e)||nextRepairTurn(s,e)!==null||!turn||!valid(text,360,3300)||!valid(reflection,65,1100)||!revisionId||!Number.isFinite(at)||
 (stage==='TRANSFER'&&latest!==null)||(stage==='REWRITE'&&latest===null)||!['TRANSFER','REWRITE'].includes(stage)||(latest&&clean(latest.text)===clean(text)))throw Error('Quellengedeckte Ergebnisnotiz oder eigenständige Korrektur fehlt.');
 const rev:ProductionRevision={id:revisionId,at,text:text.trim(),reflection:reflection.trim(),questionId:stage,paragraphId:turn.paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'BEDEUTUNG',selfChecks:['OFFEN:'+turnId]};
 return {...e,revisions:[...e.revisions,rev]};
}
export function repairProgress(entries:readonly ProductionEntry[]){
 const rows=repairStudies.map(s=>({s,e:entries.find(e=>isRepairEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstRepairEvidence(x.e)).length,questions:rows.reduce((n,x)=>n+(x.e?x.s.repairs.filter(t=>savedRepairEvidence(x.e!,t)).length:0),0),
 transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,revised:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:repairStudies.length};
}
export function nextRepairStudy(entries:readonly ProductionEntry[]):RepairStudy{
 return repairStudies.find(s=>entries.some(e=>isRepairEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))||repairStudies.find(s=>!entries.some(e=>isRepairEntry(e)&&e.itemId===s.id))||repairStudies[0];
}
