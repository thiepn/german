import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readingStudies,readingAnchors,nextUnanswered,readingProgress,isReadingEntry,studyId,transferTarget} from '../src/domain/reading/reading.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import type {ProductionEntry} from '../src/domain/production/types.ts';
test('four independently unapproved reading units and twelve grounded evidence questions',()=>{
 assert.equal(readingStudies.length,4);
 assert.equal(readingStudies.reduce((n,u)=>n+u.questions.length,0),12);
 assert.equal(readingAnchors.length,3);
 const ids=new Set(readingStudies.map(x=>x.id));assert.equal(ids.size,4);
 for(const unit of readingStudies){
  assert.equal(unit.status,'DEMO_ONLY');assert.equal(unit.editorial.approved,false);assert.equal(unit.referenceScope,'LINGUISTIC_BACKGROUND_ONLY');
  assert.equal(unit.paragraphs.length,3);assert.equal(unit.questions.length,3);
  const paragraphs=new Set(unit.paragraphs.map(p=>p.id));
  for(const q of unit.questions){assert.ok(q.paragraphIds.length);assert.ok(q.paragraphIds.every(id=>paragraphs.has(id)))}
  assert.ok(transferTarget(unit).mode===unit.transfer.mode);
 }
});
test('reading note and question answers form immutable independent text history',()=>{
 const unit=readingStudies[0];
 const original:ProductionEntry={id:studyId(unit.id),kind:'READING_STUDY',itemId:unit.id,itemVersion:1,createdAt:1,original:'Mein erster Eindruck',revisions:[],evaluated:'UNASSESSED'};
 assert.ok(isReadingEntry(original));
 assert.equal(nextUnanswered(unit,original)?.id,'q1');
 const after:ProductionEntry={...original,revisions:[{id:'synthetic-q1',at:2,text:'Eine Beobachtung, kein Beweis',reflection:'Absatz p2',questionId:'q1',paragraphId:'p2'}]};
 assert.equal(nextUnanswered(unit,after)?.id,'q2');
 assert.equal(original.revisions.length,0);
 assert.deepEqual(readingProgress(readingStudies,[after]),{started:1,answered:1,totalQuestions:12});
 assert.ok(!isReadingEntry({...original,kind:undefined,itemId:'SG-P04-001'}));
});
test('manifest and editorial queue include all reading passages and questions without approval',()=>{
 const m=JSON.parse(readFileSync('content/manifest.json','utf8'));
 assert.equal(m.readingUnitCount,4);assert.equal(m.readingQuestionCount,12);
 const worklist=collect();
 assert.equal(worklist.length,m.demoItemCount+m.productionPromptCount+m.readingUnitCount+m.readingQuestionCount);
 assert.equal(worklist.filter(x=>x.type==='READING_TEXT').length,4);
 assert.equal(worklist.filter(x=>x.type==='READING_EVIDENCE').length,12);
 assert.ok(worklist.every(x=>!x.independentEditorialApproval));
});
