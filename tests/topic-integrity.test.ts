import test from 'node:test';
import assert from 'node:assert/strict';
import type {Attempt,Exercise,ReviewCard} from '../src/domain/content/types';
import {allItems} from '../src/domain/content/registry';
import {topicMismatchReason,eligibleForTopicLink} from '../src/domain/content/topicIntegrity';
import {buildErrorClusters} from '../src/domain/errors/errorProjection';
import {buildLearningLinks} from '../src/domain/journey/evidenceLinks';
import {failedDelayedCases} from '../src/domain/errors/delayedFailure';
import {exhaustedContrastPlans} from '../src/domain/errors/exhaustedContrast';
import {planMission} from '../src/domain/mission/mission';
import {gradeAnswer} from '../src/domain/grading/gradeAnswer';
const now=Date.UTC(2026,10,14,12),DAY=86400000;
const byId=new Map(allItems.map(i=>[i.id,i]));
const m=(id:string)=>{const item=byId.get(id);assert.ok(item,'current source exists: '+id);return item};
function a(item:Exercise,at:number,result:Attempt['result']='INCORRECT'):Attempt{
 return {id:item.id+':'+at,itemId:item.id,itemVersion:item.version,mode:item.mode,skillId:item.skillId,
  sessionId:item.id+':'+at,at,slots:{},score:result==='CORRECT'?1:0,
  correct:result==='CORRECT',hinted:false,result,variantIndex:null};
}
const held=['SG-M04-006','SG-M04-012','SG-M04-013','SG-M04-018','SG-M04-024','SG-M04-029',
 'SG-M05-001','SG-M05-002','SG-M05-003','SG-M05-004','SG-M05-005','SG-M05-006'];
