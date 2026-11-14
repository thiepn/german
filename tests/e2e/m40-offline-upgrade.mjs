import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const url='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
 const page=await ctx.newPage();
 const clientErrors=[];
 page.on('pageerror',e=>clientErrors.push('pageerror '+e.message));
 page.on('requestfailed',r=>clientErrors.push('requestfailed '+r.url()+' '+JSON.stringify(r.failure())));
 // The app installs its normal worker first. A changed script URL below then
 // creates a genuine new install/activate cycle without unregistering the
 // current controlling worker or intercepting the page's native APIs.
 await page.goto(url,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,null,{timeout:20000});
 const before=await page.evaluate(async()=>{
  const db=await new Promise((res,rej)=>{const q=indexedDB.open('sprachgefuehl-learning-v1',4);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const stores=[...db.objectStoreNames];
  const settings=await new Promise((res,rej)=>{const q=db.transaction('settings','readonly').objectStore('settings').get('local');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  db.close();return {stores,settings,keys:await caches.keys()};
 });
 assert.equal(before.stores.length,8,'eight IndexedDB stores before SW upgrade');
 assert.equal(before.settings?.id,'local','settings saved before upgrade');
 const fingerprinted=before.keys.filter(k=>/^sprachgefuehl-shell-[a-f0-9]{20}$/.test(k));
 assert.equal(fingerprinted.length,1,'first worker installed a fingerprinted shell');
 await page.evaluate(async()=>{
  const old=await caches.open('sprachgefuehl-shell-0.1');
  await old.put('./index.html',new Response('<html>legacy shell</html>',{headers:{'content-type':'text/html'}}));
  // Different script URL forces the browser's update algorithm rather than
  // recycling an existing registration with identical script bytes.
  const newRegistration=await navigator.serviceWorker.register('./sw.js?m40-revision=2',{scope:'./'});
  await new Promise((resolve,reject)=>{
   let count=0;
   const poll=()=>{
    if(newRegistration.active?.scriptURL.includes('m40-revision=2')&&newRegistration.active.state==='activated')resolve();
    else if(++count>200)reject(Error('New worker did not activate after changing script URL'));
    else setTimeout(poll,100);
   };poll();
  });
 });
 await page.waitForFunction(async()=>{
  const keys=await caches.keys();
  return !keys.includes('sprachgefuehl-shell-0.1')&&keys.some(k=>/^sprachgefuehl-shell-[a-f0-9]{20}$/.test(k))&&
   navigator.serviceWorker.controller?.scriptURL.includes('m40-revision=2');
 },null,{timeout:25000});
 const shell=await page.evaluate(async()=>{
  const name=(await caches.keys()).find(k=>/^sprachgefuehl-shell-[a-f0-9]{20}$/.test(k));
  const cache=await caches.open(name);
  const index=await cache.match('./index.html');
  if(!index)return {index:false,missing:['index.html']};
  const html=await index.text();
  const assets=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]).filter(x=>x.includes('/assets/')||x.startsWith('./assets/'));
  const missing=[];for(const asset of assets)if(!await cache.match(asset))missing.push(asset);
  return {index:true,assetCount:assets.length,missing};
 });
 assert.ok(shell.index&&shell.assetCount>=2&&shell.missing.length===0,'upgrade must cache index, JS and CSS: '+JSON.stringify(shell));
 await ctx.setOffline(true);
 const response=await page.reload({waitUntil:'domcontentloaded'});
 try{await page.getByRole('navigation',{name:'Hauptnavigation'}).first().waitFor({timeout:10000})}
 catch(error){
  const html=(await page.content()).slice(0,1000);
  const details=await page.evaluate(async()=>({url:location.href,controller:navigator.serviceWorker.controller?.scriptURL,keys:await caches.keys()})).catch(e=>({error:String(e)}));
  throw Error('M40 offline upgrade failed: status='+response?.status()+' shell='+JSON.stringify(shell)+' details='+JSON.stringify(details)+' html='+html+' errors='+clientErrors.join(' | ')+' cause='+String(error));
 }
 const after=await page.evaluate(async()=>{
  const db=await new Promise((res,rej)=>{const q=indexedDB.open('sprachgefuehl-learning-v1',4);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  const stores=[...db.objectStoreNames];
  const settings=await new Promise((res,rej)=>{const q=db.transaction('settings','readonly').objectStore('settings').get('local');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
  db.close();return {stores,settings,keys:await caches.keys()};
 });
 assert.deepEqual(after.stores,before.stores,'worker upgrade preserves the eight stores');
 assert.deepEqual(after.settings,before.settings,'worker upgrade and offline reload preserve learner settings');
 assert.ok(after.keys.includes(fingerprinted[0]),'updated shell cache remains available');
 assert.ok(!after.keys.includes('sprachgefuehl-shell-0.1'),'legacy cache is retired after new activation');
 await ctx.setOffline(false);await ctx.close();
 console.log('PASS M40 Chromium real changed-script SW upgrade, old cache retirement, offline reload, settings and eight-store preservation');
}finally{await browser.close()}
