import test from 'node:test';
import assert from 'node:assert/strict';
import {compressionStudies,compressionId,isCompressionEntry,compressionSource,independentCompression,beginCompression,appendCompressionOperation,appendCompressionTransfer,firstCompressionEvidence,savedCompressionEvidence,nextCompressionOperation,latestCompressionTransfer,splitCompressionTransfer,compressionProgress,nextCompressionStudy} from '../src/domain/compression/compression.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry.ts';
const s=compressionStudies[0],at=Date.UTC(2026,9,24,13);
const expanded1='Die Stadt prüft gegenwärtig, ob sie Standorte der Bibliotheken neu ordnen und Bestände gemeinsam verwalten soll. Eine tatsächliche Schließung wurde damit nicht beschlossen.';
const compact1='Die vorgeschlagene Bestandszusammenlegung im Rahmen einer möglichen Neuordnung ist bislang keine verbindlich beschlossene Schließung des Stadtteilhauses.';
const risk1='Es handelt sich um eine Prüfung und einen Vorschlag; weder ein Ratsbeschluss noch die tatsächliche Verlagerung sind in dieser Passage dokumentiert.';
const expanded2='Die Verwaltung plant derzeit, den Bücherbus an zwei Nachmittagen auszuweiten; zuvor muss jedoch eine gesonderte Entscheidung über die Finanzierung gefällt werden.';
const compact2='Die vorbehaltlich einer Haushaltsentscheidung geplante Angebotsausweitung auf zwei Nachmittage ist keineswegs bereits finanziell zugesichert.';
const risk2='Die Haushaltsfreigabe ist offen, ebenso Zeitpunkt und praktische Umsetzung. Der modale Status des Angebots darf nicht als verbindliche Zusage erscheinen.';
const expanded3='Der Rat darf frühestens im Frühjahr entscheiden, sofern die geplanten Beteiligungsverfahren abgeschlossen sind und die Barrierefreiheit zuvor erfolgreich geprüft wurde.';
const compact3='Eine frühestens für das Frühjahr mögliche Ratsbefassung setzt eine abgeschlossene Beteiligung sowie eine positive Barrierefreiheitsprüfung voraus.';
const risk3='Beide Bedingungen sind noch offen und selbst bei ihrer Erfüllung bleibt ein Ratsbeschluss eine Möglichkeit, nicht eine bereits getroffene Entscheidung.';
const first=()=>beginCompression(s,'o1','A',expanded1,compact1,risk1,at);
const second=(e=first())=>appendCompressionOperation(e,s,'o2','B',expanded2,compact2,risk2,'second',at+1);
const third=(e=second())=>appendCompressionOperation(e,s,'o3','A',expanded3,compact3,risk3,'third',at+2);
const formal='Die Neuordnung der Bibliotheksstandorte befindet sich noch im Prüfstadium. Eine Zusammenlegung von Beständen ist vorgeschlagen worden; ein entsprechender Ratsbeschluss liegt bislang nicht vor. Die ebenfalls erwogene Ausweitung des Bücherbusses auf zwei Nachmittage setzt eine gesonderte Haushaltsentscheidung voraus. Erst nach Abschluss der Beteiligung und einer positiven Prüfung der Barrierefreiheit könnte der Rat frühestens im Frühjahr über das künftige Netz entscheiden.';
const publicText='Noch ist nicht beschlossen, dass die Stadtteilbibliothek schließt. Die Stadt prüft, ob Bestände künftig an einem anderen Standort gemeinsam angeboten werden können. Ein Bücherbus könnte das Angebot ergänzen, doch dafür muss zuerst das Geld bewilligt werden. Auch die Schulen sollen noch mitreden, und die Wege für Menschen mit Einschränkungen müssen geprüft werden. Erst danach kann der Rat entscheiden. Bis dahin bleibt die Bibliothek wie gewohnt geöffnet.';
const why='Die fachliche Version verwendet knappe Nominalgruppen, die öffentliche Version entflechtet die Bedingungen. Beide behalten den fehlenden Beschluss, die gesonderte Finanzierung und die notwendige Beteiligung ausdrücklich bei.';
const transfer=(e=third())=>appendCompressionTransfer(e,s,'TRANSFER',formal,publicText,why,'p2','transfer',at+3);
test('M21 four original three-paragraph unapproved G04 cases contain 12 literal syntactic anchors and balanced options',()=>{
 assert.equal(compressionStudies.length,4);const ids=new Set(),bands=new Set();
 for(const x of compressionStudies){assert.match(x.id,/^SG-G04C-\d{3}$/);assert.ok(!ids.has(x.id));ids.add(x.id);bands.add(x.band);
 assert.equal(x.status,'DEMO_ONLY');assert.equal(x.authorship,'AI_DRAFT');assert.equal(x.editorialApproval,false);
 assert.equal(x.rights.kind,'ORIGINAL_DRAFT');assert.equal(x.paragraphs.length,3);assert.equal(x.operations.length,3);
 for(const op of x.operations){assert.ok(x.paragraphs.find(p=>p.id===op.paragraphId)?.text.includes(op.quote));assert.ok(op.quote.length>90);assert.ok(op.model.length>=145);}
 }
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.ok(!allItems.some(i=>i.id.startsWith('SG-G04C-')));
});
test('first expansion and compression are genuinely independent, ungraded, source-linked and immutable',()=>{
 const e=first();assert.equal(e.id,compressionId(s.id));assert.equal(isCompressionEntry(e),true);assert.equal(compressionSource(e)?.id,s.id);
 assert.equal(e.evaluated,'UNASSESSED');assert.equal(firstCompressionEvidence(e)?.paragraphId,'p1');assert.equal(firstCompressionEvidence(e)?.compact,compact1);assert.equal(e.revisions.length,0);
 assert.equal(archiveKind(e),'G04_COMPRESSION');assert.equal(archiveRow(e).scope,'G04');
 assert.equal(firstCompressionEvidence({...e,sourceId:'tampered'}),null);assert.equal(firstCompressionEvidence({...e,decisionId:'o1|A|p2'}),null);
});
test('reject copied source, missing semantic invariant, identical texts or invalid operation order',()=>{
 const op=s.operations[0];
 assert.equal(independentCompression(op,op.quote,compact1,risk1),false);
 assert.equal(independentCompression(op,expanded1,op.quote,risk1),false);
 assert.equal(independentCompression(op,expanded1,expanded1,risk1),false);
 assert.equal(independentCompression(op,expanded1,compact1,risk1),true);
 assert.throws(()=>beginCompression(s,'o2','A',expanded1,compact1,risk1,at),/unvollständig/);
 assert.throws(()=>beginCompression(s,'o1','C' as never,expanded1,compact1,risk1,at),/unvollständig/);
 assert.throws(()=>beginCompression(s,'o1','A',expanded1,compact1,'nicht bekannt',at),/unvollständig/);
 assert.throws(()=>appendCompressionOperation(first(),s,'o3','A',expanded3,compact3,risk3,'skip',at+1),/fehlt/);
});
test('two additional operations retain original verbatim and append separate anchored traces',()=>{
 const e=first(),two=second(e),three=third(two);
 assert.equal(e.revisions.length,0);assert.equal(two.revisions.length,1);assert.equal(three.revisions.length,2);
 assert.equal(two.original,e.original);assert.equal(three.decisionId,e.decisionId);
 assert.equal(savedCompressionEvidence(two,s.operations[1])?.compact,compact2);assert.equal(savedCompressionEvidence(two,s.operations[1])?.choice,'B');
 assert.equal(nextCompressionOperation(s,three),null);
 assert.throws(()=>appendCompressionOperation(two,s,'o2','B',expanded2,compact2,risk2,'duplicate',at+4),/fehlt/);
});
test('two different audience versions and reflection are required for transfer; a meaningful revision is append-only',()=>{
 assert.throws(()=>appendCompressionTransfer(first(),s,'TRANSFER',formal,publicText,why,'p1','early',at+3),/fehlen/);
 assert.throws(()=>appendCompressionTransfer(third(),s,'REWRITE',formal,publicText,why,'p2','early',at+3),/fehlen/);
 assert.throws(()=>appendCompressionTransfer(third(),s,'TRANSFER',formal,formal,why,'p2','same',at+3),/fehlen/);
 const e=transfer();assert.equal(splitCompressionTransfer(e.revisions[2].text)?.formal,formal);
 assert.equal(latestCompressionTransfer(e)?.paragraphId,'p2');
 assert.throws(()=>appendCompressionTransfer(e,s,'REWRITE',formal,publicText,why,'p2','same',at+4),/fehlen/);
 const revised=appendCompressionTransfer(e,s,'REWRITE',formal+' Eine verbindliche Standortentscheidung bedarf einer gesonderten Befassung des Rates.',publicText,why,'p3','rev',at+4);
 assert.equal(revised.original,e.original);assert.deepEqual(revised.revisions.slice(0,3),e.revisions);
 assert.equal(versionPair(revised,3)?.previous,e.revisions[2].text);
 assert.equal(archiveRows([revised],{kind:'G04_COMPRESSION',activity:'REVISED',period:'ALL',search:'verbindliche Standortentscheidung',now:at+5}).length,1);
});
test('progress reflects observed independent operations without CEFR grading',()=>{
 assert.deepEqual(compressionProgress([]),{started:0,operations:0,transferred:0,rewritten:0,total:4});
 assert.deepEqual(compressionProgress([first()]),{started:1,operations:1,transferred:0,rewritten:0,total:4});
 assert.deepEqual(compressionProgress([third()]),{started:1,operations:3,transferred:0,rewritten:0,total:4});
 assert.deepEqual(compressionProgress([transfer()]),{started:1,operations:3,transferred:1,rewritten:0,total:4});
 assert.equal(nextCompressionStudy([first()]).id,s.id);assert.equal(nextCompressionStudy([transfer()]).id,compressionStudies[1].id);
});
test('existing backup v3 roundtrips both audiences, all syntactic traces and checksum',async()=>{
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const json=await buildPortableBackup(records),restored=await inspectPortableBackup(json);
 assert.equal(restored.version,BACKUP_VERSION);assert.deepEqual(restored.records.productionEntries,records.productionEntries);
 await assert.rejects(()=>inspectPortableBackup(json.replace('Bibliotheksstandorte','Bibliotheksgebäude')),/Integritätsprüfung/);
});
test('editorial queue holds all four source documents and twelve decisions at DEMO_ONLY',()=>{
 const docs=collect().filter(x=>x.mode==='G04_COMPRESSION');
 assert.equal(docs.length,16);assert.equal(docs.filter(x=>x.type==='G04_ORIGINAL_COMPLEX_DOCUMENT').length,4);
 assert.equal(docs.filter(x=>x.type==='G04_BIDIRECTIONAL_SYNTAX').length,12);
 assert.ok(docs.every(x=>x.status==='DEMO_ONLY'&&x.independentEditorialApproval===false));
});
