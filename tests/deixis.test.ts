import test from 'node:test';
import assert from 'node:assert/strict';
import {deixisStudies,deixisId,isDeixisEntry,deixisSource,independentDeixis,beginDeixis,firstDeixis,savedDeixis,nextDeixis,appendDeixis,appendDeixisMemo,latestDeixisMemo,substantialDeixisRevision,deixisProgress,nextDeixisStudy} from '../src/domain/deixis/deixis';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,BACKUP_STORES,type BackupRecords} from '../src/persistence/portableBackup';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry';

const study=deixisStudies[0],time=Date.UTC(2026,9,30,9);
const reports=[
 "Die Koordinatorin kündigte am 3. März 2025 an, dass ihre Arbeitsgruppe den Antrag am 4. März am Empfang des Stadtteilzentrums Lindenfeld einreichen werde.",
 "Die Koordinatorin erklärte am 3. März 2025, dass die nächste Beratung am 12. März 2025 im Nebenbau West stattfinden solle.",
 "Die Beiratsvorsitzende erklärte der angerufenen Vertreterin am 6. März 2025, dass sie dieser die Unterlagen am 5. März zugesandt habe."
];
const misreadings=[
 "Ein späterer Bericht könnte morgen fälschlich als Tag nach seiner Veröffentlichung im April verstehen und hier auf die Leserin des Berichts beziehen.",
 "Eine falsche Auslegung könnte dort als Empfang des Hauptgebäudes und nächste Woche relativ zum späteren Veröffentlichungsdatum auffassen.",
 "Eine Weiterleitung könnte das Wort ich der späteren Verfasserin und Ihnen sämtlichen Empfängern der Rundmail zuordnen, obwohl das Telefonat einen anderen Rahmen hatte."
];
const origines=[
 "Die Äußerung fiel am 3. März 2025 am Empfang des Stadtteilzentrums Lindenfeld. Die Koordinatorin sprach für die antragstellende Arbeitsgruppe und meinte mit hier diesen Empfang.",
 "Die Koordinatorin stand am 3. März am Empfang, zeigte jedoch auf den reservierten Nebenbau West; das Buchungsprotokoll nennt Mittwoch, den 12. März, als Beratungstermin.",
 "Im Telefonat vom 6. März 2025 sprach die Beiratsvorsitzende mit einer bestimmten Anwohnervertreterin. Der Versandvermerk dokumentiert die Sendung vom 5. März."
];
const boundaries=[
 "Die Äußerung ist kein neues Versprechen für eine Abgabe im April und bezeichnet nicht das Büro einer anderen Person, die den Bericht später liest.",
 "Aus der später kopierten Äußerung folgt weder eine Beratung im Hauptgebäude noch eine neue Einladung für eine Kalenderwoche nach der digitalen Veröffentlichung.",
 "Der Satz belegt keine zusätzliche Zusendung durch die spätere Rundmail-Absenderin und keine Adressierung sämtlicher Empfängerinnen im Verteiler."
];
const memo="Für den Jahresbericht des fiktiven Stadtteilzentrums müssen drei Äußerungen an den ursprünglichen Sprechort und das ursprüngliche Datum gebunden werden. Am Montag, dem 3. März 2025, erklärte eine Koordinatorin am Empfang des Zentrums, ihre Arbeitsgruppe werde den Antrag am folgenden Tag, dem 4. März, dort abgeben. Das Wort morgen kann nicht auf den Erscheinungstag des späteren Jahresberichts im April bezogen werden. Ebenso wenig bezeichnet das Wort wir sämtliche Personen, die den Bericht später lesen. Die zweite Erklärung derselben Koordinatorin betraf eine Beratung am 12. März im Nebenbau West. Obwohl sie am Empfang stand, war mit dort gerade nicht dieses Hauptgebäude, sondern der gesondert reservierte Nebenbau gemeint.\n\nIn einer dritten Äußerung teilte die Vorsitzende des Stadtteilbeirats am 6. März einer Anwohnervertreterin mit, sie habe ihr die Unterlagen am Vortag, dem 5. März, geschickt. Die deiktischen Pronomen ich und Ihnen beziehen sich auf die Beteiligten dieses Telefonats und dürfen nicht auf die Verfasserin oder Empfänger einer späteren Rundmail übertragen werden. Ein quellengetreuer Bericht benennt daher an jeder Stelle die ursprünglichen Sprecher, Empfänger, Orte und datierten Ereignisse. Die schriftliche Übertragung in ein anderes Publikum erfordert eine neue Formulierung der Indexwörter, nicht eine stillschweigende Verschiebung des historischen Nullpunkts.";
const why="Ich habe Sprecherrollen, ursprüngliche Datumsangaben und den Ortswechsel zum Nebenbau explizit aufgelöst. Die neue Darstellung vermeidet die irreführende Annahme, relative Zeitangaben und Personalpronomen bezögen sich auf den späteren Jahresbericht.";
const revised="Für den Jahresbericht des fiktiven Stadtteilzentrums müssen drei Äußerungen an den ursprünglichen Sprechort und das ursprüngliche Datum gebunden werden. Am Montag, dem 3. März 2025, erklärte eine Koordinatorin am Empfang des Zentrums, ihre Arbeitsgruppe werde den Antrag am folgenden Tag, dem 4. März, dort abgeben. Das Wort morgen kann nicht auf den Erscheinungstag des späteren Jahresberichts im April bezogen werden. Ebenso wenig bezeichnet das Wort wir sämtliche Personen, die den Bericht später lesen. Die zweite Erklärung derselben Koordinatorin betraf eine Beratung am 12. März im Nebenbau West. Obwohl sie am Empfang stand, war mit dort gerade nicht dieses Hauptgebäude, sondern der gesondert reservierte Nebenbau gemeint.\n\nIn einer dritten Äußerung teilte die Vorsitzende des Stadtteilbeirats am 6. März einer Anwohnervertreterin mit, sie habe ihr die Unterlagen am Vortag, dem 5. März, geschickt. Die deiktischen Pronomen ich und Ihnen beziehen sich auf die Beteiligten dieses Telefonats und dürfen nicht auf die Verfasserin oder Empfänger einer späteren Rundmail übertragen werden. Ein quellengetreuer Bericht benennt daher an jeder Stelle die ursprünglichen Sprecher, Empfänger, Orte und datierten Ereignisse. Die schriftliche Übertragung in ein anderes Publikum erfordert eine neue Formulierung der Indexwörter, nicht eine stillschweigende Verschiebung des historischen Nullpunkts.\n\nFür eine öffentliche Informationsseite würde ich zusätzlich einen Hinweis voranstellen, dass es sich ausschließlich um Vorgänge aus dem März 2025 handelt. In der Besucherfassung werden alle institutionellen Gruppen zuerst namentlich eingeführt, Empfang und Nebenbau West ausdrücklich unterschieden und der Versand an die eine Vertreterin klar abgegrenzt. Dadurch entsteht weder eine neue Einladung noch eine zusätzliche, unbelegte Dokumentenübermittlung.";
const first=()=>beginDeixis(study,'d1','A',reports[0],misreadings[0],origines[0],boundaries[0],time);
const second=(e=first())=>appendDeixis(e,study,'d2','B',reports[1],misreadings[1],origines[1],boundaries[1],'e2',time+1);
const third=(e=second())=>appendDeixis(e,study,'d3','A',reports[2],misreadings[2],origines[2],boundaries[2],'e3',time+2);
const transfer=(e=third())=>appendDeixisMemo(e,study,'TRANSFER',memo,why,'d1','memo1',time+3);

