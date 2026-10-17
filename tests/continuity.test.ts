import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {revisionDiff,journey,nextWritingPrompt} from '../src/domain/production/continuity.ts';
import {productionPrompts} from '../src/domain/production/prompts.ts';
import type {ProductionEntry} from '../src/domain/production/types.ts';
import {buildReviewQueue} from '../scripts/editorial/reviewQueue.mjs';
import {gradeAnswer} from '../src/domain/grading/gradeAnswer.ts';
import type {Exercise} from '../src/domain/content/types.ts';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const manifest=read('content/manifest.json');
const graded:Exercise[]=manifest.authoringSources.flatMap((p:string)=>read(p)).filter((i:Exercise)=>i.id?.startsWith('SG-M'));
const anchors=read('content/editorial/lexical-anchors.json').anchors;
test('learner corpus is distinctly 178 objective items plus 20 ungraded writing prompts',()=>{
 assert.equal(graded.length,178);assert.equal(productionPrompts.length,20);
 assert.equal(graded.filter(x=>x.status==='REVIEWED').length,0);
 assert.ok(productionPrompts.every(p=>p.status==='DEMO_ONLY'&&p.reviewedBy===null));
 assert.equal(new Set(graded.map(x=>x.id)).size,178);
});
test('twelve authored dictionary-linked contrasts have bounded and auditable lexical scope',()=>{
 const grounded=graded.filter(x=>x.lexicalAuthority);assert.equal(grounded.length,12);
 assert.equal(anchors.length,6);
 for(const x of grounded){
  const a=anchors.find((s:{id:string})=>s.id===x.lexicalAuthority?.anchorId);
  assert.ok(a?.url.startsWith('https://www.duden.de/rechtschreibung/'));
  assert.equal(a?.editorialApproved,false);
  assert.equal(x.lexicalAuthority?.scope,'LEXICAL_FORM_ONLY');
  const correct=x.variants[0].slots.collocation;
  assert.equal(gradeAnswer(x,{collocation:correct}).status,'CORRECT');
  for(const alternative of x.contrast?.options??[])if(alternative!==correct)assert.equal(gradeAnswer(x,{collocation:alternative}).status,'INCORRECT');
 }
});
test('word diff shows actual tokens without assigning linguistic scores',()=>{
 const delta=revisionDiff('Der Bericht ist eindeutig.','Der Bericht sei vorläufig.');
 assert.ok(delta.some(x=>x.kind==='removed'&&x.text.includes('ist')));
 assert.ok(delta.some(x=>x.kind==='added'&&x.text.includes('sei')));
 assert.ok(delta.some(x=>x.kind==='same'&&x.text.includes('Bericht')));
 assert.deepEqual(revisionDiff('Gleich','Gleich'),[{kind:'same',text:'Gleich'}]);
 const long='Wort '.repeat(400);
 assert.equal(revisionDiff(long,'Etwas neues.').length,2);
});
test('continuation chooses unfinished earlier writing before new prompt, tracks revisions and never overwrites first',()=>{
 const e:ProductionEntry={id:'synthetic-entry',itemId:productionPrompts[0].id,itemVersion:1,createdAt:10,original:'Ursprünglich',revisions:[],evaluated:'UNASSESSED'};
 assert.equal(nextWritingPrompt(productionPrompts,[]),productionPrompts[0].id);
 assert.equal(nextWritingPrompt(productionPrompts,[e]),productionPrompts[0].id);
 const later:ProductionEntry={...e,revisions:[{id:'r1',at:20,text:'Neue Fassung',reflection:'',lens:'SYNTAX',selfChecks:[]}]};
 assert.equal(nextWritingPrompt(productionPrompts,[later]),productionPrompts[1].id);
 assert.equal(journey(productionPrompts,[later])[0].revisions,1);
 assert.equal(e.revisions.length,0);
});
test('editorial queue is a read-only dossier and cannot become human approval by template',()=>{
 const queue=buildReviewQueue(graded,productionPrompts,anchors);
 assert.equal(queue.length,198);
 assert.equal(queue.filter(x=>x.type==='OPEN_WRITING').length,20);
 assert.equal(queue.filter(x=>x.lexicalReference).length,12);
 assert.ok(queue.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval&&x.issues.length>=5));
});
