import test from 'node:test';
import assert from 'node:assert/strict';
import {phraseologyStudies,phraseologyEntryId,isPhraseologyEntry,phraseologySource,independentPhraseologyText,beginPhraseology,appendPhraseologyDecision,appendPhraseologyTransfer,firstPhraseologyEvidence,savedPhraseologyDecision,nextPhraseologyDecision,latestPhraseologyTransfer,phraseologyProgress,nextPhraseologyStudy} from '../src/domain/phraseology/phraseology.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {allItems} from '../src/domain/content/registry.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';

const study=phraseologyStudies[0],at=Date.UTC(2026,9,23,12);
const ownFirst='Die Referentin stellte eine zusätzliche Förderung lediglich als mögliche Unterstützung dar, deren tatsächliche Höhe erst noch geprüft werden muss.';
const firstReason='Die geplante Hilfe ist lediglich in Aussicht gestellt; eine feste Zusage und eine verbuchte Einnahme wären nicht belegt.';
const first=()=>beginPhraseology(study,'d1','A',ownFirst,firstReason,at);
const second=(entry=first())=>appendPhraseologyDecision(entry,study,'d2','A','Die Geschäftsstelle bestätigte den Eingang der Hinweise, übernahm ihre Einschätzung damit aber nicht als eigene Position.','Kenntnisnahme ist keine Billigung. Eine inhaltliche Übernahme durch die Geschäftsstelle wird ausdrücklich nicht behauptet.','d2',at+1);
const third=(entry=second())=>appendPhraseologyDecision(entry,study,'d3','A','Die Projektgruppe erhob Einwände gegen den Zeitplan; eine neue Terminentscheidung war noch nicht getroffen worden.','Das Anmelden von Vorbehalten bedeutet gerade nicht, dass diese Bedenken bereits ausgeräumt wären.','d3',at+2);
const ownText='Die Referentin stellte einen weiteren Zuschuss in Aussicht, nannte aber keine verbindliche Summe. Die Geschäftsstelle nahm die schriftlichen Hinweise zur Kenntnis, ohne sie zu bestätigen. Die Projektgruppe meldete anschließend Bedenken gegen den Zeitplan an; die Terminfrage blieb deshalb offen.';
const transfer=(entry=third())=>appendPhraseologyTransfer(entry,study,'TRANSFER',ownText,'Die Aussicht ist keine verbindliche Förderzusage, die Kenntnisnahme keine inhaltliche Zustimmung und das Anmelden von Bedenken noch nicht deren Ausräumung.','p3','transfer',at+3);

test('six original sustained C1/C2 G07 dossiers contain eighteen distinct grounded idiomatic action contrasts',()=>{
 assert.equal(phraseologyStudies.length,6);
 assert.equal(new Set(phraseologyStudies.map(s=>s.id)).size,6);
 const bands=new Set(),families=new Set(),choices=new Set(),ids=new Set();
 for(const s of phraseologyStudies){
  assert.match(s.id,/^SG-G07-\d{3}$/);assert.equal(s.version,1);assert.equal(s.domain,'G07');
  assert.equal(s.status,'DEMO_ONLY');assert.equal(s.editorialApproval,false);assert.equal(s.reviewedBy,null);assert.equal(s.rights.kind,'ORIGINAL_DRAFT');
  bands.add(s.band);assert.deepEqual(s.paragraphs.map(p=>p.id),['p1','p2','p3']);
  assert.ok(s.paragraphs.every(p=>p.text.length>=180));assert.deepEqual(s.decisions.map(d=>d.id),['d1','d2','d3']);
  for(const d of s.decisions){
   assert.equal(s.paragraphs.find(p=>p.id===d.paragraphId)?.text.includes(d.quote),true);
   assert.ok(d.explanation.length>=125&&d.repairPrompt.length>=35&&d.analysis.length>=30);
   assert.notEqual(d.quote,d.alternate);
   assert.deepEqual(d.options.map(o=>o.id),['A','B']);assert.notEqual(d.options[0].text,d.options[1].text);
   assert.ok(d.options.some(o=>o.id===d.preferredId));
   assert.ok(!ids.has(s.id+':'+d.id));ids.add(s.id+':'+d.id);families.add(d.family);choices.add(d.preferredId);
  }
 }
 assert.equal(ids.size,18);assert.equal(families.size,18);
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.deepEqual([...choices].sort(),['A','B']);
 assert.ok(!allItems.some(x=>x.id.startsWith('SG-G07-')),'new work is not injected into auto-graded M05 exercises');
 assert.ok(allItems.some(x=>x.mode==='M05'),'original M05 stays the only graded collocation owner');
});

