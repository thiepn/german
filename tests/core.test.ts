import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gradeAnswer,normalizeGerman} from '../src/domain/grading/gradeAnswer.ts';
import {newCard,nextReview} from '../src/domain/review/scheduler.ts';
import {estimateMastery} from '../src/domain/mastery/estimator.ts';
import type {Exercise,Attempt} from '../src/domain/content/types.ts';
const items=JSON.parse(readFileSync(new URL('../content/fixtures/core.demo.json',import.meta.url),'utf8')) as Exercise[];
test('corpus: 36 demonstrators, 12 per mode, none editorially approved',()=>{
 assert.equal(items.length,36);assert.deepEqual(['M01','M02','M03'].map(m=>items.filter(x=>x.mode===m).length),[12,12,12]);assert.equal(items.filter(x=>x.status==='REVIEWED').length,0);
});
test('original gender prompts and strict wrong gender',()=>{
 const noun=items.find(x=>x.id==='SG-M01-001')!;assert.equal(gradeAnswer(noun,{article:'die'}).status,'CORRECT');assert.equal(gradeAnswer(noun,{article:'der'}).status,'INCORRECT');
});
test('multi-slot: combination must match same authored variant',()=>{
 const ex={...items.find(x=>x.mode==='M02')!,variants:[{slots:{determiner:'dem',adjective:'neuen'}},{slots:{determiner:'einem',adjective:'neuen'}}]};
 assert.equal(gradeAnswer(ex,{determiner:'dem',adjective:'neuen'}).status,'CORRECT');
 assert.equal(gradeAnswer(ex,{determiner:'einem',adjective:'neuen'}).status,'CORRECT');
 assert.equal(gradeAnswer(ex,{determiner:'den',adjective:'neuen'}).status,'PARTIAL');
});
test('multi-slot: false cross-variant combinations cannot become correct',()=>{
 const ex={...items.find(x=>x.mode==='M03')!,variants:[{slots:{preposition:'auf',case:'Dativ'}},{slots:{preposition:'für',case:'Akkusativ'}}]};
 assert.equal(gradeAnswer(ex,{preposition:'auf',case:'Akkusativ'}).status,'PARTIAL');
});
test('German unicode NFC and capitalization scope',()=>{assert.equal(normalizeGerman('  DIE  '),'die');assert.notEqual(normalizeGerman('Maße'),normalizeGerman('Masse'));assert.equal(normalizeGerman('Groß',true),'Groß');});
test('FSRS-inspired prototype schedules deterministic events',()=>{
 const c=newCard('x',1,0);const a=nextReview(c,'Good',86400000);const b=nextReview(c,'Good',86400000);assert.deepEqual(a,b);assert.ok(a.dueAt>86400000);assert.equal(nextReview(c,'Again',86400000).lapses,1);
});
test('mastery does not falsely state confidence on single attempt',()=>{
 const a:Attempt={id:'one',itemId:'a',itemVersion:1,mode:'M01',skillId:'G01.GENUS',at:86400000,slots:{article:'der'},score:1,correct:true,hinted:false,result:'CORRECT',sessionId:'sess',variantIndex:0};
 const m=estimateMastery([a],'G01.GENUS',86400000);assert.equal(m.n,1);assert.ok(m.confidence<0.1);
});
