import type {Attempt,Exercise,ReviewCard,Mode} from '../content/types';
import type {ProductionEntry} from '../production/types';
import {buildErrorClusters,independentTransferState,type ErrorCluster,type IndependentTransferState} from '../errors/errorProjection';
import {candidateFor} from './delayedWriting';
import {archiveRow} from '../archive/archive';
import {DAILY_SOURCE_TRACKS} from './dailyCycle';

export type EvidenceTopic={
 domain:string;skillId:string;topic:string;failures:number;distinctFailureItems:number;
 status:ErrorCluster['status'];freshContextId:string|null;lastFailureAt:number;
};
export type LearningLinks={
 unresolvedTopics:number;recurringTopics:number;historicalTopics:number;
 firstAttemptsWithErrors:number;newContextTopics:number;
 waitingTopics:readonly {mode:Mode;skillId:string;topic:string;nextEligibleAt:number}[];
 observedSpacedTopics:number;priorityTransfer:IndependentTransferState|null;
 priority:EvidenceTopic|null;practice: {item:Exercise;topic:EvidenceTopic}|null;
 relatedWriting:{completedPairs:number;pendingRepairs:number;dueRecalls:number};
};
export type FocusChoice={item:Exercise|undefined;reason:'DUE_REVIEW'|'FRESH_CONTEXT'|'GENERAL';topic:EvidenceTopic|null};
const domain=(skillId:string)=>/^G(?:0[1-9]|1[0-3])\./.exec(skillId)?.[0].slice(0,3)??null;
const support=new Set(DAILY_SOURCE_TRACKS.map(t=>t.domain));
const key=(c:ErrorCluster)=>c.key;
function ranked(c:ErrorCluster,d:ErrorCluster):number{
 return Number(d.distinctFailureItems>=2)-Number(c.distinctFailureItems>=2)||
 d.distinctFailureItems-c.distinctFailureItems||d.lastFailureAt-c.lastFailureAt||key(c).localeCompare(key(d));
}
const toTopic=(c:ErrorCluster):EvidenceTopic=>({
 domain:domain(c.skillId)!,skillId:c.skillId,topic:c.topic,
 failures:c.failures.length,distinctFailureItems:c.distinctFailureItems,
 status:c.status,freshContextId:c.freshContextId,lastFailureAt:c.lastFailureAt
});
/**
 * Observations only. A cluster is a repeated objective-answer pattern, not a diagnosis.
 * Domain-level writing counts describe separate activity; they cannot prove that an
 * objective misconception was resolved by free-writing.
 */
export function buildLearningLinks(now:number,attempts:readonly Attempt[],items:readonly Exercise[],entries:readonly ProductionEntry[]):LearningLinks{
 if(!Number.isFinite(now))throw Error('Invalid evidence clock');
 const byId=new Map(items.map(x=>[x.id,x] as const));
 const clusters=buildErrorClusters([...attempts].filter(a=>Number.isFinite(a.at)&&a.at<=now),byId);
 const unresolved=clusters.filter(c=>c.status!=='WIEDER_ANGEWENDET');
 const current=unresolved.filter(c=>c.sourceCurrent&&support.has(domain(c.skillId)??'')&&
   c.failures.some(a=>{const item=byId.get(a.itemId);return !!item&&item.version===a.itemVersion&&item.status!=='WITHDRAWN';})).sort(ranked);
 const repeated=current.filter(c=>c.distinctFailureItems>=2);
 const priority=repeated.length?toTopic(repeated[0]):null;
 const waitingTopics=current.flatMap(c=>{
  const state=independentTransferState(c,now);
  return state.phase==='WAITING'&&state.nextEligibleAt!==null?[{mode:c.mode,skillId:c.skillId,topic:c.topic,nextEligibleAt:state.nextEligibleAt}]:[];
 });
 const firstFresh=current.find(c=>{
  if(!c.freshContextId||independentTransferState(c,now).phase==='WAITING')return false;
  const item=byId.get(c.freshContextId);
  return !!item&&item.status!=='WITHDRAWN'&&item.skillId===c.skillId&&item.mode===c.mode&&item.topic===c.topic;
 });
 const selected=firstFresh?.freshContextId?byId.get(firstFresh.freshContextId):undefined;
 let completedPairs=0,pendingRepairs=0,dueRecalls=0;
 if(priority)for(const entry of entries){
  const result=candidateFor(entry,now);
  if(!result||archiveRow(entry).scope!==priority.domain)continue;
  completedPairs+=result.finished;
  if(result.candidate?.pendingRepair)pendingRepairs++;
  else if(result.candidate?.due)dueRecalls++;
 }
 return {unresolvedTopics:unresolved.length,recurringTopics:repeated.length,historicalTopics:clusters.filter(c=>!c.sourceCurrent).length,
  firstAttemptsWithErrors:attempts.filter(a=>Number.isFinite(a.at)&&a.at<=now&&(a.result==='INCORRECT'||a.result==='PARTIAL')).length,
  newContextTopics:current.filter(c=>!!c.freshContextId).length,
  waitingTopics,observedSpacedTopics:clusters.filter(c=>c.status==='WIEDER_ANGEWENDET').length,
  priorityTransfer:repeated.length?independentTransferState(repeated[0],now):null,
  priority,practice:selected&&firstFresh?{item:selected,topic:toTopic(firstFresh)}:null,
  relatedWriting:{completedPairs,pendingRepairs,dueRecalls}};
}
/** Real due cards precede optional practice, then fresh same-topic context, then default planner. */
export function chooseEvidenceFocus(now:number,items:readonly Exercise[],cards:readonly ReviewCard[],fallback:Exercise|undefined,links:LearningLinks):FocusChoice{
 const byId=new Map(items.map(x=>[x.id,x] as const));
 const due=cards.filter(c=>c.dueAt<=now&&Number.isFinite(c.dueAt)).map(c=>({c,item:byId.get(c.itemId)}))
  .filter((x):x is {c:ReviewCard;item:Exercise}=>!!x.item&&x.item.status!=='WITHDRAWN'&&x.item.version===x.c.itemVersion)
  .sort((a,b)=>a.c.dueAt-b.c.dueAt||a.item.id.localeCompare(b.item.id));
 if(due.length)return {item:due[0].item,reason:'DUE_REVIEW',topic:null};
 if(links.practice)return {item:links.practice.item,reason:'FRESH_CONTEXT',topic:links.practice.topic};
 return {item:fallback,reason:'GENERAL',topic:null};
}