test('the first source decision is immutable, choice-anchored, paragraph-anchored and ungraded',()=>{
 const e=first();
 assert.ok(isPhraseologyEntry(e));assert.equal(e.id,phraseologyEntryId(study.id));assert.equal(e.kind,'PHRASEOLOGY_STUDY');
 assert.equal(e.sourceId,study.id);assert.equal(e.itemVersion,1);assert.equal(e.evaluated,'UNASSESSED');assert.equal(phraseologySource(e)?.id,study.id);
 assert.deepEqual(firstPhraseologyEvidence(e),{decisionId:'d1',paragraphId:'p1',choice:'A',rewrite:ownFirst,limit:firstReason,initial:true});
 assert.deepEqual(savedPhraseologyDecision(e,study.decisions[0]),firstPhraseologyEvidence(e));
 assert.equal(archiveKind(e),'G07_PHRASEOLOGY');assert.equal(archiveRow(e).scope,'G07');
 assert.equal(nextPhraseologyDecision(study,e)?.id,'d2');
 assert.equal(firstPhraseologyEvidence({...e,sourceId:'withdrawn'}),null);
 assert.equal(firstPhraseologyEvidence({...e,decisionId:'d1|C|p1'}),null);
});

test('independent idiomatic paraphrases reject source copying, invalid choices, missing rationale and skipped anchors',()=>{
 const d=study.decisions[0];
 assert.equal(independentPhraseologyText(d,d.quote),false);
 assert.equal(independentPhraseologyText(d,d.alternate),false);
 assert.equal(independentPhraseologyText(d,ownFirst),true);
 assert.throws(()=>beginPhraseology(study,'d2','A',ownFirst,firstReason,at),/erforderlich/);
 assert.throws(()=>beginPhraseology(study,'d1','C' as never,ownFirst,firstReason,at),/erforderlich/);
 assert.throws(()=>beginPhraseology(study,'d1','A',d.quote,firstReason,at),/erforderlich/);
 assert.throws(()=>beginPhraseology(study,'d1','A',d.alternate,firstReason,at),/erforderlich/);
 assert.throws(()=>beginPhraseology(study,'d1','A',ownFirst,'Zu kurz.',at),/erforderlich/);
 assert.throws(()=>appendPhraseologyDecision(first(),study,'d3','A',ownFirst,firstReason,'early',at+1),/fehlt/);
 assert.throws(()=>appendPhraseologyDecision(first(),study,'d2','B',study.decisions[1].quote,firstReason,'copy',at+1),/fehlt/);
});

test('ordered decisions retain deliberately unpreferred interpretations as learner evidence, not scores',()=>{
 const initial=first(),two=second(initial);
 assert.equal(two.evaluated,'UNASSESSED');assert.equal(study.decisions[1].preferredId,'B');
 assert.equal(savedPhraseologyDecision(two,study.decisions[1])?.choice,'A');
 assert.equal(initial.revisions.length,0);assert.equal(two.original,initial.original);assert.equal(two.decisionId,initial.decisionId);
 assert.equal(two.revisions[0].questionId,'DECISION:d2');assert.equal(two.revisions[0].paragraphId,'p2');
 assert.deepEqual(two.revisions[0].selfChecks,['A']);
 assert.throws(()=>appendPhraseologyDecision(two,study,'d2','B',ownFirst,firstReason,'duplicate',at+2),/fehlt/);
 const complete=third(two);assert.equal(complete.revisions.length,2);
 assert.equal(nextPhraseologyDecision(study,complete),null);assert.equal(latestPhraseologyTransfer(complete),null);
});

