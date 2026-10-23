import test from 'node:test';
import assert from 'node:assert/strict';
import {valencyStudies,valencyEntryId,isValencyEntry,valencySource,beginValency,appendValencyFrame,appendValencyTransfer,firstValencyResponse,savedValencyFrame,nextValencyFrame,latestValencyTransfer,nextValencyStudy,valencyProgress} from '../src/domain/valency/valency.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {allItems} from '../src/domain/content/registry.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';

const s=valencyStudies[0],at=Date.UTC(2026,9,23,12);
const first=()=>beginValency(s,'f1','A','Die Kommission verlangt schriftliche Belege und bleibt bei ihrer Forderung.','Die Gruppe ist nicht selbst aus Texten zusammengesetzt.',at);
const second=(e=first())=>appendValencyFrame(e,s,'f2','B','Die Erhebung liefert Vergleichswerte, ohne als Autorität beansprucht zu werden.','Ein Bericht kann sich auf Werte beziehen, ohne sich ausdrücklich auf Autoritäten zu berufen.','frame2',at+1);
const third=(e=second())=>appendValencyFrame(e,s,'f3','A','Die weitere Entscheidung ist von den Ergebnissen der Prüfung abhängig.','Die endgültige Maßnahme steht noch nicht fest.','frame3',at+2);
const ownText='Die Kommission besteht auf einer nachvollziehbaren Begründung. Ob der Antrag bewilligt wird, hängt von einer noch ausstehenden Überprüfung der Daten ab.';
const transfer=(e=third())=>appendValencyTransfer(e,s,'TRANSFER',ownText,'„Bestehen auf“ markiert eine Forderung; „abhängen von“ benennt eine sachliche Entscheidungsbedingung.','p3','t1',at+3);

test('G03 contains six stable C1/C2 original multi-paragraph studies and 18 literal source-anchored frame shifts',()=>{
 assert.equal(valencyStudies.length,6);
 assert.equal(new Set(valencyStudies.map(x=>x.id)).size,6);
 const names=new Set(),bands=new Set(),preferred=new Set();
 for(const study of valencyStudies){
  bands.add(study.band);
  assert.match(study.id,/^SG-G03-\d{3}$/);assert.equal(study.version,1);assert.equal(study.domain,'G03');
  assert.equal(study.status,'DEMO_ONLY');assert.equal(study.rights.kind,'ORIGINAL_DRAFT');
  assert.equal(study.editorialApproval,false);assert.equal(study.reviewedBy,null);
  assert.deepEqual(study.paragraphs.map(p=>p.id),['p1','p2','p3']);
  assert.deepEqual(study.frames.map(f=>f.id),['f1','f2','f3']);
  for(const f of study.frames){
   names.add(f.family);preferred.add(f.preferredId);
   assert.ok(study.paragraphs.find(p=>p.id===f.paragraphId)?.text.includes(f.quote));
   assert.notEqual(f.quote,f.alternate);assert.ok(f.governor.length>=18);
   assert.ok(f.explanation.length>80&&f.model.length>20&&f.repairPrompt.length>20);
   assert.deepEqual(f.options.map(o=>o.id),['A','B']);assert.ok(f.options.some(x=>x.id===f.preferredId));
  }
 }
 assert.equal(names.size,18);assert.deepEqual([...bands].sort(),['C1','C2']);assert.deepEqual([...preferred].sort(),['A','B']);
 assert.ok(!allItems.some(x=>x.id.startsWith('SG-G03-')));
 assert.ok(allItems.some(x=>x.mode==='M03'),'existing independent graded mode M03 unaffected');
});

test('first interpretation is immutable and source/choice/paragraph anchored with no machine grade',()=>{
 const e=first();assert.equal(e.id,valencyEntryId(s.id));assert.equal(e.itemVersion,1);
 assert.ok(isValencyEntry(e));assert.equal(valencySource(e)?.id,s.id);assert.equal(e.evaluated,'UNASSESSED');
 assert.deepEqual(firstValencyResponse(e),{frameId:'f1',paragraphId:'p1',choice:'A',interpretation:'Die Kommission verlangt schriftliche Belege und bleibt bei ihrer Forderung.',boundary:'Die Gruppe ist nicht selbst aus Texten zusammengesetzt.',initial:true});
 assert.deepEqual(savedValencyFrame(e,s.frames[0]),firstValencyResponse(e));
 assert.equal(archiveKind(e),'G03_VALENCY');assert.equal(archiveRow(e).scope,'G03');
 assert.equal(nextValencyFrame(s,e)?.id,'f2');
 assert.throws(()=>beginValency(s,'f2','A','Deutung','Grenze',at),/erforderlich/);
 assert.throws(()=>beginValency(s,'f1','C' as never,'Deutung','Grenze',at),/erforderlich/);
 assert.throws(()=>beginValency(s,'f1','A','Deutung',' ',at),/erforderlich/);
 assert.equal(firstValencyResponse({...e,sourceId:'different'}),null);
 assert.equal(firstValencyResponse({...e,decisionId:'f1|invalid|p1'}),null);
});