test('twelve currently authored, source-identified mismatch examples are held without altering source versions',()=>{
 const actual=allItems.filter(i=>!eligibleForTopicLink(i));
 assert.deepEqual(actual.map(x=>x.id).sort(),[...held].sort());
 assert.ok(actual.every(x=>x.version===1&&x.status==='DEMO_ONLY'));
 assert.equal(m('SG-M04-006').topic,'Indirekte Rede');
 assert.match(m('SG-M04-006').explanation,/Irrealer Konditionalsatz/);
 assert.equal(m('SG-M04-012').topic,'Konjunktiv und Irrealität');
 assert.match(m('SG-M04-012').explanation,/Nominalisierung/);
 assert.equal(m('SG-M04-013').topic,'Nominalisierung');
 assert.match(m('SG-M04-013').explanation,/Partizip I/);
 assert.equal(m('SG-M04-018').topic,'Nominalisierung');
 assert.match(m('SG-M04-018').explanation,/Partizip II/);
 assert.equal(m('SG-M04-024').topic,'Partizipialattribute');
 assert.match(m('SG-M04-024').explanation,/Konzessiver/);
 assert.equal(m('SG-M04-029').topic,'Konzessive Verbindung');
 assert.match(m('SG-M04-029').prompt,/Kaum/);
 for(const id of held.slice(6)){
  const i=m(id);assert.equal(i.mode,'M05');assert.equal(i.topic,'Indirekte Rede');
  assert.ok(topicMismatchReason(i)?.includes('keine indirekte Rede'));
 }
});
test('known mismatches stay trainable as single current source exercises, not released as approved content',()=>{
 const x=m('SG-M05-001');
 const solved=gradeAnswer(x,{collocation:'fassen'});
 assert.equal(solved.status,'CORRECT');
 assert.equal(x.status,'DEMO_ONLY');assert.equal(x.version,1);
 assert.equal(eligibleForTopicLink(m('SG-M04-001')),true);
});
test('a misclassified current version remains in Error Archive but cannot contaminate a coherent topic cluster',()=>{
 const h=[a(m('SG-M04-001'),now-2*DAY),a(m('SG-M04-006'),now-1000,'CORRECT'),a(m('SG-M05-001'),now-2000)];
 const clusters=buildErrorClusters(h,byId);
 assert.equal(clusters.length,2);
 const mismatched=clusters.find(c=>c.failures[0].itemId==='SG-M05-001')!;
 assert.equal(mismatched.sourceCurrent,true);assert.equal(mismatched.topicComparable,false);
 assert.equal(mismatched.freshContextId,null);assert.equal(mismatched.laterCorrect.length,0);
 const good=clusters.find(c=>c.topicComparable)!;
 assert.equal(good.topic,'Indirekte Rede');assert.equal(good.laterCorrect.length,0);
 assert.equal(good.freshContextId,'SG-M04-002','do not choose mislabeled M04-006');
});
test('progress excludes mismatch evidence from topic-transfer counts without hiding original uncertain answers',()=>{
 const h=[a(m('SG-M04-001'),now-2000),a(m('SG-M04-006'),now-1600),a(m('SG-M05-001'),now-1200)];
 const x=buildLearningLinks(now,h,allItems,[]);
 assert.equal(x.unresolvedTopics,1);
 assert.equal(x.sourceTopicMismatches,2);
 assert.equal(x.historicalTopics,0);
 assert.equal(x.firstAttemptsWithErrors,3);
 assert.equal(x.practice?.item.id,'SG-M04-002');
 assert.equal(x.observedSpacedTopics,0);
});
test('failed delayed reconstruction excludes a mismatched first context and mismatched later answer',()=>{
 const good=[a(m('SG-M04-001'),now-4*DAY),a(m('SG-M04-002'),now-2*DAY,'CORRECT'),a(m('SG-M04-003'),now-1000)];
 assert.equal(failedDelayedCases(now,good,allItems).length,1);
 assert.equal(failedDelayedCases(now,[good[0],{...good[1],itemId:'SG-M04-006',itemVersion:1},good[2]],allItems).length,0);
 assert.equal(failedDelayedCases(now,[good[0],good[1],a(m('SG-M04-006'),now-1000)],allItems).length,0);
});
test('exhausted-context reconstruction does not invent a contrast from misclassified author grouping',()=>{
 const m05=held.slice(6).map((id,i)=>a(m(id),now-50000+i*500,'INCORRECT'));
 assert.equal(exhaustedContrastPlans(now,m05,allItems).length,0);
});
test('fresh mission plans skip draft-topic mismatches but respect due review of an already attempted item',()=>{
 const h=[a(m('SG-M04-006'),now-2*DAY)];
 const initial=planMission('source-check',allItems,h,[],30,now);
 assert.equal(initial.steps.some(x=>held.includes(x.itemId)&&['EXPLORE','TRANSFER'].includes(x.kind)),false);
 const item=m('SG-M04-006');
 const card:ReviewCard={id:item.id+':'+item.version,itemId:item.id,itemVersion:item.version,dueAt:now-1,
  stability:1,difficulty:5,lastReviewedAt:null,lapses:0,algorithmVersion:'sg-recall-0.2'};
 const later=planMission('source-review',allItems,h,[card],30,now);
 assert.equal(later.steps[0].itemId,item.id);
 assert.equal(later.steps[0].kind,'REVIEW');
});
test('wrong-version historical answers cannot become a current-mismatch or eligible transfer cluster',()=>{
 const h=[{...a(m('SG-M04-006'),now-1000),itemVersion:999}];
 const x=buildLearningLinks(now,h,allItems,[]);
 assert.equal(x.sourceTopicMismatches,0);assert.equal(x.historicalTopics,1);assert.equal(x.practice,null);
});
test('projection is read-only across exact sources and original learner records',()=>{
 const h=[a(m('SG-M04-001'),now-2000),a(m('SG-M04-006'),now-1000)];
 const orig=JSON.stringify({h,items:held.map(id=>m(id))});
 buildErrorClusters(h,byId);buildLearningLinks(now,h,allItems,[]);
 failedDelayedCases(now,h,allItems);exhaustedContrastPlans(now,h,allItems);
 assert.equal(JSON.stringify({h,items:held.map(id=>m(id))}),orig);
});
