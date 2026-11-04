import assert from 'node:assert/strict';
import {firefox,webkit} from 'playwright';
const url='http://127.0.0.1:4173/';
async function exercise(browserType,name,width){
 const browser=await browserType.launch({headless:true});
 const context=await browser.newContext({viewport:{width,height:850},acceptDownloads:true});
 try{
  const p=await context.newPage();
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  const stores=await p.evaluate(async()=>await new Promise((resolve,reject)=>{
   const req=indexedDB.open('sprachgefuehl-learning-v1',4);
   req.onsuccess=()=>{const db=req.result;const s=[...db.objectStoreNames];db.close();resolve(s)};
   req.onerror=()=>reject(req.error);
  }));
  for(const store of ['attempts','cards','reviewEvents','settings','drafts','diagnosticSessions','productionEntries','missions'])assert.ok(stores.includes(store),name+' store '+store);
  assert.equal(stores.length,8,name+' must retain exactly eight stores');
  await p.getByRole('button',{name:'Jetzt trainieren'}).click();
  const fields=await p.locator('.exercise input[required]').all();
  assert.ok(fields.length>0,name+' objective exercise present');
  for(const f of fields)await f.fill('unpassend');
  await p.getByRole('button',{name:'Antwort prüfen'}).click();
  await p.getByText('Noch nicht richtig').waitFor();
  const attempts=await p.evaluate(async()=>await new Promise((resolve,reject)=>{
   const req=indexedDB.open('sprachgefuehl-learning-v1',4);
   req.onsuccess=()=>{const db=req.result;const tx=db.transaction('attempts','readonly');const q=tx.objectStore('attempts').getAll();q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=()=>reject(q.error)};
   req.onerror=()=>reject(req.error);
  }));
  assert.ok(attempts.length===1&&attempts[0].itemVersion===1,name+' v1 source identity persisted');
  await p.reload({waitUntil:'domcontentloaded'});
  const persisted=await p.evaluate(async()=>await new Promise((resolve,reject)=>{
   const req=indexedDB.open('sprachgefuehl-learning-v1',4);
   req.onsuccess=()=>{const db=req.result;const tx=db.transaction('attempts','readonly');const q=tx.objectStore('attempts').count();q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=()=>reject(q.error)};
   req.onerror=()=>reject(req.error);
  }));
  assert.equal(persisted,1,name+' reload preserved v1 attempt');
  console.log('PASS M40 genuine '+name+' '+width+' eight IndexedDB stores, v1 attempt and reload');
 }finally{await context.close();await browser.close()}
}
for(const [name,browser] of [['Firefox',firefox],['WebKit',webkit]]){
 for(const width of [1280,360])await exercise(browser,name,width);
}
