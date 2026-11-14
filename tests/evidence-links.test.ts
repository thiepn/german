import test from 'node:test';
import assert from 'node:assert/strict';
import type {Attempt,Exercise,ReviewCard} from '../src/domain/content/types';
import type {ProductionEntry} from '../src/domain/production/types';
import {allItems} from '../src/domain/content/registry';
import {buildLearningLinks,chooseEvidenceFocus} from '../src/domain/journey/evidenceLinks';
import {dailyLearningCycle} from '../src/domain/journey/dailyCycle';
import {referenceStudies} from '../src/domain/reference/reference';
const now=Date.UTC(2026,10,11,12);
const group=(mode:string,skill:string,topic:string)=>allItems.filter(x=>x.mode===mode&&x.skillId===skill&&x.topic===topic).sort((a,b)=>a.id.localeCompare(b.id));
const g01=group('M01','G01.GENUS','Gesellschaft');
const g07=group('M05','G07.KOLLOKATION','Indirekte Rede');
const attempt=(item:Exercise,at:number,result:Attempt['result']='INCORRECT'):Attempt=>({
 id:item.id+':'+at,sessionId:item.id+':session:'+at,itemId:item.id,itemVersion:item.version,mode:item.mode,skillId:item.skillId,
 at,slots:{},score:result==='CORRECT'?1:0,correct:result==='CORRECT',hinted:false,result,variantIndex:null
});
const links=(attempts:Attempt[],entries:ProductionEntry[]=[])=>
 buildLearningLinks(now,attempts,allItems,entries);
test('current exact-version failure offers unused same-topic exercise; no unobserved proficiency claims',()=>{
 assert.ok(g01.length>=3);
 const x=links([attempt(g01[0],now-3000)]);
 assert.equal(x.unresolvedTopics,1);assert.equal(x.recurringTopics,0);
 assert.equal(x.practice?.item.id,g01[1].id);
 assert.equal(x.priority,null);
 const choice=chooseEvidenceFocus(now,allItems,[],g01[2],x);
 assert.equal(choice.reason,'FRESH_CONTEXT');assert.equal(choice.item?.id,g01[1].id);
});
test('two distinct failed exercises connect to same-domain source, not to a manufactured grade',()=>{
 const a=[attempt(g07[0],now-5000),attempt(g07[1],now-3000)];
 const x=links(a);
 assert.equal(x.recurringTopics,1);assert.equal(x.priority?.domain,'G07');
 assert.equal(x.priority?.distinctFailureItems,2);assert.equal(x.practice?.item.id,g07[2].id);
 const cycle=dailyLearningCycle(now,a,[],[],[],x.practice?.item,x.priority);
 assert.equal(cycle.source.track.domain,'G07');assert.equal(cycle.source.link?.topic,'Indirekte Rede');
 assert.equal(cycle.source.row,null);
});
test('repeated attempts of the same item never count as repeated independent contexts',()=>{
 const a=[attempt(g01[0],now-5000),attempt(g01[0],now-2000)];
 const x=links(a);assert.equal(x.recurringTopics,0);assert.equal(x.priority,null);
 assert.equal(x.firstAttemptsWithErrors,2);
});
test('actual due cards outrank adaptive practice and wrong-version/withdrawn cards cannot masquerade as due',()=>{
 const a=[attempt(g01[0],now-5000)];
 const x=links(a);
 const card=(version:number):ReviewCard=>({id:g01[2].id+':'+version,itemId:g01[2].id,itemVersion:version,
  dueAt:now-100,stability:1,difficulty:5,lastReviewedAt:null,lapses:0,algorithmVersion:'sg-recall-0.2'});
 let choice=chooseEvidenceFocus(now,allItems,[card(g01[2].version)],g01[0],x);
 assert.equal(choice.reason,'DUE_REVIEW');assert.equal(choice.item?.id,g01[2].id);
 choice=chooseEvidenceFocus(now,allItems,[card(999)],g01[0],x);
 assert.equal(choice.reason,'FRESH_CONTEXT');
});
test('historical wrong versions excluded from current recommendations, remain counted as historical evidence',()=>{
 const old={...attempt(g01[0],now-5000),itemVersion:999};
 const x=links([old]);
 assert.equal(x.practice,null);assert.equal(x.priority,null);
 assert.equal(x.historicalTopics,1);
});
test('two independent later correct contexts across distinct days retire a cluster as a priority, without proving mastery',()=>{
 const a=[attempt(g07[0],now-10*86400000),attempt(g07[1],now-9*86400000),
  attempt(g07[2],now-4*86400000,'CORRECT'),attempt(g07[3],now-2*86400000,'CORRECT')];
 const x=links(a);assert.equal(x.recurringTopics,0);assert.equal(x.priority,null);
 assert.equal(x.unresolvedTopics,0);
});
test('completed delayed-writing pairs in the same domain are counted as activity, not error resolution',()=>{
 const a=[attempt(g01[0],now-5000),attempt(g01[1],now-4000)];
 const s=referenceStudies[0];
 const entry:ProductionEntry={
  id:'reference:'+s.id,kind:'REFERENCE_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,
  createdAt:now-5*86400000,original:'Zuvor gespeicherter erster Quellenbeleg',evaluated:'UNASSESSED',
  revisions:[
   {id:'t',at:now-4*86400000,text:'Eigenständiger vollständiger Text',reflection:'Begründung',questionId:'TRANSFER'},
   {id:'r',at:now-3*86400000,text:'Erinnerung ohne Vorlage',reflection:'Unsicherheit',questionId:'SG_DELAYED_RECALL:1',selfChecks:['BASELINE:t']},
   {id:'x',at:now-3*86400000+2000,text:'Quellengebundene Überarbeitung',reflection:'Korrekturgrund',questionId:'SG_DELAYED_REPAIR:1',paragraphId:s.paragraphs[0].id}
  ]};
 const x=links(a,[entry]);assert.equal(x.priority?.domain,'G01');assert.equal(x.relatedWriting.completedPairs,1);
 assert.equal(x.recurringTopics,1);
});
test('ongoing source work stays exact even when another error cluster requests a different domain',()=>{
 const s=referenceStudies[0],entry:ProductionEntry={id:'reference:'+s.id,kind:'REFERENCE_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,createdAt:now-1000,
 original:'Echte begonnene Quellenarbeit',revisions:[],evaluated:'UNASSESSED'};
 const a=[attempt(g07[0],now-5000),attempt(g07[1],now-3000)];
 const x=links(a,[entry]),cycle=dailyLearningCycle(now,a,[],[],[entry],undefined,x.priority);
 assert.equal(cycle.source.row?.entry,entry);assert.equal(cycle.source.track.domain,'G01');assert.equal(cycle.source.link,null);
});
