import test from 'node:test';
import assert from 'node:assert/strict';
import {stanceStudies,stanceEntryId,isStanceEntry,stanceSource,independentStanceRewrite,beginStance,appendStanceDecision,appendStanceTransfer,firstStanceEvidence,savedStanceDecision,nextStanceDecision,latestStanceTransfer,stanceProgress,nextStanceStudy} from '../src/domain/stance/stance.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {allItems} from '../src/domain/content/registry.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';

const study=stanceStudies[0],at=Date.UTC(2026,9,24,10);
const paraphrase='Die beobachteten Messwerte legen einen Unterschied zwischen den Straßen nahe, belegen jedoch keine allgemein gültige Wirkung der Begrünung.';
const why='Aus der beobachteten Korrelation wird noch keine Ursache abgeleitet, weil Vergleichswerte fehlen und die Stichprobe räumlich begrenzt ist.';
const begin=()=>beginStance(study,'d1','A',paraphrase,why,at);
const step2=(e=begin())=>appendStanceDecision(e,study,'d2','B','Die Redaktion begrenzt ihren Befund ausdrücklich, weil auch die geänderte Verkehrsführung als Ursache infrage kommen könnte.','Der Quellenabsatz schließt eine eindeutige Zuschreibung der Unterschiede an die Begrünung gerade aus.','step2',at+1);
const step3=(e=step2())=>appendStanceDecision(e,study,'d3','A','Das Labor regt eine methodisch kontrollierte Anschlussuntersuchung an; über eine mögliche Finanzierung ist bisher nicht entschieden worden.','Ein sinnvoller Untersuchungsplan und der Vorschlag einer Anhörung sind weder ein Budgetbeschluss noch eine verbindliche Zusage.','step3',at+2);
const transferText='Die nächtlichen Temperaturmessungen weisen in den begrünten Straßen niedrigere Werte auf. Weil Vergleiche aus Innenhöfen und eindeutige Kausalbelege fehlen, ist eine Verallgemeinerung nicht möglich. Das Labor empfiehlt daher eine neue kontrollierte Studie. Ob Mittel dafür bereitgestellt werden, liegt bei einer anderen Stelle und bleibt offen.';
const transfer=(e=step3())=>appendStanceTransfer(e,study,'TRANSFER',transferText,'Die Stellungnahme unterscheidet Beobachtung, noch nicht bewiesene Ursache und unverbindliche Empfehlung. Gerade die Förderentscheidung wurde in der Quelle nicht getroffen.','p3','transfer',at+3);

