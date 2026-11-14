import type {Attempt,Exercise,ReviewCard,ReviewEvent} from '../content/types';
import type {ProductionEntry,ProductionRevision} from '../production/types';
import {archiveRows,type ArchiveKind,type ArchiveRow} from '../archive/archive';
import {STUDIO_LINKS,type StudioAction} from './catalog';
import type {EvidenceTopic} from './evidenceLinks';

// Reuses existing source-writing studios. G10 requires learner-owned audio and cannot
// truthfully satisfy the same source -> written transfer -> revision contract.
export type DailySourceTrack={action:StudioAction;kind:ArchiveKind;domain:string};
export const DAILY_SOURCE_TRACKS:readonly DailySourceTrack[]=[
 {action:'onReference',kind:'G01_REFERENCE',domain:'G01'},
 {action:'onDeixis',kind:'G01_DEIXIS',domain:'G01'},
 {action:'onCaseTracing',kind:'G02_CASE_TRACING',domain:'G02'},
 {action:'onRelative',kind:'G02_RELATIVE',domain:'G02'},
 {action:'onValency',kind:'G03_VALENCY',domain:'G03'},
 {action:'onAttachment',kind:'G03_ATTACHMENT',domain:'G03'},
 {action:'onFocus',kind:'G04_FOCUS',domain:'G04'},
 {action:'onScope',kind:'G04_SCOPE',domain:'G04'},
 {action:'onRelation',kind:'G04_RELATION',domain:'G04'},
 {action:'onCompression',kind:'G04_COMPRESSION',domain:'G04'},
 {action:'onModality',kind:'G05_MODALITY',domain:'G05'},
 {action:'onDefinition',kind:'G06_DEFINITION',domain:'G06'},
 {action:'onPolysemy',kind:'G06_POLYSEMY',domain:'G06'},
 {action:'onPhraseology',kind:'G07_PHRASEOLOGY',domain:'G07'},
 {action:'onStance',kind:'G08_STANCE',domain:'G08'},
 {action:'onRegister',kind:'G08_REGISTER_RESPONSIBILITY',domain:'G08'},
 {action:'onCrossSource',kind:'G09_CROSS_SOURCE',domain:'G09'},
 {action:'onChronology',kind:'G09_CHRONOLOGY',domain:'G09'},
 {action:'onNumeracy',kind:'G09_NUMERIC',domain:'G09'},
 {action:'onArgument',kind:'G11_ARGUMENT',domain:'G11'},
 {action:'onAttribution',kind:'G11_ATTRIBUTION',domain:'G11'},
 {action:'onOral',kind:'G12_ORAL',domain:'G12'},
 {action:'onRepair',kind:'G12_REPAIR',domain:'G12'},
 {action:'onDisclosure',kind:'G13_DISCLOSURE',domain:'G13'}
];
export type DailyLearningCycle={
 start:number;end:number;objectiveToday:number;retrievalToday:number;due:number;unresolvedErrors:number;
 source:{track:DailySourceTrack;row:ArchiveRow|null;title:string;workedToday:boolean;transferred:boolean;rewritten:boolean;link:EvidenceTopic|null};
 completed:number;total:4;
};
const inDay=(at:number,start:number,end:number)=>Number.isFinite(at)&&at>=start&&at<end;
const transfer=(r:ProductionRevision,kind:ArchiveKind)=>kind==='G13_DISCLOSURE'?
 !!r.questionId?.startsWith('AUDIENCE:'):r.questionId==='TRANSFER';
const rewrite=(r:ProductionRevision,kind:ArchiveKind)=>kind==='G13_DISCLOSURE'?
 !!r.questionId?.startsWith('REWRITE:'):r.questionId==='REWRITE';
const hasTransfer=(row:ArchiveRow)=>row.entry.revisions.some(r=>transfer(r,row.kind)&&!!r.text.trim());
const hasRewrite=(row:ArchiveRow)=>row.entry.revisions.some(r=>rewrite(r,row.kind)&&!!r.text.trim());
const domainOf=(skill:string|undefined)=>/^G(?:0[1-9]|1[0-3])(?:\.|$)/.exec(skill??'')?.[0].slice(0,3)??null;

