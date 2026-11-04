/**
 * M40 conservative source/artifact boundary. A structural check is NOT a
 * rights clearance, independent editorial review or proof of learning value.
 */
import {readdirSync,readFileSync,statSync,existsSync} from 'node:fs';
import {resolve,relative,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const SOURCE_EXT=new Set(['.ts','.tsx','.js','.jsx','.mjs']);
const DEMO_REF=/['"]([^'"]*\/fixtures\/[^'"]+\.demo\.json)['"]/g;
export function scanDemoReferences(sourceRoot=resolve(ROOT,'src')){
 const issues=[];
 function walk(folder){
  for(const dirent of readdirSync(folder,{withFileTypes:true})){
   const path=join(folder,dirent.name);
   if(dirent.isDirectory()){walk(path);continue;}
   if(!dirent.isFile()||!SOURCE_EXT.has(extname(path)))continue;
   const code=readFileSync(path,'utf8');
   for(const match of code.matchAll(DEMO_REF)){
    issues.push({file:relative(sourceRoot,path).replaceAll('\\','/'),
      fixture:match[1],kind:'STATIC_DEMO_FIXTURE_REFERENCE'});
   }
  }
 }
 walk(sourceRoot);
 return issues.sort((a,b)=>a.file.localeCompare(b.file)||a.fixture.localeCompare(b.fixture));
}
export function auditSourceBoundary({sourceRoot=resolve(ROOT,'src'),channel='DEMO_ONLY'}={}){
 if(!['DEMO_ONLY','APPROVED_ONLY'].includes(channel))throw Error('RELEASE_SOURCE_BLOCKED: invalid channel');
 const refs=scanDemoReferences(sourceRoot);
 if(channel==='APPROVED_ONLY'&&refs.length)throw Error('RELEASE_SOURCE_BLOCKED: '+refs.length+' direct demo fixture references remain in the learner-facing source graph (first '+refs[0].file+')');
 return {channel,classification:refs.length?'DRAFT_DEMO_REFERENCES_PRESENT':'NO_DIRECT_DEMO_REFERENCES',demoImportCount:refs.length,
  files:[...new Set(refs.map(x=>x.file))].length,refs,releaseQualified:false};
}
const FILE_EXT=new Set(['.html','.js','.css','.json','.webmanifest','.svg']);
const MARKERS=['DEMO_ONLY','AI_DRAFT','ORIGINAL_DRAFT','sg01-demo-8'];
export function verifyNoDemoLeakage(distRoot,{strict=true}={}){
 const failures=[],paths=[];
 if(!existsSync(distRoot))throw Error('RELEASE_ARTIFACT_BLOCKED: artifact directory missing');
 function walk(folder){
  for(const d of readdirSync(folder,{withFileTypes:true})){
   const path=join(folder,d.name);
   if(d.isDirectory()){walk(path);continue;}
   if(!d.isFile()||!FILE_EXT.has(extname(path)))continue;
   if(statSync(path).size>20*1024*1024)throw Error('RELEASE_ARTIFACT_BLOCKED: oversized output '+path);
   const s=readFileSync(path,'utf8');const hits=MARKERS.filter(x=>s.includes(x));
   paths.push(relative(distRoot,path).replaceAll('\\','/'));
   if(hits.length)failures.push({file:relative(distRoot,path).replaceAll('\\','/'),markers:hits});
  }
 }
 walk(distRoot);
 if(strict&&failures.length)throw Error('RELEASE_ARTIFACT_BLOCKED: unapproved marker(s) in '+failures.map(x=>x.file).join(', '));
 return {filesScanned:paths.length,violations:failures,releaseQualified:strict&&!failures.length};
}
function cli(){
 const channel=process.env.SG_CONTENT_CHANNEL??'DEMO_ONLY';
 const status=auditSourceBoundary({channel});
 if(process.argv.includes('--release-artifact')){
  if(channel!=='APPROVED_ONLY')throw Error('RELEASE_ARTIFACT_BLOCKED: channel must be approved only');
  const inspected=verifyNoDemoLeakage(resolve(ROOT,'dist'));
  console.log(JSON.stringify({M40:'PASS_STATIC_SOURCE_AND_ARTIFACT_ONLY',source:status,artifact:inspected},null,2));return;
 }
 if(process.argv.includes('--summary')){
  console.log(JSON.stringify({M40:'PASS_READONLY_DEMO_AUDIT',channel,refCount:status.demoImportCount,
   uniqueFiles:status.files,release:'NO_GO',editorial:'NO_GO'},null,2));
 }else console.log(JSON.stringify(status,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))cli();
