import test from 'node:test';
import assert from 'node:assert/strict';
import {attachmentStudies,attachmentId,isAttachmentEntry,attachmentSource,independentAttachment,beginAttachment,firstAttachment,savedAttachment,nextAttachment,appendAttachment,appendAttachmentMemo,latestAttachmentMemo,substantialAttachmentRevision,attachmentProgress,nextAttachmentStudy} from '../src/domain/attachment/attachment';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,BACKUP_STORES,type BackupRecords} from '../src/persistence/portableBackup';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry';

const study=attachmentStudies[0],time=Date.UTC(2026,9,30,9);
const rewrites=[
 'Die Gutachterin befestigte das Teleobjektiv an ihrer eigenen Kamera und nahm damit die Technikerin bei der Überprüfung der Baustelle auf.',
 'Bereits im November beriet der Ausschuss über die für das folgende Frühjahr geplante Sanierung der Sporthalle; Beratung und Bau sind getrennte Ereignisse.',
 'Die Verwaltung verschickte die zuvor von Sachverständigen mit handschriftlichen Markierungen versehenen Unterlagen unverändert an die vorgesehenen Stellen.'
];
const alternatives=[
 'Würde die Präpositionalgruppe die Technikerin beschreiben, trüge sie selbst das Teleobjektiv; das wäre eine andere Zuordnung als die dokumentierte Geräteverwendung.',
 'Bei Anbindung der Zeitgruppe an das Besprechen hätte die Ausschusssitzung erst im Frühjahr stattgefunden, statt bereits im November.',
 'Unter einer instrumentalen Lesart könnte die Verwaltung Markierungen erst für den Versand verwendet oder hinzugefügt haben, was eine andere Handlung behauptet.'
];
const contexts=[
 'Im ersten Quellenabsatz steht, dass das Teleobjektiv aus dem Materialkoffer genommen und an der Kamera der Gutachterin befestigt wurde. Zusätzlich führt die Technikerin einen Messstab, nicht das Objektiv.',
 'Die Akten erwähnen die Sitzung im November und nennen März und April ausdrücklich als vorgesehene Bauzeit. Diese gesonderten Angaben legen die Zeitbeziehung zur Sanierung fest.',
 'Die Sachverständigen hatten ihre Druckexemplare bereits vor dem Versenden handschriftlich gekennzeichnet und im Ordner abgelegt. Das Versandregister enthält keine spätere Herstellung der Markierungen.'
];
const boundaries=[
 'Aus der Beschreibung folgt nicht, dass die Technikerin das Objektiv mitgebracht, eine eigene Aufnahme gemacht oder mit einem anderen fotografischen Gerät gearbeitet hätte.',
 'Der Ausdruck ist kein Beleg für eine im Frühjahr stattfindende Beratung und lässt eine nachträgliche Änderung des offiziell dokumentierten Sitzungsdatums nicht zu.',
 'Die Aussage rechtfertigt keinen zusätzlichen Versandvorgang, in dem die Verwaltung selbst erst nachträglich Markierungen auf den Unterlagen angebracht hätte.'
];
const memo='Die fiktive Bauprüfstelle muss drei im Kurzprotokoll enthaltene mehrdeutige Präpositionalgruppen ausdrücklich klären. Die Aussage über die Fotografie ist nur dann zutreffend wiedergegeben, wenn das Teleobjektiv als Werkzeug der Gutachterin erscheint. Im vorangehenden Satz wird beschrieben, dass sie das Objektiv an der eigenen Kamera befestigt hatte. Eine Charakterisierung der Technikerin als Trägerin dieses Geräts wäre deshalb eine syntaktisch mögliche, aber durch die konkreten Quellenangaben nicht gestützte Interpretation. In einer eindeutigen Formulierung sollte die Nutzung des Geräts vor der Nennung der fotografierten Person stehen.\n\nBei der Aussage über die Sporthalle kommt es darauf an, Sitzung und Bauzeitraum zu trennen. Der Ausschuss beriet schon im November, während die Sanierung erst für März und April vorgesehen war. Es wäre falsch, die Aussprache durch eine unklare Zeitgruppe ins Frühjahr zu verschieben. Schließlich sind die Markierungen in der Versandnotiz eine Eigenschaft der bereits annotierten Unterlagen. Die Sachverständigen haben sie vor dem Versand angefertigt, sodass die Verwaltung keine zusätzliche Herstellung während der Versendung beanspruchen darf. Für den fachlichen Vermerk werden die drei Anbindungen einzeln benannt, ohne dem ursprünglichen Bericht neue Tätigkeiten oder Zeitpunkte hinzuzufügen.';
const why='Die redaktionelle Klarstellung benennt bei jedem Satz das Bezugswort der Präpositionalgruppe, begründet diese Wahl mit einer zusätzlichen Quelleninformation und lässt sprachlich mögliche, aber nicht gestützte Rollen vertauscht nicht als Tatsachen stehen.';
const revised=memo+'\n\nFür die öffentliche Mitteilung ergänze ich einen verständlichen Hinweis auf das bereits vorhandene Baustellenfoto und den genauen Novembersitzungstermin. Der Versand betraf vorher kommentierte Druckexemplare, die unverändert an die Empfänger gelangten. Durch diese Ergänzung werden Geräteeigentum, Zeitfolge und Dokumentzustand getrennt erläutert; neue technische Prüfungen oder Zuständigkeiten werden dabei ausdrücklich nicht behauptet.';
const first=()=>beginAttachment(study,'a1','A',rewrites[0],alternatives[0],contexts[0],boundaries[0],time);
const second=(e=first())=>appendAttachment(e,study,'a2','B',rewrites[1],alternatives[1],contexts[1],boundaries[1],'e2',time+1);
const third=(e=second())=>appendAttachment(e,study,'a3','B',rewrites[2],alternatives[2],contexts[2],boundaries[2],'e3',time+2);
const transfer=(e=third())=>appendAttachmentMemo(e,study,'TRANSFER',memo,why,'a1','memo1',time+3);

