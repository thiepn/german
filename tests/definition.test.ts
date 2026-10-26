import test from 'node:test';
import assert from 'node:assert/strict';
import {definitionStudies,definitionId,isDefinitionEntry,definitionSource,independentDefinition,beginDefinition,appendDefinitionDistinction,appendDefinitionReport,firstDefinitionEvidence,savedDefinitionEvidence,nextDefinitionDistinction,latestDefinitionReport,definitionProgress,nextDefinitionStudy} from '../src/domain/definition/definition.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry.ts';
const s=definitionStudies[0],time=Date.UTC(2026,9,26,20);
const definitions=[
'Die Arbeitsgruppe verwendet Transparenz für die öffentliche Sichtbarkeit jener Merkmale und Regeln, die eine automatisierte Weiterleitung von Anfragen grundsätzlich beeinflussen können.',
'Im Bericht bedeutet Nachvollziehbarkeit die rückblickende Rekonstruktion eines einzelnen Zuordnungswegs mithilfe dokumentierter Eingaben, Versionsstände und Ausgabeschritte.',
'Erklärbarkeit bezeichnet hier die adressatengerechte Auskunft dazu, welche konkrete Regel im jeweiligen Vorgang wirksam war und welche Korrekturmöglichkeit besteht.'
];
const contrasts=[
'Eine veröffentlichte Liste allgemeiner Kriterien ist noch keine Nachvollziehbarkeit eines Einzelfalls, denn dieser benötigt eigene Eingaben, Regelversionen und Protokolle.',
'Die Wiederherstellung eines protokollierten Ablaufs liefert nicht zwingend eine verständliche oder sachlich angemessene Begründung für die betroffene Person.',
'Eine verständliche fallbezogene Erklärung geht über die reine Offenlegung allgemeiner Kriterien hinaus und beweist auch nicht die materielle Richtigkeit aller Zuordnungen.'
];
const applications=[
'Wenn ein Bürger allein auf einer Webseite die Sortierkriterien nachlesen kann, liegt ein transparenter Überblick vor; der tatsächliche Verlauf seines Vorgangs bleibt damit ungeklärt.',
'Liegt für einen bestrittenen Fall eine ausführliche Abfolge von Eingaben und verwendeten Regeln vor, kann man den Weg rekonstruieren, auch wenn sein Nutzen noch strittig ist.',
'Eine an eine betroffene Bürgerin gerichtete Erläuterung kann das relevante Entscheidungskriterium verständlich machen, ohne daraus eine allgemeine Qualitätsgarantie abzuleiten.'
];
const begin=()=>beginDefinition(s,'d1','A',definitions[0],contrasts[0],applications[0],time);
const second=(e=begin())=>appendDefinitionDistinction(e,s,'d2','B',definitions[1],contrasts[1],applications[1],'d2',time+1);
const third=(e=second())=>appendDefinitionDistinction(e,s,'d3','A',definitions[2],contrasts[2],applications[2],'d3',time+2);
const memo='Im Bericht zur automatisierten Weiterleitung kommunaler Anfragen werden drei verwandte Begriffe ausdrücklich mit verschiedenen Prüffragen verbunden. Transparenz betrifft zunächst die öffentlich verfügbare Information darüber, welche Kriterien die Grundlogik des Systems beeinflussen können. Eine Regelübersicht auf der Webseite macht diese allgemeine Vorgehensweise sichtbar, lässt aber ohne weitere Daten nicht erkennen, welche Eingabe bei einer einzelnen Person zu einer konkreten Zuordnung führte. Für diese zweite Frage verwendet der Bericht den Begriff Nachvollziehbarkeit. Ein Vorgangsprotokoll mit den maßgeblichen Eingaben und der verwendeten Regelversion erlaubt eine Rekonstruktion des dokumentierten Ablaufs, ohne dessen Angemessenheit schon zu begründen.\n\nErklärbarkeit bezeichnet dagegen eine verständliche fallbezogene Erläuterung, die ein angewandtes Kriterium, die betroffene Eingabe und eine mögliche Korrektur zusammenführt. Eine allgemeine Liste transparenter Kriterien allein ersetzt diese individuelle Auskunft nicht. Ebenso wenig beweist die Verständlichkeit einer Erläuterung bereits die materielle Richtigkeit der Entscheidung. Bei öffentlichen Angaben sollte deshalb eindeutig zwischen Offenlegung, Rekonstruktion und begründender Kommunikation unterschieden werden. Die frühere Gleichsetzung von Transparenz und vollständiger Prüfbarkeit jedes Vorgangs wäre demnach unzutreffend.';
const why='Die erste Version verwechselt teilweise die bloße Offenlegung des Regelwerks mit der Rekonstruktion von Einzelentscheidungen. Ich habe die funktional unterschiedlichen Begriffe separat definiert und einen Grenzfall konkret benannt.';
const transfer=(e=third())=>appendDefinitionReport(e,s,'TRANSFER',memo,why,'d1','transfer',time+3);
test('four original substantial C1–C2 sources contain 12 literally anchored distinct conceptual boundaries under editorial holds',()=>{
 assert.equal(definitionStudies.length,4);const ids=new Set(),bands=new Set(),terms=new Set();
 for(const x of definitionStudies){assert.match(x.id,/^SG-G06B-\d{3}$/);assert.ok(!ids.has(x.id));ids.add(x.id);bands.add(x.band);
  assert.equal(x.status,'DEMO_ONLY');assert.equal(x.authorship,'AI_DRAFT');assert.equal(x.editorialApproval,false);assert.equal(x.rights.kind,'ORIGINAL_DRAFT');assert.equal(x.paragraphs.length,3);assert.equal(x.distinctions.length,3);
  for(const d of x.distinctions){assert.ok(x.paragraphs.find(p=>p.id===d.paragraphId)?.text.includes('„'+d.quote+'“'));terms.add(d.term);}
 }assert.deepEqual([...bands].sort(),['C1','C2']);assert.ok(terms.size>=10);assert.ok(!allItems.some(x=>x.id.startsWith('SG-G06B-')));
});
test('first definition preserves immutable original text, source version, paragraph and no proficiency claim',()=>{
 const e=begin();assert.equal(e.id,definitionId(s.id));assert.ok(isDefinitionEntry(e));assert.equal(definitionSource(e)?.id,s.id);assert.equal(e.evaluated,'UNASSESSED');assert.equal(e.revisions.length,0);
 assert.equal(firstDefinitionEvidence(e)?.definition,definitions[0]);assert.equal(firstDefinitionEvidence(e)?.paragraphId,'p1');assert.equal(archiveKind(e),'G06_DEFINITION');assert.equal(archiveRow(e).scope,'G06');
 assert.equal(firstDefinitionEvidence({...e,sourceId:'unknown'}),null);assert.equal(firstDefinitionEvidence({...e,decisionId:'d1|A|p2'}),null);
});
test('reject verbatim source duplication, collapsed independent fields, invalid option and out-of-order anchor',()=>{
 const c=s.distinctions[0];assert.equal(independentDefinition(c,definitions[0],contrasts[0],applications[0]),true);
 assert.equal(independentDefinition(c,definitions[0],definitions[0],applications[0]),false);
 assert.equal(independentDefinition(c,c.quote+' '+definitions[0],contrasts[0],applications[0]),false);
 assert.equal(independentDefinition(c,definitions[0],contrasts[0],contrasts[0]),false);
 assert.throws(()=>beginDefinition(s,'d3','A',definitions[0],contrasts[0],applications[0],time),/fehlen/);
 assert.throws(()=>beginDefinition(s,'d1','X' as never,definitions[0],contrasts[0],applications[0],time),/fehlen/);
 assert.throws(()=>appendDefinitionDistinction(begin(),s,'d3','A',definitions[2],contrasts[2],applications[2],'skip',time+1),/Reihenfolge/);
});
test('second and third conceptual boundary records append without rewriting prior evidence',()=>{
 const a=begin(),b=second(a),c=third(b);assert.equal(a.revisions.length,0);assert.equal(b.revisions.length,1);assert.equal(c.revisions.length,2);assert.equal(c.original,a.original);
 assert.equal(savedDefinitionEvidence(b,s.distinctions[1])?.choice,'B');assert.equal(savedDefinitionEvidence(b,s.distinctions[1])?.paragraphId,'p2');assert.equal(savedDefinitionEvidence(b,s.distinctions[1])?.contrast,contrasts[1]);
 assert.equal(nextDefinitionDistinction(s,c),null);
 assert.throws(()=>appendDefinitionDistinction(b,s,'d2','B',definitions[1],contrasts[1],applications[1],'again',time+5),/Reihenfolge/);
});
test('independently authored full-document terminological transfer and meaningful revision preserve original and diffs',()=>{
 assert.throws(()=>appendDefinitionReport(begin(),s,'TRANSFER',memo,why,'d1','early',time+3),/fehlt/);
 assert.throws(()=>appendDefinitionReport(third(),s,'REWRITE',memo,why,'d1','no first',time+3),/fehlt/);
 assert.throws(()=>appendDefinitionReport(third(),s,'TRANSFER',memo,'kurz','d1','no reason',time+3),/fehlt/);
 const e=transfer();assert.equal(latestDefinitionReport(e)?.paragraphId,'p1');
 assert.throws(()=>appendDefinitionReport(e,s,'REWRITE',memo,why,'d1','same',time+4),/fehlt/);
 const revised=appendDefinitionReport(e,s,'REWRITE',memo+' Der begrenzte Geltungsbereich der Arbeitsdefinitionen muss auch in der externen Kommunikation ausdrücklich erkennbar bleiben.',why,'d3','revised',time+4);
 assert.equal(revised.original,e.original);assert.deepEqual(revised.revisions.slice(0,3),e.revisions);assert.equal(versionPair(revised,3)?.previous,memo);
 assert.equal(archiveRows([revised],{kind:'G06_DEFINITION',activity:'REVISED',period:'ALL',search:'externe Kommunikation',now:time+5}).length,1);
});
test('observed progress tracks authored definitions, coherent memo and revision without CEFR grading',()=>{
 assert.deepEqual(definitionProgress([]),{started:0,distinctions:0,transferred:0,revised:0,total:4});
 assert.deepEqual(definitionProgress([begin()]),{started:1,distinctions:1,transferred:0,revised:0,total:4});
 assert.deepEqual(definitionProgress([third()]),{started:1,distinctions:3,transferred:0,revised:0,total:4});
 assert.deepEqual(definitionProgress([transfer()]),{started:1,distinctions:3,transferred:1,revised:0,total:4});
 assert.equal(nextDefinitionStudy([begin()]).id,s.id);assert.equal(nextDefinitionStudy([transfer()]).id,definitionStudies[1].id);
});
test('existing backup v3 preserves exact source context and original German writing without new stores',async()=>{
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const raw=await buildPortableBackup(records),back=await inspectPortableBackup(raw);assert.equal(back.version,BACKUP_VERSION);assert.deepEqual(back.records.productionEntries,records.productionEntries);
 await assert.rejects(()=>inspectPortableBackup(raw.replace('Transparenz','Transparens')),/Integritätsprüfung/);
});
test('sixteen source-and-anchor editorial dossiers remain unapproved and DEMO_ONLY',()=>{
 const rows=collect().filter(x=>x.mode==='G06_DEFINITION');assert.equal(rows.length,16);
 assert.equal(rows.filter(x=>x.type==='G06_ORIGINAL_CONCEPT_DEFINITION_SOURCE').length,4);
 assert.equal(rows.filter(x=>x.type==='G06_OPERATIONAL_DEFINITION_BOUNDARY').length,12);
 assert.ok(rows.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
