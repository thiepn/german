/**
 * A byte-level shell fingerprint forces SW script changes on genuine rebuilds.
 * No data/IndexedDB/backup migrations. Does not make a DEMO build publishable.
 */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const TOKEN='__SG_BUILD_FINGERPRINT__';
export function stampWorker(distDir=resolve(ROOT,'dist')){
 const html=readFileSync(join(distDir,'index.html'),'utf8');
 const names=[...new Set([...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map(m=>m[1].replace(/^\.?\//,'')))].sort();
 if(!names.length)throw Error('OFFLINE_SHELL_BLOCKED: no bundled assets present');
 const hash=createHash('sha256');hash.update(html);
 for(const name of names){
  const path=resolve(distDir,name);
  if(!path.startsWith(resolve(distDir,'assets')+'/')||!existsSync(path))throw Error('OFFLINE_SHELL_BLOCKED: asset missing '+name);
  hash.update(name);hash.update(readFileSync(path));
 }
 for(const name of ['manifest.webmanifest','icon.svg','data/approved.v1.json']){
  const path=join(distDir,name);if(!existsSync(path))throw Error('OFFLINE_SHELL_BLOCKED: missing '+name);
  hash.update(name);hash.update(readFileSync(path));
 }
 const source=readFileSync(join(ROOT,'public/sw.js'),'utf8');
 if(source.split(TOKEN).length!==2)throw Error('OFFLINE_SHELL_BLOCKED: unversioned or duplicate worker token');
 hash.update(source);
 const revision=hash.digest('hex').slice(0,20);
 const worker=source.replace(TOKEN,revision);
 writeFileSync(join(distDir,'sw.js'),worker);
 return {revision,cache:'sprachgefuehl-shell-'+revision,assets:names.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=stampWorker();console.log('Stamped offline worker: '+JSON.stringify(result));
}
