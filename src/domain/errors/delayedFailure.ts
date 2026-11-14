import type {Attempt,Exercise} from '../content/types';
import {INDEPENDENT_TRANSFER_DELAY_MS} from './errorProjection';

export type VerifiableStep={attempt:Attempt;item:Exercise};
export type FailedDelayedCase={
 key:string;mode:Exercise['mode'];skillId:string;topic:string;
 earlierError:VerifiableStep;firstTransfer:VerifiableStep;delayedFailure:VerifiableStep;
 nextItem:Exercise|null;
};
const uncertain=(a:Attempt)=>a.result==='INCORRECT'||a.result==='PARTIAL';
const keyOf=(item:Exercise)=>[item.mode,item.skillId,item.topic].join('::');
/**
 * The learner failed a previously unused authored context after a distinct, correct
 * first encounter >=24h earlier, preceded by an earlier uncertain first encounter.
 * Chronology is observed; there is no stored proof of which UI recommendation was clicked.
 *
 * Fail closed for changed/withdrawn source versions and previously attempted items.
 * Do not confuse later same-item review with independent first encounters.
 */
export function failedDelayedCases(now:number,attempts:readonly Attempt[],items:readonly Exercise[]):FailedDelayedCase[]{
 if(!Number.isFinite(now))throw Error('Invalid error-reconstruction clock');
 const byId=new Map(items.map(i=>[i.id,i] as const));
 const ordered=[...attempts].filter(a=>Number.isFinite(a.at)&&a.at<=now&&a.result!=='VOID')
  .sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 const attemptedIds=new Set(ordered.map(a=>a.itemId));
 const firstByItem=new Map<string,Attempt>();
 for(const a of ordered)if(!firstByItem.has(a.itemId))firstByItem.set(a.itemId,a);
 const groups=new Map<string,VerifiableStep[]>();
 for(const a of firstByItem.values()){
  const item=byId.get(a.itemId);
  if(!item||item.status==='WITHDRAWN'||item.version!==a.itemVersion||!item.variants.length||
   item.mode!==a.mode||item.skillId!==a.skillId)continue;
  const key=keyOf(item);
  const list=groups.get(key)??[];list.push({attempt:a,item});groups.set(key,list);
 }
 const found:FailedDelayedCase[]=[];
 for(const [key,history] of groups){
  history.sort((a,b)=>a.attempt.at-b.attempt.at||a.attempt.id.localeCompare(b.attempt.id));
  const latest=history[history.length-1];
  if(!uncertain(latest.attempt))continue;
  const firstTransfer=[...history].reverse().find(x=>x.attempt.result==='CORRECT'&&!x.attempt.hinted&&
   x.attempt.at<=latest.attempt.at-INDEPENDENT_TRANSFER_DELAY_MS);
  if(!firstTransfer)continue;
  const earlierError=[...history].reverse().find(x=>uncertain(x.attempt)&&x.attempt.at<firstTransfer.attempt.at);
  if(!earlierError||earlierError.attempt.itemId===latest.attempt.itemId||
   earlierError.attempt.itemId===firstTransfer.attempt.itemId||
   latest.attempt.itemId===firstTransfer.attempt.itemId)continue;
  const nextItem=[...items].filter(i=>i.status!=='WITHDRAWN'&&i.variants.length>0&&!attemptedIds.has(i.id)&&
   keyOf(i)===key).sort((a,b)=>a.id.localeCompare(b.id))[0]??null;
  found.push({key,mode:latest.item.mode,skillId:latest.item.skillId,topic:latest.item.topic,
   earlierError,firstTransfer,delayedFailure:latest,nextItem});
 }
 return found.sort((a,b)=>b.delayedFailure.attempt.at-a.delayedFailure.attempt.at||
  a.key.localeCompare(b.key));
}
export function failedDelayedCaseForAttempt(now:number,attempts:readonly Attempt[],items:readonly Exercise[],id:string):FailedDelayedCase|null{
 return failedDelayedCases(now,attempts,items).find(c=>c.delayedFailure.attempt.id===id)??null;
}
