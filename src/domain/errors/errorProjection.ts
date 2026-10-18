import type {Attempt,Exercise,Mode} from '../content/types';

/** Heuristic training topics, not linguistic diagnosis or proficiency certification. */
export type ErrorClusterStatus='OFFEN'|'WIEDER_ANGEWENDET'|'ERNEUT_UNSICHER';
export type ErrorCluster={
 key:string; skillId:string; topic:string; mode:Mode; status:ErrorClusterStatus;
 failures:Attempt[]; laterCorrect:Attempt[]; lastFailureAt:number; distinctFailureItems:number;
 freshContextId:string|null; repeatItemId:string|null; sourceCurrent:boolean;
};

/** Old answers survive content withdrawal and revisions. Explanations only refer to matching current versions. */
export function projectErrors(attempts:Attempt[],byId:Map<string,Exercise>){
 return attempts.filter(a=>a.result==='INCORRECT'||a.result==='PARTIAL')
  .sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id))
  .map(a=>({attempt:a,item:byId.get(a.itemId)}));
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
 const clusters:ErrorCluster[]=[];
 for(const [key,history] of groups){
  const failures=history.filter(a=>a.result==='INCORRECT'||a.result==='PARTIAL').sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));
  if(!failures.length)continue;
  const lastFailure=failures[0];
  const item=byId.get(lastFailure.itemId);
  const sourceCurrent=Boolean(item&&item.version===lastFailure.itemVersion);
  const laterCorrect=history.filter(a=>a.result==='CORRECT'&&a.at>lastFailure.at&&a.itemId!==lastFailure.itemId);
  const uniqueCorrect=new Set(laterCorrect.map(a=>a.itemId)).size;
  const distinctDays=new Set(laterCorrect.map(a=>new Date(a.at).toISOString().slice(0,10))).size;
  const status:ErrorClusterStatus=uniqueCorrect>=2&&distinctDays>=2?'WIEDER_ANGEWENDET':laterCorrect.length?'ERNEUT_UNSICHER':'OFFEN';
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
