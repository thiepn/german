import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const url='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
 // Delay only the test page's first registration, so the legacy cache really
 // precedes a new install/activate event. No app or production worker is patched.
 await ctx.addInitScript(()=>{
  const sw=navigator.serviceWorker;
  const nativeRegister=sw.register.bind(sw);
  sw.register=(...args)=>new Promise((resolve,reject)=>{
   window.__m40InstallNewWorker=()=>nativeRegister(...args).then(resolve,reject);
  });
 });
 const page=await ctx.newPage();await page.goto(url,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 const before=await page.evaluate(async()=>{
  const db=await new Promise((res,rej)=>{const q=indexedDB.open('sprachgefuehl-learning-v1',4);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const stores=[...db.objectStoreNames];
  const settings=await new Promise((res,rej)=>{const q=db.transaction('settings','readonly').objectStore('settings').get('local');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  db.close();return {stores,settings,keys:await caches.keys()};
 });
 assert.equal(before.stores.length,8,'schema remains eight stores');
 assert.equal(before.settings?.id,'local','learner settings persisted before worker upgrade');
 assert.equal(before.keys.filter(k=>k.startsWith('sprachgefuehl-shell-')).length,0,'new worker must be delayed before legacy seeding');
 await page.evaluate(async()=>{
  const old=await caches.open('sprachgefuehl-shell-0.1');
  await old.put('./index.html',new Response('<html>legacy shell</html>',{headers:{'content-type':'text/html'}}));
  if(typeof window.__m40InstallNewWorker!=='function')throw Error('application did not request service-worker registration');
  await window.__m40InstallNewWorker();
  await navigator.serviceWorker.ready;
 });
 await page.waitForFunction(async()=>{
  const keys=await caches.keys();
  return !keys.includes('sprachgefuehl-shell-0.1')&&keys.some(k=>/^sprachgefuehl-shell-[a-f0-9]{20}$/.test(k));
 },null,{timeout:20000});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:20000});
 const current=(await page.evaluate(()=>caches.keys())).filter(k=>/^sprachgefuehl-shell-[a-f0-9]{20}$/.test(k));
 assert.equal(current.length,1,'new build-fingerprinted shell installed; legacy shell removed by real activation');
 await ctx.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('navigation',{name:'Hauptnavigation'}).first().waitFor();
 const after=await page.evaluate(async()=>{
  const db=await new Promise((res,rej)=>{const q=indexedDB.open('sprachgefuehl-learning-v1',4);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const stores=[...db.objectStoreNames];
  const settings=await new Promise((res,rej)=>{const q=db.transaction('settings','readonly').objectStore('settings').get('local');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  db.close();return {stores,settings,keys:await caches.keys()};
 });
 assert.deepEqual(after.stores,before.stores,'service-worker activation never changes learner stores');
 assert.deepEqual(after.settings,before.settings,'existing learner settings survive offline cache activation');
 assert.ok(after.keys.includes(current[0]),'current offline shell intact');
 await ctx.setOffline(false);await ctx.close();
 console.log('PASS M40 genuine Chromium SW legacy cache-before-install activation, offline reload, settings and eight-store preservation');
}finally{await browser.close()}
