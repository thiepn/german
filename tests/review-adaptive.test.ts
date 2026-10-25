import test from 'node:test';import assert from 'node:assert/strict';
import {DAY,RECALL_VERSION,newCard,nextReview,dueReviewCards,recallEvidence} from '../src/domain/review/scheduler.ts';
import type {Attempt,ReviewEvent} from '../src/domain/content/types.ts';
test('elapsed time and observed difficulty adapt deterministic intervals with bounded order',()=>{
 const init=newCard('x',1,0);assert.equal(RECALL_VERSION,'sg-recall-0.2');
 const late={...init,lastReviewedAt:DAY,stability:2,dueAt:3*DAY};
 const early=nextReview(late,'Good',2*DAY),later=nextReview(late,'Good',9*DAY);
 assert.ok(later.stability>early.stability);
 const at=9*DAY;const g=['Again','Hard','Good','Easy'] as const;
 const interval=g.map(x=>nextReview(late,x,at).dueAt-at);
 assert.ok(interval.every((n,i)=>i===0||n>=interval[i-1]));
 assert.equal(nextReview(late,'Again',at).lapses,1);
 assert.equal(late.algorithmVersion,'sg-recall-0.2');
});
test('v0.1 schedules remain unchanged until a real next review',()=>{
 const old={...newCard('old',1,0),algorithmVersion:'sg-recall-0.1' as const,dueAt:100};
 const result=nextReview(old,'Hard',DAY);
 assert.equal(old.algorithmVersion,'sg-recall-0.1');
 assert.equal(old.dueAt,100);
 assert.equal(result.algorithmVersion,'sg-recall-0.2');
 assert.equal(result.itemId,old.itemId);
});
test('queue ordering respects due clock and stable IDs',()=>{
 const now=2*DAY;
 const cards=[{...newCard('b',1,0),dueAt:now+1},{...newCard('c',1,0),dueAt:now-1},{...newCard('a',1,0),dueAt:now-1}];
 assert.deepEqual(dueReviewCards(cards,now).map(c=>c.itemId),['a','c']);
});
test('observed delayed retention excludes immediate answers and refuses fake confidence',()=>{
 const at=3*DAY,prior:Attempt={id:'s0:x',itemId:'x',itemVersion:1,mode:'M01',skillId:'G01',at:0,slots:{article:'die'},score:0,correct:false,hinted:false,result:'INCORRECT',sessionId:'s0',variantIndex:null};
 const later:Attempt={...prior,id:'s1:x',sessionId:'s1',at,result:'CORRECT',score:1,correct:true};
 const e:ReviewEvent={id:'s1:review:x:1',cardId:'x:1',itemId:'x',grade:'Good',at,scheduledDueAt:at+DAY,algorithmVersion:'sg-recall-0.2'};
 assert.deepEqual(recallEvidence([prior,later],[e]),{delayed:1,correct:1,items:1,days:1,minimumReached:false});
 assert.equal(recallEvidence([later],[e]).delayed,0);
 assert.equal(recallEvidence([prior,{...later,at:DAY/2}],[{...e,at:DAY/2}]).delayed,0);
});
