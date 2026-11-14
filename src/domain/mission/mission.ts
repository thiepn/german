import type {Attempt,Exercise,LearnerSettings,ReviewCard} from '../content/types';
import {buildErrorClusters,independentTransferState} from '../errors/errorProjection';

export type MissionKind='REVIEW'|'REPAIR'|'EXPLORE'|'TRANSFER';
export type MissionStep={itemId:string;itemVersion:number;kind:MissionKind};
export type Mission={id:string;phase:'IN_PROGRESS'|'PAUSED'|'COMPLETE';minutes:LearnerSettings['dailyMinutes'];steps:MissionStep[];index:number;createdAt:number;updatedAt:number};
export const MISSION_ALGORITHM='sg-mission-1';
const capacity:Record<LearnerSettings['dailyMinutes'],number>={10:4,20:6,30:8,45:12,60:14};
const topicKey=(i:Exercise)=>[i.mode,i.skillId,i.topic].join('::');

/** Use real due cards and first-encounter evidence, not filler to reach session duration.
 * REVIEW has a current exact-version due card and earlier real attempt; REPAIR is
 * an unresolved prior error without an active card; TRANSFER is only an unattempted
 * source-linked context, not a CEFR claim; EXPLORE is only genuinely unattempted.
 * One novel item per author-topic group avoids consuming the rest in one mission.
 * Existing persisted sg-mission-1 IDs, plans, backups and CAS are unchanged.
 */
export function planMission(id:string,items:readonly Exercise[],attempts:readonly Attempt[],cards:readonly ReviewCard[],minutes:LearnerSettings['dailyMinutes'],now:number):Mission{
 if(!id||!Number.isFinite(now)||!Object.hasOwn(capacity,minutes))throw Error('Mission ID, clock and duration required');
 const eligible=items.filter(i=>i.status!=='WITHDRAWN'&&Number.isInteger(i.version)&&i.version>=1);
 const byId=new Map(eligible.map(i=>[i.id,i]));
 const chronological=[...attempts].filter(a=>Number.isFinite(a.at)&&a.at<=now&&a.result!=='VOID')
  .sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 const seenEarlier=new Set(attempts.filter(a=>a.itemId&&a.result!=='VOID').map(a=>a.itemId));
 const attemptedVersions=new Set(chronological.map(a=>a.itemId+'@'+a.itemVersion));
 const latest=new Map<string,Attempt>();
 for(const a of chronological)latest.set(a.itemId,a);
 const cardByItem=new Map<string,ReviewCard>();
 for(const card of cards){
  const item=byId.get(card.itemId);
  if(!item||card.itemVersion!==item.version||card.id!==item.id+':'+item.version||
   !Number.isFinite(card.dueAt)||card.dueAt<0||!attemptedVersions.has(item.id+'@'+item.version))continue;
  const prior=cardByItem.get(item.id);
  if(!prior||card.dueAt<prior.dueAt)cardByItem.set(item.id,card);
 }
 const due=[...cardByItem.values()].filter(c=>c.dueAt<=now)
  .sort((a,b)=>a.dueAt-b.dueAt||a.itemId.localeCompare(b.itemId)).map(c=>c.itemId);
 const errors=[...chronological].filter(a=>(a.result==='INCORRECT'||a.result==='PARTIAL')&&
  byId.get(a.itemId)?.version===a.itemVersion&&!cardByItem.has(a.itemId)&&
  latest.get(a.itemId)?.id===a.id)
  .sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id)).map(a=>a.itemId);
 const groups=buildErrorClusters(chronological,byId);
 const waiting=new Set(groups.filter(c=>c.sourceCurrent&&independentTransferState(c,now).phase==='WAITING').map(c=>c.key));
 const fresh=eligible.filter(i=>!seenEarlier.has(i.id)&&!cardByItem.has(i.id)&&!waiting.has(topicKey(i)));
 const freshById=new Map(fresh.map(i=>[i.id,i]));
 const transfer=groups.filter(c=>c.sourceCurrent&&c.freshContextId&&
    ['FIRST_CONTEXT','SPACED_CONTEXT_DUE'].includes(independentTransferState(c,now).phase))
  .map(c=>c.freshContextId!).filter(i=>freshById.has(i));
 const unseen=fresh.map(i=>i.id).sort();
 const amount=capacity[minutes];
 const picked:MissionStep[]=[];const used=new Set<string>(),novelGroups=new Set<string>();
 const add=(ids:readonly string[],kind:MissionKind,count:number)=>{
  for(const itemId of ids){
   if(picked.length>=amount||count<=0)break;
   const item=byId.get(itemId);
   if(!item||used.has(item.id))continue;
   if(kind==='REVIEW'&&!due.includes(item.id))continue;
   if(kind==='REPAIR'&&!errors.includes(item.id))continue;
   if(kind==='EXPLORE'||kind==='TRANSFER'){
    if(!freshById.has(item.id)||novelGroups.has(topicKey(item)))continue;
    novelGroups.add(topicKey(item));
   }
   used.add(item.id);picked.push({itemId:item.id,itemVersion:item.version,kind});count--;
  }
 };
 add(due,'REVIEW',Math.max(1,Math.floor(amount*.3)));
 add(errors,'REPAIR',Math.max(1,Math.floor(amount*.3)));
 add(transfer,'TRANSFER',Math.max(1,Math.floor(amount*.25)));
 add(unseen,'EXPLORE',Math.max(1,Math.floor(amount*.3)));
 add(due,'REVIEW',amount);
 add(transfer,'TRANSFER',amount);
 add(unseen,'EXPLORE',amount);
 add(errors,'REPAIR',amount);
 if(!picked.length)throw Error('Keine fälligen Wiederholungen oder geeigneten Übungskontexte. Statt Wiederholungen als neu auszugeben, Quellenarbeit fortsetzen.');
 return {id,phase:'IN_PROGRESS',minutes,steps:picked,index:0,createdAt:now,updatedAt:now};
}
export function missionStep(m:Mission):MissionStep|null{return m.index>=m.steps.length?null:m.steps[m.index];}
export function validateMission(m:Mission):boolean{
 return Boolean(m&&typeof m.id==='string'&&m.id.length>0&&Number.isFinite(m.createdAt)&&Number.isFinite(m.updatedAt)&&[10,20,30,45,60].includes(m.minutes)&&Array.isArray(m.steps)&&['IN_PROGRESS','PAUSED','COMPLETE'].includes(m.phase)&&Number.isInteger(m.index)&&m.index>=0&&m.index<=m.steps.length&&m.steps.length>0&&m.steps.length<=14&&new Set(m.steps.map(s=>s.itemId)).size===m.steps.length&&m.steps.every(s=>typeof s.itemId==='string'&&s.itemId.length>0&&Number.isInteger(s.itemVersion)&&s.itemVersion>=1&&['REVIEW','REPAIR','EXPLORE','TRANSFER'].includes(s.kind)));
}
