import test from 'node:test';import assert from 'node:assert/strict';
import type {Attempt,Exercise,ReviewEvent} from '../src/domain/content/types.ts';
import {reviewTransferChoice,reviewTransferEvidence,transferSessionId} from '../src/domain/review/transfer.ts';
const exercise=(id:string,skill='G01.GENUS',topic='Fachsprache',version=1,status='DEMO_ONLY'):Exercise=>({
 id,version,mode:'M01',skillId:skill,band:'C1',topic,prompt:id,slots:[{id:'article',label:'Artikel'}],
 variants:[{slots:{article:'das'}}],explanation:'Entwurf',misconception:'Genus',reviewPrompt:id,reviewAnswer:'das',
 status:status as Exercise['status'],rights:{kind:'ORIGINAL_DRAFT',source:'test'}});
const at=(sessionId:string,itemId:string,time:number,result:Attempt['result']='INCORRECT',version=1):Attempt=>({
 id:sessionId+':'+itemId,sessionId,itemId,itemVersion:version,mode:'M01',skillId:'G01.GENUS',at:time,slots:{article:'der'},
 score:result==='CORRECT'?1:0,correct:result==='CORRECT',hinted:false,result,variantIndex:null});
const ev:ReviewEvent={id:'r1:review:one:1',cardId:'one:1',itemId:'one',at:1000,grade:'Again',scheduledDueAt:3000,algorithmVersion:'sg-recall-0.2'};
test('different unseen context in same skill, with stable source-session linkage',()=>{
 const items=[exercise('one'),exercise('two'),exercise('three','G01.GENUS','Kontrast'),exercise('four','G02.GENUS')];
 const a=[at('r1','one',999),at('old','four',200)];
 assert.equal(transferSessionId(ev),'review-transfer:r1');
 assert.deepEqual(reviewTransferChoice(ev,items,a),{status:'AVAILABLE',itemId:'three',sourceId:'one',reviewSession:'review-transfer:r1'});
});
test('completed first transfer attempt is retained, independently countable and not a new review',()=>{
 const items=[exercise('one'),exercise('two')],prior=at('r1','one',999),transfer=at('review-transfer:r1','two',1200,'CORRECT');
 assert.equal(reviewTransferChoice(ev,items,[prior,transfer]).status,'DONE');
 assert.deepEqual(reviewTransferEvidence([ev],items,[prior,transfer]),{offered:1,finished:1,correct:1});
 assert.deepEqual(reviewTransferEvidence([ev],items,[prior]),{offered:1,finished:0,correct:0});
});
test('missing review, stale version, withdrawn and previously attempted task fail closed',()=>{
 const items=[exercise('one'),exercise('two')],prior=at('r1','one',999);
 assert.equal(reviewTransferChoice({...ev,id:'bad'},items,[prior]).status,'NO_REVIEW');
 assert.equal(reviewTransferChoice(ev,[exercise('one','G01.GENUS','Fachsprache',2),items[1]],[prior]).status,'OLD_SOURCE');
 assert.equal(reviewTransferChoice(ev,[exercise('one','G01.GENUS','Fachsprache',1,'WITHDRAWN'),items[1]],[prior]).status,'OLD_SOURCE');
 assert.equal(reviewTransferChoice(ev,items,[prior,at('other','two',0)]).status,'NO_NEW_CONTEXT');
});
