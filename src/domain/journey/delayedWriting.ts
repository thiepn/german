import type {ProductionEntry,ProductionRevision} from '../production/types';
import {archiveRow,type ArchiveKind,type ArchiveRow} from '../archive/archive';
import {referenceSource} from '../reference/reference';
import {relativeSource} from '../relative/relative';
import {attachmentSource} from '../attachment/attachment';
import {phraseologySource} from '../phraseology/phraseology';
import {definitionSource} from '../definition/definition';
import {disclosureSource} from '../disclosure/disclosure';

// Deliberately narrow version-safe vertical slice. Never resolve a historical source
// by title or silently substitute a newer fixture for an old saved entry.
export const DELAYED_KINDS=['G01_REFERENCE','G02_RELATIVE','G03_ATTACHMENT','G06_DEFINITION','G07_PHRASEOLOGY','G13_DISCLOSURE'] as const;
export type DelayedKind=typeof DELAYED_KINDS[number];
export type Round=1|2|3;
type Source={id:string;version:number;title:string;paragraphs:readonly {id:string;text:string}[]};
const DAY=86400000;
const DELAYS:Readonly<Record<Round,number>>={1:DAY,2:7*DAY,3:21*DAY};
const norm=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const safe=(s:string,min:number,max:number)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
const tag=(stage:'RECALL'|'REPAIR',round:Round)=>'SG_DELAYED_'+stage+':'+round;
const last=(entry:ProductionEntry,check:(r:ProductionRevision)=>boolean)=>[...entry.revisions].reverse().find(check)??null;
export type DelayedCandidate={
 row:ArchiveRow;source:Source;round:Round;baseline:ProductionRevision;
 dueAt:number;recall:ProductionRevision|null;repair:ProductionRevision|null;
 pendingRepair:boolean;due:boolean;
};
export type DelayedSummary={due:number;pending:number;finished:number;upcomingAt:number|null;selected:DelayedCandidate|null};
function sourceFor(e:ProductionEntry,kind:ArchiveKind):Source|null{
 const src=kind==='G01_REFERENCE'?referenceSource(e):
  kind==='G02_RELATIVE'?relativeSource(e):
  kind==='G03_ATTACHMENT'?attachmentSource(e):
  kind==='G06_DEFINITION'?definitionSource(e):
  kind==='G07_PHRASEOLOGY'?phraseologySource(e):
  kind==='G13_DISCLOSURE'?disclosureSource(e):null;
 if(!src||!src.paragraphs.length||src.version!==e.itemVersion)return null;
 return src;
}
function nativeTransfer(entry:ProductionEntry,kind:ArchiveKind):ProductionRevision|null{
 return last(entry,r=>kind==='G13_DISCLOSURE'?
  (!!r.questionId?.startsWith('AUDIENCE:')||!!r.questionId?.startsWith('REWRITE:')):
  (r.questionId==='TRANSFER'||r.questionId==='REWRITE'));
}
function prior(entry:ProductionEntry,round:Round,stage:'RECALL'|'REPAIR'):ProductionRevision|null{
 return last(entry,r=>r.questionId===tag(stage,round));
}
export function candidateFor(entry:ProductionEntry,now:number):{candidate:DelayedCandidate|null;finished:number}|null{
 if(!Number.isFinite(now)||entry.evaluated!=='UNASSESSED'||!entry.original.trim())return null;
 const row=archiveRow(entry);
 if(!DELAYED_KINDS.some(k=>k===row.kind)||row.context.startsWith('Originalinhalt inzwischen nicht mehr im Entwurfskatalog'))return null;
 const source=sourceFor(entry,row.kind),baseline=nativeTransfer(entry,row.kind);
 if(!source||!baseline||!baseline.id||!baseline.text.trim()||!Number.isFinite(baseline.at))return null;
 let finished=0;
 for(const round of [1,2,3] as const){
  const recall=prior(entry,round,'RECALL'),repair=prior(entry,round,'REPAIR');
  if(recall&&repair){finished++;continue}
  // Pending recalls must be completed against the frozen original revision,
  // even if later native-writing activity has occurred in a different tab.
  const original=recall?.selfChecks?.find(v=>v.startsWith('BASELINE:'))?.slice('BASELINE:'.length);
  const pinned=original?entry.revisions.find(r=>r.id===original)??null:baseline;
  if(!pinned||!(row.kind==='G13_DISCLOSURE'?
    (pinned.questionId?.startsWith('AUDIENCE:')||pinned.questionId?.startsWith('REWRITE:')):
    (pinned.questionId==='TRANSFER'||pinned.questionId==='REWRITE')))return null;
  const prev=round===1?null:prior(entry,(round-1) as Round,'REPAIR');
  if(round!==1&&!prev)return null; // not eligible without completed earlier reconstruction + correction
  const dueAt=Math.max(baseline.at,prev?.at??baseline.at)+DELAYS[round];
  const pendingRepair=!!recall&&!repair;
  return {candidate:{row,source,round,baseline:pinned,dueAt,recall,repair:null,
   pendingRepair,due:pendingRepair||now>=dueAt},finished};
 }
 return {candidate:null,finished};
}
export function delayedWritingSummary(now:number,entries:readonly ProductionEntry[]):DelayedSummary{
 if(!Number.isFinite(now))throw Error('Invalid delayed recall clock');
 const evaluated=entries.map(e=>candidateFor(e,now)).filter((x):x is NonNullable<typeof x>=>x!==null);
 const candidates=evaluated.flatMap(x=>x.candidate?[x.candidate]:[]);
 const order=(a:DelayedCandidate,b:DelayedCandidate)=>a.dueAt-b.dueAt||a.row.entry.id.localeCompare(b.row.entry.id);
 const pending=candidates.filter(c=>c.pendingRepair).sort(order);
 const due=candidates.filter(c=>c.due&&!c.pendingRepair).sort(order);
 const upcoming=candidates.filter(c=>!c.due).sort(order);
 return {due:due.length,pending:pending.length,finished:evaluated.reduce((n,e)=>n+e.finished,0),
  upcomingAt:upcoming[0]?.dueAt??null,selected:pending[0]??due[0]??null};
}
function assertCurrent(entry:ProductionEntry,c:DelayedCandidate,now:number){
 const next=candidateFor(entry,now)?.candidate;
 if(!next||next.row.entry.id!==c.row.entry.id||next.round!==c.round||
 next.baseline.id!==c.baseline.id||next.row.entry.itemVersion!==c.row.entry.itemVersion||
 next.source.id!==c.source.id||!next.due)throw Error('Quellenversion oder fälliger Abruf wurde verändert.');
 return next;
}
export function saveColdRecall(entry:ProductionEntry,c:DelayedCandidate,text:string,uncertainty:string,revisionId:string,now:number):ProductionEntry{
 const current=assertCurrent(entry,c,now);
 if(current.recall||!safe(text,150,2600)||!safe(uncertainty,60,850)||norm(text)===norm(current.baseline.text)||
 norm(text)===norm(uncertainty)||!revisionId||entry.revisions.some(r=>r.id===revisionId))throw Error('Eigenständiger, ungestützter Abruf und offene Unsicherheit erforderlich.');
 const revision:ProductionRevision={id:revisionId,at:now,text:text.trim(),reflection:uncertainty.trim(),
  questionId:tag('RECALL',c.round),lens:'BEDEUTUNG',selfChecks:['BASELINE:'+current.baseline.id]};
 return {...entry,revisions:[...entry.revisions,revision]};
}
export function saveSourceRepair(entry:ProductionEntry,c:DelayedCandidate,text:string,reason:string,paragraphId:string,revisionId:string,now:number):ProductionEntry{
 const current=assertCurrent(entry,c,now);
 if(!current.pendingRepair||!current.recall||!current.source.paragraphs.some(p=>p.id===paragraphId)||
 !safe(text,170,2600)||!safe(reason,90,1000)||norm(text)===norm(current.recall.text)||
 norm(text)===norm(current.baseline.text)||norm(text)===norm(reason)||
 !revisionId||entry.revisions.some(r=>r.id===revisionId)||now<current.recall.at)
 throw Error('Quellenbeleg und substanzielle Korrektur mit Begründung fehlen.');
 const revision:ProductionRevision={id:revisionId,at:now,text:text.trim(),reflection:reason.trim(),paragraphId,
  questionId:tag('REPAIR',c.round),lens:'KOHÄRENZ',selfChecks:['RECALL:'+current.recall.id,'BASELINE:'+current.baseline.id]};
 return {...entry,revisions:[...entry.revisions,revision]};
}
