import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceStudies,referenceEntryId,isReferenceEntry,referenceSource,isIndependentReferenceRewrite,beginReference,appendReferenceDecision,appendReferenceTransfer,firstReferenceAnswer,savedReferenceDecision,nextReferenceDecision,latestReferenceTransfer,nextReferenceStudy,referenceProgress} from '../src/domain/reference/reference.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {allItems} from '../src/domain/content/registry.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';

const study=referenceStudies[0],at=Date.UTC(2026,9,23,9);
const ownFirst='Im März erhielt erstmals eine hinzugezogene Fachfrau den Förderantrag. Zuvor hatten ihn ausschließlich Mitglieder der Kommission beurteilt.';
const ownReason='Die Fachfrau ist im ersten Absatz noch nicht als identifizierbare Person eingeführt; der unbestimmte Artikel ist daher angemessen.';
const first=()=>beginReference(study,'d1','A',ownFirst,ownReason,at);
const second=(e=first())=>appendReferenceDecision(e,study,'d2','A','Dieselbe bereits beauftragte Fachfrau prüfte anschließend die Daten und legte eine vorläufige Einschätzung vor.','Die bestimmte Wiederaufnahme erhält die Referenzkette; die Alternative könnte eine weitere Fachfrau einführen.','d2',at+1);
const third=(e=second())=>appendReferenceDecision(e,study,'d3','B','Am Freitag traf die schon erwähnte schriftliche Einschätzung in der Geschäftsstelle ein; eine Abstimmung stand noch aus.','Der bestimmte Dokumentverweis greift den zuvor verfassten Bericht auf und führt kein neues Schriftstück ein.','d3',at+2);
const ownText='Eine von außen hinzugezogene Gutachterin erhielt den Antrag im März. Die Gutachterin prüfte die Berechnungen und verfasste danach einen vorläufigen Bericht. Der Bericht erreichte am Freitag die Geschäftsstelle; eine Freigabe war damit nicht verbunden.';
const transfer=(e=third())=>appendReferenceTransfer(e,study,'TRANSFER',ownText,'Die unbestimmte Erstnennung führt eine Person ein; die bestimmte Rückverweisung erhält ihre Identität und unterscheidet den Bericht von einer Entscheidung.','p3','own',at+3);

test('six independent original G01 cases anchor eighteen distinct determiner-reference decisions',()=>{
 assert.equal(referenceStudies.length,6);assert.equal(new Set(referenceStudies.map(s=>s.id)).size,6);
 const families=new Set(),preferred=new Set(),bands=new Set(),ids=new Set();
 for(const s of referenceStudies){
  assert.match(s.id,/^SG-G01-\d{3}$/);assert.equal(s.version,1);assert.equal(s.domain,'G01');
  assert.equal(s.editorialApproval,false);assert.equal(s.reviewedBy,null);assert.equal(s.status,'DEMO_ONLY');assert.equal(s.rights.kind,'ORIGINAL_DRAFT');
  bands.add(s.band);assert.deepEqual(s.paragraphs.map(p=>p.id),['p1','p2','p3']);assert.ok(s.paragraphs.every(p=>p.text.length>=180));
  assert.deepEqual(s.decisions.map(d=>d.id),['d1','d2','d3']);
  for(const d of s.decisions){
   assert.ok(!ids.has(s.id+':'+d.id));ids.add(s.id+':'+d.id);
   assert.equal(s.paragraphs.find(p=>p.id===d.paragraphId)?.text.includes(d.quote),true);
   assert.notEqual(d.quote,d.alternate);assert.ok(d.explanation.length>=110&&d.repairPrompt.length>=35);
   assert.deepEqual(d.options.map(o=>o.id),['A','B']);assert.notEqual(d.options[0].text,d.options[1].text);
   preferred.add(d.preferredId);families.add(d.family);
  }
 }
 assert.equal(ids.size,18);assert.equal(families.size,18);
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.deepEqual([...preferred].sort(),['A','B']);
 assert.ok(!allItems.some(x=>x.id.startsWith('SG-G01-')),'new free source work must not enter existing graded M01 content');
 assert.ok(allItems.some(x=>x.mode==='M01'),'original M01 scorer/source owner remains untouched');
});