test('M19 supplies six independent original G08 sources and 18 literal, distinct discourse contrasts',()=>{
 assert.equal(stanceStudies.length,6);assert.equal(new Set(stanceStudies.map(s=>s.id)).size,6);
 const moves=new Set(),choices=new Set(),bands=new Set();
 for(const s of stanceStudies){
  assert.match(s.id,/^SG-G08S-\d{3}$/);assert.equal(s.version,1);assert.equal(s.domain,'G08');assert.equal(s.status,'DEMO_ONLY');assert.equal(s.authorship,'AI_DRAFT');assert.equal(s.editorialApproval,false);assert.equal(s.rights.kind,'ORIGINAL_DRAFT');
  bands.add(s.band);assert.deepEqual(s.paragraphs.map(p=>p.id),['p1','p2','p3']);assert.ok(s.paragraphs.every(p=>p.text.length>=300));
  assert.deepEqual(s.decisions.map(d=>d.id),['d1','d2','d3']);
  for(const d of s.decisions){assert.ok(s.paragraphs.find(p=>p.id===d.paragraphId)?.text.includes(d.quote));moves.add(d.move);choices.add(d.preferredId);assert.ok(d.explanation.length>=125);}
 }
 assert.equal(moves.size,18);assert.deepEqual([...choices].sort(),['A','B']);assert.deepEqual([...bands].sort(),['C1','C2']);
 assert.ok(!allItems.some(x=>x.id.startsWith('SG-G08S-')),'free-text analysis cannot join the graded exercise bank');
});
test('source identity and immutable first stance analysis',()=>{
 const e=begin();assert.equal(e.id,stanceEntryId(study.id));assert.equal(e.kind,'STANCE_STUDY');assert.equal(e.evaluated,'UNASSESSED');
 assert.ok(isStanceEntry(e));assert.equal(stanceSource(e)?.id,study.id);assert.equal(firstStanceEvidence(e)?.choice,'A');
 assert.equal(firstStanceEvidence({...e,sourceId:'other'}),null);assert.equal(firstStanceEvidence({...e,decisionId:'d1|X|p1'}),null);
 assert.equal(archiveKind(e),'G08_STANCE');assert.equal(archiveRow(e).scope,'G08');assert.equal(nextStanceDecision(study,e)?.id,'d2');
});
test('nontrivial independent paraphrases and evidence boundaries are required',()=>{
 assert.equal(independentStanceRewrite(study.decisions[0],study.decisions[0].quote),false);
 assert.equal(independentStanceRewrite(study.decisions[0],study.decisions[0].alternate),false);
 assert.equal(independentStanceRewrite(study.decisions[0],paraphrase),true);
 assert.throws(()=>beginStance(study,'d2','A',paraphrase,why,at),/erforderlich/);
 assert.throws(()=>beginStance(study,'d1','A',study.decisions[0].quote,why,at),/erforderlich/);
 assert.throws(()=>beginStance(study,'d1','A',paraphrase,'Zu wenig.',at),/erforderlich/);
 assert.throws(()=>appendStanceDecision(begin(),study,'d3','A',paraphrase,why,'too-soon',at+1),/unvollständig/);
});
test('three ordered ungraded decisions preserve author-unpreferred choices and earlier evidence',()=>{
 const one=begin(),two=step2(one),three=step3(two);
 assert.equal(one.revisions.length,0);assert.equal(three.original,one.original);assert.equal(three.decisionId,one.decisionId);
 assert.equal(savedStanceDecision(two,study.decisions[1])?.choice,'B');assert.equal(two.revisions[0].paragraphId,'p2');
 assert.equal(three.evaluated,'UNASSESSED');assert.equal(nextStanceDecision(study,three),null);assert.equal(latestStanceTransfer(three),null);
 assert.throws(()=>appendStanceDecision(two,study,'d2','A',paraphrase,why,'duplicate',at+3),/unvollständig/);
});
test('transfer requires completed source work and append-only semantic revision',()=>{
 const e=transfer();assert.equal(e.revisions.length,3);assert.equal(e.revisions[2].questionId,'TRANSFER');
 assert.throws(()=>appendStanceTransfer(begin(),study,'TRANSFER',transferText,why,'p1','early',at+3),/unvollständig/);
 assert.throws(()=>appendStanceTransfer(step3(),study,'REWRITE',transferText,why,'p2','bad-stage',at+3),/unvollständig/);
 assert.throws(()=>appendStanceTransfer(e,study,'REWRITE',transferText,why,'p2','same',at+4),/unvollständig/);
 const changed=appendStanceTransfer(e,study,'REWRITE',transferText+' Die verantwortliche Stelle muss ihre Entscheidung gesondert dokumentieren.','Die Ergänzung unterscheidet zwischen der fachlichen Empfehlung und der später erforderlichen Entscheidung der zuständigen Gremien.','p2','revision',at+4);
 assert.equal(changed.original,e.original);assert.deepEqual(changed.revisions.slice(0,3),e.revisions);
 assert.equal(changed.revisions[3].questionId,'REWRITE');assert.equal(versionPair(changed,3)?.previous,transferText);
 assert.equal(archiveRows([changed],{kind:'G08_STANCE',activity:'REVISED',period:'ALL',search:'zuständige Gremien',now:at+5}).length,1);
});
test('progress measures work completed without CEFR or mastery scoring',()=>{
 assert.deepEqual(stanceProgress([]),{started:0,decisions:0,transferred:0,rewritten:0,total:6});
 assert.deepEqual(stanceProgress([begin()]),{started:1,decisions:1,transferred:0,rewritten:0,total:6});
 assert.deepEqual(stanceProgress([step3()]),{started:1,decisions:3,transferred:0,rewritten:0,total:6});
 assert.deepEqual(stanceProgress([transfer()]),{started:1,decisions:3,transferred:1,rewritten:0,total:6});
 assert.equal(nextStanceStudy([transfer()]).id,stanceStudies[1].id);
});
test('backup v3 retains ungraded source-bound stance analysis',async()=>{
 const e=transfer(),data:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[e],missions:[]};
 const serialized=await buildPortableBackup(data),checked=await inspectPortableBackup(serialized);
 assert.equal(checked.version,BACKUP_VERSION);assert.deepEqual(checked.records.productionEntries,[e]);
 await assert.rejects(()=>inspectPortableBackup(serialized.replace('beobachteten Messwerte','erfundenen Messwerte')),/Integritätsprüfung/);
});
test('all 24 G08 stance dossiers remain in unapproved editorial review queue',()=>{
 const rows=collect().filter(x=>x.mode==='G08_STANCE');
 assert.equal(rows.length,24);assert.equal(rows.filter(x=>x.type==='G08_ORIGINAL_DISCOURSE_SOURCE').length,6);assert.equal(rows.filter(x=>x.type==='G08_STANCE_CONTRAST').length,18);
 assert.ok(rows.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
