import test from 'node:test';
import assert from 'node:assert/strict';
import {argumentStudies,argumentId,isArgumentEntry,argumentSource,independentArgument,beginArgument,appendArgumentNode,appendArgumentEssay,firstArgumentEvidence,savedArgumentEvidence,nextArgumentNode,latestArgumentEssay,argumentProgress,nextArgumentStudy} from '../src/domain/argument/argument.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry.ts';
const s=argumentStudies[0],at=Date.UTC(2026,9,25,1);
const claims=[
'Die beobachtete Verringerung kurzfristiger Fehlzeiten ist ein begrenzter Hinweis auf einen möglichen Nutzen des Pilots, aber noch kein belastbarer Kausalnachweis für alle Beschäftigten.',
'Die unveränderte Öffnung am Wochenanfang zeigt nur einen Teil der Erreichbarkeit und erlaubt ohne Wartezeitmessungen keine Aussage über sämtliche Bürgerkontakte.',
'Eine befristete und evaluierte Fortführung ist unter klaren Kriterien vertretbar, ohne die Einführung der Arbeitszeitregelung für alle Dienststellen vorwegzunehmen.'
];
const warrants=[
'Um eine kausale Wirkung zu behaupten, müsste man vergleichbare Teams betrachten und weitere Einflüsse wie Selbstselektion, Arbeitsorganisation und saisonale Veränderungen ausschließen.',
'Eine Aussage über Servicequalität setzt voraus, dass der Zugang über verschiedene Wochentage hinweg mit Wartezeit, Terminverfügbarkeit und tatsächlicher Nutzung zusammen bewertet wird.',
'Die Schlussfolgerung ist nur tragfähig, wenn der Ausschuss vorab Vergleichsindikatoren, Aufwand, Zuständigkeit und Kriterien für einen Abbruch oder eine Ausweitung festlegt.'
];
const objections=[
'Freiwillige Pilotgruppen können besonders motivierte Menschen enthalten, deren Anwesenheitswerte sich auch ohne veränderte Arbeitszeiten von anderen Beschäftigten unterscheiden würden.',
'Selbst wenn am Montag unverändert geöffnet war, könnten spätere Nachmittage zu längeren Wartezeiten geführt haben und Menschen mit eingeschränkter Terminflexibilität benachteiligen.',
'Ein weiterer Versuch beansprucht Personal und Koordinationszeit, weshalb seine Finanzierung und die spätere Übertragbarkeit nicht als selbstverständlich gelten dürfen.'
];
const first=()=>beginArgument(s,'a1','A',claims[0],warrants[0],objections[0],at);
const second=(e=first())=>appendArgumentNode(e,s,'a2','B',claims[1],warrants[1],objections[1],'a2',at+1);
const third=(e=second())=>appendArgumentNode(e,s,'a3','A',claims[2],warrants[2],objections[2],'a3',at+2);
const essay='Der Pilot einer Vier-Tage-Woche in der Stadtverwaltung liefert interessante Hinweise, erlaubt aber noch keine allgemeingültige Aussage über eine dauerhafte Einführung. Eine geringere Zahl kurzfristiger Fehlzeiten kann eine sorgfältig angelegte Anschlussuntersuchung motivieren. Weil freiwillige Gruppen besonders motivierte Beschäftigte anziehen können, bleibt die Zuordnung des Rückgangs zur neuen Arbeitszeitregelung jedoch unsicher. Ein ernstzunehmender Einwand betrifft die Erreichbarkeit öffentlicher Dienste. Zwar war die Bürgerberatung am Montag geöffnet, doch längere Wartezeiten an einzelnen Nachmittagen wurden nicht durchgängig ausgewertet. Die Belastung könnte sich daher auf andere Zeiträume verlagert haben.\n\nEine vertretbare Folgerung ist eine weitere begrenzte Erprobung in verschiedenen Abteilungen, deren Vergleichswerte und Kosten von Anfang an transparent erfasst werden. Der Personalausschuss sollte vorher festlegen, welche Unterschiede bei Fehlzeiten, Beratungsterminen und Arbeitslast für die spätere Entscheidung ausschlaggebend sind. Eine Fortsetzung von sechs Monaten kann dabei sinnvoll sein, sofern sie weder als dauerhafte Zustimmung kommuniziert noch ohne überprüfbare Abbruchkriterien durchgeführt wird. So wird die Chance auf eine bessere Organisation ernst genommen, ohne die verbleibenden Gegenargumente zu entwerten.';
const reason='Der Fehlzeitenbefund ist eine Beobachtung, für den Kausalschluss braucht es Vergleichsbedingungen; die unveränderte Montagsöffnung ist noch keine vollständige Servicegarantie. Deshalb verbinde ich eine begrenzte Empfehlung mit klaren Evaluations- und Abbruchkriterien.';
const transfer=(e=third())=>appendArgumentEssay(e,s,'TRANSFER',essay,reason,'a1','draft',at+3);
test('four C1-C2 original source documents have twelve literally anchored and editorially unapproved argument problems',()=>{
 assert.equal(argumentStudies.length,4);const ids=new Set(),bands=new Set();
 for(const x of argumentStudies){assert.match(x.id,/^SG-G11A-\d{3}$/);assert.ok(!ids.has(x.id));ids.add(x.id);bands.add(x.band);assert.equal(x.status,'DEMO_ONLY');assert.equal(x.authorship,'AI_DRAFT');assert.equal(x.editorialApproval,false);assert.equal(x.rights.kind,'ORIGINAL_DRAFT');assert.equal(x.paragraphs.length,3);assert.equal(x.arguments.length,3);
  for(const a of x.arguments)assert.ok(x.paragraphs.find(p=>p.id===a.paragraphId)?.text.includes('„'+a.quote+'“'));
 }assert.deepEqual([...bands].sort(),['C1','C2']);assert.ok(!allItems.some(i=>i.id.startsWith('SG-G11A-')));
});
test('first argument preserves immutable premise, warrant, opposing argument and its paragraph anchor',()=>{
 const e=first();assert.equal(e.id,argumentId(s.id));assert.ok(isArgumentEntry(e));assert.equal(argumentSource(e)?.id,s.id);assert.equal(e.evaluated,'UNASSESSED');
 assert.equal(firstArgumentEvidence(e)?.claim,claims[0]);assert.equal(firstArgumentEvidence(e)?.paragraphId,'p1');assert.equal(archiveKind(e),'G11_ARGUMENT');assert.equal(archiveRow(e).scope,'G11');
 assert.equal(firstArgumentEvidence({...e,sourceId:'invalid'}),null);assert.equal(firstArgumentEvidence({...e,decisionId:'a1|A|p3'}),null);
});
test('reject quoted source copying, matching fields, invalid choice and incorrect operation sequence',()=>{
 const a=s.arguments[0];assert.equal(independentArgument(a,claims[0],warrants[0],objections[0]),true);
 assert.equal(independentArgument(a,a.quote+' '+claims[0],warrants[0],objections[0]),false);
 assert.equal(independentArgument(a,claims[0],claims[0],objections[0]),false);
 assert.equal(independentArgument(a,claims[0],warrants[0],warrants[0]),false);
 assert.throws(()=>beginArgument(s,'a2','A',claims[0],warrants[0],objections[0],at),/fehlen/);
 assert.throws(()=>beginArgument(s,'a1','C' as never,claims[0],warrants[0],objections[0],at),/fehlen/);
 assert.throws(()=>appendArgumentNode(first(),s,'a3','A',claims[2],warrants[2],objections[2],'skipped',at+1),/Reihenfolge/);
});
test('later source-linked argument chains append to the original with stable independent evidence',()=>{
 const e=first(),two=second(e),three=third(two);assert.equal(e.revisions.length,0);assert.equal(two.revisions.length,1);assert.equal(three.revisions.length,2);
 assert.equal(two.revisions[0].paragraphId,'p2');assert.equal(three.original,e.original);assert.equal(savedArgumentEvidence(two,s.arguments[1])?.choice,'B');assert.equal(savedArgumentEvidence(two,s.arguments[1])?.warrant,warrants[1]);assert.equal(nextArgumentNode(s,three),null);
 assert.throws(()=>appendArgumentNode(two,s,'a2','B',claims[1],warrants[1],objections[1],'duplicate',at+4),/Reihenfolge/);
});
test('full independent argumentative transfer requires all nodes, is ungraded, and allows real append-only revision',()=>{
 assert.throws(()=>appendArgumentEssay(first(),s,'TRANSFER',essay,reason,'a1','tooearly',at+3),/fehlt/);
 assert.throws(()=>appendArgumentEssay(third(),s,'REWRITE',essay,reason,'a1','nobase',at+3),/fehlt/);
 assert.throws(()=>appendArgumentEssay(third(),s,'TRANSFER',essay,'short','a1','norationale',at+3),/fehlt/);
 const e=transfer();assert.equal(latestArgumentEssay(e)?.paragraphId,'p1');assert.throws(()=>appendArgumentEssay(e,s,'REWRITE',essay,reason,'a1','same',at+4),/fehlt/);
 const revised=appendArgumentEssay(e,s,'REWRITE',essay+' Der Bericht sollte die Risiken für den Publikumsverkehr ausdrücklich gesondert ausweisen.',reason,'a3','rewrite',at+4);
 assert.equal(revised.original,e.original);assert.deepEqual(revised.revisions.slice(0,3),e.revisions);assert.equal(versionPair(revised,3)?.previous,essay);
 assert.equal(archiveRows([revised],{kind:'G11_ARGUMENT',activity:'REVISED',period:'ALL',search:'gesondert ausweisen',now:at+5}).length,1);
});
test('observed progress distinguishes authored chains, final essay and edits without CEFR awards',()=>{
 assert.deepEqual(argumentProgress([]),{started:0,chains:0,transferred:0,revised:0,total:4});
 assert.deepEqual(argumentProgress([first()]),{started:1,chains:1,transferred:0,revised:0,total:4});
 assert.deepEqual(argumentProgress([third()]),{started:1,chains:3,transferred:0,revised:0,total:4});
 assert.deepEqual(argumentProgress([transfer()]),{started:1,chains:3,transferred:1,revised:0,total:4});
 assert.equal(nextArgumentStudy([first()]).id,s.id);assert.equal(nextArgumentStudy([transfer()]).id,argumentStudies[1].id);
});
test('production store backup v3 preserves independent source-linked prose and checksum unchanged',async()=>{
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const json=await buildPortableBackup(records),v=await inspectPortableBackup(json);assert.equal(v.version,BACKUP_VERSION);assert.deepEqual(v.records.productionEntries,records.productionEntries);
 await assert.rejects(()=>inspectPortableBackup(json.replace('Vier-Tage-Woche','Fünf-Tage-Woche')),/Integritätsprüfung/);
});
test('editorial queue includes four original argumentative sources plus twelve independent claim/warrant dossiers',()=>{
 const q=collect().filter(x=>x.mode==='G11_ARGUMENT');assert.equal(q.length,16);assert.equal(q.filter(x=>x.type==='G11_ORIGINAL_ARGUMENT_SOURCE').length,4);assert.equal(q.filter(x=>x.type==='G11_WARRANT_AND_COUNTERARGUMENT').length,12);assert.ok(q.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
