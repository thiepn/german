import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {scanDemoReferences,auditSourceBoundary,verifyNoDemoLeakage} from '../scripts/content/releaseBoundary.mjs';
import {stampWorker} from '../scripts/offline/stamp-worker.mjs';
const temporary=()=>mkdtempSync(join(tmpdir(),'sg-m40-'));
test('M40 source audit records remaining G01–G13 author fixtures and refuses approved-only graph',()=>{
 const result=auditSourceBoundary();
 assert.equal(result.channel,'DEMO_ONLY');
 assert.ok(result.demoImportCount>=20,'non-objective studio fixture references must remain visible in audit');
 assert.ok(result.refs.some((r:any)=>r.file.includes('relative/relative.ts')));
 assert.ok(result.refs.some((r:any)=>r.file.includes('oral/oral.ts')));
 assert.throws(()=>auditSourceBoundary({channel:'APPROVED_ONLY'}),/RELEASE_SOURCE_BLOCKED/);
});
test('M40 negative source graph injection cannot be silently cleared by count flags',()=>{
 const dir=temporary();
 try{
  mkdirSync(join(dir,'g12'));writeFileSync(join(dir,'g12/speak.ts'),"import data from '../../../content/fixtures/g12-oral-rehearsal.demo.json';");
  assert.equal(scanDemoReferences(dir).length,1);
  assert.throws(()=>auditSourceBoundary({sourceRoot:dir,channel:'APPROVED_ONLY'}),/RELEASE_SOURCE_BLOCKED/);
  writeFileSync(join(dir,'g12/speak.ts'),"export const safe = 'no demo import';");
  assert.equal(scanDemoReferences(dir).length,0);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('M40 artifact release leakage scan blocks source rights labels and known demo IDs',()=>{
 const dir=temporary();
 try{
  mkdirSync(join(dir,'assets'));
  writeFileSync(join(dir,'index.html'),'<main>safe</main>');
  writeFileSync(join(dir,'assets/main.js'),'const approved = 1;');
  assert.equal(verifyNoDemoLeakage(dir).violations.length,0);
  writeFileSync(join(dir,'assets/main.js'),"const source='ORIGINAL_DRAFT';");
  assert.throws(()=>verifyNoDemoLeakage(dir),/RELEASE_ARTIFACT_BLOCKED/);
  writeFileSync(join(dir,'assets/main.js'),'const approved=1;');
  writeFileSync(join(dir,'data.json'),'{"status":"DEMO_ONLY"}');
  assert.throws(()=>verifyNoDemoLeakage(dir),/RELEASE_ARTIFACT_BLOCKED/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('M40 SW fingerprint changes on asset changes but is stable for identical builds',()=>{
 const dir=temporary();
 try{
  mkdirSync(join(dir,'assets'));mkdirSync(join(dir,'data'));
  writeFileSync(join(dir,'index.html'),'<script type="module" src="./assets/main.js"></script>');
  writeFileSync(join(dir,'assets/main.js'),'const revision=1;');
  writeFileSync(join(dir,'manifest.webmanifest'),'{}');
  writeFileSync(join(dir,'icon.svg'),'<svg/>');
  writeFileSync(join(dir,'data/approved.v1.json'),'{"items":[]}');
  const a=stampWorker(dir);
  const out=readFileSync(join(dir,'sw.js'),'utf8');
  assert.match(a.revision,/^[a-f0-9]{20}$/);
  assert.ok(out.includes(a.cache));assert.ok(!out.includes('__SG_BUILD_FINGERPRINT__'));
  assert.equal(stampWorker(dir).revision,a.revision);
  writeFileSync(join(dir,'assets/main.js'),'const revision=2;');
  const b=stampWorker(dir);assert.notEqual(b.revision,a.revision);
  assert.ok(readFileSync(join(dir,'sw.js'),'utf8').includes(b.cache));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('M40 source/backup contract remains unmodified by release tooling',()=>{
 const schema=readFileSync(new URL('../src/persistence/schema.ts',import.meta.url),'utf8');
 const backup=readFileSync(new URL('../src/persistence/portableBackup.ts',import.meta.url),'utf8');
 assert.match(schema,/DB_VERSION=4/);assert.match(backup,/BACKUP_VERSION=3/);
 for(const x of ['attempts','cards','reviewEvents','settings','drafts','diagnosticSessions','productionEntries','missions'])assert.ok(backup.includes(x));
 assert.match(schema,/expected\.itemVersion!==attempt\.itemVersion/);
 const v2=JSON.parse(readFileSync(new URL('../content/editorial/m38-versioned-drafts.json',import.meta.url),'utf8'));
 assert.equal(v2.revisions.length,4);
 assert.ok(v2.revisions.every((r:any)=>r.draftV2.version===2&&r.draftV2.status==='DEMO_ONLY'));
});
