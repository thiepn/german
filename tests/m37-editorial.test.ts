import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runM37Audit,validateM37} from '../scripts/editorial/m37Audit.mjs';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
const read=(path:string)=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const packet=read('content/editorial/m37-alpha-candidates.json');
const copy=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
const changedSource=(path:string,change:(source:any)=>void)=>(p:string)=>{
 const data=read(p);
 if(p===path){change(data);return data}
 return data;
};
test('M37 exact 26-source C1/C2 risk sample covers 12 domains with explicit G10 media hold',()=>{
 const summary=runM37Audit();
 assert.equal(summary.structuralGate,'PASS');
 assert.equal(summary.candidateCount,26);assert.equal(summary.verifiedAnchors,26);
 assert.deepEqual(summary.authorCefrBands,{C1:13,C2:13});
 assert.equal(Object.keys(summary.coverage).length,12);
 assert.equal(summary.coverage.G07,4);
 assert.ok(!('G10' in summary.coverage));
 assert.equal(summary.g10,'BLOCKED_NO_RIGHTS_CLEARED_AUDIO');
 assert.equal(summary.inventoryCount,682);
 assert.deepEqual(summary.knownDefectIds,['SG-M05-037','SG-M05-036','SG-G02R-002:r1']);
});
test('M37 structural checks do not award German correctness, rights or CEFR status',()=>{
 const result=runM37Audit();
 assert.equal(result.editorialGate,'NO_GO');assert.equal(result.privateAlphaGate,'NO_GO');assert.equal(result.releaseGate,'NO_GO');
 assert.equal(result.independentApprovalCount,0);assert.equal(result.existingApprovedItems,0);
 assert.ok(result.checks.every(x=>x.mechanical==='PASS'&&x.linguistic==='NOT_REVIEWED'&&x.rights==='NOT_APPROVED'&&x.cefr==='NOT_CALIBRATED'));
 assert.ok(result.checks.every(x=>x.sourceQuoteMatches===1));
});
test('M37 sample membership and historical source version cannot silently drift',()=>{
 const p=copy(packet);p.candidates[0].version++;
 assert.throws(()=>validateM37(p),/source ID\/version\/skill mismatch/);
 const d=copy(packet);d.candidates[1].id=d.candidates[0].id;
 assert.throws(()=>validateM37(d),/duplicate or incorrect source\/anchor ID/);
 const e=copy(packet);e.candidates.pop();e.totalCandidates=25;
 assert.throws(()=>validateM37(e),/exactly 26/);
});
test('M37 literal anchors reject altered source quote and wrong cited paragraph',()=>{
 const p='content/fixtures/g01-reference.demo.json';
 const failQuote=changedSource(p,data=>{
  const study=data.find((s:any)=>s.id==='SG-G01-001'),t=study.decisions[0];
  study.paragraphs[0].text=study.paragraphs[0].text.replace(t.quote,'Nicht mehr derselbe Originaltext.');
 });
 assert.throws(()=>validateM37(packet,{source:failQuote}),/quote must occur literally once/);
 const failParagraph=changedSource(p,data=>{
  const study=data.find((s:any)=>s.id==='SG-G01-001');
  study.decisions[0].paragraphId='p2';
 });
 assert.throws(()=>validateM37(packet,{source:failParagraph}),/quote must occur literally once/);
});
test('M37 plausible alternatives require unique, nonempty options and preferred ID',()=>{
 const p='content/fixtures/g01-reference.demo.json';
 assert.throws(()=>validateM37(packet,{source:changedSource(p,data=>{
  const t=data.find((s:any)=>s.id==='SG-G01-001').decisions[0];
  t.options[1].text=t.options[0].text;
 })}),/identical normalized choices/);
 assert.throws(()=>validateM37(packet,{source:changedSource(p,data=>{
  data.find((s:any)=>s.id==='SG-G01-001').decisions[0].preferredId='Z';
 })}),/preferred answer not in explicit options/);
});
test('M37 provenance and reviewer authority cannot be forged in a fixture or candidate packet',()=>{
 const p='content/fixtures/g01-reference.demo.json';
 assert.throws(()=>validateM37(packet,{source:changedSource(p,data=>{
  data.find((s:any)=>s.id==='SG-G01-001').editorialApproval=true;
 })}),/source changed review state/);
 assert.throws(()=>validateM37(packet,{source:changedSource(p,data=>{
  data.find((s:any)=>s.id==='SG-G01-001').rights.kind='UNKNOWN';
 })}),/source rights provenance missing/);
 const fake=copy(packet);fake.candidates[0].reviewStatus='APPROVED';
 assert.throws(()=>validateM37(fake),/unearned human\/rights approval/);
 const rights=copy(packet);rights.editorialAuthority='SELF_CERTIFIED';
 assert.throws(()=>validateM37(rights),/claims editorial authority/);
});
test('M37 editorial queue original approval authority is read-only and candidate-only',()=>{
 const queue=collect(),before=JSON.stringify(queue);
 const result=validateM37(packet,{queue});
 assert.equal(result.inventoryCount,queue.length);
 assert.ok(queue.every(x=>x.independentEditorialApproval===false&&x.status==='DEMO_ONLY'));
 assert.equal(JSON.stringify(queue),before,'audit cannot mutate editorial approval records');
 assert.equal(packet.candidates.every((x:any)=>x.reviewStatus==='NOT_REVIEWED'),true);
});
test('M37 named defects are retained and do not accidentally qualify for private alpha',()=>{
 const selected=new Set(packet.candidates.map((x:any)=>x.id));
 assert.ok(!selected.has('SG-M05-037'));assert.ok(!selected.has('SG-M05-036'));
 assert.ok(selected.has('SG-G02R-002:r1'),'source error remains explicitly visible, not silently erased');
 assert.ok(packet.knownDefects.some((x:any)=>x.id==='SG-G02R-002:r1'&&x.status==='BLOCKED_PENDING_EDITOR'));
 const summary=runM37Audit();assert.equal(summary.privateAlphaGate,'NO_GO');
});
