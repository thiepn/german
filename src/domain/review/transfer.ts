import type {Attempt,Exercise,ReviewEvent} from '../content/types';
/** Existing Attempt.sessionId provides an immutable link: no new data store. */
export const REVIEW_TRANSFER_PREFIX='review-transfer:';
export function reviewSessionId(event:ReviewEvent):string|null{
 const suffix=':review:'+event.cardId,position=event.cardId.lastIndexOf(':');
 if(position<=0||!event.id.endsWith(suffix)||event.itemId!==event.cardId.slice(0,position))return null;
 const session=event.id.slice(0,-suffix.length);
 return session&&!session.startsWith(REVIEW_TRANSFER_PREFIX)?session:null;
}
export function transferSessionId(event:ReviewEvent):string|null{
 const session=reviewSessionId(event);return session?REVIEW_TRANSFER_PREFIX+session:null;
}
export function reviewSourceAttempt(event:ReviewEvent,attempts:readonly Attempt[]):Attempt|null{
 const session=reviewSessionId(event);
 if(!session)return null;
 const a=attempts.find(x=>x.sessionId===session&&x.itemId===event.itemId&&x.at<=event.at);
 return a&&a.result!=='VOID'&&event.cardId===a.itemId+':'+a.itemVersion?a:null;
}
export type TransferChoice={itemId:string;sourceId:string;reviewSession:string;status:'AVAILABLE'|'DONE'|'NO_NEW_CONTEXT'|'OLD_SOURCE'|'NO_REVIEW';finished?:Attempt};
/** Match the exact authored skill and mode, prefer a different topic and never reuse a previously answered task. */
export function reviewTransferChoice(event:ReviewEvent,items:readonly Exercise[],attempts:readonly Attempt[]):TransferChoice{
 const transfer=transferSessionId(event),prior=reviewSourceAttempt(event,attempts);
 const base={itemId:'',sourceId:event.itemId,reviewSession:transfer??''};
 if(!prior||!transfer)return {...base,status:'NO_REVIEW'};
 const original=items.find(x=>x.id===prior.itemId);
 if(!original||original.version!==prior.itemVersion||original.status==='WITHDRAWN')return {...base,status:'OLD_SOURCE'};
 const completed=attempts.find(x=>x.sessionId===transfer);
 if(completed)return {...base,itemId:completed.itemId,status:'DONE',finished:completed};
 const used=new Set(attempts.map(x=>x.itemId));
 const available=items.filter(x=>x.status!=='WITHDRAWN'&&x.id!==original.id&&
  !used.has(x.id)&&x.version>=1&&x.mode===original.mode&&x.skillId===original.skillId);
 available.sort((a,b)=>Number(a.topic===original.topic)-Number(b.topic===original.topic)||a.id.localeCompare(b.id));
 return available.length?{...base,itemId:available[0].id,status:'AVAILABLE'}:{...base,status:'NO_NEW_CONTEXT'};
}
export function reviewTransferEvidence(events:readonly ReviewEvent[],items:readonly Exercise[],attempts:readonly Attempt[]){
 let offered=0,finished=0,correct=0;
 const seen=new Set<string>();
 for(const event of events){
  const id=transferSessionId(event);
  if(!id||seen.has(id))continue;seen.add(id);
  const result=reviewTransferChoice(event,items,attempts);
  if(result.status==='AVAILABLE'||result.status==='DONE')offered++;
  if(result.status==='DONE'&&result.finished){
   finished++;
   const item=items.find(x=>x.id===result.finished?.itemId);
   if(item&&item.version===result.finished.itemVersion&&result.finished.result==='CORRECT')correct++;
  }
 }
 return {offered,finished,correct};
}
