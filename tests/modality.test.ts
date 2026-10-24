import test from 'node:test';
import assert from 'node:assert/strict';
import {modalityCases,modalityFirst,modalityContrastRevision,modalityWrittenRevision,firstInterpretation,recordedContrast,nextModalityContrast,modalityProgress,sourceForModality,isModalityEntry,modalityId,lastModalityOutput,nextModalityCase} from '../src/domain/modality/modality.ts';
import {archiveKind,archiveRow,archiveRows} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {allItems} from '../src/domain/content/registry.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
const c=modalityCases[0],at=Date.UTC(2026,9,23,8);
const first=()=>modalityFirst(c,'c1','A','Der Abschluss wird lediglich der Projektleitung zugeschrieben; eine Freigabe fehlt.',at);
const step2=(e=first())=>modalityContrastRevision(e,c,'c2','B','Aus Sicht der Sprecherin war die Handlung noch zukünftig.','Die tatsächliche Einreichung folgt daraus nicht.','c2v1',at+1);
const step3=(e=step2())=>modalityContrastRevision(e,c,'c3','A','Die behauptete Einreichung ist als vergangener Vorgang berichtet.','Die Gegenprüfung war nicht abgeschlossen.','c3v1',at+2);
const transfer=(e=step3())=>modalityWrittenRevision(e,c,'TRANSFER','Die Leitung erklärte, der Entwurf sei fertig. Der Nachweis sei eingereicht; die Kommission habe dies noch nicht geprüft.','Freigabe und Einreichung sind getrennt.','p3','tv1',at+3);

