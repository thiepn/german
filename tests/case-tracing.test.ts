import test from 'node:test';import assert from 'node:assert/strict';
import {caseStudies,caseStudyId,isCaseStudyEntry,sourceForCaseStudy,firstCaseEvidence,recordedCaseRepair,nextCaseRepair,caseStudyFirst,appendCaseRepair,appendCaseTransfer,latestCaseTransfer,caseStudyProgress,nextCaseStudy,caseRoles} from '../src/domain/caseTracing/caseTracing.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {allItems} from '../src/domain/content/registry.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
const s=caseStudies[0],at=Date.UTC(2026,9,23,14);
const first=()=>caseStudyFirst(s,'r1','AKKUSATIV','auf den vorläufigen Bericht','Die Verbindung „sich auf etwas stützen“ regiert den Akkusativ und das Adjektiv endet auf -en.',at);
const second=(e=first())=>appendCaseRepair(e,s,'r2','DATIV','dem zuständigen Kollegen','Der Empfänger steht im Dativ; Kollege hat n-Deklination.','r2-id',at+1);
const third=(e=second())=>appendCaseRepair(e,s,'r3','GENITIV','Wegen der unerwartet hohen Kosten','Die Pluralgruppe verlangt nach „wegen“ den Genitiv mit „der“.','r3-id',at+2);
const output=(e=third())=>appendCaseTransfer(e,s,'TRANSFER','Das Team stützt sich auf den aktuellen Bericht der Expertinnen. Wegen der erheblich gestiegenen Kosten wird die Vergabe vertagt.','Die Präposition „auf“ folgt auf „sich stützen“ und „wegen“ regiert hier den Genitiv.','p1','transfer-id',at+3);
test('six independent original case dossiers cover eighteen anchored repairs and several inflection families',()=>{
 assert.equal(caseStudies.length,6);assert.equal(new Set(caseStudies.map(c=>c.id)).size,6);
 const families=new Set(),roles=new Set(),ids=new Set();
 for(const c of caseStudies){
  assert.match(c.id,/^SG-G02-\d{3}$/);assert.equal(c.version,1);assert.equal(c.domain,'G02');
  assert.equal(c.editorialApproval,false);assert.equal(c.status,'DEMO_ONLY');assert.equal(c.rights.kind,'ORIGINAL_DRAFT');
  assert.deepEqual(c.paragraphs.map(p=>p.id),['p1','p2','p3']);assert.deepEqual(c.repairs.map(p=>p.id),['r1','r2','r3']);
  for(const r of c.repairs){
   assert.ok(!ids.has(c.id+':'+r.id));ids.add(c.id+':'+r.id);
   assert.ok(c.paragraphs.find(p=>p.id===r.paragraphId)?.text.includes(r.quote));
   assert.notEqual(r.quote,r.solution);assert.ok(r.explanation.length>70&&r.governor.length>10);
   roles.add(r.role);families.add(r.family);
  }
 }
 assert.equal(ids.size,18);assert.ok(families.size>=8);assert.deepEqual([...roles].sort(),[...caseRoles].sort());
 assert.ok(!allItems.some(x=>x.id.startsWith('SG-G02-')));assert.ok(allItems.some(x=>x.mode==='M02'));
});
test('immutable first analysis retains source, specific case, paragraph, free text and rationale without a grade',()=>{
 const e=first();assert.equal(e.id,caseStudyId(s.id));assert.equal(isCaseStudyEntry(e),true);assert.equal(e.evaluated,'UNASSESSED');
 assert.equal(sourceForCaseStudy(e)?.id,s.id);assert.deepEqual(firstCaseEvidence(e),{repairId:'r1',paragraphId:'p1',role:'AKKUSATIV',text:'auf den vorläufigen Bericht',reason:'Die Verbindung „sich auf etwas stützen“ regiert den Akkusativ und das Adjektiv endet auf -en.'});
 assert.equal(recordedCaseRepair(e,s.repairs[0])?.original,true);assert.equal(nextCaseRepair(s,e)?.id,'r2');
 assert.equal(archiveKind(e),'G02_CASE_TRACING');assert.equal(archiveRow(e).scope,'G02');
 assert.throws(()=>caseStudyFirst(s,'r2','DATIV','Text','Grund',at),/unvollständig/);
 assert.throws(()=>caseStudyFirst(s,'r1','UNGÜLTIG' as never,'Text','Grund',at),/unvollständig/);
 assert.throws(()=>caseStudyFirst(s,'r1','AKKUSATIV',s.repairs[0].quote,'Grund',at),/unvollständig/);
 assert.throws(()=>caseStudyFirst(s,'r1','AKKUSATIV','Korrigiert',' ',at),/unvollständig/);
 assert.equal(firstCaseEvidence({...e,sourceId:'invalid'}),null);
});
test('case repair stages are sequential append-only; even an incorrect self-selected case is ungraded',()=>{
 const e=first();
 assert.throws(()=>appendCaseRepair(e,s,'r3','GENITIV','Text','Grund','out-of-order',at+1),/unvollständig/);
 assert.throws(()=>appendCaseRepair(e,s,'r2','DATIV','Text',' ','empty',at+1),/unvollständig/);
 const mistaken=appendCaseRepair(e,s,'r2','AKKUSATIV','dem zuständigen Kollegen','Nach der Regel der Empfängerzuordnung.','wrong-role',at+1);
 assert.equal(recordedCaseRepair(mistaken,s.repairs[1])?.role,'AKKUSATIV');assert.equal(mistaken.evaluated,'UNASSESSED');
 const two=second(e),three=third(two);
 assert.equal(e.revisions.length,0);assert.equal(two.original,e.original);assert.equal(two.decisionId,e.decisionId);
 assert.equal(two.revisions[0].questionId,'REPAIR:r2');assert.equal(nextCaseRepair(s,two)?.id,'r3');assert.equal(nextCaseRepair(s,three),null);
 assert.throws(()=>appendCaseRepair(two,s,'r2','DATIV','Text','Grund','repeat',at+2),/unvollständig/);
 assert.equal(three.revisions.length,2);assert.equal(latestCaseTransfer(three),null);
});
test('independent source-linked transfer and rewrite are immutable distinct writing stages',()=>{
 const e=third(),written=output(e);assert.equal(e.revisions.length,2);assert.equal(written.revisions.length,3);assert.equal(written.revisions[2].questionId,'TRANSFER');
 assert.deepEqual(written.revisions.slice(0,2),e.revisions);assert.equal(written.original,e.original);
 assert.throws(()=>appendCaseTransfer(first(),s,'TRANSFER','Ein ausreichender Satz mit einem ausführlichen Inhalt.','Grund','p1','bad',at+4),/unvollständig/);
 assert.throws(()=>appendCaseTransfer(e,s,'REWRITE','Ein ausreichender Satz mit einem ausführlichen Inhalt.','Grund','p1','bad',at+4),/unvollständig/);
 assert.throws(()=>appendCaseTransfer(written,s,'TRANSFER','Ein ausreichender Satz mit einem ausführlichen Inhalt.','Grund','p1','bad',at+4),/unvollständig/);
 assert.throws(()=>appendCaseTransfer(written,s,'REWRITE',written.revisions[2].text,'Grund','p1','bad',at+4),/unvollständig/);
 const revised=appendCaseTransfer(written,s,'REWRITE',written.revisions[2].text+' Die erneute Prüfung steht noch aus.','Die Ergänzung begrenzt den Befund.','p2','new',at+4);
 assert.equal(revised.revisions.length,4);assert.deepEqual(revised.revisions.slice(0,3),written.revisions);
 assert.equal(versionPair(revised,3)?.previous,written.revisions[2].text);
 assert.equal(archiveRows([revised],{kind:'G02_CASE_TRACING',activity:'REVISED',period:'ALL',search:'erneute Prüfung',now:at+5}).length,1);
});
test('activity progression is separate from existing M02 scoring and picks incomplete case first',()=>{
 assert.deepEqual(caseStudyProgress([]),{started:0,repairs:0,transferred:0,rewritten:0,total:6});
 assert.equal(nextCaseStudy([]).id,s.id);
 assert.deepEqual(caseStudyProgress([first()]),{started:1,repairs:1,transferred:0,rewritten:0,total:6});
 assert.deepEqual(caseStudyProgress([third()]),{started:1,repairs:3,transferred:0,rewritten:0,total:6});
 assert.deepEqual(caseStudyProgress([output()]),{started:1,repairs:3,transferred:1,rewritten:0,total:6});
 assert.equal(nextCaseStudy([first()]).id,s.id);assert.equal(nextCaseStudy([output()]).id,caseStudies[1].id);
});
test('existing eight-store backup v3 preserves source, repair decisions and append-only text',async()=>{
 const e=output(),records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[e],missions:[]};
 const packed=await buildPortableBackup(records);const restored=await inspectPortableBackup(packed);
 assert.equal(restored.version,BACKUP_VERSION);assert.deepEqual(restored.records.productionEntries,[e]);
 await assert.rejects(()=>inspectPortableBackup(packed.replace('auf den vorläufigen Bericht','gefälschte Lernerspur')),/Integritätsprüfung/);
});
test('case source and each repair have independent unapproved editorial dossiers',()=>{
 const queue=collect().filter(x=>x.mode==='G02');
 assert.equal(queue.length,24);assert.equal(queue.filter(x=>x.type==='G02_ORIGINAL_SOURCE').length,6);
 assert.equal(queue.filter(x=>x.type==='G02_GOVERNED_REPAIR').length,18);
 assert.ok(queue.every(x=>x.independentEditorialApproval===false&&x.status==='DEMO_ONLY'));
});
