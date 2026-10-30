import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {pragmaticScenarios,pragmaticProgress,pragmaticNext,pragmaticId,isPragmaticEntry} from '../src/domain/pragmatics/pragmatics.ts';
import {readingTransferBriefs,readingTransferFor,readingTransferId,isReadingTransfer,readingTransferProgress} from '../src/domain/reading/transfer.ts';
import {readingStudies} from '../src/domain/reading/reading.ts';
import type {ProductionEntry} from '../src/domain/production/types.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
test('eight distinct unreviewed contextual decisions with multiple effects, never an auto-grade',()=>{
 assert.equal(pragmaticScenarios.length,8);assert.equal(new Set(pragmaticScenarios.map(x=>x.id)).size,8);
 for(const s of pragmaticScenarios){
  assert.equal(s.status,'DEMO_ONLY');assert.equal(s.editorialApproval,false);assert.equal(s.reviewedBy,null);
  assert.equal(s.options.length,3);assert.equal(new Set(s.options.map(x=>x.id)).size,3);
  assert.ok(s.options.every(x=>x.effect.trim().length>20));
  assert.ok(s.preferredIds.every(id=>s.options.some(x=>x.id===id)));
 }
 const first=pragmaticScenarios[0];
 const record:ProductionEntry={id:pragmaticId(first.id),kind:'PRAGMATIC_STUDY',itemId:first.id,itemVersion:1,decisionId:'b',createdAt:20,original:'Meine begründete Wahl bleibt als Erstfassung erhalten.',revisions:[],evaluated:'UNASSESSED'};
 assert.ok(isPragmaticEntry(record));
 assert.deepEqual(pragmaticProgress([record]),{started:1,rewritten:0,total:8});
 assert.equal(pragmaticNext([record]),first.id);
 const revision:ProductionEntry={...record,revisions:[{id:'r1',at:30,text:'Andere Formulierung',reflection:'Register angepasst'}]};
 assert.equal(pragmaticNext([revision]),pragmaticScenarios[1].id);
 assert.equal(record.revisions.length,0);
});
test('reading-to-writing briefs are separate from writing mode and source reading notes',()=>{
 assert.equal(readingTransferBriefs.length,readingStudies.length);
 for(const u of readingStudies){
  const b=readingTransferFor(u.id);assert.ok(b);assert.equal(b?.status,'DEMO_ONLY');assert.equal(b?.editorialApproval,false);
  assert.ok(b?.checks.length!>=3);assert.equal(readingTransferId(u.id),'reading-transfer:'+u.id);
 }
 const u=readingStudies[0],b=readingTransferFor(u.id)!;
 const record:ProductionEntry={id:readingTransferId(u.id),kind:'READING_TRANSFER',sourceId:u.id,itemId:b.id,itemVersion:1,createdAt:1,original:'Zusammenfassung für eine Fachleitung',revisions:[],evaluated:'UNASSESSED'};
 assert.ok(isReadingTransfer(record));assert.deepEqual(readingTransferProgress([record]),{drafted:1,revisions:0,total:4});
 assert.ok(!isPragmaticEntry(record));
});
test('editorial worklist source and manifest include all new 12 unreviewed dossiers',()=>{
 const m=JSON.parse(readFileSync('content/manifest.json','utf8'));
 assert.equal(m.demoItemCount,202);assert.equal(m.pragmaticScenarioCount,8);assert.equal(m.readingTransferCount,4);
 const queue=collect();assert.equal(queue.length,250+m.modalityDraftCount*4+m.caseTracingDraftCount*4+m.valencyDraftCount*4+m.focusDraftCount*4+m.referenceDraftCount*4+m.phraseologyDraftCount*4+m.polysemyDraftCount*4+m.stanceDraftCount*4+m.crossSourceDraftCount*4+m.compressionDraftCount*4+m.attributionDraftCount*4+m.repairDraftCount*4+m.argumentDraftCount*4+m.numericDraftCount*4+m.disclosureDraftCount*4+m.chronologyDraftCount*4+m.definitionDraftCount*4+m.scopeDraftCount*4+m.attachmentDraftCount*4+m.relationDraftCount*4);
 assert.equal(queue.filter(x=>x.type==='PRAGMATIC_CHOICE').length,8);
 assert.equal(queue.filter(x=>x.type==='READING_WRITTEN_TRANSFER').length,4);
 assert.equal(queue.filter(x=>x.mode==='G05').length,m.modalityDraftCount*4);
 assert.equal(queue.filter(x=>x.type==='G02_GOVERNED_REPAIR').length,m.caseTracingDraftCount*3);
 assert.equal(queue.filter(x=>x.type==='G03_VALENCY_FRAME').length,m.valencyDraftCount*3);
 assert.equal(queue.filter(x=>x.type==='G04_DISCOURSE_CONTRAST').length,m.focusDraftCount*3);
 assert.equal(queue.filter(x=>x.type==='G01_REFERENCE_DECISION').length,m.referenceDraftCount*3);
 assert.equal(queue.filter(x=>x.type==='G07_PHRASEOLOGY_CONTRAST').length,m.phraseologyDraftCount*3);
 assert.equal(queue.filter(x=>x.type==='G06_SENSE_CONTRAST').length,m.polysemyDraftCount*3);
 assert.ok(queue.every(x=>x.independentEditorialApproval===false));
});
