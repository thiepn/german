import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPortableBackup,inspectPortableBackup,backupCounts,type BackupRecords} from '../src/persistence/portableBackup.ts';
const empty=():BackupRecords=>({attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[],missions:[]});
test('portable export/import verifies all seven stores and Unicode',async()=>{
 const x=empty();x.attempts=[{id:'s:1',itemId:'SG-M02-001',itemVersion:1,mode:'M02',skillId:'G02.TEST',at:100,slots:{a:'des großen Hauses'},score:1,correct:true,hinted:false,result:'CORRECT',sessionId:'s',variantIndex:0}];
 x.diagnosticSessions=[{id:'diag-1',form:'A',formFingerprint:'a@1',itemIds:['a'],phase:'PAUSED',startedAt:1,updatedAt:2,responses:[]}];
 const json=await buildPortableBackup(x,'2026-10-18T00:00:00.000Z');
 const restored=await inspectPortableBackup(json);
 assert.deepEqual(restored.records,x);
 assert.equal(backupCounts(restored.records).attempts,1);
 assert.equal(backupCounts(restored.records).diagnosticSessions,1);
 assert.match(json,/großen/);
});
test('tampered, malformed or unsupported backups fail closed',async()=>{
 const json=await buildPortableBackup(empty());
 await assert.rejects(inspectPortableBackup(json.replace('"attempts": []','"attempts": [{"id":"corrupt"}]')),/Integritäts|Ungültig/);
 await assert.rejects(inspectPortableBackup(json.replace('"version": 3','"version": 99')),/Sicherungsformat/);
 await assert.rejects(inspectPortableBackup('{'),/JSON/);
});
test('duplicate keys, structurally invalid attempts and unbounded input fail',async()=>{
 const x=empty();
 x.attempts=[{id:'bad',itemId:'item',sessionId:'s',skillId:'G01',at:0,score:4,slots:{},result:'CORRECT'} as never];
 await assert.rejects(buildPortableBackup(x),/Versuch/);
 const y=empty();y.settings=[{id:'local',entryTrack:'C1_C2',dailyMinutes:30,createdAt:1},{id:'local',entryTrack:'C1_C2',dailyMinutes:30,createdAt:1}];
 await assert.rejects(buildPortableBackup(y),/doppelte/);
});

test('v1 six-store snapshots remain readable without inventing writing history',async()=>{
 const json=await buildPortableBackup(empty());const current=JSON.parse(json);
 const legacy={format:current.format,version:1,sourceDatabase:current.sourceDatabase,createdAt:current.createdAt,records:{...current.records}};
 delete legacy.records.productionEntries;
 delete legacy.records.missions;
 const {createHash}=await import('node:crypto');
 const sha=createHash('sha256').update(JSON.stringify(legacy)).digest('hex');
 const restored=await inspectPortableBackup(JSON.stringify({...legacy,integrity:{algorithm:'SHA-256',digest:sha}}));
 assert.equal(restored.records.productionEntries.length,0);
 assert.equal(restored.records.attempts.length,0);
});


test('M40 signed legacy v1/v2 and current v3 preserve source-version identities without rewriting learner history',async()=>{
 const {createHash}=await import('node:crypto');
 const history=empty();
 history.attempts=[{id:'session:item-v1',itemId:'SG-M05-036',itemVersion:1,mode:'M05',skillId:'G07.KOLLOKATION',
  at:10,slots:{collocation:'prüfen'},score:1,correct:true,hinted:false,result:'CORRECT',sessionId:'session',variantIndex:0}];
 history.productionEntries=[{id:'relative:SG-G02R-002',kind:'RELATIVE_STUDY',itemId:'SG-G02R-002',itemVersion:1,
  sourceId:'SG-G02R-002',decisionId:'r1|B|p1',createdAt:100,original:'Historische Originalfassung',
  revisions:[{id:'revision-v1',at:200,text:'Historisch revidiert',reflection:'Grammatik','questionId':'REWRITE',paragraphId:'p1',
   lens:'REGISTER',selfChecks:['B']}],evaluated:'UNASSESSED'} as never];
 const createdAt='2026-11-04T00:00:00.000Z';
 const sign=(version:1|2,records:Record<string,unknown>)=>{
  const payload={format:'sprachgefuehl-local-backup',version,sourceDatabase:'sprachgefuehl-learning-v1',createdAt,records};
  return JSON.stringify({...payload,integrity:{algorithm:'SHA-256',digest:createHash('sha256').update(JSON.stringify(payload)).digest('hex')}});
 };
 const legacy1={attempts:history.attempts,cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[]};
 const legacy2={...legacy1,productionEntries:history.productionEntries};
 const a=await inspectPortableBackup(sign(1,legacy1));
 const b=await inspectPortableBackup(sign(2,legacy2));
 const c=await inspectPortableBackup(await buildPortableBackup(history,createdAt));
 for(const restored of [a,b,c]){
  assert.equal(restored.version,3,'normalized current backup envelope');
  assert.deepEqual(restored.records.attempts,history.attempts,'historical graded attempt and item version preserved');
  assert.equal(restored.records.attempts[0].itemVersion,1);
  assert.equal(backupCounts(restored.records).missions,0);
 }
 assert.equal(a.records.productionEntries.length,0,'v1 must not fabricate writing history');
 assert.deepEqual(b.records.productionEntries,history.productionEntries,'v2 first draft and revision remain byte-identical');
 assert.deepEqual(c.records.productionEntries,history.productionEntries,'v3 original plus revision intact');
 assert.deepEqual(b.records.missions,[],'v2 migration to v3 does not invent mission rows');
 const tampered=JSON.parse(sign(2,legacy2));
 tampered.records.productionEntries[0].itemVersion=2;
 await assert.rejects(inspectPortableBackup(JSON.stringify(tampered)),/Integritätsprüfung fehlgeschlagen/);
});
