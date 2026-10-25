import raw from '../../../content/fixtures/g07-phraseology.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type PhraseologyChoice='A'|'B';
export type PhraseologyDecision={
 id:string;paragraphId:string;family:string;focus:string;quote:string;alternate:string;question:string;
 options:{id:PhraseologyChoice;text:string}[];preferredId:PhraseologyChoice;analysis:string;explanation:string;repairPrompt:string;
};
export type PhraseologyStudy={
 id:string;version:1;domain:'G07';band:'C1'|'C2';title:string;focus:string;paragraphs:{id:string;text:string}[];
 decisions:PhraseologyDecision[];transfer:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;
 editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string};
};
export const phraseologyStudies:PhraseologyStudy[]=raw as PhraseologyStudy[];
export const phraseologyEntryId=(id:string)=>'phraseology:'+id;
export const isPhraseologyEntry=(e:ProductionEntry):boolean=>e.kind==='PHRASEOLOGY_STUDY'&&e.id===phraseologyEntryId(e.itemId);
export function phraseologySource(e:ProductionEntry):PhraseologyStudy|null{
 return isPhraseologyEntry(e)?phraseologyStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
}
const separator='\n\nBedeutungsgrenze: ';
const valid=(s:string,min:number,max:number)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
const normalized=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
function validChoice(d:PhraseologyDecision,choice:string):choice is PhraseologyChoice{
 return (choice==='A'||choice==='B')&&d.options.some(o=>o.id===choice);
}
export function independentPhraseologyText(d:PhraseologyDecision,text:string):boolean{
 return valid(text,50,2900)&&normalized(text)!==normalized(d.quote)&&normalized(text)!==normalized(d.alternate);
}
function decode(text:string):{rewrite:string;limit:string}|null{
 const i=text.indexOf(separator);
 if(i<1)return null;
 const rewrite=text.slice(0,i).trim(),limit=text.slice(i+separator.length).trim();
 return rewrite&&limit?{rewrite,limit}:null;
}
export type PhraseologyEvidence={decisionId:string;paragraphId:string;choice:PhraseologyChoice;rewrite:string;limit:string;initial:boolean};
export function firstPhraseologyEvidence(entry:ProductionEntry):PhraseologyEvidence|null{
 const s=phraseologySource(entry),d=s?.decisions[0],p=entry.decisionId?.split('|'),parts=decode(entry.original);
 if(!s||!d||!p||p.length!==3||p[0]!==d.id||p[2]!==d.paragraphId||!validChoice(d,p[1])||!parts)return null;
 return {decisionId:d.id,paragraphId:d.paragraphId,choice:p[1],...parts,initial:true};
}
export function savedPhraseologyDecision(entry:ProductionEntry,d:PhraseologyDecision):PhraseologyEvidence|null{
 const s=phraseologySource(entry),first=firstPhraseologyEvidence(entry);
 if(!s||!first||!s.decisions.some(x=>x.id===d.id&&x.paragraphId===d.paragraphId))return null;
 if(d.id===s.decisions[0].id)return first;
 const rev=entry.revisions.find(r=>r.questionId==='DECISION:'+d.id),choice=rev?.selfChecks?.[0];
 if(!rev||rev.paragraphId!==d.paragraphId||!choice||!validChoice(d,choice)||!independentPhraseologyText(d,rev.text)||!valid(rev.reflection,20,1150))return null;
 return {decisionId:d.id,paragraphId:d.paragraphId,choice,rewrite:rev.text,limit:rev.reflection,initial:false};
}
export function nextPhraseologyDecision(study:PhraseologyStudy,entry:ProductionEntry|null):PhraseologyDecision|null{
 if(!entry)return study.decisions[0]??null;
 const s=phraseologySource(entry);
 if(!s||s.id!==study.id||s.version!==study.version||!firstPhraseologyEvidence(entry))return null;
 return s.decisions.find(d=>!savedPhraseologyDecision(entry,d))??null;
}
export function beginPhraseology(study:PhraseologyStudy,id:string,choice:PhraseologyChoice,text:string,limit:string,at:number):ProductionEntry{
 const s=phraseologyStudies.find(x=>x.id===study.id&&x.version===study.version),d=s?.decisions[0];
 const original=text.trim()+separator+limit.trim();
 if(!s||!d||d.id!==id||!validChoice(d,choice)||!independentPhraseologyText(d,text)||!valid(text,50,1800)||!valid(limit,20,850)||original.length>3000||!Number.isFinite(at))
  throw Error('Quellenbezogene Wortverbindung, eigene Fassung und Bedeutungsgrenze erforderlich.');
 return {id:phraseologyEntryId(s.id),itemId:s.id,itemVersion:s.version,kind:'PHRASEOLOGY_STUDY',sourceId:s.id,
 decisionId:d.id+'|'+choice+'|'+d.paragraphId,createdAt:at,original,revisions:[],evaluated:'UNASSESSED'};
}
export function appendPhraseologyDecision(entry:ProductionEntry,study:PhraseologyStudy,id:string,choice:PhraseologyChoice,text:string,limit:string,revisionId:string,at:number):ProductionEntry{
 const s=phraseologySource(entry),d=s?.decisions.find(x=>x.id===id);
 if(!s||s.id!==study.id||s.version!==study.version||!firstPhraseologyEvidence(entry)||!d||d.id===s.decisions[0].id||
 nextPhraseologyDecision(study,entry)?.id!==id||!validChoice(d,choice)||!independentPhraseologyText(d,text)||!valid(limit,20,1150)||!revisionId||!Number.isFinite(at))
  throw Error('Eigenständige Formulierung oder idiomatische Bedeutungseinordnung fehlt.');
 const r:ProductionRevision={id:revisionId,at,text:text.trim(),reflection:limit.trim(),questionId:'DECISION:'+id,paragraphId:d.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...entry,revisions:[...entry.revisions,r]};
}
export function latestPhraseologyTransfer(entry:ProductionEntry):ProductionRevision|null{
 return [...entry.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendPhraseologyTransfer(entry:ProductionEntry,study:PhraseologyStudy,stage:'TRANSFER'|'REWRITE',text:string,reason:string,paragraphId:string,id:string,at:number):ProductionEntry{
 const s=phraseologySource(entry),previous=latestPhraseologyTransfer(entry);
 if(!s||s.id!==study.id||s.version!==study.version||!firstPhraseologyEvidence(entry)||nextPhraseologyDecision(study,entry)!==null||
 !s.paragraphs.some(p=>p.id===paragraphId)||!valid(text,100,2900)||!valid(reason,25,1150)||!id||!Number.isFinite(at)||
 !['TRANSFER','REWRITE'].includes(stage)||(stage==='TRANSFER'&&previous!==null)||(stage==='REWRITE'&&previous===null)||
 (previous&&normalized(previous.text)===normalized(text)))throw Error('Unabhängiger Transfer oder begründete Überarbeitung unvollständig.');
 const r:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'BEDEUTUNG',selfChecks:[]};
 return {...entry,revisions:[...entry.revisions,r]};
}
export function phraseologyProgress(entries:readonly ProductionEntry[]){
 const rows=phraseologyStudies.map(s=>({s,e:entries.find(e=>isPhraseologyEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstPhraseologyEvidence(x.e)).length,
 decisions:rows.reduce((n,x)=>n+(x.e?x.s.decisions.filter(d=>savedPhraseologyDecision(x.e!,d)).length:0),0),
 transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,
 rewritten:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),
 total:phraseologyStudies.length};
}
export function nextPhraseologyStudy(entries:readonly ProductionEntry[]):PhraseologyStudy{
 return phraseologyStudies.find(s=>{const e=entries.find(e=>isPhraseologyEntry(e)&&e.itemId===s.id);return e&&!e.revisions.some(r=>r.questionId==='TRANSFER')})??
 phraseologyStudies.find(s=>!entries.some(e=>isPhraseologyEntry(e)&&e.itemId===s.id))??phraseologyStudies[0];
}
