import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPortableBackup,inspectPortableBackup,backupCounts,type BackupRecords} from '../src/persistence/portableBackup.ts';
const empty=():BackupRecords=>({attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[]});
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
 await assert.rejects(inspectPortableBackup(json.replace('"version": 2','"version": 99')),/Sicherungsformat/);
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
 const {createHash}=await import('node:crypto');
 const sha=createHash('sha256').update(JSON.stringify(legacy)).digest('hex');
 const restored=await inspectPortableBackup(JSON.stringify({...legacy,integrity:{algorithm:'SHA-256',digest:sha}}));
 assert.equal(restored.records.productionEntries.length,0);
 assert.equal(restored.records.attempts.length,0);
});
