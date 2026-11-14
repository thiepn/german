import type {Attempt,Exercise,ReviewCard,Mode} from '../content/types';
import {buildErrorClusters} from './errorProjection';

export type AuthoredContext={item:Exercise;first:Attempt};
export type ExhaustedContrastPlan={
 key:string;mode:Mode;skillId:string;topic:string;latestErrorAt:number;
 anchor:AuthoredContext;contrast:AuthoredContext;
 contexts:readonly AuthoredContext[];dueItem:Exercise|null;nextDueAt:number|null;
};
const keyOf=(x:Exercise)=>[x.mode,x.skillId,x.topic].join('::');
const uncertain=(a:Attempt)=>a.result==='INCORRECT'||a.result==='PARTIAL';
const answer=(x:Exercise)=>x.variants[0]&&x.slots.map(s=>x.variants[0].slots[s.id]??'').join('\u241f').trim().toLocaleLowerCase('de-DE');
/**
 * All currently authored same-topic contexts have already received exact-version
 * first attempts. Choose two that actually contrast in their authored slot answers,
 * favoring a first-error versus a correct first attempt.
 *
 * This does NOT produce a new task, grade, proof of language competence or a
 * validated topic taxonomy. It only offers self-study on already seen fixtures.
 */
export function exhaustedContrastPlans(now:number,attempts:readonly Attempt[],items:readonly Exercise[],cards:readonly ReviewCard[]=[]):ExhaustedContrastPlan[]{
 if(!Number.isFinite(now))throw Error('Exhausted-contrast clock must be finite');
 const byId=new Map(items.map(x=>[x.id,x] as const));
 const prior=[...attempts].filter(a=>a.result!=='VOID'&&Number.isFinite(a.at)&&a.at<=now)
  .sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 const first=new Map<string,Attempt>();
 for(const a of prior)if(!first.has(a.itemId))first.set(a.itemId,a);
 const clusters=buildErrorClusters(prior,byId).filter(c=>c.sourceCurrent&&c.status!=='WIEDER_ANGEWENDET'&&!c.freshContextId);
 const plans:ExhaustedContrastPlan[]=[];
 for(const cluster of clusters){
  const sources=items.filter(x=>x.status!=='WITHDRAWN'&&x.variants.length>0&&x.slots.length>0&&
   x.mode===cluster.mode&&x.skillId===cluster.skillId&&x.topic===cluster.topic).sort((a,b)=>a.id.localeCompare(b.id));
  if(sources.length<2)continue;
  // A prior encounter with a withdrawn or changed version must not be silently
  // used as an exact current authored comparison.
  const contexts:AuthoredContext[]=[];
  let blocked=false;
  for(const item of sources){
   const a=first.get(item.id);
   if(!a||a.itemVersion!==item.version||a.mode!==item.mode||a.skillId!==item.skillId||!answer(item)){
    blocked=true;break;
   }
   contexts.push({item,first:a});
  }
  if(blocked)continue;
  const errors=contexts.filter(x=>uncertain(x.first)).sort((a,b)=>b.first.at-a.first.at||a.item.id.localeCompare(b.item.id));
  let pair:{anchor:AuthoredContext;contrast:AuthoredContext}|null=null;
  for(const anchor of errors){
   const contrasting=contexts.filter(x=>x.item.id!==anchor.item.id&&answer(x.item)!==answer(anchor.item))
    .sort((a,b)=>Number(b.first.result==='CORRECT'&&!b.first.hinted)-Number(a.first.result==='CORRECT'&&!a.first.hinted)||
     b.first.at-a.first.at||a.item.id.localeCompare(b.item.id));
   if(contrasting.length){pair={anchor,contrast:contrasting[0]};break;}
  }
  if(!pair)continue;
  const candidates=cards.filter(c=>Number.isFinite(c.dueAt)&&sources.some(x=>x.id===c.itemId&&x.version===c.itemVersion))
   .sort((a,b)=>a.dueAt-b.dueAt||a.itemId.localeCompare(b.itemId));
  const due=candidates.find(c=>c.dueAt<=now);
  plans.push({key:cluster.key,mode:cluster.mode,skillId:cluster.skillId,topic:cluster.topic,
   latestErrorAt:cluster.lastFailureAt,anchor:pair.anchor,contrast:pair.contrast,contexts,
   dueItem:due?byId.get(due.itemId)??null:null,nextDueAt:candidates.find(c=>c.dueAt>now)?.dueAt??null});
 }
 return plans.sort((a,b)=>b.latestErrorAt-a.latestErrorAt||a.key.localeCompare(b.key));
}
