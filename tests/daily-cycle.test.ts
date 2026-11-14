import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyLearningCycle,DAILY_SOURCE_TRACKS} from '../src/domain/journey/dailyCycle';
import {STUDIO_LINKS} from '../src/domain/journey/catalog';
import {allItems} from '../src/domain/content/registry';
import {definitionStudies} from '../src/domain/definition/definition';
import {disclosureStudies} from '../src/domain/disclosure/disclosure';
import type {Attempt,ReviewCard,ReviewEvent} from '../src/domain/content/types';
import type {ProductionEntry,ProductionRevision} from '../src/domain/production/types';

const now=new Date(2026,10,11,12,0,0).getTime();
const yesterday=now-86400000;
const objective=allItems.find(i=>i.mode==='M01')!;
const attempt=(at:number,result:Attempt['result']='INCORRECT'):Attempt=>({
 id:'session-'+at,itemId:objective.id,itemVersion:objective.version,mode:objective.mode,
 skillId:objective.skillId,at,slots:{},score:0,correct:result==='CORRECT',
 hinted:false,result,sessionId:'session-'+at,variantIndex:null
});
const revision=(id:string,at:number,text='Eigenständig formulierte längere Fassung'):ProductionRevision=>({
 id:id+at,at,text,reflection:'Quellengebundene Reflexion',questionId:id,lens:'BEDEUTUNG'
});
const source=(at:number,kind:ProductionEntry['kind']='DEFINITION_STUDY'):ProductionEntry=>{
 const s=kind==='DISCLOSURE_STUDY'?disclosureStudies[0]:definitionStudies[0];
 return {id:(kind==='DISCLOSURE_STUDY'?'disclosure:':'definition:')+s.id,kind,
  itemId:s.id,itemVersion:s.version,sourceId:s.id,createdAt:at,
  original:'Ein eigenständiger Quellenbeleg wird ohne Note gespeichert.',revisions:[],evaluated:'UNASSESSED'};
};

test('daily cycle covers every existing source-writing domain without inventing G10 audio or new storage',()=>{
 const actions=new Set(STUDIO_LINKS.map(x=>x.action));
 assert.ok(DAILY_SOURCE_TRACKS.every(t=>actions.has(t.action)));
 assert.equal(new Set(DAILY_SOURCE_TRACKS.map(t=>t.kind)).size,DAILY_SOURCE_TRACKS.length);
 assert.deepEqual(new Set(DAILY_SOURCE_TRACKS.map(t=>t.domain)),new Set(['G01','G02','G03','G04','G05','G06','G07','G08','G09','G11','G12','G13']));
 const c=dailyLearningCycle(now,[],[],[],[],objective);
 assert.equal(c.total,4);assert.equal(c.completed,0);
 assert.equal(c.source.row,null);assert.equal(c.source.track.domain,'G01');
 assert.equal(c.source.track.action,'onReference');
});

test('objective work and actual delayed review are different evidence, with a local-day boundary',()=>{
 const attempts=[attempt(yesterday),attempt(now)],reviews:ReviewEvent[]=[
 {id:'r1',cardId:'card',itemId:objective.id,grade:'Good',at:now,scheduledDueAt:now+100000,algorithmVersion:'sg-recall-0.2'}
 ];
 const cards:ReviewCard[]=[{id:objective.id+':'+objective.version,itemId:objective.id,itemVersion:objective.version,
 dueAt:now-1000,stability:1,difficulty:5,lastReviewedAt:null,lapses:0,algorithmVersion:'sg-recall-0.2'}];
 const c=dailyLearningCycle(now,attempts,reviews,cards,[],objective);
 assert.equal(c.objectiveToday,1);assert.equal(c.retrievalToday,1);
 assert.equal(c.completed,1);assert.equal(c.due,1);assert.equal(c.unresolvedErrors,1);
 const prior=dailyLearningCycle(now,[attempt(yesterday)],[],[],[],objective);
 assert.equal(prior.objectiveToday,0);assert.equal(prior.completed,0);
});

test('exact archived source work advances analysis then independent transfer and revision, without mutating records',()=>{
 const e=source(now),original=JSON.stringify(e);
 let c=dailyLearningCycle(now,[attempt(now)],[],[],[e],objective);
 assert.equal(c.source.row?.entry,e);assert.equal(c.source.track.action,'onDefinition');
 assert.equal(c.completed,2);assert.equal(c.source.transferred,false);
 const t={...e,revisions:[revision('DEFINITION:d2',now+100),revision('TRANSFER',now+200)]};
 c=dailyLearningCycle(now,[attempt(now)],[],[],[t],objective);
 assert.equal(c.completed,3);assert.equal(c.source.transferred,true);assert.equal(c.source.rewritten,false);
 const rewritten={...t,revisions:[...t.revisions,revision('REWRITE',now+300)]};
 c=dailyLearningCycle(now,[attempt(now)],[],[],[rewritten],objective);
 assert.equal(c.completed,4);assert.equal(c.source.rewritten,true);
 assert.equal(JSON.stringify(e),original);
});

test('unfinished source resumes even after a day changes, while historical wrong-version work is not resumed',()=>{
 const carry=source(yesterday),unavailable={...carry,itemVersion:999,id:'definition:SG-UNKNOWN'};
 let c=dailyLearningCycle(now,[],[],[],[carry],objective);
 assert.equal(c.source.row?.entry,carry);
 assert.equal(c.source.workedToday,false);
 assert.equal(c.completed,1);
 c=dailyLearningCycle(now,[],[],[],[unavailable],objective);
 assert.equal(c.source.row,null);
 assert.equal(c.completed,0);
});

test('G13 uses its actual audience-writing and revision markers, never imaginary TRANSFER markers',()=>{
 const e=source(now,'DISCLOSURE_STUDY');
 let c=dailyLearningCycle(now,[],[],[],[e],objective);
 assert.equal(c.source.track.action,'onDisclosure');assert.equal(c.completed,1);
 const written={...e,revisions:[revision('AUDIENCE:PUBLIC',now+100)]};
 c=dailyLearningCycle(now,[],[],[],[written],objective);
 assert.equal(c.completed,2);
 c=dailyLearningCycle(now,[],[],[],[{...written,revisions:[...written.revisions,revision('REWRITE:PUBLIC',now+200)]}],objective);
 assert.equal(c.completed,3);
});

test('a completed source is not repeated over less-covered active studios on the next day',()=>{
 const complete={...source(yesterday),revisions:[revision('TRANSFER',yesterday+100),revision('REWRITE',yesterday+200)]};
 const c=dailyLearningCycle(now,[],[],[],[complete],objective);
 assert.equal(c.source.row,null);
 assert.notEqual(c.source.track.kind,'G06_DEFINITION');
 assert.equal(c.completed,0);
});
