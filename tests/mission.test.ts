import test from 'node:test';import assert from 'node:assert/strict';
import {planMission,missionStep,validateMission} from '../src/domain/mission/mission.ts';
import type {Exercise,Attempt,ReviewCard} from '../src/domain/content/types.ts';
const items=Array.from({length:30},(_,i)=>({id:'SYN-M0'+(i%5+1)+'-'+i,version:1,mode:('M0'+(i%5+1)) as Exercise['mode'],status:'DEMO_ONLY' as const,skillId:'G01.TEST'})) as Exercise[];
test('finite mission quotas and unique, fixed-version steps',()=>{
 for(const [minutes,total] of [[10,4],[20,6],[30,8],[45,12],[60,14]] as const){
  const m=planMission('s-'+minutes,items,[],[],minutes,100);
  assert.equal(m.steps.length,total);assert.equal(new Set(m.steps.map(x=>x.itemId)).size,total);
  assert.equal(m.index,0);assert.equal(missionStep(m)?.itemId,m.steps[0].itemId);assert.equal(validateMission(m),true);
 }
});
test('due and wrong answers are prioritized without repeated questions',()=>{
 const item=items[0];const attempts=[{itemId:items[1].id,result:'INCORRECT',at:90}] as Attempt[];
 const cards=[{itemId:item.id,dueAt:50}] as ReviewCard[];
 const m=planMission('one',items,attempts,cards,20,100);
 assert.equal(m.steps[0].itemId,item.id);assert.equal(m.steps[0].kind,'REVIEW');
 assert.equal(m.steps[1].itemId,items[1].id);assert.equal(m.steps[1].kind,'REPAIR');
 assert.equal(m.steps.length,6);
});
test('no invented mission items or extension of exhausted bank',()=>{
 const m=planMission('limited',items.slice(0,2),[],[],30,100);
 assert.equal(m.steps.length,2);assert.equal(missionStep({...m,index:2}),null);
 assert.throws(()=>planMission('empty',[],[],[],10,0));
});
