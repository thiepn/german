import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const url='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
 const page=await ctx.newPage();await page.goto(url,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,null,{timeout:20000});
 const before=await page.evaluate(async()=>{
  const db=await new Promise((res,rej)=>{const q=indexedDB.open('sprachgefuehl-learning-v1',4);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const stores=[...db.objectStoreNames];db.close();
  const keys=await caches.keys();
  return {stores,keys};
 });
 assert.equal(before.stores.length,8,'schema remains eight stores');
 const current=before.keys.filter(k=>/^sprachgefuehl-shell-[a-f0-9]{20}$/.test(k));
 assert.equal(current.length,1,'production SW cache must be content-fingerprinted');
 // Introduce a real legacy cache after first installation, then trigger a new
 // registration. Its removal must occur only through the SW activate sequence.
 await page.evaluate(async()=>{
  const old=await caches.open('sprachgefuehl-shell-0.1');
  await old.put('./index.html',new Response('<html>legacy shell</html>',{headers:{'content-type':'text/html'}}));
 });
 const removed=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker.getRegistration();
  if(!reg||!(await reg.unregister()))throw Error('cannot exercise SW replacement');
  const fresh=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
  await navigator.serviceWorker.ready;
  await new Promise((resolve,reject)=>{
   if(fresh.active?.state==='activated')return resolve();
   let count=0;const poll=()=>{if(fresh.active?.state==='activated')resolve();else if(++count>100)reject(Error('SW activation timeout'));else setTimeout(poll,100)};
   poll();
  });
  return !(await caches.keys()).includes('sprachgefuehl-shell-0.1');
 });
 assert.equal(removed,true,'legacy shell cache was removed after replacement activation');
 await ctx.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('navigation',{name:'Hauptnavigation'}).first().waitFor();
 const after=await page.evaluate(async()=>{
  const db=await new Promise((res,rej)=>{const q=indexedDB.open('sprachgefuehl-learning-v1',4);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const stores=[...db.objectStoreNames];db.close();
  return {stores,keys:await caches.keys()};
 });
 assert.deepEqual(after.stores,before.stores,'service-worker upgrade never touches learner stores');
 assert.ok(after.keys.includes(current[0]),'current offline shell intact');
 await ctx.setOffline(false);await ctx.close();
 console.log('PASS M40 real Chromium SW fingerprint, old cache replacement, offline reload, eight-store preservation');
}finally{await browser.close()}
