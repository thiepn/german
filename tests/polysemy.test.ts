import test from 'node:test';
import assert from 'node:assert/strict';
import {polysemyStudies,polysemyEntryId,isPolysemyEntry,polysemySource,independentPolysemyRewrite,beginPolysemy,appendPolysemyDecision,appendPolysemyTransfer,firstPolysemyEvidence,savedPolysemyDecision,nextPolysemyDecision,latestPolysemyTransfer,polysemyProgress,nextPolysemyStudy} from '../src/domain/polysemy/polysemy.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {allItems} from '../src/domain/content/registry.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';

const study=polysemyStudies[0],at=Date.UTC(2026,9,23,12);
const ownFirst='Im Frühjahr beschloss das kommunale Gremium erstmals eine allgemein geltende Regel über die Gebühren für die Benutzung der Uferwege.';
const why='Erlassen bedeutet im Satz, eine Rechtsvorschrift zu beschließen. Damit ist keine konkrete Gebühr für eine einzelne Person erlassen worden.';
const first=()=>beginPolysemy(study,'d1','A',ownFirst,why,at);
const second=(e=first())=>appendPolysemyDecision(e,study,'d2','A','Die Gebührenregelung wurde wegen des Gutachtens sechs Wochen lang nicht angewendet, obwohl die rechtliche Satzung zunächst bestehen blieb.','Der zeitweise Verzicht auf Vollzug ist nicht gleichbedeutend mit einer Gefahr, der Bürger unmittelbar ausgesetzt wären.','d2',at+1);
const third=(e=second())=>appendPolysemyDecision(e,study,'d3','B','Später beschloss der Rat die ersatzlose Streichung genau dieser Gebührenbestimmung; die übrige Satzung blieb bestehen.','Rechtliches Aufheben beseitigt die konkrete Bestimmung. Die zum Nachweis archivierten Akten werden dagegen weiterhin aufbewahrt.','d3',at+2);
const ownText='Der Gemeinderat beschloss zunächst eine neue Gebührenordnung für die Uferwege. Nach der technischen Prüfung unterbrach die Verwaltung deren Anwendung vorübergehend. Einige Wochen später strich der Rat eine einzelne Gebührenvorschrift endgültig, während die übrigen Regeln bestehen blieben.';
const transfer=(e=third())=>appendPolysemyTransfer(e,study,'TRANSFER',ownText,'Erlassen benennt die Normsetzung, aussetzen nur die befristete Nichtanwendung und aufheben die Beseitigung einer Bestimmung. Keine der drei Handlungen meint den Verzicht auf eine einzelne Geldforderung.','p3','transfer',at+3);

test('six original C1/C2 G06 source dossiers cover 18 unique lexical senses in full paragraph context',()=>{
 assert.equal(polysemyStudies.length,6);assert.equal(new Set(polysemyStudies.map(s=>s.id)).size,6);
 const ids=new Set(),families=new Set(),bands=new Set(),preferred=new Set(),lemmas=new Set();
 for(const s of polysemyStudies){
  assert.match(s.id,/^SG-G06-\d{3}$/);assert.equal(s.version,1);assert.equal(s.domain,'G06');
  assert.equal(s.status,'DEMO_ONLY');assert.equal(s.authorship,'AI_DRAFT');assert.equal(s.editorialApproval,false);assert.equal(s.reviewedBy,null);assert.equal(s.rights.kind,'ORIGINAL_DRAFT');
  bands.add(s.band);assert.deepEqual(s.paragraphs.map(p=>p.id),['p1','p2','p3']);assert.ok(s.paragraphs.every(p=>p.text.length>=250));
  assert.deepEqual(s.decisions.map(d=>d.id),['d1','d2','d3']);
  for(const d of s.decisions){
   const unique=s.id+':'+d.id;assert.ok(!ids.has(unique));ids.add(unique);
   assert.equal(s.paragraphs.find(p=>p.id===d.paragraphId)?.text.includes(d.quote),true);
   assert.notEqual(d.quote,d.alternate);assert.ok(d.lemma.length>3&&d.explanation.length>=125&&d.repairPrompt.length>=30);
   assert.deepEqual(d.options.map(o=>o.id),['A','B']);assert.notEqual(d.options[0].text,d.options[1].text);
   families.add(d.family);preferred.add(d.preferredId);lemmas.add(d.lemma);
  }
 }
 assert.equal(ids.size,18);assert.equal(families.size,18);assert.ok(lemmas.size>=15);
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.deepEqual([...preferred].sort(),['A','B']);
 assert.ok(!allItems.some(i=>i.id.startsWith('SG-G06-')),'free meaning production must not enter the M06 auto-grader');
 assert.ok(allItems.some(i=>i.mode==='M06'),'existing semantic precision grader remains present');
});

