import test from 'node:test';
import assert from 'node:assert/strict';
import {P1_BLUEPRINT,P1_TOTAL,validatePilot,makePilot,answerPilot,pausePilot,resumePilot,finishPilot,pilotResults,type PilotItem,type Approval} from '../src/domain/diagnostic/p1Pilot.ts';
import {pilotItems,pilotApprovals,practiceIds} from '../src/domain/diagnostic/p1Items.ts';
const xs:PilotItem[]=P1_BLUEPRINT.flatMap(([domain,mode,n])=>Array.from({length:n},(_,i)=>({
 id:'SYNTHETIC-'+domain+'-'+i,version:1,mode,skillId:domain+'.TEST',band:'C1' as const,topic:'fixture',prompt:'synthetic',slots:[{id:'a',label:'Form'}],variants:[{slots:{a:'richtig'}}],
 explanation:'test',misconception:'test',reviewPrompt:'test',reviewAnswer:'richtig',status:'REVIEWED' as const,
 authorId:'author',editorial:{reviewId:'FAKE',reviewedBy:'editor',reviewedAt:'2020-01-01',sourceChecked:true,languageChecked:true,rightsChecked:true},
 rights:{kind:'ORIGINAL_REVIEWED' as const,source:'test'},assessmentForm:'P1' as const,reservedForDiagnostic:true as const
})));
const ledger:Approval[]=xs.map(x=>({id:x.id,version:x.version,authorId:'author',editorId:'editor',date:'2020-01-01',sourceChecked:true,languageChecked:true,rightsChecked:true,approvalReference:'FAKE'}));
test('real P1 diagnostic blocked without independently approved content',()=>{
 assert.equal(P1_TOTAL,50);assert.equal(pilotItems.length,0);
 assert.equal(validatePilot(pilotItems,pilotApprovals,practiceIds).ready,false);
 assert.throws(()=>makePilot(pilotItems,pilotApprovals,practiceIds,'P1-LOCAL',1),/not available/);
});
test('synthetic pilot 20/16/14, holdout, independent editor and fingerprint',()=>{
 assert.equal(validatePilot(xs,ledger,new Set()).ready,true);
 assert.equal(validatePilot(xs,ledger,new Set([xs[0].id])).ready,false);
 assert.equal(validatePilot(xs.slice(1),ledger.slice(1),new Set()).ready,false);
 assert.equal(validatePilot(xs,ledger.map((a,i)=>i===0?{...a,editorId:'author'}:a),new Set()).ready,false);
 const s=makePilot(xs,ledger,new Set(),'P1-LOCAL',1);assert.equal(s.form,'P1');assert.equal(s.itemIds.length,50);
});
test('50-item objective pilot pause/reload-shaped state, immutable answers and no CEFR',()=>{
 let s=makePilot(xs,ledger,new Set(),'P1-LOCAL',1);
 s=pausePilot(s,2);assert.throws(()=>answerPilot(s,xs[0],{a:'richtig'},3));
 s=resumePilot(JSON.parse(JSON.stringify(s)),4);
 for(const item of xs)s=answerPilot(s,item,{a:'richtig'},5);
 assert.throws(()=>answerPilot(s,xs[0],{a:'richtig'},6));
 s=finishPilot(s,7);assert.equal(s.phase,'COMPLETE');
 assert.equal(pilotResults(s,xs).length,3);
 assert.ok(pilotResults(s,xs).every(r=>r.complete&&r.cefrLevel===null));
});
