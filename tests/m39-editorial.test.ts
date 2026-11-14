import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectM39,renderM39} from '../scripts/editorial/m39Review.mjs';
const read=(p:string)=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
test('M39 26-case explicit source fingerprint, complete domain review and no human authority',()=>{
 const r=inspectM39();assert.equal(r.caseCount,26);assert.equal(r.rows.length,26);
 assert.equal(new Set(r.rows.map((c:any)=>c.id)).size,26);
 assert.ok(r.rows.every((c:any)=>/^[0-9a-f]{64}$/.test(c.sourceFingerprint)));
 assert.ok(r.rows.every((c:any)=>c.editorialDecision===null&&c.humanReviewer===null&&c.cefrCalibration==='NOT_CALIBRATED'));
 assert.equal(r.privateAlpha,'NO_GO');assert.equal(r.release,'NO_GO');
 assert.equal(r.G10,'BLOCKED_RIGHTS_CLEARED_AUDIO_ABSENT');
});
test('M39 packet includes evidence for open spoken tasks and targeted ambiguity findings',()=>{
 const r=inspectM39(),written=renderM39(r);
 assert.match(written,/SG-G12O-001:t1/);assert.match(written,/OPEN RESPONSE/);
 assert.match(written,/SG-G07-003:d1/);assert.match(written,/partly true/);
 assert.match(written,/SG-G13D-001:d1/);assert.match(written,/general legal advice/);
 assert.match(written,/SHA-256/);assert.match(written,/CEFR descriptor/);
});
test('M39 correction proposals preserve original v1 and remain unapproved author-only',()=>{
 const r=inspectM39();assert.equal(r.corrections.length,4);
 assert.ok(r.corrections.every((c:any)=>c.from===1&&c.to===2&&c.status==='UNAPPROVED_STAGED_ONLY'));
 assert.ok(r.corrections.every((c:any)=>c.originalFingerprint!==c.proposedFingerprint));
 const p=read('content/editorial/m38-versioned-drafts.json');
 assert.ok(p.revisions.every((c:any)=>c.draftV2.status==='DEMO_ONLY'&&c.rightsStatus==='ORIGINAL_DRAFT_DEMO_ONLY'));
});
test('M39 rejects false human approval and malformed source in reviewer packet',()=>{
 const changed=(path:string,mutator:(x:any)=>void)=>(p:string)=>{const v=read(p);if(p===path)mutator(v);return v;};
 assert.throws(()=>inspectM39({load:changed('content/editorial/approval-ledger.json',x=>x.push({fake:true}))}),/human approval\/assessment authority changed/);
 assert.throws(()=>inspectM39({load:changed('content/fixtures/g06-polysemy.demo.json',x=>x.find((s:any)=>s.id==='SG-G06-002').decisions[0].preferredId='A')}),/historical v1 changed/);
});
