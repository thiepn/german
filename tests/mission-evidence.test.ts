import test from 'node:test';
import assert from 'node:assert/strict';
import type {Attempt,Exercise,ReviewCard} from '../src/domain/content/types';
import {allItems} from '../src/domain/content/registry';
import {planMission} from '../src/domain/mission/mission';
const NOW=Date.UTC(2026,10,11,14),DAY=86400000;
const group=(mode:string,skill:string,topic:string)=>allItems.filter(i=>i.mode===mode&&i.skillId===skill&&i.topic===topic).sort((a,b)=>a.id.localeCompare(b.id));
const g01=group('M01','G01.GENUS','Gesellschaft');
assert.equal(g01.length,3);
function attempt(item:Exercise,at:number,result:Attempt['result']):Attempt{
 return {id:item.id+':'+at,itemId:item.id,itemVersion:item.version,mode:item.mode,skillId:item.skillId,at,
 sessionId:item.id+':'+at,slots:{},score:result==='CORRECT'?1:0,correct:result==='CORRECT',hinted:false,result,variantIndex:null};
}
function card(item:Exercise,dueAt:number):ReviewCard{
 return {id:item.id+':'+item.version,itemId:item.id,itemVersion:item.version,dueAt,
 stability:.25,difficulty:5,lastReviewedAt:null,lapses:0,algorithmVersion:'sg-recall-0.2'};
}
const plan=(a:Attempt[],c:ReviewCard[]=[],items:Exercise[]=allItems)=>planMission('evidence',items,a,c,30,NOW);
test('primary mission cannot consume held unseen context before delayed practice',()=>{
 const h=[attempt(g01[0],NOW-2*DAY,'INCORRECT'),attempt(g01[1],NOW-1000,'CORRECT')];
 const steps=plan(h).steps;
 assert.equal(steps.some(s=>s.itemId===g01[2].id),false,'reserve the last unseen source for 24 hours');
 assert.equal(steps.find(s=>s.itemId===g01[0].id)?.kind,'REPAIR');
 assert.equal(steps.some(s=>s.itemId===g01[1].id),false,'no replay of already correct item');
});
test('a new context is eligible at the exact 24h boundary',()=>{
 const h=[attempt(g01[0],NOW-3*DAY,'INCORRECT'),attempt(g01[1],NOW-DAY,'CORRECT')];
 const steps=plan(h).steps;
 assert.equal(steps.find(s=>s.itemId===g01[2].id)?.kind,'TRANSFER');
 for(const s of steps.filter(x=>x.kind==='TRANSFER'||x.kind==='EXPLORE'))
  assert.equal(h.some(a=>a.itemId===s.itemId),false,'already answered items never labelled novel');
});
test('only one new context per mode, skill, author topic per mission',()=>{
 const steps=plan([]).steps;
 const map=new Map(allItems.map(x=>[x.id,x]));
 const keys=steps.filter(s=>s.kind==='EXPLORE'||s.kind==='TRANSFER').map(s=>{
  const i=map.get(s.itemId)!;return [i.mode,i.skillId,i.topic].join('::');
 });
 assert.equal(keys.length,new Set(keys).size);
 assert.equal(steps.length,8,'normal inventory fills quota without invented repeats');
});
test('real due card first, future card and reserved novel item excluded',()=>{
 const h=[attempt(g01[0],NOW-2*DAY,'INCORRECT'),attempt(g01[1],NOW-1000,'CORRECT')];
 const steps=plan(h,[card(g01[0],NOW-1),card(g01[1],NOW+DAY)]).steps;
 assert.equal(steps[0].itemId,g01[0].id);assert.equal(steps[0].kind,'REVIEW');
 assert.equal(steps.some(s=>s.itemId===g01[1].id),false);
 assert.equal(steps.some(s=>s.itemId===g01[2].id),false);
});
test('future cards and mismatched versions are never accelerated',()=>{
 const h=[attempt(g01[0],NOW-1000,'INCORRECT')];
 const steps=plan(h,[card(g01[0],NOW+DAY)]).steps;
 assert.equal(steps.some(s=>s.itemId===g01[0].id),false);
 const invalid=[{...card(g01[0],NOW-1),itemVersion:999}];
 assert.equal(plan(h,invalid).steps.some(s=>s.itemId===g01[0].id&&s.kind==='REVIEW'),false);
});
test('withdrawn source and older attempted version cannot appear as new',()=>{
 const h=[{...attempt(g01[0],NOW-2*DAY,'INCORRECT'),itemVersion:999}];
 const steps=plan(h,[],g01).steps;
 assert.equal(steps.some(s=>s.itemId===g01[0].id),false);
 const withdrawn=allItems.map(x=>x.id===g01[1].id?{...x,status:'WITHDRAWN' as const}:x);
 assert.equal(plan([],[],withdrawn).steps.some(s=>s.itemId===g01[1].id),false);
});
test('partially exhausted inventory yields a shorter truthful mission',()=>{
 const h=[attempt(g01[0],NOW-3*DAY,'INCORRECT'),attempt(g01[1],NOW-DAY,'CORRECT')];
 const steps=plan(h,[],g01).steps;
 assert.deepEqual(steps.map(x=>x.itemId),[g01[0].id,g01[2].id]);
 assert.deepEqual(steps.map(x=>x.kind),['REPAIR','TRANSFER']);
});
test('fully exhausted inventory with no due card cannot create false work',()=>{
 const h=g01.map((x,i)=>attempt(x,NOW-10000+i,'CORRECT'));
 assert.throws(()=>plan(h,[],g01),/Keine fälligen Wiederholungen/);
});
test('planning is read-only over learner attempts, cards and content',()=>{
 const h=[attempt(g01[0],NOW-3*DAY,'INCORRECT'),attempt(g01[1],NOW-1000,'CORRECT')];
 const c=[card(g01[0],NOW-1)],before=JSON.stringify([h,c,g01]);
 plan(h,c);assert.equal(JSON.stringify([h,c,g01]),before);
});
