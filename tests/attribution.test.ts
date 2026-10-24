import test from 'node:test';
import assert from 'node:assert/strict';
import {attributionStudies,attributionId,isAttributionEntry,attributionSource,independentAttribution,beginAttribution,appendAttributionAnchor,appendAttributionText,firstAttributionEvidence,savedAttributionEvidence,nextAttributionAnchor,latestAttributionText,attributionProgress,nextAttributionStudy} from '../src/domain/attribution/attribution.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry.ts';
const s=attributionStudies[0],at=Date.UTC(2026,9,24,14),quote=(n:number)=>'„'+s.anchors[n].quote+'“';
const para=[
'Die Projektkoordinatorin erläuterte, die Untersuchung habe bislang nur die technisch erreichbaren Häuser einbezogen und mache keine Aussage zu den übrigen Gebäuden.',
'Nach Angaben der Mietendenvertretung komme eine Unterstützung erst in Betracht, wenn nachvollziehbare Angaben über die voraussichtlichen laufenden Betriebskosten vorlägen.',
'Der Ausschussvorsitzende begrenzte den aktuellen Finanzbeschluss ausdrücklich auf den Prüfauftrag, über den eigentlichen Bau sei damit noch nicht entschieden.'
];
const embedded=[
'Die Projektkoordinatorin umschrieb den Umfang der ersten Erhebung mit den Worten '+quote(0)+' Diese Abgrenzung ist für die Interpretation des Berichts entscheidend.',
'Die Mietendenvertretung knüpfte ihre mögliche Mitwirkung ausdrücklich an eine Bedingung: '+quote(1)+' Daraus folgt gerade noch keine endgültige Position.',
'Mit der Aussage '+quote(2)+' umriss der Ausschussvorsitzende den engen Gegenstand der Sitzung und ihre begrenzte Zuständigkeit.'
];
const limits=[
'Aus einer Erhebung unter technisch erreichbaren Häusern folgt nicht, dass bereits eine Anschlusszusage für alle Grundstücke existiert oder eine genehmigte Bauplanung vorliegt.',
'Die Forderung nach transparenten Betriebskosten stellt keine Zustimmung der Mietendenvertretung zu einem unbekannten Preis oder fertigen Anschlussmodell dar.',
'Die Zustimmung zur Finanzierung einer Vorprüfung darf weder als Bauauftrag noch als schon erfolgte Genehmigung des langfristigen Betriebs ausgegeben werden.'
];
const first=()=>beginAttribution(s,'q1','A',para[0],embedded[0],limits[0],at);
const second=(e=first())=>appendAttributionAnchor(e,s,'q2','B',para[1],embedded[1],limits[1],'q2-revision',at+1);
const third=(e=second())=>appendAttributionAnchor(e,s,'q3','A',para[2],embedded[2],limits[2],'q3-revision',at+2);
const draft='Die erste Untersuchung zu einem möglichen Quartierswärmenetz bleibt nach Angaben der Projektkoordination in ihrer Aussagekraft begrenzt. Die Projektkoordinatorin erläuterte, dass nur ein Teil der Häuser hinsichtlich der technischen Erreichbarkeit berücksichtigt worden sei. Sie betonte: '+quote(0)+' Damit ist insbesondere keine verbindliche Anschlussentscheidung für alle Gebäude dokumentiert. Die Mietendenvertretung fordert vor einer möglichen Unterstützung transparente Angaben zu den Betriebskosten. Diese Forderung darf nicht als bereits erteilte Zustimmung dargestellt werden. Schließlich hat der Haushaltsausschuss lediglich die Finanzierung einer Vorprüfung beschlossen; ein gesonderter Beschluss über die Errichtung und den Betrieb steht aus. Die Aussagen der drei Stellen unterscheiden sich in ihrer jeweiligen Verantwortung und dem Umfang ihres Anspruchs.';
const reason='Die Projektkoordinatorin berichtet über den Zuschnitt der Erhebung, die Mietendenvertretung formuliert eine Bedingung, und der Ausschuss handelt nur im Rahmen des Prüfauftrags. Keine dieser Aussagen ersetzt einen späteren Ratsbeschluss.';
const transfer=(e=third())=>appendAttributionText(e,s,'TRANSFER',draft,reason,'q1','first-draft',at+3);
test('12 direct fictional quotes across four full-context G11 documents have literal anchors and independent review gates',()=>{
 assert.equal(attributionStudies.length,4);const ids=new Set(),bands=new Set(),allSpeakers=new Set();
 for(const x of attributionStudies){assert.match(x.id,/^SG-G11Q-\d{3}$/);assert.ok(!ids.has(x.id));ids.add(x.id);bands.add(x.band);assert.equal(x.editorialApproval,false);
  assert.equal(x.status,'DEMO_ONLY');assert.equal(x.authorship,'AI_DRAFT');assert.equal(x.rights.kind,'ORIGINAL_DRAFT');assert.equal(x.paragraphs.length,3);assert.equal(x.anchors.length,3);
  for(const a of x.anchors){assert.ok(x.paragraphs.find(p=>p.id===a.paragraphId)?.text.includes('„'+a.quote+'“'));allSpeakers.add(a.speaker);}
 }
 assert.ok(allSpeakers.size>=10);assert.deepEqual([...bands].sort(),['C1','C2']);assert.ok(!allItems.some(i=>i.id.startsWith('SG-G11Q-')));
});
test('first original record anchors speaker and exact quotation, remains immutable and ungraded',()=>{
 const e=first();assert.equal(e.id,attributionId(s.id));assert.equal(isAttributionEntry(e),true);assert.equal(attributionSource(e)?.id,s.id);
 assert.equal(e.evaluated,'UNASSESSED');assert.equal(firstAttributionEvidence(e)?.paragraphId,'p1');assert.equal(firstAttributionEvidence(e)?.embedded,embedded[0]);assert.equal(e.revisions.length,0);
 assert.equal(archiveKind(e),'G11_ATTRIBUTION');assert.equal(archiveRow(e).scope,'G11');assert.equal(firstAttributionEvidence({...e,sourceId:'wrong'}),null);assert.equal(firstAttributionEvidence({...e,decisionId:'q1|A|p2'}),null);
});
test('reject altered or omitted direct quotation, copied paraphrase, unsupported choice and skipped operation',()=>{
 const a=s.anchors[0];assert.equal(independentAttribution(a,para[0],embedded[0],limits[0]),true);
 assert.equal(independentAttribution(a,para[0],embedded[0].replace(a.quote,a.quote.toUpperCase()),limits[0]),false);
 assert.equal(independentAttribution(a,para[0]+' '+a.quote,embedded[0],limits[0]),false);
 assert.equal(independentAttribution(a,para[0],para[0],limits[0]),false);
 assert.throws(()=>beginAttribution(s,'q3','A',para[0],embedded[0],limits[0],at),/erforderlich/);
 assert.throws(()=>beginAttribution(s,'q1','C' as never,para[0],embedded[0],limits[0],at),/erforderlich/);
 assert.throws(()=>appendAttributionAnchor(first(),s,'q3','B',para[2],embedded[2],limits[2],'skip',at+1),/fehlt/);
});
test('additional speaker traces store separate direct and indirect source representations without changing first answer',()=>{
 const e=first(),two=second(e),three=third(two);
 assert.equal(e.revisions.length,0);assert.equal(two.revisions.length,1);assert.equal(three.revisions.length,2);assert.equal(three.original,e.original);
 assert.equal(two.revisions[0].paragraphId,'p2');assert.equal(savedAttributionEvidence(two,s.anchors[1])?.choice,'B');assert.equal(savedAttributionEvidence(two,s.anchors[1])?.embedded,embedded[1]);
 assert.equal(nextAttributionAnchor(s,three),null);assert.throws(()=>appendAttributionAnchor(two,s,'q2','B',para[1],embedded[1],limits[1],'duplicate',at+4),/fehlt/);
});
test('authored source-integrated writing needs an unchanged original quote and meaningful independent revision',()=>{
 assert.throws(()=>appendAttributionText(first(),s,'TRANSFER',draft,reason,'q1','early',at+3),/fehlt/);
 assert.throws(()=>appendAttributionText(third(),s,'REWRITE',draft,reason,'q1','early',at+3),/fehlt/);
 assert.throws(()=>appendAttributionText(third(),s,'TRANSFER',draft.replace(quote(0),'nicht belegte Kurzform'),reason,'q1','noquote',at+3),/fehlt/);
 const e=transfer();assert.equal(latestAttributionText(e)?.paragraphId,'p1');
 assert.throws(()=>appendAttributionText(e,s,'REWRITE',draft,reason,'q1','same',at+4),/fehlt/);
 const revised=appendAttributionText(e,s,'REWRITE',draft+' Eine Freigabe kann deshalb erst Gegenstand eines gesonderten Beschlussverfahrens werden.',reason,'q3','rewrite',at+4);
 assert.equal(revised.original,e.original);assert.deepEqual(revised.revisions.slice(0,3),e.revisions);
 assert.equal(versionPair(revised,3)?.previous,draft);
 assert.equal(archiveRows([revised],{kind:'G11_ATTRIBUTION',activity:'REVISED',period:'ALL',search:'gesonderten Beschlussverfahrens',now:at+5}).length,1);
});
test('progress reflects only genuinely saved source attribution, not CEFR credit',()=>{
 assert.deepEqual(attributionProgress([]),{started:0,anchors:0,transferred:0,revised:0,total:4});
 assert.deepEqual(attributionProgress([first()]),{started:1,anchors:1,transferred:0,revised:0,total:4});
 assert.deepEqual(attributionProgress([third()]),{started:1,anchors:3,transferred:0,revised:0,total:4});
 assert.deepEqual(attributionProgress([transfer()]),{started:1,anchors:3,transferred:1,revised:0,total:4});
 assert.equal(nextAttributionStudy([first()]).id,s.id);assert.equal(nextAttributionStudy([transfer()]).id,attributionStudies[1].id);
});
test('backup v3 roundtrips direct quotations, history and source identity without a new store',async()=>{
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const json=await buildPortableBackup(records),restored=await inspectPortableBackup(json);
 assert.equal(restored.version,BACKUP_VERSION);assert.deepEqual(restored.records.productionEntries,records.productionEntries);
 await assert.rejects(()=>inspectPortableBackup(json.replace('Quartierswärmenetz','Gebäudenetz')),/Integritätsprüfung/);
});
test('G11 worklist retains four original documents and twelve source quotes without editorial approval',()=>{
 const queue=collect().filter(x=>x.mode==='G11_ATTRIBUTION');assert.equal(queue.length,16);
 assert.equal(queue.filter(x=>x.type==='G11_ORIGINAL_ATTRIBUTION_DOCUMENT').length,4);
 assert.equal(queue.filter(x=>x.type==='G11_QUOTE_PARAPHRASE_INTEGRATION').length,12);
 assert.ok(queue.every(x=>x.status==='DEMO_ONLY'&&x.independentEditorialApproval===false));
});
