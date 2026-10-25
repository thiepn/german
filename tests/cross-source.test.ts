import test from 'node:test';
import assert from 'node:assert/strict';
import {crossStudies,crossEntryId,isCrossEntry,crossSource,independentCrossReading,beginCross,appendCrossComparison,appendCrossTransfer,firstCrossEvidence,savedCrossEvidence,nextCrossComparison,latestCrossTransfer,crossProgress,nextCrossStudy} from '../src/domain/crossSource/crossSource.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry.ts';

const s=crossStudies[0],at=Date.UTC(2026,9,24,9);
const firstA='Das betriebliche Experiment misst eine begrenzte Änderung der Arbeitszeit innerhalb freiwillig ausgewählter Softwareteams, nicht die Belegschaft insgesamt.';
const firstB='Die Aussagen aus dem freiwilligen Fragebogen erfassen subjektive Bewertungen nur eines Teils der Beschäftigten und können keine Gesamtaussage über das Unternehmen tragen.';
const why='Die vier beobachteten Teams bilden keine zufällige Vollerhebung; zudem umfasst die Befragung weniger Antworten als eingeladenen Personen.';
const begin=()=>beginCross(s,'c1','A',firstA,firstB,why,at);
const second=(e=begin())=>appendCrossComparison(e,s,'c2','B','Die Pilotstudie zählt dokumentierte Arbeitsvorgänge und berichtet einen weitgehend stabilen Durchsatz, nicht ein direktes Maß für Qualität oder Stress.','Die Beschäftigten schildern sehr unterschiedliche Erfahrungen zwischen höherer Konzentration und dichter getakteten Besprechungen vor Projektabgaben.','Die verschiedenen Messgrößen sind vereinbar; der eine Datensatz widerlegt nicht automatisch die subjektiven Berichte.','c2',at+1);
const third=(e=second())=>appendCrossComparison(e,s,'c3','A','Der technische Abschlussbericht empfiehlt neue Untersuchungen in weiteren Tätigkeitsfeldern und verweist auf noch ungeklärte Anforderungen im Kundenservice.','Die befragten Angestellten nennen klare Vertretungsregeln als Voraussetzung für einen Einsatz außerhalb der bisherigen Softwareteams.','Beide Quellen schildern Bedingungen und Wünsche, aber keine von einer zuständigen Leitung getroffene verbindliche Umsetzungsentscheidung.','c3',at+2);
const synthesis='Die Pilotstudie beschreibt bei vier freiwillig ausgewählten Softwareteams kürzere Arbeitszeiten bei weitgehend gleichem Ticketdurchsatz. Dieser Befund gilt nicht ohne Weiteres für andere Tätigkeiten oder für die Qualität der erledigten Vorgänge. Die begleitende Befragung belegt überwiegend positive Bewertungen unter den antwortenden Beschäftigten, zugleich aber uneinheitliche Erfahrungen mit der Arbeitsintensität. Für eine Übertragung auf den Kundendienst werden sowohl kontrollierte Erprobungsbedingungen als auch verlässliche Vertretungsregeln verlangt. Eine verbindliche Entscheidung über eine allgemeine Einführung ist in den zwei Texten nicht dokumentiert.';
const reason='Der erste Text erhebt betriebliche Kennzahlen, der zweite subjektive Angaben bei begrenztem Rücklauf. Eine gemeinsame Deutung ist möglich, ohne Stichproben und Zielgrößen gleichzusetzen oder eine Entscheidung der Unternehmensleitung zu erfinden.';
const transfer=(e=third())=>appendCrossTransfer(e,s,'TRANSFER',synthesis,reason,'c2','transfer',at+3);
test('four unapproved paired G09 dossiers contain 8 texts, 24 original paragraphs and 12 literal paired anchors',()=>{
 assert.equal(crossStudies.length,4);const ids=new Set(),bands=new Set(),anchors=new Set();for(const x of crossStudies){
  assert.match(x.id,/^SG-G09X-\d{3}$/);assert.ok(!ids.has(x.id));ids.add(x.id);bands.add(x.band);
  assert.equal(x.editorialApproval,false);assert.equal(x.authorship,'AI_DRAFT');assert.equal(x.status,'DEMO_ONLY');assert.equal(x.rights.kind,'ORIGINAL_DRAFT');
  assert.deepEqual(x.sources.map(y=>y.id),['A','B']);assert.equal(x.sources.flatMap(y=>y.paragraphs).length,6);
  assert.ok(x.sources.flatMap(y=>y.paragraphs).every(p=>p.text.length>=320));assert.deepEqual(x.comparisons.map(c=>c.id),['c1','c2','c3']);
  for(const c of x.comparisons){assert.ok(x.sources[0].paragraphs.find(p=>p.id===c.sourceA)?.text.includes(c.quoteA));assert.ok(x.sources[1].paragraphs.find(p=>p.id===c.sourceB)?.text.includes(c.quoteB));anchors.add(x.id+':'+c.sourceA+':'+c.sourceB);}
 }
 assert.equal(anchors.size,12);assert.deepEqual([...bands].sort(),['C1','C2']);assert.ok(!allItems.some(i=>i.id.startsWith('SG-G09X')));
});
test('first paired reading retains dual source anchors, immutable evidence and no automatic score',()=>{
 const e=begin();assert.equal(e.id,crossEntryId(s.id));assert.ok(isCrossEntry(e));assert.equal(crossSource(e)?.id,s.id);assert.equal(e.evaluated,'UNASSESSED');
 assert.equal(e.decisionId,'c1|A|A1|B1');assert.equal(firstCrossEvidence(e)?.sourceA,'A1');assert.equal(firstCrossEvidence(e)?.sourceB,'B1');assert.equal(firstCrossEvidence(e)?.readingB,firstB);
 assert.equal(nextCrossComparison(s,e)?.id,'c2');assert.equal(archiveKind(e),'G09_CROSS_SOURCE');assert.equal(archiveRow(e).scope,'G09');
 assert.equal(firstCrossEvidence({...e,sourceId:'unknown'}),null);assert.equal(firstCrossEvidence({...e,decisionId:'c1|A|A1|B3'}),null);
});
test('require two independently phrased readings and a substantive boundary; reject literal copying',()=>{
 const c=s.comparisons[0];assert.equal(independentCrossReading(c,c.quoteA,firstB,why),false);assert.equal(independentCrossReading(c,firstA,c.quoteB,why),false);
 assert.equal(independentCrossReading(c,firstA,firstB,why),true);assert.equal(independentCrossReading(c,firstA,firstA,why),false);
 assert.throws(()=>beginCross(s,'c2','A',firstA,firstB,why,at),/erforderlich/);
 assert.throws(()=>beginCross(s,'c1','C' as never,firstA,firstB,why,at),/erforderlich/);
 assert.throws(()=>beginCross(s,'c1','A',firstA,firstB,'Nicht bekannt.',at),/erforderlich/);
 assert.throws(()=>appendCrossComparison(begin(),s,'c3','A',firstA,firstB,why,'skip',at+1),/Reihenfolge/);
});
test('pair-specific second and third analyses append without overwriting their predecessors',()=>{
 const e=begin(),two=second(e),three=third(two);assert.equal(e.revisions.length,0);assert.equal(two.revisions.length,1);assert.equal(three.revisions.length,2);
 assert.equal(three.original,e.original);assert.equal(three.decisionId,e.decisionId);assert.equal(two.revisions[0].paragraphId,'A2|B2');
 assert.equal(savedCrossEvidence(two,s.comparisons[1])?.sourceB,'B2');assert.equal(savedCrossEvidence(two,s.comparisons[1])?.choice,'B');
 assert.equal(nextCrossComparison(s,three),null);assert.equal(latestCrossTransfer(three),null);
 assert.throws(()=>appendCrossComparison(two,s,'c2','A',firstA,firstB,why,'duplicate',at+4),/Reihenfolge/);
});
test('independent synthesis is gated; revision retains both source identities and original version',()=>{
 assert.throws(()=>appendCrossTransfer(begin(),s,'TRANSFER',synthesis,reason,'c1','early',at+3),/fehlt/);
 assert.throws(()=>appendCrossTransfer(third(),s,'REWRITE',synthesis,reason,'c1','early',at+3),/fehlt/);
 const e=transfer();assert.equal(e.revisions[2].paragraphId,'A2|B2');assert.deepEqual(e.revisions[2].selfChecks,['PAIR:c2']);
 assert.throws(()=>appendCrossTransfer(e,s,'REWRITE',synthesis,reason,'c1','same',at+4),/fehlt/);
 assert.throws(()=>appendCrossTransfer(e,s,'REWRITE',synthesis+'.','zu kurz','c1','reason',at+4),/fehlt/);
 const revised=appendCrossTransfer(e,s,'REWRITE',synthesis+' Diese Unterscheidung sollte in einer künftigen Evaluation mit eigenständigen Indikatoren geprüft werden.',reason,'c3','rev',at+4);
 assert.equal(revised.original,e.original);assert.deepEqual(revised.revisions.slice(0,3),e.revisions);
 assert.equal(versionPair(revised,3)?.previous,synthesis);assert.equal(archiveRows([revised],{kind:'G09_CROSS_SOURCE',activity:'REVISED',period:'ALL',search:'eigenständigen Indikatoren',now:at+5}).length,1);
});
test('only source-confirmed saved evidence counts toward observed progress',()=>{
 assert.deepEqual(crossProgress([]),{started:0,comparisons:0,transferred:0,revisions:0,total:4});
 assert.deepEqual(crossProgress([begin()]),{started:1,comparisons:1,transferred:0,revisions:0,total:4});
 assert.deepEqual(crossProgress([third()]),{started:1,comparisons:3,transferred:0,revisions:0,total:4});
 assert.deepEqual(crossProgress([transfer()]),{started:1,comparisons:3,transferred:1,revisions:0,total:4});
 assert.equal(nextCrossStudy([begin()]).id,s.id);assert.equal(nextCrossStudy([transfer()]).id,crossStudies[1].id);
});
test('backup v3 checksum roundtrips paired source interpretation without new stores',async()=>{
 const data:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const serialized=await buildPortableBackup(data),loaded=await inspectPortableBackup(serialized);
 assert.equal(loaded.version,BACKUP_VERSION);assert.deepEqual(loaded.records.productionEntries,data.productionEntries);
 await assert.rejects(()=>inspectPortableBackup(serialized.replace('betriebliche Kennzahlen','betriebliche Behauptungen')),/Integritätsprüfung/);
});
test('cross-source review queue has 4 original source pairs and 12 contrasts, all DEMO_ONLY',()=>{
 const docs=collect().filter(x=>x.mode==='G09_CROSS_SOURCE');assert.equal(docs.length,16);assert.equal(docs.filter(x=>x.type==='G09_ORIGINAL_SOURCE_PAIR').length,4);
 assert.equal(docs.filter(x=>x.type==='G09_CROSS_SOURCE_CONTRAST').length,12);assert.ok(docs.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
 assert.ok(docs.some(x=>x.quoteA&&x.quoteB&&x.sourceA&&x.sourceB));
});
