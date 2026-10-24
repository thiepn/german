import test from 'node:test';
import assert from 'node:assert/strict';
import {focusStudies,focusEntryId,isFocusEntry,focusSource,beginFocus,appendFocusContrast,appendFocusTransfer,firstFocusResponse,savedFocusContrast,nextFocusContrast,latestFocusTransfer,nextFocusStudy,focusProgress} from '../src/domain/focus/focus.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {allItems} from '../src/domain/content/registry.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';

const study=focusStudies[0],at=Date.UTC(2026,9,23,14);
const originalSentence='Der Ausschuss begann die Abstimmung keinesfalls am ursprünglich angekündigten Montag, sondern erst nach der unabhängigen Stellungnahme.';
const first=()=>beginFocus(study,'c1','A',originalSentence,'Der korrigierte Zeitpunkt wird durch „erst nach“ zum kontrastiven Fokus.',at);
const second=(entry=first())=>appendFocusContrast(entry,study,'c2','A','Im Unterschied zum bereits vorliegenden ersten Nachweis forderte die Prüfstelle den zweiten erst am Montag an.','Die Unterlagen stehen im thematischen Kontrast; der zweite Nachweis ist noch nicht rechtzeitig vorhanden.','contrast2',at+1);
const third=(entry=second())=>appendFocusContrast(entry,study,'c3','B','Die Zustimmung war bis zum Termin noch unvollständig; einige Unterschriften standen noch aus.','Nicht alle bedeutet nicht, dass überhaupt keine Person zugestimmt hätte.','contrast3',at+2);
const ownText='Erst nachdem die externe Stellungnahme eingegangen war, begann die Kommission die Abstimmung. Den zweiten Nachweis verlangte die Prüfstelle erst am Montag; die Zustimmung aller Beteiligten lag zum Sitzungstermin weiterhin nicht vor.';
const written=(entry=third())=>appendFocusTransfer(entry,study,'TRANSFER',ownText,'Das Vorfeld korrigiert den Zeitpunkt, das Objekt knüpft an den Nachweiskontrast an und „nicht alle“ vermeidet eine unbelegte Totalverneinung.','p3','transfer',at+3);

