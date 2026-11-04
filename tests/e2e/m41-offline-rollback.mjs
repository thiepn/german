import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {cpSync,readFileSync,writeFileSync,mkdirSync,renameSync,rmSync,existsSync} from 'node:fs';
import {mkdtempSync} from 'node:fs';
import {join,extname,resolve,normalize,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {stampWorker} from '../../scripts/offline/stamp-worker.mjs';

const staging=mkdtempSync(join(tmpdir(),'sprachgefuehl-m41-roll-'));
const rootA=join(staging,'a'),rootB=join(staging,'b');
cpSync(resolve('dist'),rootA,{recursive:true});
cpSync(resolve('dist'),rootB,{recursive:true});
const first=readFileSync(join(rootA,'sw.js'),'utf8').match(/sprachgefuehl-shell-([a-f0-9]{20})/);
assert.ok(first,'build A must have a signed-content-fingerprinted service worker');
const buildA='sprachgefuehl-shell-'+first[1];
let index=readFileSync(join(rootB,'index.html'),'utf8');
const assets=[...new Set([...index.matchAll(/(?:src|href)="\.\/assets\/([^"]+)"/g)].map(m=>m[1]))];
assert.ok(assets.some(x=>x.endsWith('.js'))&&assets.some(x=>x.endsWith('.css')),'must include real app bundles');
for(const asset of assets){
 const renamed=asset.replace(/(\.[^.]+)$/,'-m41b$1');
 assert.notEqual(renamed,asset);
 renameSync(join(rootB,'assets',asset),join(rootB,'assets',renamed));
 index=index.replaceAll('./assets/'+asset,'./assets/'+renamed);
}
writeFileSync(join(rootB,'index.html'),index);
const buildB=stampWorker(rootB).cache;
assert.notEqual(buildA,buildB,'B build must have genuinely different script and hashed-asset URLs');
let serving='A';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const relative=path==='/'?'index.html':path.slice(1);
  const root=serving==='A'?rootA:rootB;
  const file=normalize(join(root,relative));
  if(!file.startsWith(root+sep)||!existsSync(file))throw Error('Missing/out-of-root path '+relative);
  const data=readFileSync(file);
  res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store','Service-Worker-Allowed':'/'});
  res.end(data);
 }catch(e){res.writeHead(404);res.end('not found: '+String(e))}
});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done)});
const port=server.address().port,url='http://127.0.0.1:'+port+'/';
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
const page=await ctx.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function waitCache(expected,old){
 await page.waitForFunction(async({expected,old})=>{
  const keys=(await caches.keys()).filter(k=>k.startsWith('sprachgefuehl-shell-'));
  return keys.length===1&&keys[0]===expected&&!keys.includes(old)&&!!navigator.serviceWorker?.controller;
 },{expected,old},{timeout:30000});
}
async function snapshot(){
 return page.evaluate(async()=>{
  const db=await new Promise((ok,no)=>{const q=indexedDB.open('sprachgefuehl-learning-v1',4);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});
  const stores=[...db.objectStoreNames];
  const settings=await new Promise((ok,no)=>{const q=db.transaction('settings','readonly').objectStore('settings').get('local');q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});
  db.close();return {stores,settings};
 });
}
async function assertOffline(expected,old,expectedSuffix){
 await waitCache(expected,old);
 await ctx.setOffline(true);
 const nav=await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(nav?.status(),200,'offline navigation served from shell cache');
 await page.getByRole('navigation',{name:'Hauptnavigation'}).first().waitFor({timeout:15000});
 const html=await page.content();
 const cacheHtml=await page.evaluate(async name=>{const c=await caches.open(name),r=await c.match('./index.html');return r?await r.text():null},expected);
 const observed={build:serving,expectedSuffix,loadedB:html.includes('-m41b.js'),cachedB:cacheHtml?.includes('-m41b.js'),
   servedIndexB:readFileSync(join(serving==='A'?rootA:rootB,'index.html'),'utf8').includes('-m41b.js'),
   htmlSrc:html.match(/src="([^"]+\.js)"/)?.[1],cacheSrc:cacheHtml?.match(/src="([^"]+\.js)"/)?.[1]};
 console.log('M41 rollback diagnostic: '+JSON.stringify(observed));
 assert.equal(html.includes('-m41b.js'),expectedSuffix,'SW must load the build-specific script: '+JSON.stringify(observed));
 await ctx.setOffline(false);
 return snapshot();
}
try{
 await page.goto(url,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await page.waitForFunction(()=>!!navigator.serviceWorker?.controller);
 await waitCache(buildA,buildB);
 const initial=await snapshot();
 assert.equal(initial.settings?.id,'local');assert.equal(initial.stores.length,8);
 serving='B';
 await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();if(!reg)throw Error('missing registration');await reg.update()});
 const afterB=await assertOffline(buildB,buildA,true);
 assert.deepEqual(afterB,initial,'A→B must not change learner data or eight stores');
 serving='A';
 await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();if(!reg)throw Error('missing registration');await reg.update()});
 const afterA=await assertOffline(buildA,buildB,false);
 assert.deepEqual(afterA,initial,'B→A rollback must not change learner data or eight stores');
 assert.deepEqual(errors,[],'no page exceptions during rollback');
 console.log('PASS M41 real Chromium A→B→A service-worker rollback of two distinct bundle-path builds, offline reload and exact learner-data preservation');
}finally{
 await ctx.close();await browser.close();
 await new Promise(ok=>server.close(ok));
 rmSync(staging,{force:true,recursive:true});
}
