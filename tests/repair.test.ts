import test from 'node:test';
import assert from 'node:assert/strict';
import {repairStudies,repairId,isRepairEntry,repairSource,independentRepair,beginRepair,appendRepairTurn,appendRepairSummary,firstRepairEvidence,savedRepairEvidence,nextRepairTurn,latestRepairSummary,repairProgress,nextRepairStudy} from '../src/domain/repair/repair.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry.ts';
const s=repairStudies[0],now=Date.UTC(2026,9,24,16);
const questions=[
'Ist der Freitag als verbindlicher Liefertermin zugesagt, oder gilt er nur unter der Voraussetzung, dass die interne Rechtsprüfung rechtzeitig abgeschlossen wird?',
'Bezieht sich Ihre vorläufig positive Einschätzung lediglich auf die gezeigte Struktur, oder liegt bereits eine schriftliche rechtliche Freigabe für alle Datenflüsse vor?',
'Soll die Finanzierung nur auf die Tagesordnung kommen, oder können Sie bereits eine formale Entscheidung oder die Bewilligung zusätzlicher Mittel bestätigen?'
];
const replies=[
'Wir können eine Lieferung am Freitag erst dann als verbindlich einplanen, wenn die Projektpartnerin nach abgeschlossener Rechtsprüfung die Daten ausdrücklich freigibt.',
'Solange Datenflüsse und Löschfristen nicht vollständig geprüft sind, behandeln wir die Äußerung nur als unverbindliche Ersteinschätzung und beantragen keine Produktivfreigabe.',
'Wir bereiten die Kostenübersicht und eine mögliche Gremienbefassung vor, ohne dies vor einer zuständigen Entscheidung als finanzierte Nutzerstudie zu kommunizieren.'
];
const limits=[
'Die Lieferung des Datensatzes bleibt ohne Rechtsprüfung und ausdrückliche Bestätigung offen; der Freitag ist als vorläufiger Zeitrahmen, nicht als zugesagtes Fälligkeitsdatum zu dokumentieren.',
'Die rechtliche Freigabe bleibt nach der ersten Sichtung des Schemas ausdrücklich offen. Auch über eine produktive Datenverarbeitung oder Veröffentlichung wurde nicht entschieden.',
'Die Mittel sind noch nicht bewilligt; das Gremium muss den Finanzierungsantrag getrennt beraten, und die Fakultätsvertretung hat keinen Förderbeschluss vorweggenommen.'
];
const first=()=>beginRepair(s,'r1','A',questions[0],replies[0],limits[0],now);
const second=(e=first())=>appendRepairTurn(e,s,'r2','B',questions[1],replies[1],limits[1],'r2',now+1);
const third=(e=second())=>appendRepairTurn(e,s,'r3','A',questions[2],replies[2],limits[2],'r3',now+2);
const summary='Im heutigen Koordinationstermin wurden drei Fragen behandelt, ohne dass alle damit verbundenen Entscheidungen bereits getroffen worden wären. Die Projektpartnerin hält eine Lieferung des Datensatzes bis Freitag nur unter der Voraussetzung einer erfolgreich abgeschlossenen Rechtsprüfung für möglich. Ein verbindlicher Termin ist daher noch zu bestätigen. Der Datenschutzbeauftragte äußerte gegen den vorgestellten schematischen Ansatz zunächst keinen Einwand, hat aber die konkreten Datenflüsse und die Löschfristen noch nicht vollständig geprüft. Eine formale Freigabe ist davon zu unterscheiden und wurde nicht ausgesprochen. Die Fakultätsvertretung regte an, die Finanzierung einer zusätzlichen Nutzerstudie im nächsten Gremium anzusprechen. Festgehalten wurde bislang nur die Vorbereitung einer Kostenübersicht. Zuständigkeits- und Terminfragen bleiben deshalb offen und sollen vor einer weiteren Veröffentlichung ausdrücklich geklärt werden.';
const reason='Die Aussagen betreffen drei unterschiedliche Verpflichtungsstufen: eine mögliche Lieferung, eine vorläufige Beurteilung und einen Vorschlag zur späteren Haushaltsbefassung. Keine darf als abgeschlossene Freigabe oder bewilligte Finanzierung ausgegeben werden.';
const transfer=(e=third())=>appendRepairSummary(e,s,'TRANSFER',summary,reason,'r1','transfer',now+3);
test('four original C1-C2 conversation dossiers have 12 distinct source-quoted clarification problems and DEMO_ONLY holds',()=>{
 assert.equal(repairStudies.length,4);const ids=new Set(),bands=new Set(),speakers=new Set();
 for(const x of repairStudies){assert.match(x.id,/^SG-G12R-\d{3}$/);assert.ok(!ids.has(x.id));ids.add(x.id);bands.add(x.band);assert.equal(x.status,'DEMO_ONLY');assert.equal(x.editorialApproval,false);assert.equal(x.authorship,'AI_DRAFT');assert.equal(x.rights.kind,'ORIGINAL_DRAFT');
 assert.equal(x.paragraphs.length,3);assert.equal(x.repairs.length,3);
 for(const t of x.repairs){assert.ok(x.paragraphs.find(p=>p.id===t.paragraphId)?.text.includes('„'+t.quote+'“'));speakers.add(t.speaker);}
 }assert.deepEqual([...bands].sort(),['C1','C2']);assert.ok(speakers.size>=10);assert.ok(!allItems.some(i=>i.id.startsWith('SG-G12R')));
});
test('first clarification retains immutable question, open commitment and original context without grading',()=>{
 const e=first();assert.equal(e.id,repairId(s.id));assert.ok(isRepairEntry(e));assert.equal(repairSource(e)?.id,s.id);assert.equal(e.evaluated,'UNASSESSED');
 assert.equal(firstRepairEvidence(e)?.clarification,questions[0]);assert.equal(firstRepairEvidence(e)?.paragraphId,'p1');assert.equal(nextRepairTurn(s,e)?.id,'r2');
 assert.equal(archiveKind(e),'G12_REPAIR');assert.equal(archiveRow(e).scope,'G12');
 assert.equal(firstRepairEvidence({...e,sourceId:'unknown'}),null);assert.equal(firstRepairEvidence({...e,decisionId:'r1|A|p3'}),null);
});
test('reject incomplete clarification, copied utterance, missing question mark, bad choice and out-of-order answers',()=>{
 const t=s.repairs[0];assert.equal(independentRepair(t,questions[0],replies[0],limits[0]),true);
 assert.equal(independentRepair(t,t.quote+'?',replies[0],limits[0]),false);
 assert.equal(independentRepair(t,questions[0].replace('?',''),replies[0],limits[0]),false);
 assert.equal(independentRepair(t,questions[0],t.quote,limits[0]),false);
 assert.throws(()=>beginRepair(s,'r3','A',questions[0],replies[0],limits[0],now),/fehlen/);
 assert.throws(()=>beginRepair(s,'r1','C' as never,questions[0],replies[0],limits[0],now),/fehlen/);
 assert.throws(()=>appendRepairTurn(first(),s,'r3','A',questions[2],replies[2],limits[2],'skip',now+1),/fehlt/);
});
test('second and third repairs stay tied to their own speakers and preserve the original first response',()=>{
 const e=first(),two=second(e),three=third(two);assert.equal(e.revisions.length,0);assert.equal(two.revisions.length,1);assert.equal(three.revisions.length,2);
 assert.equal(two.revisions[0].paragraphId,'p2');assert.equal(three.original,e.original);assert.equal(savedRepairEvidence(two,s.repairs[1])?.clarification,questions[1]);
 assert.equal(savedRepairEvidence(two,s.repairs[1])?.choice,'B');assert.equal(nextRepairTurn(s,three),null);
 assert.throws(()=>appendRepairTurn(two,s,'r2','B',questions[1],replies[1],limits[1],'duplicate',now+4),/fehlt/);
});
test('independent neutral summary is gated until all questions and later revisions preserve history',()=>{
 assert.throws(()=>appendRepairSummary(first(),s,'TRANSFER',summary,reason,'r1','early',now+3),/fehlt/);
 assert.throws(()=>appendRepairSummary(third(),s,'REWRITE',summary,reason,'r1','early',now+3),/fehlt/);
 assert.throws(()=>appendRepairSummary(third(),s,'TRANSFER',summary,'zu kurz','r1','early',now+3),/fehlt/);
 const e=transfer();assert.equal(latestRepairSummary(e)?.paragraphId,'p1');assert.throws(()=>appendRepairSummary(e,s,'REWRITE',summary,reason,'r1','same',now+4),/fehlt/);
 const revised=appendRepairSummary(e,s,'REWRITE',summary+' Für die nächste Sitzung sollte jede offene Entscheidung mit einer namentlichen Ansprechperson und einem noch zu bestätigenden Termin versehen werden.',reason,'r3','rewrite',now+4);
 assert.equal(revised.original,e.original);assert.deepEqual(revised.revisions.slice(0,3),e.revisions);assert.equal(versionPair(revised,3)?.previous,summary);
 assert.equal(archiveRows([revised],{kind:'G12_REPAIR',activity:'REVISED',period:'ALL',search:'Ansprechperson',now:now+5}).length,1);
});
test('observed progress is source-grounded and never claimed as CEFR proficiency credit',()=>{
 assert.deepEqual(repairProgress([]),{started:0,questions:0,transferred:0,revised:0,total:4});
 assert.deepEqual(repairProgress([first()]),{started:1,questions:1,transferred:0,revised:0,total:4});
 assert.deepEqual(repairProgress([third()]),{started:1,questions:3,transferred:0,revised:0,total:4});
 assert.deepEqual(repairProgress([transfer()]),{started:1,questions:3,transferred:1,revised:0,total:4});
 assert.equal(nextRepairStudy([first()]).id,s.id);assert.equal(nextRepairStudy([transfer()]).id,repairStudies[1].id);
});
test('eight-store portable backup v3 preserves original wording, immutable anchors and revisions',async()=>{
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const json=await buildPortableBackup(records),back=await inspectPortableBackup(json);assert.equal(back.version,BACKUP_VERSION);assert.deepEqual(back.records.productionEntries,records.productionEntries);
 await assert.rejects(()=>inspectPortableBackup(json.replace('Koordinationstermin','Koordinationsmeeting')),/Integritätsprüfung/);
});
test('G12 review queue keeps 4 original documents and 12 interpretive repair cases unapproved',()=>{
 const docs=collect().filter(x=>x.mode==='G12_REPAIR');assert.equal(docs.length,16);
 assert.equal(docs.filter(x=>x.type==='G12_ORIGINAL_DISCUSSION_RECORD').length,4);assert.equal(docs.filter(x=>x.type==='G12_AMBIGUITY_REPAIR').length,12);
 assert.ok(docs.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
