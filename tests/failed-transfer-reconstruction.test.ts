import test from 'node:test';
import assert from 'node:assert/strict';
import type {Attempt,Exercise} from '../src/domain/content/types';
import {allItems} from '../src/domain/content/registry';
import {failedDelayedCases,failedDelayedCaseForAttempt} from '../src/domain/errors/delayedFailure';
const DAY=86400000,now=Date.UTC(2026,10,11,13);
const group=allItems.filter(i=>i.mode==='M04'&&i.skillId==='G04.SYNTAX'&&i.topic==='Indirekte Rede').sort((a,b)=>a.id.localeCompare(b.id));
assert.ok(group.length>=4);
const a=(i:Exercise,at:number,result:Attempt['result'],extra:Partial<Attempt>={}):Attempt=>({
 id:i.id+':'+at,sessionId:i.id+':session:'+at,itemId:i.id,itemVersion:i.version,
 mode:i.mode,skillId:i.skillId,at,slots:{form:'falsch'},score:result==='CORRECT'?1:0,
 correct:result==='CORRECT',hinted:false,result,variantIndex:null,...extra
});
const example=()=>[a(group[0],now-4*DAY,'INCORRECT'),
 a(group[1],now-2*DAY,'CORRECT'),a(group[2],now-1000,'INCORRECT')];
test('exact first errors -> distinct correct new context -> delayed failed first context yields anchored comparison',()=>{
 const r=failedDelayedCases(now,example(),allItems);
 assert.equal(r.length,1);assert.equal(r[0].earlierError.item.id,group[0].id);
 assert.equal(r[0].firstTransfer.item.id,group[1].id);
 assert.equal(r[0].delayedFailure.item.id,group[2].id);
 assert.equal(r[0].nextItem?.id,group[3].id);
 assert.equal(failedDelayedCaseForAttempt(now,example(),allItems,example()[2].id)?.key,'M04::G04.SYNTAX::Indirekte Rede');
 assert.equal(failedDelayedCaseForAttempt(now,example(),allItems,example()[0].id),null);
});
test('same-item reviews, premature next context, and hinted previous success never create delayed-failure evidence',()=>{
 const base=example(),review=[...base,a(group[2],now,'CORRECT')];
 assert.equal(failedDelayedCases(now,review,allItems)[0]?.delayedFailure.attempt.id,base[2].id);
 assert.equal(failedDelayedCases(now,[base[0],base[1],a(group[1],now-1000,'INCORRECT')],allItems).length,0);
 assert.equal(failedDelayedCases(now,[base[0],base[1],a(group[2],base[1].at+DAY-1,'INCORRECT')],allItems).length,0);
 assert.equal(failedDelayedCases(now,[base[0],{...base[1],hinted:true},base[2]],allItems).length,0);
});
test('later first-context success removes the urgent reconstruction, not the stored historical answers',()=>{
 const base=example();
 assert.equal(failedDelayedCases(now,[...base,a(group[3],now,'CORRECT')],allItems).length,0);
 assert.equal(base.length,3);
});
test('withdrawn, changed versions, and future attempts are excluded rather than substituted',()=>{
 const base=example();
 assert.equal(failedDelayedCases(now,[...base.slice(0,2),{...base[2],itemVersion:99}],allItems).length,0);
 assert.equal(failedDelayedCases(now,base,allItems.map(x=>x.id===group[1].id?{...x,status:'WITHDRAWN'}:x)).length,0);
 assert.equal(failedDelayedCases(now,[base[0],base[1],{...base[2],at:now+1000}],allItems).length,0);
});
test('no same-topic unseen task is reported honestly instead of leaking a different topic',()=>{
 const small=allItems.filter(x=>x.mode==='M01'&&x.skillId==='G01.GENUS'&&x.topic==='Gesellschaft').sort((a,b)=>a.id.localeCompare(b.id));
 assert.equal(small.length,3);
 const s=[a(small[0],now-4*DAY,'INCORRECT'),a(small[1],now-2*DAY,'CORRECT'),a(small[2],now-1000,'PARTIAL')];
 const r=failedDelayedCases(now,s,allItems);
 assert.equal(r.length,1);assert.equal(r[0].nextItem,null);
});
test('unrelated sources, invalid timestamps and previous failed new task do not count as a successful transfer',()=>{
 const base=example();
 assert.equal(failedDelayedCases(now,[base[0],{...base[1],result:'INCORRECT',correct:false},base[2]],allItems).length,0);
 assert.equal(failedDelayedCases(now,[base[0],{...base[1],at:Infinity},base[2]],allItems).length,0);
 assert.throws(()=>failedDelayedCases(NaN,base,allItems),/clock/);
});
