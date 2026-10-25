import test from 'node:test';
import assert from 'node:assert/strict';
import {numericStudies,numericId,isNumericEntry,numericSource,independentNumeric,beginNumeric,appendNumericClaim,appendNumericReport,firstNumericEvidence,savedNumericEvidence,nextNumericClaim,latestNumericReport,numericProgress,nextNumericStudy} from '../src/domain/numeracy/numeracy.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry.ts';
const s=numericStudies[0],now=Date.UTC(2026,9,25,9);
const statements=[
'Der Anteil bewilligter förderfähiger Anträge stieg von zwanzig auf fünfundzwanzig Prozent, also um fünf Prozentpunkte beziehungsweise um ein Viertel relativ zur alten Quote.',
'Unter den einhundertachtzig Menschen, die den Fragebogen tatsächlich beantworteten, gaben einhundertfünfunddreißig eine positive Rückmeldung zu ihrer Verständlichkeit.',
'Der ausgewiesene Zuwachs der Erstanträge enthält erstmals Bewerbungen aus einem neu aufgenommenen Studiengang; in vergleichbar erfassten Bereichen fällt er geringer aus.'
];
const denominator=[
'Für die Quoten wurden in beiden Runden jeweils eintausend förderfähige Anträge als Grundgesamtheit verwendet; zweihundert beziehungsweise zweihundertfünfzig waren erfolgreich.',
'Die Zustimmungsquote bezieht sich auf die einhundertachtzig Antwortenden und nicht auf alle dreihundert Angeschriebenen oder auf sämtliche Förderberechtigte.',
'Der Ausgangswert waren fünfhundert Erstanträge; die neue Gesamtzählung umfasst fünfhundertsechzig, davon fünfunddreißig aus dem erst jetzt erfassten Studiengang.'
];
const limits=[
'Die arithmetische Steigerung der Bewilligungsquote erklärt nicht, ob eine Regeländerung kausal wirkte oder ob Zusammensetzung und Voraussetzungen beider Gruppen vergleichbar waren.',
'Die freiwillige Antwortauswahl lässt keine Aussage über sämtliche Geförderte oder Berechtigte zu, und die fehlenden Antworten können systematisch verschieden sein.',
'Eine allgemeine Wachstumsaussage über dieselben Studiengänge wäre irreführend, weil der zusätzliche Studiengang im früheren Berichtsjahr gar nicht einbezogen war.'
];
const first=()=>beginNumeric(s,'n1','A',statements[0],denominator[0],limits[0],now);
const second=(e=first())=>appendNumericClaim(e,s,'n2','B',statements[1],denominator[1],limits[1],'n2',now+1);
const third=(e=second())=>appendNumericClaim(e,s,'n3','A',statements[2],denominator[2],limits[2],'n3',now+2);
const report='Der vorgelegte Bericht zur Studienförderung zeigt mehrere quantitative Entwicklungen, die nicht ohne Angabe ihrer jeweiligen Bezugsgröße zusammengefasst werden dürfen. In zwei jeweils tausend förderfähige Anträge umfassenden Runden nahm die Bewilligungsquote von zwanzig auf fünfundzwanzig Prozent zu. Dies entspricht fünf Prozentpunkten beziehungsweise einer relativen Zunahme von fünfundzwanzig Prozent, aber noch keinem Nachweis einer kausalen Wirkung bestimmter Förderregeln. Auch die Befragung erfordert eine klare Abgrenzung: Nur einhundertachtzig von dreihundert angeschriebenen geförderten Personen beteiligten sich. Von den Antwortenden äußerten sich einhundertfünfunddreißig positiv, was nicht die Zustimmung sämtlicher Berechtigter belegt.\n\nDaneben stieg die registrierte Anzahl der Erstanträge insgesamt von fünfhundert auf fünfhundertsechzig. In der aktuellen Runde zählte das Referat jedoch erstmals fünfunddreißig Bewerbungen eines weiteren Studiengangs. Bei gleichem fachlichem Zuschnitt verbleibt damit eine wesentlich geringere Zunahme. Die künftige Berichterstattung sollte deshalb die fachlichen Grenzen, die jeweiligen Nenner und die unterschiedlichen Veränderungen explizit benennen, bevor daraus Folgerungen für die Gestaltung der Förderung gezogen werden.';
const why='Ich habe die relative Veränderung explizit von der Prozentpunktdifferenz getrennt, die Teilnehmenden der Befragung nicht mit allen Berechtigten gleichgesetzt und den durch einen neuen Studiengang veränderten Zählumfang berücksichtigt.';
const transfer=(e=third())=>appendNumericReport(e,s,'TRANSFER',report,why,'n1','report',now+3);
test('four original C1/C2 datasets have twelve paragraph-literal numeracy claims and unapproved DEMO_ONLY rights',()=>{
 assert.equal(numericStudies.length,4);const ids=new Set(),bands=new Set();
 for(const x of numericStudies){assert.match(x.id,/^SG-G09N-\d{3}$/);assert.ok(!ids.has(x.id));ids.add(x.id);bands.add(x.band);
 assert.equal(x.status,'DEMO_ONLY');assert.equal(x.authorship,'AI_DRAFT');assert.equal(x.editorialApproval,false);assert.equal(x.rights.kind,'ORIGINAL_DRAFT');assert.equal(x.paragraphs.length,3);assert.equal(x.claims.length,3);
 for(const c of x.claims)assert.ok(x.paragraphs.find(p=>p.id===c.paragraphId)?.text.includes('„'+c.quote+'“'));}
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.ok(!allItems.some(x=>x.id.startsWith('SG-G09N')));
});
test('first record preserves original numerator, denominator, limited conclusion and source identity',()=>{
 const e=first();assert.equal(e.id,numericId(s.id));assert.ok(isNumericEntry(e));assert.equal(numericSource(e)?.id,s.id);assert.equal(e.evaluated,'UNASSESSED');assert.equal(e.revisions.length,0);
 assert.equal(firstNumericEvidence(e)?.statement,statements[0]);assert.equal(firstNumericEvidence(e)?.paragraphId,'p1');assert.equal(archiveKind(e),'G09_NUMERIC');assert.equal(archiveRow(e).scope,'G09');
 assert.equal(firstNumericEvidence({...e,sourceId:'altered'}),null);assert.equal(firstNumericEvidence({...e,decisionId:'n1|A|p3'}),null);
});
test('reject copy, duplicated fields, invalid option, bad source anchor and skipped claim',()=>{
 const c=s.claims[0];assert.equal(independentNumeric(c,statements[0],denominator[0],limits[0]),true);
 assert.equal(independentNumeric(c,statements[0],statements[0],limits[0]),false);
 assert.equal(independentNumeric(c,c.quote+' '+statements[0],denominator[0],limits[0]),false);
 assert.equal(independentNumeric(c,statements[0],denominator[0],denominator[0]),false);
 assert.throws(()=>beginNumeric(s,'n3','A',statements[0],denominator[0],limits[0],now),/erforderlich/);
 assert.throws(()=>beginNumeric(s,'n1','X' as never,statements[0],denominator[0],limits[0],now),/erforderlich/);
 assert.throws(()=>appendNumericClaim(first(),s,'n3','A',statements[2],denominator[2],limits[2],'skip',now+1),/Reihenfolge/);
});
test('second and third source claims are appended without altering independent first response',()=>{
 const e=first(),two=second(e),three=third(two);assert.equal(e.revisions.length,0);assert.equal(two.revisions.length,1);assert.equal(three.revisions.length,2);assert.equal(three.original,e.original);
 assert.equal(savedNumericEvidence(two,s.claims[1])?.choice,'B');assert.equal(savedNumericEvidence(two,s.claims[1])?.paragraphId,'p2');assert.equal(savedNumericEvidence(two,s.claims[1])?.denominator,denominator[1]);
 assert.equal(nextNumericClaim(s,three),null);assert.throws(()=>appendNumericClaim(two,s,'n2','B',statements[1],denominator[1],limits[1],'duplicate',now+4),/Reihenfolge/);
});
test('full-context report requires all evidence, independent rationale, and append-only changed revision',()=>{
 assert.throws(()=>appendNumericReport(first(),s,'TRANSFER',report,why,'n1','early',now+3),/fehlt/);
 assert.throws(()=>appendNumericReport(third(),s,'REWRITE',report,why,'n1','no previous',now+3),/fehlt/);
 assert.throws(()=>appendNumericReport(third(),s,'TRANSFER',report,'short','n1','no rationale',now+3),/fehlt/);
 const e=transfer();assert.equal(latestNumericReport(e)?.paragraphId,'p1');assert.throws(()=>appendNumericReport(e,s,'REWRITE',report,why,'n1','same',now+4),/fehlt/);
 const revised=appendNumericReport(e,s,'REWRITE',report+' Eine weitergehende Aussage über den Erfolg einer Reform braucht zusätzlich vergleichbare Kohorten und nachprüfbare Auswahlkriterien.',why,'n3','revision',now+4);
 assert.equal(revised.original,e.original);assert.deepEqual(revised.revisions.slice(0,3),e.revisions);assert.equal(versionPair(revised,3)?.previous,report);
 assert.equal(archiveRows([revised],{kind:'G09_NUMERIC',activity:'REVISED',period:'ALL',search:'Kohorten',now:now+5}).length,1);
});
test('progress reflects authored evidence not CEFR grading or automated math confidence',()=>{
 assert.deepEqual(numericProgress([]),{started:0,claims:0,transferred:0,revised:0,total:4});
 assert.deepEqual(numericProgress([first()]),{started:1,claims:1,transferred:0,revised:0,total:4});
 assert.deepEqual(numericProgress([third()]),{started:1,claims:3,transferred:0,revised:0,total:4});
 assert.deepEqual(numericProgress([transfer()]),{started:1,claims:3,transferred:1,revised:0,total:4});
 assert.equal(nextNumericStudy([first()]).id,s.id);assert.equal(nextNumericStudy([transfer()]).id,numericStudies[1].id);
});
test('unchanged backup v3 retains source identifiers, original German text and append-only proof',async()=>{
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const json=await buildPortableBackup(records),back=await inspectPortableBackup(json);assert.equal(back.version,BACKUP_VERSION);assert.deepEqual(back.records.productionEntries,records.productionEntries);
 await assert.rejects(()=>inspectPortableBackup(json.replace('Förderung','Forderung')),/Integritätsprüfung/);
});
test('review queue holds exactly four documents and twelve quantitative claim analyses without independent signoff',()=>{
 const rows=collect().filter(x=>x.mode==='G09_NUMERIC');assert.equal(rows.length,16);
 assert.equal(rows.filter(x=>x.type==='G09_ORIGINAL_NUMERICAL_SOURCE').length,4);assert.equal(rows.filter(x=>x.type==='G09_QUANTITATIVE_CLAIM').length,12);
 assert.ok(rows.every(x=>x.status==='DEMO_ONLY'&&x.independentEditorialApproval===false));
});
