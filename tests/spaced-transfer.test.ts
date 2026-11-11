import test from 'node:test';
import assert from 'node:assert/strict';
import type {Attempt,Exercise} from '../src/domain/content/types';
import {allItems} from '../src/domain/content/registry';
import {buildErrorClusters,independentTransferState,INDEPENDENT_TRANSFER_DELAY_MS} from '../src/domain/errors/errorProjection';
import {buildLearningLinks,chooseEvidenceFocus} from '../src/domain/journey/evidenceLinks';
import {chooseSession} from '../src/domain/recommendation/chooseSession';
const DAY=INDEPENDENT_TRANSFER_DELAY_MS,now=Date.UTC(2026,10,11,12);
const same=allItems.filter(x=>x.mode==='M01'&&x.skillId==='G01.GENUS'&&x.topic==='Gesellschaft').sort((a,b)=>a.id.localeCompare(b.id));
const attempt=(item:Exercise,at:number,result:Attempt['result'],options:Partial<Attempt>={}):Attempt=>({
 id:item.id+':'+at,sessionId:item.id+':session:'+at,itemId:item.id,itemVersion:item.version,mode:item.mode,
 skillId:item.skillId,at,slots:{},score:result==='CORRECT'?1:0,correct:result==='CORRECT',
 hinted:false,result,variantIndex:null,...options
});
const cluster=(a:Attempt[])=>buildErrorClusters(a,new Map(allItems.map(i=>[i.id,i])))[0];
test('an immediately corrected review of the original failed item is never independent transfer',()=>{
 const a=[attempt(same[0],now-5000,'INCORRECT'),attempt(same[0],now-3000,'CORRECT')];
 const c=cluster(a);assert.equal(c.status,'OFFEN');assert.equal(c.laterCorrect.length,0);
 assert.equal(independentTransferState(c,now).phase,'FIRST_CONTEXT');
});
test('a correct first answer to a new context pauses additional same-topic context until a full elapsed day',()=>{
 const a=[attempt(same[0],now-5000,'INCORRECT'),attempt(same[1],now-1000,'CORRECT')];
 const c=cluster(a),state=independentTransferState(c,now);
 assert.equal(c.laterCorrect.length,1);assert.equal(c.status,'ERNEUT_UNSICHER');
 assert.equal(state.phase,'WAITING');assert.equal(state.nextEligibleAt,now-1000+DAY);
 const links=buildLearningLinks(now,a,allItems,[]);
 assert.equal(links.waitingTopics.length,1);assert.equal(links.practice,null);
 assert.equal(links.observedSpacedTopics,0);
 const pool=allItems.filter(i=>!links.waitingTopics.some(x=>x.mode===i.mode&&x.skillId===i.skillId&&x.topic===i.topic));
 const choice=chooseEvidenceFocus(now,allItems,[],chooseSession(pool,a,[],now,1)[0],links);
 assert.notEqual(choice.item?.topic,'Gesellschaft');assert.equal(choice.reason,'GENERAL');
});
test('crossing midnight without 24h elapsed is insufficient evidence of spaced transfer',()=>{
 const at=Date.UTC(2026,10,10,23,58);
 const wide=allItems.filter(x=>x.mode==='M04'&&x.skillId==='G04.SYNTAX'&&x.topic==='Indirekte Rede').sort((a,b)=>a.id.localeCompare(b.id));
 assert.ok(wide.length>=4,'test requires a fourth genuinely unused context');
 const a=[attempt(wide[0],at-2000,'INCORRECT'),attempt(wide[1],at,'CORRECT'),attempt(wide[2],at+4*60000,'CORRECT')];
 const c=cluster(a);assert.equal(c.status,'ERNEUT_UNSICHER');assert.equal(c.laterCorrect.length,2);
 assert.equal(independentTransferState(c,at+5*60000).phase,'WAITING');
 assert.equal(independentTransferState(c,at+DAY+1).phase,'SPACED_CONTEXT_DUE');
});
test('two different correct first answers at least 24h apart are observed without granting a proficiency score',()=>{
 const t=now-3*DAY;
 const a=[attempt(same[0],t,'INCORRECT'),attempt(same[1],t+1000,'CORRECT'),attempt(same[2],t+DAY+2000,'CORRECT')];
 const c=cluster(a),state=independentTransferState(c,now);
 assert.equal(c.status,'WIEDER_ANGEWENDET');assert.equal(state.phase,'OBSERVED');
 assert.equal(state.spacedCorrect,2);assert.equal(buildLearningLinks(now,a,allItems,[]).observedSpacedTopics,1);
});
test('hinted, wrong-version, later-review, or previously-failed new items cannot masquerade as novel first answers',()=>{
 const t=now-5*DAY;
 const orig=attempt(same[0],t,'INCORRECT');
 const hinted=attempt(same[1],t+DAY,'CORRECT',{hinted:true});
 const old=attempt(same[2],t+2*DAY,'CORRECT',{itemVersion:999});
 const c=cluster([orig,hinted,old]);assert.equal(c.laterCorrect.length,0);
 const reviewedFirst=attempt(same[1],t+DAY-1000,'INCORRECT');
 const reviewedCorrect=attempt(same[1],t+DAY,'CORRECT');
 const group=buildErrorClusters([orig,reviewedFirst,reviewedCorrect],new Map(allItems.map(x=>[x.id,x])));
 assert.equal(group[0].laterCorrect.length,0);
});
test('a later uncertain task resets observed transfer evidence, even after earlier different-day successes',()=>{
 const t=now-8*DAY;
 const a=[attempt(same[0],t,'INCORRECT'),attempt(same[1],t+1000,'CORRECT'),attempt(same[2],t+DAY+2000,'CORRECT'),attempt(same[2],now-1000,'INCORRECT')];
 const c=cluster(a);assert.notEqual(c.status,'WIEDER_ANGEWENDET');assert.equal(c.laterCorrect.length,0);
});
test('historical content cannot become a current transfer recommendation through an old key',()=>{
 const a=[attempt(same[0],now-2000,'INCORRECT',{itemVersion:999})];
 const x=buildLearningLinks(now,a,allItems,[]);
 assert.equal(x.priority,null);assert.equal(x.practice,null);assert.equal(x.historicalTopics,1);
});