test('six G04 studies and 18 independently authored paragraph-anchored contrasts cover topic, focus and scope',()=>{
 assert.equal(focusStudies.length,6);assert.equal(new Set(focusStudies.map(x=>x.id)).size,6);
 const families=new Set(),bands=new Set(),chosen=new Set(),allIds=new Set();
 for(const s of focusStudies){
  assert.match(s.id,/^SG-G04-\d{3}$/);assert.equal(s.version,1);assert.equal(s.domain,'G04');
  assert.equal(s.status,'DEMO_ONLY');assert.equal(s.editorialApproval,false);assert.equal(s.reviewedBy,null);assert.equal(s.rights.kind,'ORIGINAL_DRAFT');
  bands.add(s.band);assert.deepEqual(s.paragraphs.map(p=>p.id),['p1','p2','p3']);assert.deepEqual(s.contrasts.map(c=>c.id),['c1','c2','c3']);
  assert.ok(s.paragraphs.every(p=>p.text.length>150));
  for(const c of s.contrasts){
   assert.ok(!allIds.has(s.id+':'+c.id));allIds.add(s.id+':'+c.id);
   assert.equal(s.paragraphs.find(p=>p.id===c.paragraphId)?.text.includes(c.quote),true);
   assert.ok(c.explanation.length>100&&c.model.length>25);assert.ok(c.repairPrompt.length>20);
   assert.deepEqual(c.options.map(o=>o.id),['A','B']);assert.notEqual(c.options[0].text,c.options[1].text);
   assert.ok(c.options.some(o=>o.id===c.preferredId));chosen.add(c.preferredId);families.add(c.family);
  }
 }
 assert.equal(allIds.size,18);assert.equal(families.size,18);assert.deepEqual([...bands].sort(),['C1','C2']);
 assert.deepEqual([...chosen].sort(),['A','B']);
 assert.ok(!allItems.some(x=>x.id.startsWith('SG-G04-')));
 assert.ok(allItems.some(x=>x.mode==='M04'),'original graded sentence engine still owns M04');
});
test('first independent rewrite is immutable source-linked ungraded evidence',()=>{
 const e=first();assert.equal(e.id,focusEntryId(study.id));assert.equal(e.kind,'FOCUS_STUDY');assert.equal(e.itemVersion,1);
 assert.equal(e.sourceId,study.id);assert.equal(e.evaluated,'UNASSESSED');assert.ok(isFocusEntry(e));assert.equal(focusSource(e)?.id,study.id);
 assert.deepEqual(firstFocusResponse(e),{contrastId:'c1',paragraphId:'p1',choice:'A',rewrite:originalSentence,reason:'Der korrigierte Zeitpunkt wird durch „erst nach“ zum kontrastiven Fokus.',initial:true});
 assert.deepEqual(savedFocusContrast(e,study.contrasts[0]),firstFocusResponse(e));
 assert.equal(nextFocusContrast(study,e)?.id,'c2');assert.equal(archiveKind(e),'G04_FOCUS');assert.equal(archiveRow(e).scope,'G04');
 assert.equal(firstFocusResponse({...e,sourceId:'different'}),null);
 assert.equal(firstFocusResponse({...e,decisionId:'c1|C|p1'}),null);
});
test('reject ungrounded, copied, unchanged, invalid and premature source reformulations',()=>{
 const c=study.contrasts[0];
 assert.throws(()=>beginFocus(study,'c2','A',originalSentence,'Richtige Begründung zur Umformung.',at),/erforderlich/);
 assert.throws(()=>beginFocus(study,'c1','Z' as never,originalSentence,'Richtige Begründung zur Umformung.',at),/erforderlich/);
 assert.throws(()=>beginFocus(study,'c1','A',c.quote,'Richtige Begründung zur Umformung.',at),/erforderlich/);
 assert.throws(()=>beginFocus(study,'c1','A',c.options[0].text,'Richtige Begründung zur Umformung.',at),/erforderlich/);
 assert.throws(()=>beginFocus(study,'c1','A',originalSentence,' ',at),/erforderlich/);
 assert.throws(()=>beginFocus(study,'c1','A','Zu kurz.','Richtige Begründung zur Umformung.',at),/erforderlich/);
 assert.throws(()=>appendFocusContrast(first(),study,'c3','B','Eine lange eigenständige Reformulierung mit neuer Schwerpunktsetzung.','Ausführliche Begründung.','early',at+1),/unvollständig/);
 assert.throws(()=>appendFocusContrast(first(),study,'c2','B',study.contrasts[1].options[1].text,'Ausführliche Begründung.','copied',at+1),/unvollständig/);
});
test('consecutive frame interpretations retain author-unpreferred choices without grading or mutating earlier events',()=>{
 const e=first(),wrong=second(e);assert.equal(wrong.evaluated,'UNASSESSED');
 assert.equal(savedFocusContrast(wrong,study.contrasts[1])?.choice,'A');assert.equal(study.contrasts[1].preferredId,'B');
 assert.equal(e.revisions.length,0);assert.equal(wrong.original,e.original);
 assert.equal(wrong.decisionId,e.decisionId);assert.equal(wrong.revisions[0].questionId,'CONTRAST:c2');
 assert.deepEqual(wrong.revisions[0].selfChecks,['A']);assert.equal(wrong.revisions[0].paragraphId,'p2');
 assert.equal(nextFocusContrast(study,wrong)?.id,'c3');
 assert.throws(()=>appendFocusContrast(wrong,study,'c2','B','Eine lange eigenständige Reformulierung als Zweitantwort.','Ausführliche Begründung.','duplicate',at+2),/unvollständig/);
 const end=third(wrong);assert.equal(end.revisions.length,2);assert.equal(nextFocusContrast(study,end),null);
});
test('independent transfer requires all three saved contrasts and qualified source/rationale; rewrite only appends',()=>{
 const initial=third(),e=written(initial);
 assert.equal(initial.revisions.length,2);assert.equal(e.revisions.length,3);
 assert.equal(e.revisions[2].questionId,'TRANSFER');assert.equal(e.revisions[2].paragraphId,'p3');
 assert.deepEqual(e.revisions.slice(0,2),initial.revisions);assert.equal(e.original,initial.original);
 assert.throws(()=>appendFocusTransfer(first(),study,'TRANSFER',ownText,'Eine ausführliche Begründung zur Stellung der Angaben.','p1','bad',at+4),/unvollständig/);
 assert.throws(()=>appendFocusTransfer(initial,study,'REWRITE',ownText,'Eine ausführliche Begründung zur Stellung der Angaben.','p1','bad',at+4),/unvollständig/);
 assert.throws(()=>appendFocusTransfer(e,study,'TRANSFER',ownText+' Eine zweite Fassung.','Eine ausführliche Begründung zur Stellung der Angaben.','p1','bad',at+4),/unvollständig/);
 assert.throws(()=>appendFocusTransfer(e,study,'REWRITE',ownText,'Eine ausführliche Begründung zur Stellung der Angaben.','p1','unchanged',at+4),/unvollständig/);
 assert.throws(()=>appendFocusTransfer(e,study,'REWRITE',ownText+' Ein weiterer Satz.','Eine ausführliche Begründung zur Stellung der Angaben.','p9','bad-source',at+4),/unvollständig/);
 const updated=appendFocusTransfer(e,study,'REWRITE',ownText+' Die Entscheidung blieb somit ausdrücklich von der zusätzlichen Prüfung abhängig.','Das neue Nachfeld erläutert die zeitliche Grenze, ohne eine Entscheidung als bereits getroffen darzustellen.','p1','revised',at+4);
 assert.equal(updated.evaluated,'UNASSESSED');assert.equal(updated.revisions.length,4);
 assert.deepEqual(updated.revisions.slice(0,3),e.revisions);assert.equal(updated.original,e.original);
 assert.equal(versionPair(updated,3)?.previous,e.revisions[2].text);
 assert.equal(archiveRows([updated],{kind:'G04_FOCUS',activity:'REVISED',period:'ALL',search:'zusätzlichen Prüfung',now:at+5}).length,1);
});
test('progress counts observed activity only without altering M04 mastery authority',()=>{
 assert.deepEqual(focusProgress([]),{started:0,contrasts:0,transfers:0,rewrites:0,total:6});
 assert.deepEqual(focusProgress([first()]),{started:1,contrasts:1,transfers:0,rewrites:0,total:6});
 assert.deepEqual(focusProgress([third()]),{started:1,contrasts:3,transfers:0,rewrites:0,total:6});
 assert.deepEqual(focusProgress([written()]),{started:1,contrasts:3,transfers:1,rewrites:0,total:6});
 assert.equal(nextFocusStudy([]).id,study.id);assert.equal(nextFocusStudy([first()]).id,study.id);
 assert.equal(nextFocusStudy([written()]).id,focusStudies[1].id);
});
test('v3 portable backup retains source IDs, first ungraded wording and append-only decisions with tamper detection',async()=>{
 const e=written(),records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[e],missions:[]};
 const backup=await buildPortableBackup(records),restored=await inspectPortableBackup(backup);
 assert.equal(restored.version,BACKUP_VERSION);assert.deepEqual(restored.records.productionEntries,[e]);
 assert.ok(backup.includes('Der Ausschuss begann die Abstimmung'));
 await assert.rejects(()=>inspectPortableBackup(backup.replace('Der Ausschuss begann die Abstimmung','Das Gremium führte eine Abstimmung')),/Integritätsprüfung/);
});
test('every new original source and contrast is an independent unapproved editorial dossier',()=>{
 const q=collect().filter(x=>x.mode==='G04_FOCUS');
 assert.equal(q.length,24);assert.equal(q.filter(x=>x.type==='G04_ORIGINAL_SOURCE').length,6);
 assert.equal(q.filter(x=>x.type==='G04_DISCOURSE_CONTRAST').length,18);
 assert.ok(q.every(x=>x.status==='DEMO_ONLY'&&x.independentEditorialApproval===false));
 assert.ok(q.some(x=>x.options?.[0]?.text&&x.model),'human review has both contrast wording and authored feedback');
});