/** A read-only journey based on real saved actions. No new session IDs, inferred grades or CEFR claims. */
export function dailyLearningCycle(now:number,attempts:readonly Attempt[],reviews:readonly ReviewEvent[],cards:readonly ReviewCard[],entries:readonly ProductionEntry[],recommended:Exercise|undefined,priority:EvidenceTopic|null=null):DailyLearningCycle{
 if(!Number.isFinite(now))throw Error('Daily cycle requires a finite clock');
 const day=new Date(now);day.setHours(0,0,0,0);
 const start=day.getTime(),tomorrow=new Date(day);tomorrow.setDate(tomorrow.getDate()+1);
 const end=tomorrow.getTime();
 const todaysAttempts=attempts.filter(a=>inDay(a.at,start,end)&&a.result!=='VOID');
 const objectiveToday=todaysAttempts.length;
 const retrievalToday=reviews.filter(r=>inDay(r.at,start,end)).length;
 const due=cards.filter(c=>c.dueAt<=now).length;
 const lastAttempt=new Map<string,Attempt>();
 for(const a of attempts)if(a.result!=='VOID'){
  const key=a.itemId+':'+a.itemVersion,prior=lastAttempt.get(key);
  if(!prior||a.at>prior.at||(a.at===prior.at&&a.id>prior.id))lastAttempt.set(key,a);
 }
 const unresolvedErrors=[...lastAttempt.values()].filter(a=>a.result==='PARTIAL'||a.result==='INCORRECT').length;
 // The existing archive is the source of truth for an exact saved source and its versions.
 // Only active v1 source studies are planned; unavailable/unknown versions remain archived.
 const rows=archiveRows(entries,{kind:'ALL',activity:'ALL',period:'ALL',search:'',now}).filter(row=>
  row.entry.itemVersion===1&&row.entry.evaluated==='UNASSESSED'&&!!row.entry.original.trim()&&
  !row.context.startsWith('Originalinhalt inzwischen nicht mehr im Entwurfskatalog')&&
  DAILY_SOURCE_TRACKS.some(track=>track.kind===row.kind));
 const row=rows.find(r=>inDay(r.lastAt,start,end))??rows.find(r=>!hasTransfer(r))??rows.find(r=>!hasRewrite(r))??null;
 let track=row?DAILY_SOURCE_TRACKS.find(t=>t.kind===row.kind):undefined;
 let linked:EvidenceTopic|null=null;
 if(!track&&priority){
  const candidates=DAILY_SOURCE_TRACKS.filter(t=>t.domain===priority.domain);
  if(candidates.length){
   track=[...candidates].sort((a,b)=>rows.filter(r=>r.kind===a.kind).length-rows.filter(r=>r.kind===b.kind).length||a.action.localeCompare(b.action))[0];
   linked=priority;
  }
 }
 if(!track){
  const counts=DAILY_SOURCE_TRACKS.map(t=>rows.filter(r=>r.kind===t.kind).length);
  const minimum=Math.min(...counts);
  const least=DAILY_SOURCE_TRACKS.filter((_,i)=>counts[i]===minimum);
  const firstToday=[...todaysAttempts].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))[0];
  const lastMistake=[...lastAttempt.values()].filter(a=>a.result==='INCORRECT'||a.result==='PARTIAL').sort((a,b)=>b.at-a.at)[0];
  const preferred=domainOf(firstToday?.skillId??lastMistake?.skillId??recommended?.skillId);
  const matching=least.filter(t=>t.domain===preferred);
  track=matching[0]??least[Math.abs(Math.floor(start/86400000))%least.length];
 }
 const transferred=!!row&&hasTransfer(row),rewritten=!!row&&hasRewrite(row);
 const title=row?.title??STUDIO_LINKS.find(link=>link.action===track.action)?.today??track.domain;
 return {start,end,objectiveToday,retrievalToday,due,unresolvedErrors,
  source:{track,row,title,workedToday:!!row&&inDay(row.lastAt,start,end),transferred,rewritten,link:linked},
  completed:Number(objectiveToday>0)+Number(!!row)+Number(transferred)+Number(rewritten),total:4};
}