test('first G06 lexical analysis is immutable, source-anchored and never automatically assessed',()=>{
 const e=first();
 assert.equal(e.id,polysemyEntryId(study.id));assert.ok(isPolysemyEntry(e));
 assert.equal(e.kind,'POLYSEMY_STUDY');assert.equal(e.itemVersion,1);assert.equal(e.sourceId,study.id);assert.equal(e.evaluated,'UNASSESSED');
 assert.equal(polysemySource(e)?.id,study.id);
 assert.deepEqual(firstPolysemyEvidence(e),{decisionId:'d1',paragraphId:'p1',choice:'A',rewrite:ownFirst,boundary:why,initial:true});
 assert.deepEqual(savedPolysemyDecision(e,study.decisions[0]),firstPolysemyEvidence(e));
 assert.equal(nextPolysemyDecision(study,e)?.id,'d2');assert.equal(archiveKind(e),'G06_POLYSEMY');assert.equal(archiveRow(e).scope,'G06');
 assert.equal(firstPolysemyEvidence({...e,sourceId:'unknown'}),null);
 assert.equal(firstPolysemyEvidence({...e,decisionId:'d1|C|p1'}),null);
});

test('require independent wording and genuine excluded-sense explanations; reject copied and reordered tasks',()=>{
 const d=study.decisions[0];
 assert.equal(independentPolysemyRewrite(d,d.quote),false);
 assert.equal(independentPolysemyRewrite(d,d.alternate),false);
 assert.equal(independentPolysemyRewrite(d,ownFirst),true);
 assert.throws(()=>beginPolysemy(study,'d2','A',ownFirst,why,at),/erforderlich/);
 assert.throws(()=>beginPolysemy(study,'d1','Z' as never,ownFirst,why,at),/erforderlich/);
 assert.throws(()=>beginPolysemy(study,'d1','A',d.quote,why,at),/erforderlich/);
 assert.throws(()=>beginPolysemy(study,'d1','A',d.alternate,why,at),/erforderlich/);
 assert.throws(()=>beginPolysemy(study,'d1','A',ownFirst,'Zu knapp.',at),/erforderlich/);
 assert.throws(()=>appendPolysemyDecision(first(),study,'d3','B',ownFirst,why,'early',at+1),/unvollständig/);
 assert.throws(()=>appendPolysemyDecision(first(),study,'d2','A',study.decisions[1].quote,why,'copy',at+1),/unvollständig/);
});

test('ordered sense contrasts preserve unpreferred answers without touching M06 mastery',()=>{
 const one=first(),two=second(one);
 assert.equal(two.evaluated,'UNASSESSED');assert.equal(study.decisions[1].preferredId,'B');
 assert.equal(savedPolysemyDecision(two,study.decisions[1])?.choice,'A');
 assert.equal(one.revisions.length,0);assert.equal(two.original,one.original);assert.equal(two.decisionId,one.decisionId);
 assert.equal(two.revisions[0].questionId,'DECISION:d2');assert.equal(two.revisions[0].paragraphId,'p2');
 assert.deepEqual(two.revisions[0].selfChecks,['A']);assert.equal(nextPolysemyDecision(study,two)?.id,'d3');
 assert.throws(()=>appendPolysemyDecision(two,study,'d2','B',ownFirst,why,'duplicate',at+2),/unvollständig/);
 const done=third(two);assert.equal(nextPolysemyDecision(study,done),null);assert.equal(latestPolysemyTransfer(done),null);
});

