import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gradeAnswer} from '../src/domain/grading/gradeAnswer.ts';
import {planMission} from '../src/domain/mission/mission.ts';
import {modes} from '../src/domain/content/modes.ts';
import type {Exercise} from '../src/domain/content/types.ts';
const items=JSON.parse(readFileSync('content/fixtures/semantic-register.demo.json','utf8')) as Exercise[];
test('24 unapproved contextual decisions in two independent modes',()=>{
 assert.equal(items.length,24);assert.equal(new Set(items.map(i=>i.id)).size,24);
 for(const mode of ['M06','M07'] as const){assert.equal(items.filter(i=>i.mode===mode).length,12);assert.ok(modes[mode]);}
 for(const i of items){
  assert.equal(i.status,'DEMO_ONLY');assert.equal(i.rights.kind,'ORIGINAL_DRAFT');
  assert.equal(i.decision?.options.length,3);assert.equal(new Set(i.decision!.options).size,3);
  assert.equal(gradeAnswer(i,i.variants[0].slots).status,'CORRECT',i.id);
  for(const o of i.decision!.options.filter(o=>o!==i.variants[0].slots.choice))assert.equal(gradeAnswer(i,{choice:o}).status,'INCORRECT',i.id);
 }
});
test('same finite mission engine schedules new items without a new writer',()=>{
 const m=planMission('nuances',items,[],[],30,10);assert.equal(m.steps.length,8);
 assert.equal(new Set(m.steps.map(s=>s.itemId)).size,8);
 assert.ok(m.steps.every(s=>items.some(i=>i.id===s.itemId&&i.version===s.itemVersion)));
});