test('four substantial original C1/C2 G03 dossiers contain 12 literal single-use attachment anchors and retain closed rights gates',()=>{
 assert.equal(attachmentStudies.length,4);
 const ids=new Set<string>(),types=new Set<string>(),bands=new Set<string>();let count=0,b=0;
 for(const s of attachmentStudies){
  assert.match(s.id,/^SG-G03A-\d{3}$/);assert.equal(ids.has(s.id),false);ids.add(s.id);bands.add(s.band);
  assert.equal(s.status,'DEMO_ONLY');assert.equal(s.authorship,'AI_DRAFT');assert.equal(s.reviewedBy,null);assert.equal(s.editorialApproval,false);assert.equal(s.rights.kind,'ORIGINAL_DRAFT');
  assert.equal(s.paragraphs.length,3);assert.equal(s.attachments.length,3);
  for(const [i,a] of s.attachments.entries()){
   const p=s.paragraphs[i];assert.ok(p.text.length>900);assert.equal(a.paragraphId,p.id);assert.equal(p.text.split('„'+a.quote+'“').length,2);
   assert.equal(a.options.length,2);assert.notEqual(a.options[0].text,a.options[1].text);types.add(a.type);count++;if(a.preferredId==='B')b++;
  }
 }
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.equal(count,12);assert.ok(types.size>=10);assert.equal(b,6);
 assert.equal(allItems.filter(item=>item.id.startsWith('SG-G03A-')).length,0);
});
test('first analysis is source-bound and immutable with original text, version and unassessed choice',()=>{
 const e=first();
 assert.equal(e.id,attachmentId(study.id));assert.ok(isAttachmentEntry(e));assert.equal(attachmentSource(e)?.id,study.id);
 assert.equal(e.itemVersion,1);assert.equal(e.evaluated,'UNASSESSED');assert.deepEqual(e.revisions,[]);
 assert.equal(firstAttachment(e)?.rewrite,rewrites[0]);assert.equal(firstAttachment(e)?.choice,'A');assert.equal(firstAttachment(e)?.paragraphId,'p1');
 assert.equal(archiveKind(e),'G03_ATTACHMENT');assert.equal(archiveRow(e).scope,'G03');
 assert.equal(firstAttachment({...e,sourceId:'tampered'}),null);
 assert.equal(firstAttachment({...e,decisionId:'a1|A|p2'}),null);
});
test('reject copied source, collapsed evidence, missing contexts, invalid selection and skipped anchor',()=>{
 const p=study.attachments[0];assert.ok(independentAttachment(p,rewrites[0],alternatives[0],contexts[0],boundaries[0]));
 assert.equal(independentAttachment(p,rewrites[0],rewrites[0],contexts[0],boundaries[0]),false);
 assert.equal(independentAttachment(p,p.quote+' '+rewrites[0],alternatives[0],contexts[0],boundaries[0]),false);
 assert.equal(independentAttachment(p,rewrites[0],alternatives[0],'zu kurz',boundaries[0]),false);
 assert.throws(()=>beginAttachment(study,'a2','A',rewrites[0],alternatives[0],contexts[0],boundaries[0],time),/erforderlich/);
 assert.throws(()=>beginAttachment(study,'a1','X' as never,rewrites[0],alternatives[0],contexts[0],boundaries[0],time),/erforderlich/);
 assert.throws(()=>appendAttachment(first(),study,'a3','B',rewrites[2],alternatives[2],contexts[2],boundaries[2],'skip',time+1),/Reihenfolge/);
});
test('source-anchored three-step evidence is append-only, sequential and accepts unpreferred selections without automatic grading',()=>{
 const e=first(),b=second(e),c=third(b);
 assert.equal(e.revisions.length,0);assert.equal(b.revisions.length,1);assert.equal(c.revisions.length,2);
 assert.equal(c.original,e.original);assert.equal(savedAttachment(b,study.attachments[1])?.choice,'B');assert.equal(savedAttachment(c,study.attachments[2])?.context,contexts[2]);
 assert.equal(nextAttachment(study,c),null);assert.equal(c.evaluated,'UNASSESSED');
 assert.throws(()=>appendAttachment(c,study,'a3','B',rewrites[2],alternatives[2],contexts[2],boundaries[2],'again',time+4),/Reihenfolge/);
 const unpreferred=beginAttachment(study,'a1','B',rewrites[0],alternatives[0],contexts[0],boundaries[0],time);
 assert.equal(firstAttachment(unpreferred)?.choice,'B');assert.equal(unpreferred.evaluated,'UNASSESSED');
});
test('independent multi-paragraph memo requires prior 3 anchors and substantive full-document audience revision',()=>{
 assert.throws(()=>appendAttachmentMemo(first(),study,'TRANSFER',memo,why,'a1','premature',time+3),/fehlt/);
 assert.throws(()=>appendAttachmentMemo(third(),study,'REWRITE',memo,why,'a1','premature',time+3),/fehlt/);
 assert.throws(()=>appendAttachmentMemo(third(),study,'TRANSFER',memo,'Zu knapp','a1','brief',time+3),/fehlt/);
 assert.throws(()=>appendAttachmentMemo(third(),study,'TRANSFER',memo,why,'unknown','badanchor',time+3),/fehlt/);
 const e=transfer();assert.equal(latestAttachmentMemo(e)?.questionId,'TRANSFER');
 assert.equal(substantialAttachmentRevision(memo,memo+' Ein Wort.'),false);
 assert.throws(()=>appendAttachmentMemo(e,study,'REWRITE',memo,why,'a1','same',time+4),/fehlt/);
 const r=appendAttachmentMemo(e,study,'REWRITE',revised,why,'a3','rewrite',time+4);
 assert.equal(r.original,e.original);assert.deepEqual(r.revisions.slice(0,3),e.revisions);
 assert.equal(versionPair(r,3)?.previous,memo);assert.equal(latestAttachmentMemo(r)?.paragraphId,'p3');
 assert.equal(archiveRows([r],{kind:'G03_ATTACHMENT',activity:'REVISED',period:'ALL',search:'öffentliche Mitteilung',now:time+5}).length,1);
});
test('progress and next-study record observed source evidence, transfers and revisions without CEFR claims',()=>{
 assert.deepEqual(attachmentProgress([]),{started:0,analyses:0,transferred:0,revised:0,total:4});
 assert.deepEqual(attachmentProgress([first()]),{started:1,analyses:1,transferred:0,revised:0,total:4});
 assert.equal(attachmentProgress([third()]).analyses,3);
 assert.equal(attachmentProgress([transfer()]).transferred,1);
 assert.equal(nextAttachmentStudy([first()]).id,study.id);
 assert.equal(nextAttachmentStudy([transfer()]).id,attachmentStudies[1].id);
 const final=appendAttachmentMemo(transfer(),study,'REWRITE',revised,why,'a3','rewrite',time+4);
 assert.equal(attachmentProgress([final]).revised,1);
});
test('eight-store portable backup v3 preserves untouched original, all text versions, stable references and digest',async()=>{
 assert.equal(BACKUP_STORES.length,8);assert.equal(BACKUP_VERSION,3);
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const raw=await buildPortableBackup(records);const restore=await inspectPortableBackup(raw);
 assert.equal(restore.version,3);assert.deepEqual(restore.records.productionEntries,records.productionEntries);
 const corrupted=raw.replace('Die Gutachterin','Die Gutachterer');
 assert.notEqual(corrupted,raw);await assert.rejects(()=>inspectPortableBackup(corrupted),/Integritätsprüfung/);
});
test('editorial queue includes all 4 source dossiers and 12 anchors without approval or publication',()=>{
 const rows=collect().filter(x=>x.mode==='G03_ATTACHMENT');assert.equal(rows.length,16);
 assert.equal(rows.filter(x=>x.type==='G03_ORIGINAL_ATTACHMENT_SOURCE').length,4);
 assert.equal(rows.filter(x=>x.type==='G03_PREPOSITIONAL_ATTACHMENT').length,12);
 assert.ok(rows.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
