import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateM42,renderM42} from '../scripts/editorial/m42Review.mjs';
import {validateM38} from '../scripts/editorial/m38Qualification.mjs';
import {qualifyM41} from '../scripts/content/m41Qualification.mjs';
import {auditSourceBoundary} from '../scripts/content/releaseBoundary.mjs';
import {polysemyStudies,polysemySource} from '../src/domain/polysemy/polysemy.ts';
import {phraseologyStudies,phraseologySource} from '../src/domain/phraseology/phraseology.ts';
import type {ProductionEntry} from '../src/domain/production/types.ts';
const load=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
test('M42 identifies 13 additional source-vs-author-key contradictions in 11 unapplied version-two studies',()=>{
 const p=validateM42();
 assert.equal(p.M42,'PASS_STRUCTURAL_ONLY');assert.equal(p.caseCount,26);
 assert.equal(p.newDrafts,11);assert.equal(p.newDefectCount,13);
 assert.equal(p.reviewCases.length,13);assert.equal(new Set(p.reviewCases.map((x:any)=>x.id)).size,13);
 assert.equal(p.oldDrafts,4);
 assert.equal(p.release,'NO_GO');assert.equal(p.alpha,'NO_GO');assert.equal(p.editorial,'NO_GO');
 assert.ok(p.reviewCases.every((x:any)=>x.originalKey==='B'&&x.proposedKey==='A'&&x.reviewerDecision===null));
});
test('M42 exact v1 source objects and the preexisting four M38 corrections remain unchanged and inactive',()=>{
 const m38=validateM38(),p=load('content/editorial/m42-versioned-drafts.json');
 assert.equal(m38.corrections.length,4);assert.equal(m38.corrections[0].draftV2.version,2);
 const sources=new Map<string,unknown>();
 for(const revision of p.revisions){
  const original=load(revision.source).find((s:any)=>s.id===revision.id&&s.version===1);
  assert.deepEqual(original,revision.legacyV1);
  const expected=structuredClone(original);expected.version=2;
  for(const operation of revision.operations){
   assert.deepEqual(operation.path.slice(0,1),['decisions']);
   assert.equal(operation.path.at(-1),'preferredId');
   assert.equal(operation.from,'B');assert.equal(operation.to,'A');
   expected.decisions[operation.path[1]].preferredId='A';
  }
  assert.deepEqual(revision.draftV2,expected);
  assert.equal(revision.draftV2.status,'DEMO_ONLY');
  assert.equal(revision.draftV2.editorialApproval,false);
  assert.equal(load(revision.source).some((s:any)=>s.id===revision.id&&s.version===2),false);
  sources.set(revision.id,original);
 }
 assert.equal(sources.size,11);
 assert.equal(polysemyStudies.some(s=>s.version!==1),false);
 assert.equal(phraseologyStudies.some(s=>s.version!==1),false);
});
test('M42 v2 author proposal cannot be interpreted as activated G06/G07 learner source',()=>{
 const make=(kind:'POLYSEMY_STUDY'|'PHRASEOLOGY_STUDY',itemId:string):ProductionEntry=>({
  id:(kind==='POLYSEMY_STUDY'?'polysemy:':'phraseology:')+itemId,itemId,itemVersion:2,sourceId:itemId,kind,
  createdAt:10,original:'Saved immutable learner text',revisions:[],evaluated:'UNASSESSED'
 });
 assert.equal(polysemySource(make('POLYSEMY_STUDY','SG-G06-001')),null);
 assert.equal(phraseologySource(make('PHRASEOLOGY_STUDY','SG-G07-001')),null);
});
test('M42 review packet names every sample source, disputed option, CEFR mapping and independent signoff field',()=>{
 const r=validateM42(),md=renderM42(r);
 assert.equal(r.sample.length,26);
 // All thirteen G01–G13 studio groups are mandatory, but cross-cutting
 // objective content and unmapped source imports MUST remain in the release hold
 // inventory rather than being silently dropped to make its length equal 13.
 const expectedDomains=Array.from({length:13},(_,i)=>'G'+String(i+1).padStart(2,'0'));
 const groupedDomains=r.inventory.map((x:any)=>x.domain);
 assert.deepEqual(groupedDomains.filter((d:string)=>/^G(?:0[1-9]|1[0-3])$/.test(d)).sort(),expectedDomains);
 assert.ok(groupedDomains.includes('M01–M07'),'objective fixture hold must remain visible');
 assert.ok(groupedDomains.includes('UNMAPPED_HOLD'),'unmapped demo references must fail closed');
 assert.equal(new Set(groupedDomains).size,r.inventory.length);
 assert.equal(r.inventory.reduce((n:number,x:any)=>n+x.directDemoImports,0),38);
 assert.ok(md.includes('SG-G03A-002:a1')&&md.includes('SG-G07-003:d1'));
 assert.ok(md.includes('SG-G06-006:d3')&&md.includes('SG-G07-006:d3'));
 assert.ok(md.includes('source fingerprint')&&md.includes('Blind')===false);
 assert.match(md,/qualified independent reviewer/i);
 assert.match(md,/cefr-companion-volume-and-its-language-versions/);
 assert.match(md,/no placeholder or demo alias/i);
 assert.ok(md.includes('NO_GO'));
});
test('M42 refuses fabricated approval and altered key-inventory without mutating records',()=>{
 const original=load('content/editorial/m42-versioned-drafts.json'),baseline=JSON.stringify(original);
 const inj=(modify:(x:any)=>void)=>{
  const packet=structuredClone(original);modify(packet);
  assert.throws(()=>validateM42({load:(p:string)=>p==='content/editorial/m42-versioned-drafts.json'?packet:load(p)}),/M42 EDITORIAL_HOLD/);
 };
 inj(x=>{x.editorialApproval=true});
 inj(x=>{x.rightsApproval=true});
 inj(x=>{x.cefrCalibration=true});
 inj(x=>{x.revisions.pop()});
 inj(x=>{x.revisions[0].draftV2.decisions[1].explanation='Fabricated evidence'});
 inj(x=>{x.revisions[0].operations[0].to='B'});
 assert.equal(JSON.stringify(load('content/editorial/m42-versioned-drafts.json')),baseline);
 assert.equal(qualifyM41().release,'NO_GO');
 assert.throws(()=>auditSourceBoundary({channel:'APPROVED_ONLY'}),/RELEASE_SOURCE_BLOCKED/);
});
