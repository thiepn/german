import test from 'node:test';
import assert from 'node:assert/strict';
import {interactionScenarios,interactionFirst,interactionRevision,isInteractionEntry,interactionSource,openingChoice,primaryResponse,nextInteractionTurn,interactionProgress} from '../src/domain/interaction/interaction.ts';
import {archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
const s=interactionScenarios[0],at=Date.UTC(2026,9,19,15);
const first=()=>interactionFirst(s,s.registers[0],'CHALLENGE','Ich kann eine Mindestprüfung anbieten.',at);
test('G12 authored source and all fixed counterpart turns are original and clearly ungraded',()=>{
 assert.equal(interactionScenarios.length,4);
 assert.equal(new Set(interactionScenarios.map(x=>x.id)).size,4);
 for(const sc of interactionScenarios){
  assert.equal(sc.status,'DEMO_ONLY');assert.equal(sc.rights.kind,'ORIGINAL_DRAFT');
  assert.equal(sc.editorialApproval,false);assert.deepEqual(sc.turns.map(t=>t.id),['t0','t1','t2']);
  assert.ok(sc.turns.every(t=>t.text.trim()&&t.task.trim()&&t.speaker.trim()));
  assert.equal(sc.registers.length,2);
 }
});
test('original register, first response and strategy are preserved without generated grading or audio',()=>{
 const entry=first();
 assert.equal(isInteractionEntry(entry),true);
 assert.equal(entry.evaluated,'UNASSESSED');assert.equal(entry.kind,'INTERACTION_STUDY');
 assert.equal(entry.id,'interaction:'+s.id);assert.equal(entry.sourceId,s.id);
 assert.deepEqual(openingChoice(entry),{register:s.registers[0],strategy:'CHALLENGE'});
 assert.equal(interactionSource(entry)?.id,s.id);
 assert.equal(primaryResponse(entry,'t0'),entry.original);
 assert.equal(nextInteractionTurn(s,entry)?.id,'t1');
 assert.throws(()=>interactionFirst(s,'Invalid','CHALLENGE','x',at),/unvollständig/);
 assert.throws(()=>interactionFirst(s,s.registers[0],'CHALLENGE',' ',at),/unvollständig/);
 assert.throws(()=>interactionFirst(s,s.registers[0],'INVALID' as never,'x',at),/unvollständig/);
});
test('only consecutive primary turns are appended; alternatives require saved targets and justification',()=>{
 const firstEntry=first();
 assert.throws(()=>interactionRevision(firstEntry,s,'TURN','t2','Vorsicht','NEGOTIATE','Grenze','bad',at+1),/Reihenfolge/);
 assert.throws(()=>interactionRevision(firstEntry,s,'ALTERNATIVE','t2','Vorsicht','REFRAME','Grenze','bad',at+1),/Alternative/);
 const t1=interactionRevision(firstEntry,s,'TURN','t1','Ein Zwischenstand mit Vorbehalt.','NEGOTIATE','Keine Freigabe.','t1-1',at+1);
 assert.equal(firstEntry.revisions.length,0);assert.equal(t1.original,firstEntry.original);
 assert.equal(primaryResponse(t1,'t1'),'Ein Zwischenstand mit Vorbehalt.');
 assert.equal(nextInteractionTurn(s,t1)?.id,'t2');
 assert.throws(()=>interactionRevision(t1,s,'TURN','t1','Überschreiben','NEGOTIATE','x','bad',at+2),/Reihenfolge/);
 const alt=interactionRevision(t1,s,'ALTERNATIVE','t0','Die Bedingung neu rahmen.','REFRAME','Verhindert Überdehnung.','alt-1',at+2);
 assert.equal(alt.revisions[1].questionId,'ALTERNATIVE:t0');assert.deepEqual(alt.revisions[1].selfChecks,['Perspektive verändern']);
 assert.equal(primaryResponse(alt,'t0'),firstEntry.original);
 assert.equal(primaryResponse(alt,'t1'),primaryResponse(t1,'t1'));
 const last=interactionRevision(alt,s,'TURN','t2','Vorläufig beschließen.','ACKNOWLEDGE','Endabnahme offen.','t2-1',at+3);
 assert.equal(nextInteractionTurn(s,last),null);
 assert.equal(versionPair(last,0)?.previous,firstEntry.original);
 assert.equal(versionPair(last,1)?.previous,t1.revisions[0].text);
 assert.throws(()=>interactionRevision(t1,s,'TURN','t2','x','ACKNOWLEDGE','','bad',at+2),/unvollständig/);
 assert.throws(()=>interactionRevision({...t1,sourceId:'other'},s,'ALTERNATIVE','t0','x','CHALLENGE','x','bad',at+2),/unvollständig/);
});
test('G12 counted as independent evidence and searchable archive; never M04 or scored mastery',()=>{
 const one=first();
 const t1=interactionRevision(one,s,'TURN','t1','Ein Zwischenstand.','NEGOTIATE','Offene Fragen.','r1',at+1);
 const alt=interactionRevision(t1,s,'ALTERNATIVE','t0','Eine Alternative.','REFRAME','Gegenargument.','r2',at+2);
 const done=interactionRevision(alt,s,'TURN','t2','Konsens mit Grenze.','ACKNOWLEDGE','Nur vorläufig.','r3',at+3);
 assert.deepEqual(interactionProgress([one]),{started:1,completed:0,turns:1,alternatives:0,total:4});
 assert.deepEqual(interactionProgress([done]),{started:1,completed:1,turns:3,alternatives:1,total:4});
 assert.equal(archiveRow(done).kind,'G12_INTERACTION');assert.equal(archiveRow(done).scope,'G12');
 const query={kind:'G12_INTERACTION' as const,activity:'REVISED' as const,period:'ALL' as const,search:'Gegenargument',now:at+10};
 assert.equal(archiveRows([done],query).length,1);
 assert.equal(archiveRows([done],{...query,kind:'M04'}).length,0);
 assert.equal(archiveRows([done],{...query,search:'REFRAME'}).length,0);
 assert.equal(archiveRows([done],{...query,search:'Perspektive verändern'}).length,1);
});
test('existing backup v3 preserves exact G12 first answer and append-only alternative evidence',async()=>{
 const e=interactionRevision(first(),s,'ALTERNATIVE','t0','Andere Begründung.','REFRAME','Grenze bleibt.','alt-v1',at+1);
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[e],missions:[]};
 const b=await buildPortableBackup(records);
 const decoded=await inspectPortableBackup(b);
 assert.equal(decoded.version,BACKUP_VERSION);assert.deepEqual(decoded.records.productionEntries,[e]);
 assert.equal(decoded.records.productionEntries[0].evaluated,'UNASSESSED');
});
