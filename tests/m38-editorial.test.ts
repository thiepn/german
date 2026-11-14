import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateM38,renderM38ReviewPacket} from '../scripts/editorial/m38Qualification.mjs';
const load=(path:string)=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const mutation=(path:string,change:(v:any)=>void)=>(p:string)=>{
 const obj=load(p);if(p===path)change(obj);return obj;
};
test('M38 human-review dossier covers 26 full original source cases and stays NO_GO',()=>{
 const x=validateM38();
 assert.equal(x.structuralGate,'PASS');assert.equal(x.privateAlphaGate,'NO_GO');assert.equal(x.releaseGate,'NO_GO');
 assert.equal(x.counts.candidateCases,26);assert.equal(x.counts.versionedDrafts,4);assert.equal(x.counts.approvedItems,0);
 assert.ok(x.sourceCases.every((c:any)=>c.paragraphs.length===3&&c.sourceRightsClaim&&c.linguistic==='NOT_REVIEWED'));
 const md=renderM38ReviewPacket(x);assert.equal((md.match(/^## SG-/gm)||[]).length,26);
 assert.ok(md.includes('SG-G02R-002:r1'));assert.ok(md.includes('SG-G06-002:d1'));
 assert.ok(md.includes('Reviewer identity / organization: __________________'));
 assert.ok(md.includes('All plausible answers and counter-readings'));
 assert.ok(md.includes('Active runtime still imports DEMO_ONLY'));
});
test('M38 exact historical v1 sources remain untouched and version-two drafts are quarantined',()=>{
 const x=validateM38();
 for(const r of x.corrections){
  const source=load(r.source).find((s:any)=>s.id===r.id);
  assert.deepEqual(source,r.legacyV1);
  assert.equal(source.version,1);
  assert.equal(r.draftV2.version,2);
  assert.equal(r.draftV2.status,'DEMO_ONLY');
  if(r.id.startsWith('SG-M05-')){
   assert.equal(r.draftV2.editorial?.reviewedBy,undefined);
   assert.equal(r.draftV2.editorial?.reviewId,undefined);
  }else{
   assert.equal(r.draftV2.editorialApproval,false);
   assert.equal(r.draftV2.reviewedBy,null);
  }
 }
});
test('M38 corrects G02 model and both G06 semantic answer reversals in non-runtime v2 drafts',()=>{
 const x=validateM38(),r=(id:string)=>x.corrections.find((c:any)=>c.id===id)!.draftV2;
 assert.match(r('SG-G02R-002').anchors[0].model,/die Finanzierung das Subjekt/);
 assert.equal(r('SG-G06-002').decisions[0].preferredId,'A');
 assert.equal(r('SG-G06-002').decisions[2].preferredId,'A');
 assert.equal(r('SG-G06-002').decisions[1].preferredId,'A');
});
test('M38 corrected collocation prompts constrain intended alternatives without granting review',()=>{
 const x=validateM38(),r=(id:string)=>x.corrections.find((c:any)=>c.id===id)!.draftV2;
 assert.match(r('SG-M05-036').prompt,/auf Vollständigkeit/);
 assert.match(r('SG-M05-037').prompt,/keine verbindliche Zusage/);
 assert.deepEqual(r('SG-M05-036').contrast.options,['prüfen','ablehnen']);
 assert.deepEqual(r('SG-M05-037').contrast.options,['aufzeigen','versprechen']);
});
test('M38 rejects hidden changes to historical source, v2 edits or reviewer authority',()=>{
 assert.throws(()=>validateM38({load:mutation('content/fixtures/g02-relative.demo.json',x=>{x.find((y:any)=>y.id==='SG-G02R-002').anchors[0].model='silent mutation'})}),/historical v1 changed/);
 assert.throws(()=>validateM38({load:mutation('content/editorial/m38-versioned-drafts.json',x=>{x.revisions[0].draftV2.rights.kind='REVIEWED'})}),/draft v2 claims unearned approval/);
 assert.throws(()=>validateM38({load:mutation('content/editorial/m38-versioned-drafts.json',x=>{x.revisions[1].draftV2.decisions[2].preferredId='B'})}),/unauthorized source\/answer\/distractor change/);
 assert.throws(()=>validateM38({load:mutation('content/editorial/approval-ledger.json',x=>{x.push({id:'fake'})})}),/human approval\/assessment authority changed/);
 assert.throws(()=>validateM38({load:mutation('content/editorial/m37-alpha-candidates.json',x=>{x.candidates[0].reviewStatus='APPROVED'})}),/unearned human qualification/);
});
