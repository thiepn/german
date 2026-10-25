import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {gradeAnswer} from '../src/domain/grading/gradeAnswer.ts';import type {Exercise} from '../src/domain/content/types.ts';
const items=JSON.parse(readFileSync('content/fixtures/advanced-precision.demo.json','utf8')) as Exercise[];
test('48 unique unapproved drafts covering three grammar modes',()=>{assert.equal(items.length,48);assert.equal(new Set(items.map(i=>i.id)).size,48);for(const mode of ['M01','M02','M03'])assert.equal(items.filter(i=>i.mode===mode).length,16);assert.ok(items.every(i=>i.status==='DEMO_ONLY'&&i.rights.kind==='ORIGINAL_DRAFT'))});
test('draft answer tuples validated by deterministic scorer without editorial claim',()=>{for(const i of items){assert.equal(gradeAnswer(i,i.variants[0].slots).status,'CORRECT');assert.equal(gradeAnswer(i,Object.fromEntries(i.slots.map(s=>[s.id,'unpassend']))).status,'INCORRECT')}});
