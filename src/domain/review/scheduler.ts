import type {Attempt,ReviewCard,ReviewEvent} from '../content/types';
export const RECALL_VERSION='sg-recall-0.2' as const;
export const DAY=86400000;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
/** A deterministic, elapsed-time-aware recall heuristic; NOT FSRS or a calibrated recall probability.
 * Existing v0.1 cards are adopted only on the learner's next actual review.
 * No history is rewritten or rescheduled during upgrades.
 */
export function nextReview(card:ReviewCard,grade:ReviewEvent['grade'],at:number):ReviewCard{
 if(!Number.isFinite(at)||at<0||!Number.isFinite(card.stability)||!Number.isFinite(card.difficulty))throw Error('Ungültige Wiederholung oder Zeitangabe');
 const oldDays=clamp(card.stability,0.25,3650);
 const elapsedDays=card.lastReviewedAt===null?oldDays:Math.max(0,(at-card.lastReviewedAt)/DAY);
 const ratio=clamp(elapsedDays/oldDays,0,3);
 const ease=clamp(1-(card.difficulty-5)*0.035,0.75,1.2);
 let stability:number;
 switch(grade){
  case 'Again':stability=clamp(oldDays*0.32,0.25,1.5);break;
  case 'Hard':stability=clamp(oldDays*(1.12+0.11*ratio)*ease,0.5,3650);break;
  case 'Good':stability=clamp(oldDays*(1.75+0.30*ratio)*ease,0.75,3650);break;
  case 'Easy':stability=clamp(oldDays*(2.65+0.48*ratio)*ease,1.25,3650);break;
  default:throw Error('Unbekannte Wiederholungsbewertung');
 }
 const difficulty=clamp(card.difficulty+({Again:1,Hard:0.35,Good:-0.2,Easy:-0.4}[grade]),1,10);
 return {...card,stability,difficulty,lastReviewedAt:at,lapses:card.lapses+(grade==='Again'?1:0),
  dueAt:at+Math.max(1,Math.round(stability*DAY)),algorithmVersion:RECALL_VERSION};
}
export function newCard(itemId:string,itemVersion:number,at:number):ReviewCard{
 return {id:itemId+':'+itemVersion,itemId,itemVersion,dueAt:at,stability:0.25,
  difficulty:5,lastReviewedAt:null,lapses:0,algorithmVersion:RECALL_VERSION};
}
export function dueReviewCards(cards:readonly ReviewCard[],now:number):ReviewCard[]{
 return cards.filter(c=>c.dueAt<=now).sort((a,b)=>a.dueAt-b.dueAt||b.lapses-a.lapses||a.id.localeCompare(b.id));
}
export type RecallEvidence={delayed:number;correct:number;items:number;days:number;minimumReached:boolean};
/** Historical, observed delayed retrieval, never a claim of CEFR or a validated predicted-retention rate. */
export function recallEvidence(attempts:readonly Attempt[],events:readonly ReviewEvent[]):RecallEvidence{
 const observations=new Map<string,Attempt[]>();
 for(const a of attempts){
  const key=a.itemId+'@'+a.itemVersion;
  const existing=observations.get(key)??[];existing.push(a);observations.set(key,existing);
 }
 for(const x of observations.values())x.sort((a,b)=>a.at-b.at);
 let delayed=0,correct=0;const seenItems=new Set<string>(),seenDays=new Set<string>();
 for(const event of [...events].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))){
  const suffix=':review:'+event.cardId;
  if(!event.id.endsWith(suffix))continue;
  const sessionId=event.id.slice(0,-suffix.length);
  const attempt=attempts.find(a=>a.sessionId===sessionId&&a.itemId===event.itemId&&a.at<=event.at);
  if(!attempt)continue;
  const key=attempt.itemId+'@'+attempt.itemVersion;
  const earlier=(observations.get(key)??[]).some(a=>a.id!==attempt.id&&a.at<=attempt.at-DAY);
  if(!earlier)continue;
  delayed++;if(attempt.result==='CORRECT'&&['Good','Easy'].includes(event.grade))correct++;
  seenItems.add(key);seenDays.add(new Date(event.at).toISOString().slice(0,10));
 }
 return {delayed,correct,items:seenItems.size,days:seenDays.size,minimumReached:delayed>=5&&seenItems.size>=3&&seenDays.size>=2};
}
