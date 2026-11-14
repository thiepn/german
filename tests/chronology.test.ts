import test from 'node:test';
import assert from 'node:assert/strict';
import {chronologyStudies,chronologyId,isChronologyEntry,chronologySource,independentChronology,beginChronology,appendChronologyClaim,appendChronologyReport,firstChronologyEvidence,savedChronologyEvidence,nextChronologyClaim,latestChronologyReport,chronologyProgress,nextChronologyStudy} from '../src/domain/chronology/chronology.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry.ts';
const s=chronologyStudies[0],at=Date.UTC(2026,9,26,18);
const statements=[
'Die Geschäftsstelle hat die Forschungsunterlagen am Montag lediglich technisch in Empfang genommen; dies eröffnet die Prüfphase, ohne die Dateien inhaltlich oder rechtlich freizugeben.',
'Die am Dienstag beendete Fachprüfung reicht für eine Veröffentlichung noch nicht aus, weil die Rechteprüfung einen ausstehenden Vermerk enthält und eine Freigaberunde voraussetzt.',
'Die für Donnerstag geplante Entscheidung ist tatsächlich nicht erfolgt, weil der erforderliche Nachweis noch fehlte und deshalb eine spätere Sitzung erforderlich ist.'
];
const prerequisites=[
'Der Eingang am Montag ist als Datum des Zugangs dokumentiert; zur weiteren Bearbeitung sind danach eigenständige Inhalts- und Rechteprüfungen nötig.',
'Die Freigaberunde setzt zwei vollständig vorliegende Prüfvermerke voraus, sodass sie vor Abschluss des rechtlichen Teils noch nicht stattfinden darf.',
'Zunächst muss der offene Rechtevermerk geklärt und sodann ein neuer Sitzungstermin bestätigt werden, bevor das Gremium eine Entscheidung treffen kann.'
];
const limits=[
'Ein technischer Zeitstempel sichert noch keinen Veröffentlichungstermin; der erwähnte Freitag war nur ein Plan und keine verbindliche Zusage an Dritte.',
'Das Vorbereiten einer Pressemitteilung ist ausdrücklich keine Erlaubnis zu deren Versand, solange das Freigabegremium noch nicht entscheiden durfte.',
'Die bloße Ankündigung des früheren Sitzungstages begründet keine rückwirkende Zustimmung; eine externe Veröffentlichung bleibt ausdrücklich zurückgestellt.'
];
const initial=()=>beginChronology(s,'t1','A',statements[0],prerequisites[0],limits[0],at);
const second=(e=initial())=>appendChronologyClaim(e,s,'t2','B',statements[1],prerequisites[1],limits[1],'step2',at+1);
const third=(e=second())=>appendChronologyClaim(e,s,'t3','A',statements[2],prerequisites[2],limits[2],'step3',at+2);
const memo='Am Montag wurden die Unterlagen einer gemeinsamen Erhebung technisch an das Forschungsarchiv übermittelt. Die Geschäftsstelle hat den Eingang bestätigt und damit lediglich einen Beginn des weiteren Prüfverfahrens dokumentiert. Eine inhaltliche Prüfung oder rechtliche Freigabe war damit noch nicht verbunden. Der ursprünglich für Freitag genannte Veröffentlichungstermin war eine Planung, kein verbindlicher Beschluss. Am Dienstag wurde die fachliche Prüfung teilweise abgeschlossen, während die Rechteprüfung wegen eines noch ausstehenden Nachweises am Mittwoch nicht abgeschlossen war. Nach der vereinbarten Verfahrensordnung darf das Freigabegremium erst tätig werden, wenn beide Prüfvermerke tatsächlich vorliegen.\n\nFür Donnerstag war eine Freigabesitzung vorgesehen, doch aufgrund des weiter fehlenden Dokuments wurde die Entscheidung ausdrücklich vertagt. Der neue Termin ist noch unbestimmt. Das Projektteam darf geprüfte Metadaten intern vorbereiten, jedoch weder öffentlich verbreiten noch eine Freigabe als bereits erteilt darstellen. Die weitere Reihenfolge lautet zunächst Rechteklärung, danach dokumentierte Freigaberunde und erst bei positiver Entscheidung eine externe Veröffentlichung. Der frühere Freitagstermin darf nicht als bestehende Zusage kommuniziert werden.';
const why='Ich habe den technischen Eingang vom Prüfabschluss getrennt, die beiden notwendigen Vermerke vor die Freigabesitzung gestellt und die tatsächlich vertagte Entscheidung nicht als nachträgliche Zusage dargestellt.';
const full=(e=third())=>appendChronologyReport(e,s,'TRANSFER',memo,why,'t1','transfer',at+3);
test('four original multi-paragraph source cases and twelve literal time-logic anchors remain rights-gated',()=>{
 assert.equal(chronologyStudies.length,4);const ids=new Set(),bands=new Set();
 for(const x of chronologyStudies){assert.match(x.id,/^SG-G09T-\d{3}$/);assert.ok(!ids.has(x.id));ids.add(x.id);bands.add(x.band);
  assert.equal(x.status,'DEMO_ONLY');assert.equal(x.authorship,'AI_DRAFT');assert.equal(x.editorialApproval,false);assert.equal(x.rights.kind,'ORIGINAL_DRAFT');assert.equal(x.paragraphs.length,3);assert.equal(x.claims.length,3);
  for(const y of x.claims)assert.ok(x.paragraphs.find(p=>p.id===y.paragraphId)?.text.includes('„'+y.quote+'“'));
 }
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.ok(!allItems.some(x=>x.id.startsWith('SG-G09T-')));
});
test('immutable first procedural step retains source reference, exact selection and unassessed state',()=>{
 const e=initial();assert.equal(e.id,chronologyId(s.id));assert.ok(isChronologyEntry(e));assert.equal(chronologySource(e)?.id,s.id);assert.equal(e.evaluated,'UNASSESSED');
 assert.equal(firstChronologyEvidence(e)?.statement,statements[0]);assert.equal(firstChronologyEvidence(e)?.paragraphId,'p1');assert.equal(archiveKind(e),'G09_CHRONOLOGY');assert.equal(archiveRow(e).scope,'G09');
 assert.equal(firstChronologyEvidence({...e,sourceId:'unknown'}),null);assert.equal(firstChronologyEvidence({...e,decisionId:'t1|A|p3'}),null);
});
test('invalid chronology option, copied quotation, repeated fields and premature stage are rejected',()=>{
 assert.equal(independentChronology(s.claims[0],statements[0],prerequisites[0],limits[0]),true);
 assert.equal(independentChronology(s.claims[0],statements[0],statements[0],limits[0]),false);
 assert.equal(independentChronology(s.claims[0],s.claims[0].quote+' '+statements[0],prerequisites[0],limits[0]),false);
 assert.throws(()=>beginChronology(s,'t3','A',statements[0],prerequisites[0],limits[0],at),/erforderlich/);
 assert.throws(()=>beginChronology(s,'t1','X' as never,statements[0],prerequisites[0],limits[0],at),/erforderlich/);
 assert.throws(()=>appendChronologyClaim(initial(),s,'t3','A',statements[2],prerequisites[2],limits[2],'skip',at+1),/Reihenfolge/);
});
test('subsequent anchored steps append to original source identity in strict order',()=>{
 const a=initial(),b=second(a),c=third(b);assert.equal(a.revisions.length,0);assert.equal(b.revisions.length,1);assert.equal(c.revisions.length,2);assert.equal(c.original,a.original);
 assert.equal(savedChronologyEvidence(b,s.claims[1])?.choice,'B');assert.equal(savedChronologyEvidence(b,s.claims[1])?.paragraphId,'p2');
 assert.equal(nextChronologyClaim(s,c),null);assert.throws(()=>appendChronologyClaim(b,s,'t2','B',statements[1],prerequisites[1],limits[1],'again',at+5),/Reihenfolge/);
});
test('independent source-bound status memo requires three evidence steps and meaningful append-only edits',()=>{
 assert.throws(()=>appendChronologyReport(initial(),s,'TRANSFER',memo,why,'t1','early',at+3),/fehlt/);
 assert.throws(()=>appendChronologyReport(third(),s,'REWRITE',memo,why,'t1','no original',at+3),/fehlt/);
 assert.throws(()=>appendChronologyReport(third(),s,'TRANSFER',memo,'kurz','t1','no rationale',at+3),/fehlt/);
 const e=full();assert.equal(latestChronologyReport(e)?.paragraphId,'p1');
 assert.throws(()=>appendChronologyReport(e,s,'REWRITE',memo,why,'t1','same',at+4),/fehlt/);
 const newer=appendChronologyReport(e,s,'REWRITE',memo+' Der Zeitpunkt der neuen Sitzung muss gesondert bestätigt werden, bevor ein belastbarer Veröffentlichungstermin genannt werden kann.',why,'t3','rewrite',at+4);
 assert.equal(newer.original,e.original);assert.deepEqual(newer.revisions.slice(0,3),e.revisions);assert.equal(versionPair(newer,3)?.previous,memo);
 assert.equal(archiveRows([newer],{kind:'G09_CHRONOLOGY',activity:'REVISED',period:'ALL',search:'gesondert bestätigt',now:at+5}).length,1);
});
test('progress counts learner-authored evidence, draft and revision without CEFR awards',()=>{
 assert.deepEqual(chronologyProgress([]),{started:0,claims:0,transferred:0,revised:0,total:4});
 assert.deepEqual(chronologyProgress([initial()]),{started:1,claims:1,transferred:0,revised:0,total:4});
 assert.deepEqual(chronologyProgress([third()]),{started:1,claims:3,transferred:0,revised:0,total:4});
 assert.deepEqual(chronologyProgress([full()]),{started:1,claims:3,transferred:1,revised:0,total:4});
 assert.equal(nextChronologyStudy([initial()]).id,s.id);assert.equal(nextChronologyStudy([full()]).id,chronologyStudies[1].id);
});
test('native backup v3 retains initial source evidence and append-only written argument in existing productionEntries',async()=>{
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[full()],missions:[]};
 const raw=await buildPortableBackup(records),parsed=await inspectPortableBackup(raw);assert.equal(parsed.version,BACKUP_VERSION);assert.deepEqual(parsed.records.productionEntries,records.productionEntries);
 await assert.rejects(()=>inspectPortableBackup(raw.replace('Forschungsarchiv','Forschungsarchivs')),/Integritätsprüfung/);
});
test('new editorial queue has four full original sources and twelve unapproved detailed temporal interpretation tasks',()=>{
 const q=collect().filter(x=>x.mode==='G09_CHRONOLOGY');assert.equal(q.length,16);
 assert.equal(q.filter(x=>x.type==='G09_ORIGINAL_PROCEDURAL_SOURCE').length,4);
 assert.equal(q.filter(x=>x.type==='G09_CONDITIONAL_CHRONOLOGY').length,12);
 assert.ok(q.every(x=>x.status==='DEMO_ONLY'&&x.independentEditorialApproval===false));
});
