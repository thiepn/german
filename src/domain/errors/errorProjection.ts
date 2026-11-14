import type {Attempt,Exercise,Mode} from '../content/types';

/** Heuristic training topics, not linguistic diagnosis or proficiency certification. */
export type ErrorClusterStatus='OFFEN'|'WIEDER_ANGEWENDET'|'ERNEUT_UNSICHER';
export const INDEPENDENT_TRANSFER_DELAY_MS=86400000;
export type ErrorCluster={
 key:string; skillId:string; topic:string; mode:Mode; status:ErrorClusterStatus;
 failures:Attempt[]; laterCorrect:Attempt[]; lastFailureAt:number; distinctFailureItems:number;
 freshContextId:string|null; repeatItemId:string|null; sourceCurrent:boolean;
};

/**
 * First correct answers to other, never-failed items in the same current-version
 * mode / author-topic group. Same-item reviews, hints, repeat answers and wrong
 * versions cannot count as independent transfer. This is an *observed correct
 * answer*, not semantic proof of generalization or language mastery.
 */
function spacedIndependent(correct:readonly Attempt[]):Attempt[]{
 const sorted=[...correct].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 const retained:Attempt[]=[];
 for(const a of sorted)if(!retained.length||a.at-retained[retained.length-1].at>=INDEPENDENT_TRANSFER_DELAY_MS)retained.push(a);
 return retained;
}
export type IndependentTransferState={
 phase:'FIRST_CONTEXT'|'WAITING'|'SPACED_CONTEXT_DUE'|'OBSERVED'|'NO_UNUSED_CONTEXT';
 independentCorrect:number;spacedCorrect:number;nextEligibleAt:number|null;
};
/** Derived solely from existing immutable first-attempt timestamps, with a full elapsed day between qualifying observations. */
export function independentTransferState(c:ErrorCluster,now:number):IndependentTransferState{
 const accepted=spacedIndependent(c.laterCorrect);
 if(accepted.length>=2)return {phase:'OBSERVED',independentCorrect:c.laterCorrect.length,spacedCorrect:accepted.length,nextEligibleAt:null};
 if(!accepted.length)return {phase:c.freshContextId?'FIRST_CONTEXT':'NO_UNUSED_CONTEXT',independentCorrect:0,spacedCorrect:0,nextEligibleAt:null};
 const nextEligibleAt=accepted[0].at+INDEPENDENT_TRANSFER_DELAY_MS;
 return {phase:!c.freshContextId?'NO_UNUSED_CONTEXT':now<nextEligibleAt?'WAITING':'SPACED_CONTEXT_DUE',
  independentCorrect:c.laterCorrect.length,spacedCorrect:accepted.length,nextEligibleAt};
}

/** Old answers survive content withdrawal and revisions. Explanations only refer to matching current versions. */
export function projectErrors(attempts:Attempt[],byId:Map<string,Exercise>){
 return attempts.filter(a=>a.result==='INCORRECT'||a.result==='PARTIAL')
  .sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id))
  .map(a=>{const item=byId.get(a.itemId);return {attempt:a,item:item?.version===a.itemVersion?item:undefined};});
}

export function buildErrorClusters(attempts:readonly Attempt[],byId:ReadonlyMap<string,Exercise>):ErrorCluster[]{
 const groups=new Map<string,Attempt[]>();
 const current=[...attempts].filter(a=>a.result!=='VOID').sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 // Use skill and author topic only: never claim a clinically validated misconception diagnosis.
 for(const a of current){
  const source=byId.get(a.itemId);
  const key=source&&source.version===a.itemVersion
   ?[a.mode,a.skillId,source.topic].join('::')
   :[a.mode,a.skillId,'HISTORISCH',a.itemId,a.itemVersion].join('::');
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key)!.push(a);
 }
 const attempted=new Set(current.map(a=>a.itemId));
 const firstAttemptById=new Map<string,Attempt>();
 for(const a of current)if(!firstAttemptById.has(a.itemId))firstAttemptById.set(a.itemId,a);
 const clusters:ErrorCluster[]=[];
 for(const [key,history] of groups){
  const failures=history.filter(a=>a.result==='INCORRECT'||a.result==='PARTIAL').sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));
  if(!failures.length)continue;
  const lastFailure=failures[0];
  const item=byId.get(lastFailure.itemId);
  const sourceCurrent=Boolean(item&&item.version===lastFailure.itemVersion);
  const failedIds=new Set(failures.map(a=>a.itemId));
  const laterCorrect=history.filter(a=>a.result==='CORRECT'&&!a.hinted&&a.at>lastFailure.at&&
   !failedIds.has(a.itemId)&&firstAttemptById.get(a.itemId)?.id===a.id&&
   byId.get(a.itemId)?.version===a.itemVersion&&byId.get(a.itemId)?.status!=='WITHDRAWN')
   .sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
  const status:ErrorClusterStatus=spacedIndependent(laterCorrect).length>=2?'WIEDER_ANGEWENDET':laterCorrect.length?'ERNEUT_UNSICHER':'OFFEN';
  const alternatives=sourceCurrent?[...byId.values()].filter(x=>x.status!=='WITHDRAWN'&&x.version>=1&&x.skillId===lastFailure.skillId&&x.mode===lastFailure.mode&&x.topic===item!.topic&&!attempted.has(x.id)&&x.id!==lastFailure.itemId).sort((a,b)=>a.id.localeCompare(b.id)):[];
  const repeat=failures.find(a=>{const x=byId.get(a.itemId);return x&&x.version===a.itemVersion&&x.status!=='WITHDRAWN'});
  clusters.push({
   key,skillId:lastFailure.skillId,topic:sourceCurrent?item!.topic:'Historische Aufgabenfassung',mode:lastFailure.mode,status,
   failures,laterCorrect,lastFailureAt:lastFailure.at,distinctFailureItems:new Set(failures.map(a=>a.itemId)).size,
   freshContextId:alternatives[0]?.id??null,repeatItemId:repeat?.itemId??null,sourceCurrent
  });
 }
 return clusters.sort((a,b)=>b.lastFailureAt-a.lastFailureAt||a.key.localeCompare(b.key));
}
