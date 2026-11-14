import test from 'node:test';
import assert from 'node:assert/strict';
import {relationStudies,relationId,isRelationEntry,relationSource,independentRelation,beginRelation,firstRelation,savedRelation,nextRelation,appendRelation,appendRelationMemo,latestRelationMemo,substantialRelationRevision,relationProgress,nextRelationStudy} from '../src/domain/relation/relation';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,BACKUP_STORES,type BackupRecords} from '../src/persistence/portableBackup';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry';
const study=relationStudies[0],at=Date.UTC(2026,9,30,12);
const rewrites=[
'Die gestiegenen Zugriffe lassen eine bessere Nutzung vermuten, dennoch bleibt die konkrete Objektsuche für viele Personen schwierig. Der Gegensatz wird anerkannt, aber nicht kausal erklärt.',
'Die zusätzliche Freigabe wurde verschoben, weil mehrere Bildrechte noch nicht geklärt waren; die ausdrücklich genannte Ursache liegt also vor der Verzögerung.',
'Nur unter der Voraussetzung geklärter Rechte kann eine einzelne Freigabe stattfinden; das eröffnet die Möglichkeit, aber nicht eine automatische Pflicht zur Veröffentlichung.'
];
const alternatives=[
'Eine unzutreffende Lesart würde die höheren Seitenaufrufe direkt dafür verantwortlich machen, dass die Suche nach bestimmten Objekten schwieriger geworden sei.',
'Eine alternative, in der Quelle nicht gestützte Beschreibung würde die Verzögerung selbst zum Grund für die zuvor ungeklärten Bildrechte machen.',
'Als falsche Lesart könnte man behaupten, das Museum habe bereits alle Bilder freigegeben und die noch fehlenden Rechte hätten überhaupt keine Bedeutung.'
];
const contexts=[
'Die Nutzungsstatistik belegt einen Anstieg der Seitenaufrufe, während der getrennte Nutzertest weiterhin die umständliche Suche nach einzelnen Objekten dokumentiert. Zwei Befunde bleiben nebeneinander bestehen.',
'Der technische Import war bereits abgeschlossen, aber die zuständige Fachperson musste noch verschiedene Bildrechte prüfen. Genau dieser ungeklärte rechtliche Zustand wird als Ursache der Freigabeverzögerung genannt.',
'Die Leitung beschloss ausdrücklich, einzelne Bildgruppen getrennt zu bearbeiten. Die Rechteklärung ermöglicht eine spätere Freigabe; andere organisatorische Schritte können dennoch ausstehen.'
];
const boundaries=[
'Daraus folgt nicht, dass die höheren Seitenaufrufe die Suchschwierigkeiten verursacht haben oder dass die Suche inzwischen für alle Nutzenden zuverlässig funktioniert.',
'Die Begründung nennt keinen verbindlichen späteren Freigabetermin und erlaubt nicht den Schluss, ein vollständiges Veröffentlichungsverbot gelte für andere Bilder.',
'Durch die bedingte Möglichkeit entsteht weder eine unbedingte Veröffentlichungserlaubnis noch ein einklagbares Versprechen, jeden Bestand ohne weitere Prüfung sofort freizuschalten.'
];
const memo='Der fiktive Bericht des Stadtmuseums muss drei verschiedene logische Beziehungen transparent halten. Die steigende Zahl der Seitenaufrufe ist ein positiver Reichweitenbefund. Trotzdem blieb die Suche nach bestimmten Objekten schwierig, wie der getrennte Nutzertest belegte. Der Konnektor obwohl drückt hier eine Einräumung aus: Die positive Entwicklung wird nicht bestritten, aus ihr folgt aber gerade nicht, dass die Erschließung der Bestände bereits zufriedenstellend wäre. Der Befund über Suchschwierigkeiten darf weder als Folge der höheren Zugriffszahlen noch als deren Widerlegung dargestellt werden. Für die Darstellung der Bildfreigaben ist dagegen eine ausdrückliche Begründung gegeben. Die ungeklärten Bildrechte verursachten die Verzögerung; das Wort weil macht ihre Rolle als Grund deutlich. Ein späterer Termin wird dabei nicht versprochen.\n\nDie geplante Veröffentlichung weiterer Bilder ist schließlich an einen eigenen konditionalen Rahmen geknüpft. Sofern die Rechte geklärt werden, können einzelne Bestände freigegeben werden. Das bedeutet nicht, dass sämtliche Bilder ohne weitere organisatorische Arbeit sofort erscheinen müssen. Eine verständliche Besucherinformation sollte die drei Beziehungen getrennt erklären: einen trotz positiver Entwicklung verbleibenden Mangel, den tatsächlich genannten Grund einer Verzögerung und eine Möglichkeit unter einer noch zu erfüllenden Voraussetzung. So bleiben Ursache, Einräumung und Bedingung auch bei verkürzter Darstellung erhalten.';
const why='Der Text trennt Konzessivität von Kausalität und Konditionalität. Die neue Zielgruppe benötigt eine ausdrückliche Erklärung dieser drei Geltungsgrenzen, ohne dass Reichweite als Ursache der Suchprobleme oder ein konditionaler Ausblick als Garantie ausgegeben wird.';
const revised=memo+'\n\nIn einer öffentlich lesbaren Museumsmitteilung würde ich zusätzlich den noch ausstehenden unabhängigen Nutzertest zur verbesserten Suchfunktion als eigenes Vorhaben benennen, ohne einen Erfolg zu behaupten. Eine spätere Freischaltung bleibt von Bildrechten und organisatorischer Prüfung abhängig. Diese Ergänzung klärt Zeitbezug, Zuständigkeit und die noch offenen Schritte für interessierte Besucherinnen und Besucher, ohne eine ungedeckte endgültige Veröffentlichung zu versprechen.';
const begin=()=>beginRelation(study,'r1','A',rewrites[0],alternatives[0],contexts[0],boundaries[0],at);
const second=(e=begin())=>appendRelation(e,study,'r2','B',rewrites[1],alternatives[1],contexts[1],boundaries[1],'relation-2',at+1);
const third=(e=second())=>appendRelation(e,study,'r3','A',rewrites[2],alternatives[2],contexts[2],boundaries[2],'relation-3',at+2);
const transfer=(e=third())=>appendRelationMemo(e,study,'TRANSFER',memo,why,'r1','memo',at+3);