test('six original G05 authoring cases have stable paragraphs, distinct contrasts and full mood/tense/voice coverage',()=>{
 assert.equal(modalityCases.length,6);assert.equal(new Set(modalityCases.map(x=>x.id)).size,6);
 const families=new Set();
 for(const s of modalityCases){
  assert.equal(s.status,'DEMO_ONLY');assert.equal(s.editorialApproval,false);assert.equal(s.rights.kind,'ORIGINAL_DRAFT');
  assert.equal(s.domain,'G05');assert.equal(s.version,1);assert.deepEqual(s.paragraphs.map(p=>p.id),['p1','p2','p3']);
  assert.deepEqual(s.contrasts.map(x=>x.id),['c1','c2','c3']);
  for(const x of s.contrasts){families.add(x.family);assert.equal(s.paragraphs.find(p=>p.id===x.paragraphId)?.text.includes(x.quote),true);assert.deepEqual(x.options.map(o=>o.id),['A','B']);assert.ok(x.model.length>25&&x.reason.length>25);}
 }
 assert.ok(families.has('KI_REPORT'));assert.ok(families.has('KII_COUNTERFACTUAL'));assert.ok(families.has('PASSIVE_STATE'));assert.ok(families.has('TEMPORAL'));assert.ok(families.size>=8);
 assert.ok(!allItems.some(x=>x.skillId.startsWith('G05.')||x.id.startsWith('SG-G05-')),'no silent grade/mastery evidence');
});
test('immutable first interpretation stores canonical source and initial reading without scoring',()=>{
 const e=first();assert.equal(e.id,modalityId(c.id));assert.equal(isModalityEntry(e),true);assert.equal(e.evaluated,'UNASSESSED');
 assert.deepEqual(firstInterpretation(e),{contrastId:'c1',optionId:'A',paragraphId:'p1'});
 assert.equal(sourceForModality(e)?.id,c.id);assert.equal(nextModalityContrast(c,e)?.id,'c2');
 assert.equal(recordedContrast(e,c.contrasts[0])?.text,e.original);
 assert.equal(archiveKind(e),'G05_MODALITY');assert.equal(archiveRow(e).scope,'G05');
 assert.throws(()=>modalityFirst(c,'c2','A','Text',at),/unvollständig/);
 assert.throws(()=>modalityFirst(c,'c1','C','Text',at),/unvollständig/);
 assert.throws(()=>modalityFirst(c,'c1','A',' ',at),/unvollständig/);
});
test('consecutive contrast responses preserve non-preferred selections as ungraded learner evidence',()=>{
 const e=first();
 assert.throws(()=>modalityContrastRevision(e,c,'c3','A','x','y','bad',at+1),/unvollständig/);
 assert.throws(()=>modalityContrastRevision(e,c,'c2','C','x','y','bad',at+1),/unvollständig/);
 assert.throws(()=>modalityContrastRevision(e,c,'c2','A','x',' ','bad',at+1),/unvollständig/);
 const second=step2(e);
 assert.equal(e.revisions.length,0);assert.equal(second.original,e.original);assert.equal(second.decisionId,e.decisionId);
 assert.deepEqual(recordedContrast(second,c.contrasts[1])?.optionId,'B');
 assert.equal(second.revisions[0].questionId,'CONTRAST:c2');assert.deepEqual(second.revisions[0].selfChecks,['B']);
 assert.equal(nextModalityContrast(c,second)?.id,'c3');
 assert.throws(()=>modalityContrastRevision(second,c,'c2','A','x','y','bad',at+2),/unvollständig/);
 const third=step3(second);assert.equal(nextModalityContrast(c,third),null);assert.equal(lastModalityOutput(third),null);
});
test('independent output requires all contrasts, source reference and rationale; revisions cannot overwrite history',()=>{
 const e=step3(),written=transfer(e);
 assert.equal(e.revisions.length,2);assert.equal(written.revisions.length,3);assert.equal(written.revisions[2].questionId,'TRANSFER');assert.equal(written.revisions[2].paragraphId,'p3');
 assert.equal(lastModalityOutput(written)?.text,written.revisions[2].text);
 assert.throws(()=>modalityWrittenRevision(first(),c,'TRANSFER','Text','Grund','p1','bad',at+4),/unvollständig/);
 assert.throws(()=>modalityWrittenRevision(e,c,'REWRITE','Text','Grund','p1','bad',at+4),/unvollständig/);
 assert.throws(()=>modalityWrittenRevision(written,c,'TRANSFER','Nochmals','Grund','p1','bad',at+4),/unvollständig/);
 assert.throws(()=>modalityWrittenRevision(written,c,'REWRITE',written.revisions[2].text,'Grund','p1','bad',at+4),/unvollständig/);
 assert.throws(()=>modalityWrittenRevision(written,c,'REWRITE','Neu','Grund','p9','bad',at+4),/unvollständig/);
 const revised=modalityWrittenRevision(written,c,'REWRITE',written.revisions[2].text+' Die Freigabe steht noch aus.','Die Aussage wird ausdrücklich begrenzt.','p1','rv1',at+4);
 assert.equal(revised.original,e.original);assert.deepEqual(revised.revisions.slice(0,3),written.revisions);
 assert.equal(revised.revisions[3].questionId,'REWRITE');assert.equal(revised.evaluated,'UNASSESSED');
 assert.equal(archiveRows([revised],{kind:'G05_MODALITY',activity:'REVISED',period:'ALL',search:'Die Freigabe',now:at+5}).length,1);
});
test('progress is activity-only, no implied certification, and next case stays explicit',()=>{
 assert.deepEqual(modalityProgress([]),{started:0,contrasts:0,finished:0,revised:0,total:6});
 assert.equal(nextModalityCase([]).id,c.id);assert.deepEqual(modalityProgress([first()]),{started:1,contrasts:1,finished:0,revised:0,total:6});
 assert.equal(nextModalityCase([first()]).id,c.id);
 assert.deepEqual(modalityProgress([step3()]),{started:1,contrasts:3,finished:0,revised:0,total:6});
 assert.deepEqual(modalityProgress([transfer()]),{started:1,contrasts:3,finished:1,revised:0,total:6});
 assert.equal(nextModalityCase([transfer()]).id,modalityCases[1].id);
});
test('original backup v3 integrity retains ungraded G05 first choice and every append-only source link',async()=>{
 const e=transfer(),records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[e],missions:[]};
 const text=await buildPortableBackup(records);
 const imported=await inspectPortableBackup(text);assert.equal(imported.version,BACKUP_VERSION);
 assert.deepEqual(imported.records.productionEntries,[e]);
 const tampered=text.replace(e.original,'Gefälschte Aussage');
 await assert.rejects(()=>inspectPortableBackup(tampered),/Integritätsprüfung/);
});
test('G05 draft source and each authored contrast remain explicitly unapproved in original editorial worklist',()=>{
 const editorial=collect().filter(x=>x.mode==='G05');
 assert.equal(editorial.length,24);
 assert.ok(editorial.every(x=>x.independentEditorialApproval===false&&x.status==='DEMO_ONLY'));
 assert.equal(editorial.filter(x=>x.type==='G05_AUTHOR_CONTRAST').length,18);
});
