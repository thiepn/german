import test from 'node:test';
import assert from 'node:assert/strict';
import type {Attempt,Exercise,ReviewCard} from '../src/domain/content/types';
import {allItems} from '../src/domain/content/registry';
import {exhaustedContrastPlans} from '../src/domain/errors/exhaustedContrast';
const now=Date.UTC(2026,10,11,13);
const group=allItems.filter(x=>x.mode==='M01'&&x.skillId==='G01.GENUS'&&x.topic==='Gesellschaft').sort((a,b)=>a.id.localeCompare(b.id));
assert.equal(group.length,3);
const attempt=(i:Exercise,t:number,result:Attempt['result'],extra:Partial<Attempt>={}):Attempt=>({
 id:i.id+':'+t,sessionId:i.id+':'+t,itemId:i.id,itemVersion:i.version,
 mode:i.mode,skillId:i.skillId,at:t,slots:{article:'falsch'},
 score:result==='CORRECT'?1:0,correct:result==='CORRECT',hinted:false,result,variantIndex:null,...extra
});
const history=()=>[attempt(group[0],now-50000,'INCORRECT'),attempt(group[1],now-30000,'CORRECT'),
 attempt(group[2],now-10000,'INCORRECT')];
const project=(a:Attempt[],items:Exercise[]=allItems,cards:ReviewCard[]=[])=>exhaustedContrastPlans(now,a,items,cards);
test('three exact current attempted contexts with a real authored answer contrast form a non-new-context practice',()=>{
 const p=project(history()).find(p=>p.topic==='Gesellschaft');
 assert.ok(p);assert.equal(p.contexts.length,3);
 assert.equal(p.anchor.item.id,group[2].id);assert.equal(p.contrast.item.id,group[1].id);
 assert.notDeepEqual(p.anchor.item.variants[0].slots,p.contrast.item.variants[0].slots);
 assert.equal(p.dueItem,null);
});
test('one unused exercise is reserved for legitimate independent transfer, not contrast exhaustion',()=>{
 assert.equal(project(history().slice(0,2)).find(p=>p.topic==='Gesellschaft'),undefined);
});
test('history with no observed uncertain answers is not incorrectly treated as remediation',()=>{
 const correct=group.map((x,i)=>attempt(x,now-50000+i*1000,'CORRECT'));
 assert.equal(project(correct).find(p=>p.topic==='Gesellschaft'),undefined);
});
test('wrong version, withdrawn source and future first encounter are fail-closed',()=>{
 const h=history();
 assert.equal(project([h[0],h[1],{...h[2],itemVersion:999}]).find(p=>p.topic==='Gesellschaft'),undefined);
 assert.equal(project(h,allItems.map(x=>x.id===group[2].id?{...x,version:x.version+1}:x)).find(p=>p.topic==='Gesellschaft'),undefined);
 assert.equal(project([...h.slice(0,2),{...h[2],at:now+2000}]).find(p=>p.topic==='Gesellschaft'),undefined);
});
test('an unchanged current-version due review is offered instead of a fabricated first encounter',()=>{
 const c:ReviewCard={id:group[2].id+':'+group[2].version,itemId:group[2].id,itemVersion:group[2].version,
 dueAt:now-1000,stability:1,difficulty:5,lastReviewedAt:null,lapses:0,algorithmVersion:'sg-recall-0.2'};
 assert.equal(project(history(),allItems,[c])[0]?.dueItem?.id,group[2].id);
 assert.equal(project(history(),allItems,[{...c,itemVersion:999}])[0]?.dueItem,null);
 assert.equal(project(history(),allItems,[{...c,dueAt:now+60000}])[0]?.nextDueAt,now+60000);
});
test('source prompts and original submissions remain byte-for-byte unchanged by pure projection',()=>{
 const h=history();const before=JSON.stringify(h);
 project(h);assert.equal(JSON.stringify(h),before);
});
test('same author topic without two distinct authored accepted forms cannot be invented as a contrast',()=>{
 const items=allItems.map(x=>group.some(y=>y.id===x.id)?{...x,variants:[{slots:{article:'die'}}]}:x);
 assert.equal(project(history(),items).find(p=>p.topic==='Gesellschaft'),undefined);
});
test('invalid clock is rejected',()=>assert.throws(()=>project(history(),allItems,[]).length&&exhaustedContrastPlans(NaN,history(),allItems),/clock/));