test('frame progression stores author-unpreferred selections without grading, rejects skipped and duplicate evidence',()=>{
 const original=first();
 assert.throws(()=>appendValencyFrame(original,s,'f3','A','Deutung','Grenze','premature',at+1),/unvollständig/);
 assert.throws(()=>appendValencyFrame(original,s,'f2','C' as never,'Deutung','Grenze','wrong',at+1),/unvollständig/);
 assert.throws(()=>appendValencyFrame(original,s,'f2','B','Deutung',' ','empty',at+1),/unvollständig/);
 const wrong=appendValencyFrame(original,s,'f2','A','Ich lese die Position als Autoritätsberufung.','Diese Deutung ist möglicherweise zu stark.','unpreferred',at+1);
 assert.equal(wrong.evaluated,'UNASSESSED');
 assert.equal(savedValencyFrame(wrong,s.frames[1])?.choice,'A');
 const two=second(original);
 assert.equal(original.revisions.length,0);assert.equal(two.original,original.original);assert.equal(two.decisionId,original.decisionId);
 assert.equal(two.revisions[0].questionId,'FRAME:f2');assert.equal(two.revisions[0].paragraphId,'p2');
 assert.deepEqual(two.revisions[0].selfChecks,['B']);assert.equal(nextValencyFrame(s,two)?.id,'f3');
 assert.throws(()=>appendValencyFrame(two,s,'f2','B','Nochmals','Begründung','duplicate',at+2),/unvollständig/);
 const end=third(two);assert.equal(nextValencyFrame(s,end),null);
 assert.equal(end.revisions.length,2);assert.equal(latestValencyTransfer(end),null);
});

test('independent written transfer requires three completed frames, anchored paragraph and rationale; revisions append only',()=>{
 const base=third(),written=transfer(base);
 assert.equal(base.revisions.length,2);assert.equal(written.revisions.length,3);
 assert.equal(written.revisions[2].questionId,'TRANSFER');assert.equal(written.revisions[2].paragraphId,'p3');
 assert.deepEqual(written.revisions.slice(0,2),base.revisions);
 assert.throws(()=>appendValencyTransfer(first(),s,'TRANSFER',ownText,'Grund','p1','bad',at+5),/unvollständig/);
 assert.throws(()=>appendValencyTransfer(base,s,'REWRITE',ownText,'Grund','p1','bad',at+5),/unvollständig/);
 assert.throws(()=>appendValencyTransfer(written,s,'TRANSFER',ownText+' Weitere Aussage.','Grund','p1','bad',at+5),/unvollständig/);
 assert.throws(()=>appendValencyTransfer(written,s,'REWRITE',ownText,'Grund','p1','bad',at+5),/unvollständig/);
 assert.throws(()=>appendValencyTransfer(written,s,'REWRITE',ownText+' Das ist neu.','Grund','p9','bad',at+5),/unvollständig/);
 const revised=appendValencyTransfer(written,s,'REWRITE',ownText+' Die Entscheidung bleibt bis dahin ausdrücklich offen.','Die neue Formulierung grenzt eine voreilige Zustimmung aus.','p1','r1',at+5);
 assert.equal(revised.evaluated,'UNASSESSED');assert.equal(revised.original,base.original);
 assert.deepEqual(revised.revisions.slice(0,3),written.revisions);assert.equal(revised.revisions[3].questionId,'REWRITE');
 assert.equal(versionPair(revised,3)?.previous,written.revisions[2].text);
 assert.equal(archiveRows([revised],{kind:'G03_VALENCY',activity:'REVISED',period:'ALL',search:'ausdrücklich offen',now:at+6}).length,1);
});

test('progress is observed activity only and next-case selection respects unfinished source work',()=>{
 assert.deepEqual(valencyProgress([]),{started:0,frames:0,transferred:0,revisions:0,total:6});
 assert.deepEqual(valencyProgress([first()]),{started:1,frames:1,transferred:0,revisions:0,total:6});
 assert.deepEqual(valencyProgress([third()]),{started:1,frames:3,transferred:0,revisions:0,total:6});
 assert.deepEqual(valencyProgress([transfer()]),{started:1,frames:3,transferred:1,revisions:0,total:6});
 assert.equal(nextValencyStudy([]).id,s.id);assert.equal(nextValencyStudy([first()]).id,s.id);
 assert.equal(nextValencyStudy([transfer()]).id,valencyStudies[1].id);
});

test('original backup v3 retains source, immutable interpretation, frame choices and writing without new stores',async()=>{
 const e=transfer(),records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[e],missions:[]};
 const packed=await buildPortableBackup(records),restored=await inspectPortableBackup(packed);
 assert.equal(restored.version,BACKUP_VERSION);
 assert.deepEqual(restored.records.productionEntries,[e]);
 await assert.rejects(()=>inspectPortableBackup(packed.replace('Die Kommission verlangt schriftliche Belege','Die Kommission hat diese Angaben nie erhalten')),/Integritätsprüfung/);
});

test('all six source files and eighteen contrasts are independently unapproved in the original review queue',()=>{
 const queue=collect().filter(x=>x.mode==='G03');
 assert.equal(queue.length,24);assert.equal(queue.filter(x=>x.type==='G03_ORIGINAL_SOURCE').length,6);
 assert.equal(queue.filter(x=>x.type==='G03_VALENCY_FRAME').length,18);
 assert.ok(queue.every(x=>x.status==='DEMO_ONLY'&&x.independentEditorialApproval===false));
});
