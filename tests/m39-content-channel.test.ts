import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolveContentChannel} from '../scripts/content/channel.ts';
import {allItems,itemById} from '../src/domain/content/registry.ts';
const read=(p:string)=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
test('M39 demo objective content remains byte/source-identical and no v2 activated',()=>{
 const demo=['core','syntax-collocations','collocation-contrasts','nuance-grounded','advanced-precision','semantic-register']
  .flatMap(n=>read('content/fixtures/'+n+'.demo.json'));
 assert.equal(allItems.length,202);assert.deepEqual(allItems,demo);
 assert.equal(itemById.size,202);assert.ok(allItems.every(i=>i.version===1&&i.status==='DEMO_ONLY'));
 assert.equal(resolveContentChannel('DEMO_ONLY',read('content/manifest.json'),[],[]),'DEMO_ONLY');
});
test('M39 APPROVED_ONLY channel rejects zero approvals and forged release metadata',()=>{
 const manifest=read('content/manifest.json');
 assert.throws(()=>resolveContentChannel('APPROVED_ONLY',manifest,[],[]),/signed release manifest is absent/);
 assert.throws(()=>resolveContentChannel('release',manifest,[],[]),/unknown content channel/);
 const fake={...manifest,releaseStatus:'RELEASE_CANDIDATE',publishedApprovedCount:350,lessonApprovalCount:10};
 assert.throws(()=>resolveContentChannel('APPROVED_ONLY',fake,[],[]),/studios are not independently qualified/);
 assert.throws(()=>resolveContentChannel('APPROVED_ONLY',{...fake,releaseStudiosQualified:true},[],[]),/approved exercise count/);
});
test('M39 release command and direct package release fail closed without writing to learner stores',()=>{
 const check=spawnSync('npm',['run','check:release'],{encoding:'utf8',env:{...process.env,SG_CONTENT_CHANNEL:'APPROVED_ONLY'}});
 assert.notEqual(check.status,0);assert.match(check.stdout+check.stderr,/RELEASE_BLOCKED|CONTENT_CHANNEL_BLOCKED/);
 const packageOnly=spawnSync(process.execPath,['scripts/content/package.mjs','--release'],{encoding:'utf8',env:{...process.env,SG_CONTENT_CHANNEL:'DEMO_ONLY'}});
 assert.notEqual(packageOnly.status,0);assert.match(packageOnly.stdout+packageOnly.stderr,/RELEASE_BLOCKED/);
});
test('M39 approved channel is a distinct source file and only explicit release selects it',()=>{
 const registry=readFileSync(new URL('../src/domain/content/registry.ts',import.meta.url),'utf8');
 const config=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
 const approved=readFileSync(new URL('../src/domain/content/objectiveContent.approved.ts',import.meta.url),'utf8');
 const packageScript=readFileSync(new URL('../package.json',import.meta.url),'utf8');
 assert.match(registry,/from '\.\/objectiveContent\.demo'/);assert.doesNotMatch(registry,/fixtures\//);
 assert.match(config,/objectiveContent\.approved\.ts/);assert.match(config,/resolveContentChannel/);
 assert.match(approved,/content\/approved\/approved\.json/);assert.doesNotMatch(approved,/\.demo\.json/);
 assert.match(packageScript,/SG_CONTENT_CHANNEL=APPROVED_ONLY npm run build/);
});
