import test from 'node:test';import assert from 'node:assert/strict';
import {editorialCases,editorialId,isEditorialEntry,editorialSource,editorialFirst,appendEditorialRevision,selectedIssue,editorialCaseFor,editorialProgress,nextEditorialCase,EDITORIAL_CHECKS} from '../src/domain/editorial/editorial.ts';
import {archiveKind,archiveRow,archiveRows} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';

const c=editorialCases[0],at=Date.UTC(2026,9,22,14);
const first=()=>editorialFirst(c,c.issues[0].id,c.issues[0].paragraphId,'Das Pronomen „sie“ bezeichnet keine eindeutige Stelle; der Beschluss setzt ungeprüfte Hinweise voraus.',at);
test('all G11 source paragraphs are original, addressable and separate from G09/G12/G13',()=>{
 assert.equal(editorialCases.length,4);assert.equal(new Set(editorialCases.map(x=>x.id)).size,4);
 for(const s of editorialCases){
  assert.equal(s.domain,'G11');assert.equal(s.version,1);assert.equal(s.status,'DEMO_ONLY');
  assert.equal(s.rights.kind,'ORIGINAL_DRAFT');assert.equal(s.editorialApproval,false);
  assert.equal(s.paragraphs.length,3);assert.ok(s.paragraphs.every(p=>p.id&&p.text.length>60));
  assert.equal(s.issues.length,2);assert.ok(s.issues.every(i=>s.paragraphs.some(p=>p.id===i.paragraphId)&&i.question.length>30));
  assert.ok(editorialSource(s).includes('\n\n'));
 }
});
test('first editorial diagnosis is anchored and immutable, separated from prior kind records',()=>{
 const e=first();assert.equal(e.id,editorialId(c.id));assert.equal(e.kind,'EDITORIAL_STUDY');
 assert.equal(e.evaluated,'UNASSESSED');assert.equal(e.itemVersion,c.version);assert.equal(e.sourceId,c.id);
 assert.equal(e.decisionId,c.issues[0].id+'|'+c.issues[0].paragraphId);
 assert.deepEqual(selectedIssue(e),c.issues[0]);assert.equal(editorialCaseFor(e)?.id,c.id);
 assert.equal(archiveKind(e),'G11_EDITORIAL');assert.equal(archiveRow(e).scope,'G11');
 assert.throws(()=>editorialFirst(c,'bad','p2','Text',at),/unvollständig/);
 assert.throws(()=>editorialFirst(c,c.issues[0].id,'p3','Text',at),/unvollständig/);
 assert.throws(()=>editorialFirst(c,c.issues[0].id,'p2',' ',at),/unvollständig/);
});
test('full redrafts and reconsiderations are append-only, anchored and require rationale',()=>{
 const e=first(),draft=editorialSource(c).replace('Sie hat die Hinweise','Die Projektleitung hat die Hinweise');
 const one=appendEditorialRevision(e,c,'REDRAFT',draft,'Die Subjekte sind eindeutig; die Entscheidung bleibt offen.',[EDITORIAL_CHECKS[0]],'v1',at+1);
 assert.equal(e.revisions.length,0);assert.equal(one.original,e.original);assert.equal(one.decisionId,e.decisionId);
 assert.equal(one.revisions[0].questionId,'REDRAFT');assert.equal(one.revisions[0].paragraphId,'p2');
 const two=appendEditorialRevision(one,c,'RECONSIDER',draft+' Eine Entscheidung bleibt vorbehalten.','Die Folgerung wird eingeschränkt.',[EDITORIAL_CHECKS[3]],'v2',at+2);
 assert.equal(two.revisions.length,2);assert.deepEqual(two.revisions.slice(0,1),one.revisions);
 assert.equal(two.revisions[1].lens,'KOHÄRENZ');
 assert.throws(()=>appendEditorialRevision(e,c,'RECONSIDER',draft,'Begründung',[],'bad',at+3),/unvollständig/);
 assert.throws(()=>appendEditorialRevision(e,c,'REDRAFT',draft,' ',[],'bad',at+3),/unvollständig/);
 assert.throws(()=>appendEditorialRevision({...e,sourceId:'fake'},c,'REDRAFT',draft,'Begründung',[],'bad',at+3),/unvollständig/);
 assert.throws(()=>appendEditorialRevision(e,c,'REDRAFT',draft,'Begründung',['erfundene Prüfnorm'],'bad',at+3),/unvollständig/);
 assert.equal(archiveRows([two],{kind:'G11_EDITORIAL',activity:'REVISED',period:'ALL',search:'Die Folgerung',now:at+3}).length,1);
});
test('progress counts observed acts without inferred skill/mastery and chooses incomplete cases',()=>{
 const e=first();assert.deepEqual(editorialProgress([e]),{started:1,rewritten:0,reconsidered:0,revisions:0,total:4});
 assert.equal(nextEditorialCase([e]).id,c.id);
 const one=appendEditorialRevision(e,c,'REDRAFT','Redigierter Text','Präzisiert',[],'r1',at+1);
 assert.equal(editorialProgress([one]).rewritten,1);assert.equal(nextEditorialCase([one]).id,editorialCases[1].id);
 const two=appendEditorialRevision(one,c,'RECONSIDER','Präziser Text','Weiter präzisiert',[],'r2',at+2);
 assert.equal(editorialProgress([two]).reconsidered,1);
});
test('backup v3 retains diagnosis, source reference, and independent complete rewrites',async()=>{
 const e=appendEditorialRevision(first(),c,'REDRAFT',editorialSource(c),'Stelle klar.',[],'r1',at+1);
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[e],missions:[]};
 const packed=await buildPortableBackup(records);
 const read=await inspectPortableBackup(packed);assert.equal(read.version,BACKUP_VERSION);
 assert.deepEqual(read.records.productionEntries,[e]);
});
