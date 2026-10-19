import test from 'node:test';
import assert from 'node:assert/strict';
import {mediationBriefs,mediationOriginal,addMediationRevision,isMediationEntry,firstEvidence,mediationProgress,nextMediationBrief,sourceForMediation} from '../src/domain/mediation/mediation.ts';
import {readingStudies} from '../src/domain/reading/reading.ts';
import {archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION} from '../src/persistence/portableBackup.ts';
import type {BackupRecords} from '../src/persistence/portableBackup.ts';

const at=Date.UTC(2026,9,19,12);
const b=mediationBriefs[0];
const first=()=>mediationOriginal(b,b.audiences[0].id,'p2','Eine Zunahme wird berichtet, aber Kausalität ist nicht belegt.',at);
test('original G09 passages and rights are referenced, not duplicated or reclassified as licensed sources',()=>{
 assert.equal(mediationBriefs.length,4);
 assert.deepEqual(mediationBriefs.map(x=>x.unitId),readingStudies.map(x=>x.id));
 for(const brief of mediationBriefs){
  const u=sourceForMediation(brief);
  assert.ok(u);assert.equal(u?.status,'DEMO_ONLY');assert.equal(u?.rights.kind,'ORIGINAL_DRAFT');
  assert.equal(brief.status,'DEMO_ONLY');assert.equal(brief.editorialApproval,false);
  assert.ok(brief.audiences.length>=2);assert.ok(u?.paragraphs.every(p=>p.text.trim()&&p.id));
  assert.ok(brief.task.trim()&&brief.argumentTask.trim());
 }
});
test('first source citation, recipient and ungraded original are immutable and distinct from writing exercises',()=>{
 const initial=first();
 assert.equal(initial.kind,'MEDIATION_STUDY');assert.equal(initial.evaluated,'UNASSESSED');
 assert.equal(initial.sourceId,b.unitId);assert.equal(initial.itemId,b.id);
 assert.deepEqual(firstEvidence(initial),{audienceId:b.audiences[0].id,paragraphId:'p2'});
 assert.equal(isMediationEntry(initial),true);
 assert.equal(archiveRow(initial).kind,'G13_MEDIATION');assert.equal(archiveRow(initial).scope,'G13');
 assert.equal(initial.revisions.length,0);
 assert.throws(()=>mediationOriginal(b,'WRONG','p2','Text',at),/ungültig/);
 assert.throws(()=>mediationOriginal(b,b.audiences[0].id,'p8','Text',at),/ungültig/);
 assert.throws(()=>mediationOriginal(b,b.audiences[0].id,'p1','  ',at),/ungültig/);
});
test('source evidence and uncertainty are required for each separate argumentation and audience revision',()=>{
 const original=first();
 const adapted=addMediationRevision(original,b,'ADAPTATION','Vorsichtige Meldung','p2','Zweiter Einflussfaktor unbekannt.','a1',at+1,['Quellenaussagen zugeordnet']);
 assert.equal(original.revisions.length,0);
 assert.equal(adapted.revisions.length,1);
 assert.deepEqual(adapted.revisions[0],{id:'a1',at:at+1,text:'Vorsichtige Meldung',reflection:'Zweiter Einflussfaktor unbekannt.',questionId:'ADAPTATION',paragraphId:'p2',lens:'REGISTER',selfChecks:['Quellenaussagen zugeordnet']});
 const argued=addMediationRevision(adapted,b,'ARGUMENT','Kein eindeutiger Ursachebeweis','p3','Weitere Vergleichsgruppen nötig.','a2',at+2);
 assert.equal(argued.revisions[1].lens,'KOHÄRENZ');
 assert.equal(argued.original,original.original);assert.equal(argued.decisionId,original.decisionId);
 assert.equal(versionPair(argued,1)?.previous,'Vorsichtige Meldung');
 assert.equal(archiveRows([argued],{kind:'G13_MEDIATION',activity:'REVISED',period:'ALL',search:'Vergleichsgruppen',now:at+3}).length,1);
 assert.equal(archiveRows([argued],{kind:'G13_MEDIATION',activity:'ALL',period:'ALL',search:b.unitId,now:at+3}).length,1);
 assert.equal(archiveRows([argued],{kind:'G13_MEDIATION',activity:'ALL',period:'ALL',search:'p3',now:at+3}).length,1);
 assert.throws(()=>addMediationRevision(original,b,'ARGUMENT','Text','p9','Unklar','bad',at),/vollständig/);
 assert.throws(()=>addMediationRevision(original,b,'ADAPTATION','Text','p1',' ','bad',at),/vollständig/);
 assert.throws(()=>addMediationRevision({...original,sourceId:'unexpected'},b,'ARGUMENT','Text','p1','Unklar','bad',at),/vollständig/);
});
test('progress tracks distinct documented acts, not correctness or mastery; next brief is deterministic',()=>{
 const original=first();
 assert.equal(nextMediationBrief([]).id,b.id);
 const one=mediationProgress([original]);assert.deepEqual(one,{started:1,adapted:0,argued:0,revisions:0,total:4});
 const revised=addMediationRevision(original,b,'ARGUMENT','Abwägung','p3','Unsicher','r1',at+1);
 assert.equal(mediationProgress([revised]).argued,1);
 assert.equal(mediationProgress([revised]).adapted,0);
 const adapted=addMediationRevision(revised,b,'ADAPTATION','Für die Zielgruppe','p1','Bedingt','r2',at+2);
 assert.equal(mediationProgress([adapted]).adapted,1);
 assert.equal(mediationProgress([adapted]).revisions,2);
 assert.equal(nextMediationBrief([adapted]).id,mediationBriefs[1].id);
});
test('v3 encrypted-digest portable JSON keeps original M09 identity and exact evidence revisions',async()=>{
 const entry=addMediationRevision(first(),b,'ADAPTATION','Adressatengerecht','p2','Eingeschränkte Aussage','rev',at+1);
 const data:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[entry],missions:[]};
 const backup=await buildPortableBackup(data);
 const result=await inspectPortableBackup(backup);
 assert.equal(result.version,BACKUP_VERSION);
 assert.deepEqual(result.records.productionEntries,[entry]);
 assert.equal(result.records.productionEntries[0].decisionId,b.audiences[0].id+'|p2');
});