test('transfer is gated by three source meanings and revisions append without erasing evidence',()=>{
 const analysis=third(),e=transfer(analysis);
 assert.equal(analysis.revisions.length,2);assert.equal(e.revisions.length,3);
 assert.equal(e.revisions[2].questionId,'TRANSFER');assert.equal(e.revisions[2].paragraphId,'p3');
 assert.deepEqual(e.revisions.slice(0,2),analysis.revisions);
 assert.throws(()=>appendPolysemyTransfer(first(),study,'TRANSFER',ownText,why,'p1','early',at+3),/unvollständig/);
 assert.throws(()=>appendPolysemyTransfer(analysis,study,'REWRITE',ownText,why,'p1','stage',at+3),/unvollständig/);
 assert.throws(()=>appendPolysemyTransfer(e,study,'TRANSFER',ownText+' Ein weiterer Satz.',why,'p1','duplicate',at+4),/unvollständig/);
 assert.throws(()=>appendPolysemyTransfer(e,study,'REWRITE',ownText,why,'p1','unchanged',at+4),/unvollständig/);
 assert.throws(()=>appendPolysemyTransfer(e,study,'REWRITE',ownText+' Ein neuer Satz.',why,'p8','source',at+4),/unvollständig/);
 const r=appendPolysemyTransfer(e,study,'REWRITE',ownText+' Ein Verzicht auf rückwirkende individuelle Gebühren war darin nicht enthalten.','Die Revision ergänzt ausdrücklich, dass ein allgemeiner Ratsbeschluss kein individueller Gebührenerlass ist.','p1','new',at+4);
 assert.equal(r.original,e.original);assert.deepEqual(r.revisions.slice(0,3),e.revisions);
 assert.equal(r.evaluated,'UNASSESSED');assert.equal(r.revisions[3].questionId,'REWRITE');
 assert.equal(versionPair(r,3)?.previous,e.revisions[2].text);
 assert.equal(archiveRows([r],{kind:'G06_POLYSEMY',activity:'REVISED',period:'ALL',search:'rückwirkende individuelle Gebühren',now:at+5}).length,1);
});

test('G06 progress counts observed saved evidence only and continues unfinished source',()=>{
 assert.deepEqual(polysemyProgress([]),{started:0,decisions:0,transferred:0,rewritten:0,total:6});
 assert.deepEqual(polysemyProgress([first()]),{started:1,decisions:1,transferred:0,rewritten:0,total:6});
 assert.deepEqual(polysemyProgress([third()]),{started:1,decisions:3,transferred:0,rewritten:0,total:6});
 assert.deepEqual(polysemyProgress([transfer()]),{started:1,decisions:3,transferred:1,rewritten:0,total:6});
 assert.equal(nextPolysemyStudy([]).id,study.id);assert.equal(nextPolysemyStudy([first()]).id,study.id);
 assert.equal(nextPolysemyStudy([transfer()]).id,polysemyStudies[1].id);
});

test('portable v3 backup retains source lineage, ungraded interpretive evidence and checksum integrity',async()=>{
 const entry=transfer(),data:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[entry],missions:[]};
 const serialized=await buildPortableBackup(data),read=await inspectPortableBackup(serialized);
 assert.equal(read.version,BACKUP_VERSION);assert.deepEqual(read.records.productionEntries,[entry]);
 assert.ok(serialized.includes('Im Frühjahr beschloss das kommunale Gremium'));
 await assert.rejects(()=>inspectPortableBackup(serialized.replace('Im Frühjahr beschloss das kommunale Gremium','Im Frühjahr lobte das kommunale Gremium')),/Integritätsprüfung/);
});

test('independent editorial queue holds 24 original G06 dossiers without approval or CEFR credit',()=>{
 const list=collect().filter(x=>x.mode==='G06_POLYSEMY');
 assert.equal(list.length,24);
 assert.equal(list.filter(x=>x.type==='G06_ORIGINAL_SOURCE').length,6);
 assert.equal(list.filter(x=>x.type==='G06_SENSE_CONTRAST').length,18);
 assert.ok(list.every(x=>x.status==='DEMO_ONLY'&&x.independentEditorialApproval===false));
 assert.ok(list.some(x=>x.quote&&x.alternate&&x.lemma&&x.options?.length===2));
});
