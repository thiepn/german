import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';
import {productionPrompts} from '../src/domain/production/prompts.ts';
import {gradeAnswer} from '../src/domain/grading/gradeAnswer.ts';
import type {Exercise} from '../src/domain/content/types.ts';
const old=JSON.parse(fs.readFileSync('content/fixtures/syntax-collocations.demo.json','utf8')) as Exercise[];
const contrasts=JSON.parse(fs.readFileSync('content/fixtures/collocation-contrasts.demo.json','utf8')) as Exercise[];
test('content extensions separate graded contrasts from ungraded rewriting',()=>{
 assert.equal(contrasts.length,14);assert.equal(productionPrompts.length,12);
 assert.ok(contrasts.every(i=>i.mode==='M05'&&i.contrast&&i.contrast.options.includes(i.variants[0].slots.collocation)&&i.status==='DEMO_ONLY'));
 assert.ok(productionPrompts.every(p=>p.status==='DEMO_ONLY'&&p.authorship==='AI_DRAFT'&&p.reviewedBy===null));
 assert.equal(old.length,68);
});
test('contrast explanations and wrong alternatives remain distinct',()=>{
 for(const item of contrasts){
  const correct=item.variants[0].slots.collocation;
  const wrong=item.contrast!.options.find(x=>x!==correct)!;
  assert.equal(gradeAnswer(item,{collocation:correct}).status,'CORRECT',item.id);
  assert.equal(gradeAnswer(item,{collocation:wrong}).status,'INCORRECT',item.id);
  assert.ok(item.contrast!.rationale.trim().length>10);
 }
});
