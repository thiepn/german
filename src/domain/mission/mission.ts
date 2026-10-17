import type {Attempt,Exercise,LearnerSettings,ReviewCard} from '../content/types';
export type MissionKind='REVIEW'|'REPAIR'|'EXPLORE'|'TRANSFER';
export type MissionStep={itemId:string;itemVersion:number;kind:MissionKind};
export type Mission={id:string;phase:'IN_PROGRESS'|'PAUSED'|'COMPLETE';minutes:LearnerSettings['dailyMinutes'];steps:MissionStep[];index:number;createdAt:number;updatedAt:number};
export const MISSION_ALGORITHM='sg-mission-1';
const capacity:Record<LearnerSettings['dailyMinutes'],number>={10:4,20:6,30:8,45:12,60:14};
/** Finite, uniquely keyed plan. Never silently replaces tasks after a failed answer. */
export function planMission(id:string,items:readonly Exercise[],attempts:readonly Attempt[],cards:readonly ReviewCard[],minutes:LearnerSettings['dailyMinutes'],now:number):Mission{
 if(!id||!Number.isFinite(now))throw Error('Mission ID and clock required');
 const candidates=items.filter(i=>i.status!=='WITHDRAWN');
 const byId=new Map(candidates.map(i=>[i.id,i]));
 const picked:MissionStep[]=[];const seen=new Set<string>();
 const add=(ids:string[],kind:MissionKind,count:number)=>{
  for(const itemId of ids){if(picked.length>=capacity[minutes]||count<=0)break;
   const item=byId.get(itemId);if(!item||seen.has(item.id))continue;
   seen.add(item.id);picked.push({itemId:item.id,itemVersion:item.version,kind});count--;
  }
 };
 const history=new Set(attempts.map(x=>x.itemId));
 const overdue=cards.filter(c=>c.dueAt<=now).sort((a,b)=>a.dueAt-b.dueAt).map(x=>x.itemId);
 const errors=[...attempts].filter(x=>x.result==='INCORRECT'||x.result==='PARTIAL').sort((a,b)=>b.at-a.at).map(x=>x.itemId);
 const unseen=candidates.filter(i=>!history.has(i.id)).map(i=>i.id).sort();
 const transfer=candidates.filter(i=>i.mode==='M04'||i.mode==='M05').map(i=>i.id).sort();
 const amount=capacity[minutes];
 add(overdue,'REVIEW',Math.max(1,Math.floor(amount*.3)));
 add(errors,'REPAIR',Math.max(1,Math.floor(amount*.3)));
 add(unseen,'EXPLORE',Math.max(1,Math.floor(amount*.3)));
 add(transfer,'TRANSFER',Math.max(1,Math.floor(amount*.25)));
 add([...overdue,...errors,...unseen,...candidates.map(i=>i.id).sort()],'EXPLORE',amount);
 if(!picked.length)throw Error('No eligible exercises');
 return {id,phase:'IN_PROGRESS',minutes,steps:picked,index:0,createdAt:now,updatedAt:now};
}
export function missionStep(m:Mission):MissionStep|null{return m.index>=m.steps.length?null:m.steps[m.index];}
export function validateMission(m:Mission):boolean{
 return Boolean(m.id&&['IN_PROGRESS','PAUSED','COMPLETE'].includes(m.phase)&&Number.isInteger(m.index)&&m.index>=0&&m.index<=m.steps.length&&m.steps.length>0&&m.steps.length<=14&&new Set(m.steps.map(s=>s.itemId)).size===m.steps.length&&m.steps.every(s=>s.itemVersion>=1&&['REVIEW','REPAIR','EXPLORE','TRANSFER'].includes(s.kind)));
}
