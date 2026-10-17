import type { ReviewCard,ReviewEvent } from '../content/types';
export const RECALL_VERSION = 'sg-recall-0.1' as const;
// Deterministic offline recall scheduler. Prototype, NOT certified FSRS-6.
export function nextReview(card:ReviewCard, grade:ReviewEvent['grade'], at:number):ReviewCard {
 const days=Math.max(0.25,card.stability);
 const multiplier={Again:0.35,Hard:1.3,Good:2.5,Easy:3.5}[grade];
 const stability=grade==='Again'?0.25:Math.max(0.5,days*multiplier);
 const difficulty=Math.min(10,Math.max(1,card.difficulty+({Again:1,Hard:0.4,Good:-0.15,Easy:-0.4}[grade])));
 return {...card,stability,difficulty,lastReviewedAt:at,lapses:card.lapses+(grade==='Again'?1:0),dueAt:at+Math.round(stability*86400000)};
}
export function newCard(itemId:string,itemVersion:number,at:number):ReviewCard {
 return {id:itemId+':'+itemVersion,itemId,itemVersion,dueAt:at,stability:0.25,difficulty:5,lastReviewedAt:null,lapses:0,algorithmVersion:RECALL_VERSION};
}