test('four original multi-paragraph C1/C2 source cases contain twelve deictic speech centres and retain closed rights gates',()=>{
 assert.equal(deixisStudies.length,4);
 const ids=new Set<string>(),types=new Set<string>(),bands=new Set<string>();let count=0,b=0;
 for(const s of deixisStudies){
  assert.match(s.id,/^SG-G01D-\d{3}$/);assert.equal(ids.has(s.id),false);ids.add(s.id);bands.add(s.band);
  assert.equal(s.status,'DEMO_ONLY');assert.equal(s.authorship,'AI_DRAFT');assert.equal(s.reviewedBy,null);assert.equal(s.editorialApproval,false);assert.equal(s.rights.kind,'ORIGINAL_DRAFT');
  assert.equal(s.paragraphs.length,3);assert.equal(s.anchors.length,3);
  for(const [i,a] of s.anchors.entries()){
   const p=s.paragraphs[i];assert.ok(p.text.length>900);assert.equal(a.paragraphId,p.id);assert.equal(p.text.split('„'+a.quote+'“').length,2);
   assert.equal(a.options.length,2);assert.notEqual(a.options[0].text,a.options[1].text);types.add(a.phenomenon);count++;if(a.preferredId==='B')b++;
  }
 }
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.equal(count,12);assert.ok(types.size>=10);assert.equal(b,6);
 assert.equal(allItems.filter(item=>item.id.startsWith('SG-G01D-')).length,0);
});
test('first analysis is source-bound and immutable with original text, version and unassessed choice',()=>{
 const e=first();
 assert.equal(e.id,deixisId(study.id));assert.ok(isDeixisEntry(e));assert.equal(deixisSource(e)?.id,study.id);
 assert.equal(e.itemVersion,1);assert.equal(e.evaluated,'UNASSESSED');assert.deepEqual(e.revisions,[]);
 assert.equal(firstDeixis(e)?.report,reports[0]);assert.equal(firstDeixis(e)?.choice,'A');assert.equal(firstDeixis(e)?.paragraphId,'p1');
 assert.equal(archiveKind(e),'G01_DEIXIS');assert.equal(archiveRow(e).scope,'G01');
 assert.equal(firstDeixis({...e,sourceId:'tampered'}),null);
 assert.equal(firstDeixis({...e,decisionId:'d1|A|p2'}),null);
});
test('reject copied source, collapsed evidence, missing origines, invalid selection and skipped anchor',()=>{
 const p=study.anchors[0];assert.ok(independentDeixis(p,reports[0],misreadings[0],origines[0],boundaries[0]));
 assert.equal(independentDeixis(p,reports[0],reports[0],origines[0],boundaries[0]),false);
 assert.equal(independentDeixis(p,p.quote+' '+reports[0],misreadings[0],origines[0],boundaries[0]),false);
 assert.equal(independentDeixis(p,reports[0],misreadings[0],'zu kurz',boundaries[0]),false);
 assert.throws(()=>beginDeixis(study,'d2','A',reports[0],misreadings[0],origines[0],boundaries[0],time),/erforderlich/);
 assert.throws(()=>beginDeixis(study,'d1','X' as never,reports[0],misreadings[0],origines[0],boundaries[0],time),/erforderlich/);
 assert.throws(()=>appendDeixis(first(),study,'d3','A',reports[2],misreadings[2],origines[2],boundaries[2],'skip',time+1),/Reihenfolge/);
});
test('source-anchored three-step evidence is append-only, sequential and accepts unpreferred selections without automatic grading',()=>{
 const e=first(),b=second(e),c=third(b);
 assert.equal(e.revisions.length,0);assert.equal(b.revisions.length,1);assert.equal(c.revisions.length,2);
 assert.equal(c.original,e.original);assert.equal(savedDeixis(b,study.anchors[1])?.choice,'B');assert.equal(savedDeixis(c,study.anchors[2])?.origo,origines[2]);
 assert.equal(nextDeixis(study,c),null);assert.equal(c.evaluated,'UNASSESSED');
 assert.throws(()=>appendDeixis(c,study,'d3','A',reports[2],misreadings[2],origines[2],boundaries[2],'again',time+4),/Reihenfolge/);
 const unpreferred=beginDeixis(study,'d1','B',reports[0],misreadings[0],origines[0],boundaries[0],time);
 assert.equal(firstDeixis(unpreferred)?.choice,'B');assert.equal(unpreferred.evaluated,'UNASSESSED');
});
test('independent multi-paragraph memo requires prior 3 anchors and substantive full-document audience revision',()=>{
 assert.throws(()=>appendDeixisMemo(first(),study,'TRANSFER',memo,why,'d1','premature',time+3),/fehlt/);
 assert.throws(()=>appendDeixisMemo(third(),study,'REWRITE',memo,why,'d1','premature',time+3),/fehlt/);
 assert.throws(()=>appendDeixisMemo(third(),study,'TRANSFER',memo,'Zu knapp','d1','brief',time+3),/fehlt/);
 assert.throws(()=>appendDeixisMemo(third(),study,'TRANSFER',memo,why,'unknown','badanchor',time+3),/fehlt/);
 const e=transfer();assert.equal(latestDeixisMemo(e)?.questionId,'TRANSFER');
 assert.equal(substantialDeixisRevision(memo,memo+' Ein Wort.'),false);
 assert.throws(()=>appendDeixisMemo(e,study,'REWRITE',memo,why,'d1','same',time+4),/fehlt/);
 const r=appendDeixisMemo(e,study,'REWRITE',revised,why,'d3','rewrite',time+4);
 assert.equal(r.original,e.original);assert.deepEqual(r.revisions.slice(0,3),e.revisions);
 assert.equal(versionPair(r,3)?.previous,memo);assert.equal(latestDeixisMemo(r)?.paragraphId,'p3');
 assert.equal(archiveRows([r],{kind:'G01_DEIXIS',activity:'REVISED',period:'ALL',search:'öffentliche Informationsseite',now:time+5}).length,1);
});
test('progress and next-study record observed source evidence, transfers and revisions without CEFR claims',()=>{
 assert.deepEqual(deixisProgress([]),{started:0,analyses:0,transferred:0,revised:0,total:4});
 assert.deepEqual(deixisProgress([first()]),{started:1,analyses:1,transferred:0,revised:0,total:4});
 assert.equal(deixisProgress([third()]).analyses,3);
 assert.equal(deixisProgress([transfer()]).transferred,1);
 assert.equal(nextDeixisStudy([first()]).id,study.id);
 assert.equal(nextDeixisStudy([transfer()]).id,deixisStudies[1].id);
 const final=appendDeixisMemo(transfer(),study,'REWRITE',revised,why,'d3','rewrite',time+4);
 assert.equal(deixisProgress([final]).revised,1);
});
test('eight-store portable backup v3 preserves untouched original, all text versions, stable references and digest',async()=>{
 assert.equal(BACKUP_STORES.length,8);assert.equal(BACKUP_VERSION,3);
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const raw=await buildPortableBackup(records);const restore=await inspectPortableBackup(raw);
 assert.equal(restore.version,3);assert.deepEqual(restore.records.productionEntries,records.productionEntries);
 const corrupted=raw.replace('Koordinatorin','Koordinatore');
 assert.notEqual(corrupted,raw);await assert.rejects(()=>inspectPortableBackup(corrupted),/Integritätsprüfung/);
});
test('editorial queue includes all 4 source dossiers and 12 anchors without approval or publication',()=>{
 const rows=collect().filter(x=>x.mode==='G01_DEIXIS');assert.equal(rows.length,16);
 assert.equal(rows.filter(x=>x.phenomenon==='G01_ORIGINAL_DEIXIS_SOURCE').length,4);
 assert.equal(rows.filter(x=>x.phenomenon==='G01_PREPOSITIONAL_DEIXIS').length,12);
 assert.ok(rows.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