test('four new distinct C1/C2 multi-paragraph relation dossiers, twelve literal anchors and DEMO_ONLY ownership',()=>{
 assert.equal(relationStudies.length,4);const ids=new Set<string>(),relations=new Set<string>(),bands=new Set<string>();let count=0,b=0;
 for(const s of relationStudies){
  assert.match(s.id,/^SG-G04R-\d{3}$/);assert.equal(ids.has(s.id),false);ids.add(s.id);bands.add(s.band);
  assert.equal(s.status,'DEMO_ONLY');assert.equal(s.authorship,'AI_DRAFT');assert.equal(s.reviewedBy,null);assert.equal(s.editorialApproval,false);assert.equal(s.rights.kind,'ORIGINAL_DRAFT');
  assert.equal(s.paragraphs.length,3);assert.equal(s.relations.length,3);
  for(const [i,q] of s.relations.entries()){
   const p=s.paragraphs[i];assert.ok(p.text.length>=780);assert.equal(q.paragraphId,p.id);assert.equal(p.text.split('„'+q.quote+'“').length,2);
   assert.equal(q.options.length,2);assert.notEqual(q.options[0].text,q.options[1].text);relations.add(q.relation);count++;if(q.preferredId==='B')b++;
  }
 }
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.equal(count,12);assert.ok(relations.size>=10);assert.equal(b,6);
 assert.equal(allItems.filter(item=>item.id.startsWith('SG-G04R-')).length,0);
});
test('first interpretation preserves immutable original, stable source reference, paragraph and ungraded answer',()=>{
 const e=begin();assert.equal(e.id,relationId(study.id));assert.ok(isRelationEntry(e));
 assert.equal(relationSource(e)?.id,study.id);assert.equal(e.itemVersion,1);assert.equal(e.revisions.length,0);assert.equal(e.evaluated,'UNASSESSED');
 assert.equal(firstRelation(e)?.rewrite,rewrites[0]);assert.equal(firstRelation(e)?.choice,'A');assert.equal(firstRelation(e)?.paragraphId,'p1');
 assert.equal(archiveKind(e),'G04_RELATION');assert.equal(archiveRow(e).scope,'G04');
 assert.equal(firstRelation({...e,sourceId:'invalid'}),null);assert.equal(firstRelation({...e,decisionId:'r1|A|p2'}),null);
});
test('source copying, collapsed independent fields, short explanation and out-of-order relations are rejected',()=>{
 const p=study.relations[0];assert.equal(independentRelation(p,rewrites[0],alternatives[0],contexts[0],boundaries[0]),true);
 assert.equal(independentRelation(p,rewrites[0],rewrites[0],contexts[0],boundaries[0]),false);
 assert.equal(independentRelation(p,p.quote+' '+rewrites[0],alternatives[0],contexts[0],boundaries[0]),false);
 assert.equal(independentRelation(p,rewrites[0],alternatives[0],'too short',boundaries[0]),false);
 assert.throws(()=>beginRelation(study,'r3','A',rewrites[0],alternatives[0],contexts[0],boundaries[0],at),/erforderlich/);
 assert.throws(()=>beginRelation(study,'r1','X' as never,rewrites[0],alternatives[0],contexts[0],boundaries[0],at),/erforderlich/);
 assert.throws(()=>appendRelation(begin(),study,'r3','A',rewrites[2],alternatives[2],contexts[2],boundaries[2],'skip',at+1),/Reihenfolge/);
});
test('three sequential source-linked records retain exact first writing and unpreferred selections without grading',()=>{
 const a=begin(),b=second(a),c=third(b);
 assert.equal(a.revisions.length,0);assert.equal(b.revisions.length,1);assert.equal(c.revisions.length,2);assert.equal(c.original,a.original);
 assert.equal(savedRelation(b,study.relations[1])?.choice,'B');assert.equal(savedRelation(c,study.relations[2])?.context,contexts[2]);assert.equal(nextRelation(study,c),null);
 assert.throws(()=>appendRelation(c,study,'r3','A',rewrites[2],alternatives[2],contexts[2],boundaries[2],'repeat',at+4),/Reihenfolge/);
 const unpreferred=beginRelation(study,'r1','B',rewrites[0],alternatives[0],contexts[0],boundaries[0],at);
 assert.equal(firstRelation(unpreferred)?.choice,'B');assert.equal(unpreferred.evaluated,'UNASSESSED');
});
test('independent full-document transfer and substantial revision preserve immutable source-linked evidence',()=>{
 assert.throws(()=>appendRelationMemo(begin(),study,'TRANSFER',memo,why,'r1','premature',at+3),/fehlt/);
 assert.throws(()=>appendRelationMemo(third(),study,'REWRITE',memo,why,'r1','premature',at+3),/fehlt/);
 assert.throws(()=>appendRelationMemo(third(),study,'TRANSFER',memo,'kurz','r1','short',at+3),/fehlt/);
 assert.throws(()=>appendRelationMemo(third(),study,'TRANSFER',memo,why,'wrong','bad',at+3),/fehlt/);
 const e=transfer();assert.equal(latestRelationMemo(e)?.questionId,'TRANSFER');
 assert.equal(substantialRelationRevision(memo,memo+' Ein kurzes Wort.'),false);
 assert.throws(()=>appendRelationMemo(e,study,'REWRITE',memo,why,'r1','same',at+4),/fehlt/);
 const r=appendRelationMemo(e,study,'REWRITE',revised,why,'r3','rewrite',at+4);
 assert.equal(r.original,e.original);assert.deepEqual(r.revisions.slice(0,3),e.revisions);assert.equal(versionPair(r,3)?.previous,memo);
 assert.equal(archiveRows([r],{kind:'G04_RELATION',activity:'REVISED',period:'ALL',search:'Museumsmitteilung',now:at+5}).length,1);
});
test('progress and next-study represent observed activity rather than CEFR grading',()=>{
 assert.deepEqual(relationProgress([]),{started:0,analyses:0,transferred:0,revised:0,total:4});
 assert.deepEqual(relationProgress([begin()]),{started:1,analyses:1,transferred:0,revised:0,total:4});
 assert.equal(relationProgress([third()]).analyses,3);assert.equal(relationProgress([transfer()]).transferred,1);
 assert.equal(nextRelationStudy([begin()]).id,study.id);assert.equal(nextRelationStudy([transfer()]).id,relationStudies[1].id);
 assert.equal(relationProgress([appendRelationMemo(transfer(),study,'REWRITE',revised,why,'r3','rewrite',at+4)]).revised,1);
});
test('unmodified eight-store backup v3 roundtrip and tamper detection',async()=>{
 assert.equal(BACKUP_STORES.length,8);assert.equal(BACKUP_VERSION,3);
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const raw=await buildPortableBackup(records),decoded=await inspectPortableBackup(raw);
 assert.equal(decoded.version,3);assert.deepEqual(decoded.records.productionEntries,records.productionEntries);
 const corrupted=raw.replace('Seitenaufrufe','SeitenaufrufEX');assert.notEqual(corrupted,raw);
 await assert.rejects(()=>inspectPortableBackup(corrupted),/Integritätsprüfung/);
});
test('four sources plus twelve relation anchors are in the unapproved editorial review queue',()=>{
 const rows=collect().filter(x=>x.mode==='G04_RELATION');assert.equal(rows.length,16);
 assert.equal(rows.filter(x=>x.type==='G04_ORIGINAL_RELATION_SOURCE').length,4);
 assert.equal(rows.filter(x=>x.type==='G04_CONNECTOR_RELATION').length,12);
 assert.ok(rows.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