test('independent source transfer and real rewriting append only after all evidence, preserving all prior history',()=>{
 const initial=third(),firstTransfer=transfer(initial);
 assert.equal(initial.revisions.length,2);assert.equal(firstTransfer.revisions.length,3);
 assert.equal(firstTransfer.revisions[2].questionId,'TRANSFER');assert.equal(firstTransfer.revisions[2].paragraphId,'p3');
 assert.deepEqual(firstTransfer.revisions.slice(0,2),initial.revisions);
 assert.throws(()=>appendPhraseologyTransfer(first(),study,'TRANSFER',ownText,firstReason,'p1','early',at+3),/unvollständig/);
 assert.throws(()=>appendPhraseologyTransfer(initial,study,'REWRITE',ownText,firstReason,'p1','early',at+3),/unvollständig/);
 assert.throws(()=>appendPhraseologyTransfer(firstTransfer,study,'TRANSFER',ownText+' Eine weitere Aussage.',firstReason,'p1','duplicate',at+4),/unvollständig/);
 assert.throws(()=>appendPhraseologyTransfer(firstTransfer,study,'REWRITE',ownText,firstReason,'p1','same',at+4),/unvollständig/);
 assert.throws(()=>appendPhraseologyTransfer(firstTransfer,study,'REWRITE',ownText+' Ein Zusatz.',firstReason,'unknown','wrong-source',at+4),/unvollständig/);
 const revised=appendPhraseologyTransfer(firstTransfer,study,'REWRITE',ownText+' Die beantragte Förderung blieb ausdrücklich ohne verbindlichen Bescheid.','Der letzte Satz grenzt den Bearbeitungsstand ein und verhindert eine unbelegte Zusicherung.','p2','rewrite',at+4);
 assert.equal(revised.original,initial.original);assert.deepEqual(revised.revisions.slice(0,3),firstTransfer.revisions);
 assert.equal(revised.evaluated,'UNASSESSED');assert.equal(revised.revisions[3].questionId,'REWRITE');
 assert.equal(versionPair(revised,3)?.previous,firstTransfer.revisions[2].text);
 assert.equal(archiveRows([revised],{kind:'G07_PHRASEOLOGY',activity:'REVISED',period:'ALL',search:'ohne verbindlichen Bescheid',now:at+5}).length,1);
});

test('progress shows observed events only and chooses unfinished studies before unseen',()=>{
 assert.deepEqual(phraseologyProgress([]),{started:0,decisions:0,transferred:0,rewritten:0,total:6});
 assert.deepEqual(phraseologyProgress([first()]),{started:1,decisions:1,transferred:0,rewritten:0,total:6});
 assert.deepEqual(phraseologyProgress([third()]),{started:1,decisions:3,transferred:0,rewritten:0,total:6});
 assert.deepEqual(phraseologyProgress([transfer()]),{started:1,decisions:3,transferred:1,rewritten:0,total:6});
 assert.equal(nextPhraseologyStudy([]).id,study.id);assert.equal(nextPhraseologyStudy([first()]).id,study.id);
 assert.equal(nextPhraseologyStudy([transfer()]).id,phraseologyStudies[1].id);
});

test('portable backup version 3 roundtrips first evidence, version and revisions; tampering fails closed',async()=>{
 const e=transfer(),records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[e],missions:[]};
 const text=await buildPortableBackup(records),restored=await inspectPortableBackup(text);
 assert.equal(restored.version,BACKUP_VERSION);assert.deepEqual(restored.records.productionEntries,[e]);
 assert.ok(text.includes('Die Referentin stellte eine zusätzliche Förderung lediglich'));
 await assert.rejects(()=>inspectPortableBackup(text.replace('Die Referentin stellte eine zusätzliche Förderung lediglich','Die Referentin versprach eine zusätzliche Förderung verbindlich')),/Integritätsprüfung/);
});

test('all sources and contrasts remain independent, original and unapproved in editorial worklist',()=>{
 const q=collect().filter(x=>x.mode==='G07_PHRASEOLOGY');
 assert.equal(q.length,24);assert.equal(q.filter(x=>x.type==='G07_ORIGINAL_SOURCE').length,6);
 assert.equal(q.filter(x=>x.type==='G07_PHRASEOLOGY_CONTRAST').length,18);
 assert.ok(q.every(x=>x.status==='DEMO_ONLY'&&x.independentEditorialApproval===false));
 assert.ok(q.some(x=>x.quote&&x.alternate&&x.model&&x.options.length===2));
});