test('the immutable first referent analysis preserves original, source version, choice and paragraph without a grade',()=>{
 const e=first();
 assert.ok(isReferenceEntry(e));assert.equal(e.id,referenceEntryId(study.id));assert.equal(e.kind,'REFERENCE_STUDY');
 assert.equal(e.sourceId,study.id);assert.equal(e.itemVersion,1);assert.equal(e.evaluated,'UNASSESSED');
 assert.equal(referenceSource(e)?.id,study.id);
 assert.deepEqual(firstReferenceAnswer(e),{decisionId:'d1',paragraphId:'p1',choice:'A',rewrite:ownFirst,reason:ownReason,initial:true});
 assert.deepEqual(savedReferenceDecision(e,study.decisions[0]),firstReferenceAnswer(e));
 assert.equal(nextReferenceDecision(study,e)?.id,'d2');assert.equal(archiveKind(e),'G01_REFERENCE');assert.equal(archiveRow(e).scope,'G01');
 assert.equal(firstReferenceAnswer({...e,sourceId:'withdrawn'}),null);
 assert.equal(firstReferenceAnswer({...e,decisionId:'d1|Z|p1'}),null);
});

test('independent source analysis rejects copied, skipped, invalid and unreasoned answers',()=>{
 const d=study.decisions[0];
 assert.equal(isIndependentReferenceRewrite(d,d.quote),false);
 assert.equal(isIndependentReferenceRewrite(d,d.alternate),false);
 assert.equal(isIndependentReferenceRewrite(d,ownFirst),true);
 assert.throws(()=>beginReference(study,'d2','A',ownFirst,ownReason,at),/erforderlich/);
 assert.throws(()=>beginReference(study,'d1','Z' as never,ownFirst,ownReason,at),/erforderlich/);
 assert.throws(()=>beginReference(study,'d1','A',d.quote,ownReason,at),/erforderlich/);
 assert.throws(()=>beginReference(study,'d1','A',d.alternate,ownReason,at),/erforderlich/);
 assert.throws(()=>beginReference(study,'d1','A',ownFirst,'Zu kurz.',at),/erforderlich/);
 assert.throws(()=>appendReferenceDecision(first(),study,'d3','B',ownFirst,ownReason,'early',at+1),/unvollständig/);
 assert.throws(()=>appendReferenceDecision(first(),study,'d2','A',study.decisions[1].quote,ownReason,'copy',at+1),/unvollständig/);
});

test('sequential reference decisions preserve unpreferred interpretation without autonomous grading',()=>{
 const initial=first(),two=second(initial);
 assert.equal(two.evaluated,'UNASSESSED');assert.equal(study.decisions[1].preferredId,'B');
 assert.equal(savedReferenceDecision(two,study.decisions[1])?.choice,'A');
 assert.equal(initial.revisions.length,0);assert.equal(two.original,initial.original);assert.equal(two.decisionId,initial.decisionId);
 assert.equal(two.revisions[0].questionId,'DECISION:d2');assert.equal(two.revisions[0].paragraphId,'p2');
 assert.deepEqual(two.revisions[0].selfChecks,['A']);
 assert.throws(()=>appendReferenceDecision(two,study,'d2','B',ownFirst,ownReason,'duplicate',at+2),/unvollständig/);
 const all=third(two);assert.equal(all.revisions.length,2);assert.equal(nextReferenceDecision(study,all),null);
 assert.equal(latestReferenceTransfer(all),null);
});

