import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {gradeAnswer} from '../src/domain/grading/gradeAnswer.ts';
import {DIAGNOSTIC_A_BLUEPRINT,DIAGNOSTIC_A_TOTAL,validateDiagnosticA,createDiagnosticA,answerDiagnostic,pauseDiagnostic,resumeDiagnostic,finishDiagnostic,diagnosticEvidence,type DiagnosticItem} from '../src/domain/diagnostic/engine.ts';
import type {Exercise} from '../src/domain/content/types.ts';
const baseline=JSON.parse(readFileSync('content/fixtures/core.demo.json','utf8')) as Exercise[];
const advanced=JSON.parse(readFileSync('content/fixtures/syntax-collocations.demo.json','utf8')) as Exercise[];
test('P1: 104 drafts across five modes, none reviewed',()=>{
 assert.equal(baseline.length,36);assert.equal(advanced.length,68);
 assert.equal(advanced.filter(i=>i.mode==='M04').length,33);
 assert.equal(advanced.filter(i=>i.mode==='M05').length,35);
 assert.ok([...baseline,...advanced].every(i=>i.status==='DEMO_ONLY'&&i.rights.kind==='ORIGINAL_DRAFT'));
 assert.equal(new Set([...baseline,...advanced].map(x=>x.id)).size,104);
 assert.deepEqual(JSON.parse(readFileSync('content/approved/approved.json','utf8')),[]);
});
test('M04: constrained Konjunktiv target forms distinguish right/wrong',()=>{
 const x=advanced.find(i=>i.id==='SG-M04-001')!;
 assert.equal(gradeAnswer(x,{form:'seien'}).status,'CORRECT');
 assert.equal(gradeAnswer(x,{form:'sind'}).status,'INCORRECT');
 assert.equal(gradeAnswer(x,{form:'  SEIEN  '}).status,'CORRECT');
});
test('M05: authored contextual collocation grading is exact and scoped',()=>{
 const x=advanced.find(i=>i.id==='SG-M05-001')!;
 assert.equal(gradeAnswer(x,{collocation:'fassen'}).status,'CORRECT');
 assert.equal(gradeAnswer(x,{collocation:'treffen'}).status,'INCORRECT');
});
test('diagnostic A cannot start from empty or incomplete demo material',()=>{
 assert.equal(DIAGNOSTIC_A_TOTAL,72);
 assert.equal(validateDiagnosticA([]).ready,false);
 assert.throws(()=>createDiagnosticA([], 'fake',123),/not available/);
});
const synthetic=DIAGNOSTIC_A_BLUEPRINT.flatMap(([section,count])=>Array.from({length:count},(_,n)=>({
 id:'SYNTHETIC-TEST-'+section+'-'+n,version:1,section,form:'A' as const,
 modality:section==='G10'?'listening' as const:section==='G11'?'writing' as const:'objective' as const,
 status:'REVIEWED' as const,reviewId:'SYNTHETIC-NOT-REAL',
 approvedBy:'synthetic-editor',approvedAt:'2000-01-01',authorId:'synthetic-author',
 rightsCleared:true,media:section==='G10'?{audioId:'synthetic-fixture',rightsCleared:true}:null
}))) satisfies DiagnosticItem[];
// Above are in-memory synthetic test doubles, NOT authored, publishable or genuinely approved content.
test('diagnostic A enforces unique reviewed items and audio permissions',()=>{
 assert.equal(validateDiagnosticA(synthetic).ready,true);
 assert.equal(validateDiagnosticA(synthetic.slice(0,-1)).ready,false);
 assert.equal(validateDiagnosticA([...synthetic.slice(1),synthetic[1]]).ready,false);
 const missingAudio=synthetic.map(i=>i.modality==='listening'?{...i,media:null}:i);
 assert.equal(validateDiagnosticA(missingAudio).ready,false);
});
test('diagnostic answer, pause/resume, completion and human review pending',()=>{
 const original=createDiagnosticA(synthetic,'synthetic-session',100);
 const paused=pauseDiagnostic(original,110);
 assert.throws(()=>answerDiagnostic(paused,original.itemIds[0],'1',120));
 let state=resumeDiagnostic(paused,130);
 assert.equal(state.responses.length,0);
 for(const id of state.itemIds){
  const written=synthetic.find(i=>i.id===id)!.modality==='writing';
  state=answerDiagnostic(state,id,'synthetic response',200,written?undefined:1);
 }
 assert.equal(state.responses.length,72);
 assert.throws(()=>answerDiagnostic(state,state.itemIds[0],'repeat',300));
 const finished=finishDiagnostic(state,500);
 assert.equal(finished.phase,'AWAITING_ASSESSMENT');
 const evidence=diagnosticEvidence(finished);
 assert.equal(evidence.cefrLevel,null);
 assert.ok(evidence.requiresHuman>0);
 assert.equal(original.responses.length,0);
});
test('release gate rejects unapproved content while preview validator passes',()=>{
 const pass=spawnSync(process.execPath,['scripts/content/validate.mjs'],{encoding:'utf8'});
 const fail=spawnSync(process.execPath,['scripts/content/validate.mjs','--release'],{encoding:'utf8'});
 assert.equal(pass.status,0,pass.stderr);
 assert.notEqual(fail.status,0);
 assert.match(fail.stderr,/RELEASE_BLOCKED/);
});