test('transfer and later revision append without editing original analysis or earlier choice history',()=>{
 const analysis=third(),e=transfer(analysis);
 assert.equal(analysis.revisions.length,2);assert.equal(e.revisions.length,3);
 assert.equal(e.revisions[2].questionId,'TRANSFER');assert.equal(e.revisions[2].paragraphId,'p3');
 assert.deepEqual(e.revisions.slice(0,2),analysis.revisions);
 assert.throws(()=>appendReferenceTransfer(first(),study,'TRANSFER',ownText,ownReason,'p1','early',at+3),/unvollständig/);
 assert.throws(()=>appendReferenceTransfer(analysis,study,'REWRITE',ownText,ownReason,'p1','wrong-stage',at+3),/unvollständig/);
 assert.throws(()=>appendReferenceTransfer(e,study,'TRANSFER',ownText+' Eine weitere Aussage.',ownReason,'p1','duplicate',at+4),/unvollständig/);
 assert.throws(()=>appendReferenceTransfer(e,study,'REWRITE',ownText,ownReason,'p1','unchanged',at+4),/unvollständig/);
 assert.throws(()=>appendReferenceTransfer(e,study,'REWRITE',ownText+' Ein Zusatz.',ownReason,'bad','wrong-source',at+4),/unvollständig/);
 const revised=appendReferenceTransfer(e,study,'REWRITE',ownText+' Eine Entscheidung lag an diesem Tag noch nicht vor.','Der Zusatz klärt die Grenze zwischen dem Eingang des Dokuments und dem noch ausstehenden Beschluss.','p2','rewrite',at+4);
 assert.equal(revised.original,e.original);assert.deepEqual(revised.revisions.slice(0,3),e.revisions);
 assert.equal(revised.evaluated,'UNASSESSED');assert.equal(revised.revisions[3].questionId,'REWRITE');
 assert.equal(versionPair(revised,3)?.previous,e.revisions[2].text);
 assert.equal(archiveRows([revised],{kind:'G01_REFERENCE',activity:'REVISED',period:'ALL',search:'noch nicht vor',now:at+5}).length,1);
});

test('reference metrics count observed activity only and prioritise unfinished source cases',()=>{
 assert.deepEqual(referenceProgress([]),{started:0,decisions:0,transferred:0,rewritten:0,total:6});
 assert.deepEqual(referenceProgress([first()]),{started:1,decisions:1,transferred:0,rewritten:0,total:6});
 assert.deepEqual(referenceProgress([third()]),{started:1,decisions:3,transferred:0,rewritten:0,total:6});
 assert.deepEqual(referenceProgress([transfer()]),{started:1,decisions:3,transferred:1,rewritten:0,total:6});
 assert.equal(nextReferenceStudy([]).id,study.id);assert.equal(nextReferenceStudy([first()]).id,study.id);
 assert.equal(nextReferenceStudy([transfer()]).id,referenceStudies[1].id);
});

test('portable v3 backup preserves ungraded G01 interpretations and their source anchors with integrity validation',async()=>{
 const e=transfer(),data:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[e],missions:[]};
 const text=await buildPortableBackup(data),restored=await inspectPortableBackup(text);
 assert.equal(restored.version,BACKUP_VERSION);assert.deepEqual(restored.records.productionEntries,[e]);
 assert.ok(text.includes('Im März erhielt erstmals eine hinzugezogene Fachfrau'));
 await assert.rejects(()=>inspectPortableBackup(text.replace('Im März erhielt erstmals eine hinzugezogene Fachfrau','Im März erhielt erstmals eine unbeteiligte Fachfrau')),/Integritätsprüfung/);
});

test('editorial worklist holds 24 distinct unapproved source and referent dossiers',()=>{
 const work=collect().filter(x=>x.mode==='G01_REFERENCE');
 assert.equal(work.length,24);assert.equal(work.filter(x=>x.type==='G01_ORIGINAL_SOURCE').length,6);
 assert.equal(work.filter(x=>x.type==='G01_REFERENCE_DECISION').length,18);
 assert.ok(work.every(x=>x.status==='DEMO_ONLY'&&x.independentEditorialApproval===false));
 assert.ok(work.some(x=>x.alternate&&x.options?.length===2&&x.model));
});
