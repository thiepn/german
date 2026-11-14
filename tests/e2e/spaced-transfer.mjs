import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const core=JSON.parse(await readFile(new URL('../../content/fixtures/core.demo.json',import.meta.url),'utf8'));
const byId=new Map(core.map(x=>[x.id,x]));
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
async function scenario(width){
 const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'allow'});
 try{
  const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
  if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  const focus=p.locator('.today-focus button.today-action').first();
  const answer=async(id,value)=>{
   await focus.click();
   assert.equal(await p.locator('.exercise .prompt').innerText(),byId.get(id).prompt,'exact objective item');
   await p.getByLabel('Artikel',{exact:true}).fill(value);
   await p.getByRole('button',{name:'Antwort prüfen'}).click();
   await p.getByRole('button',{name:'Zur Übersicht'}).click();
  };
  await answer('SG-M01-001','falsch');
  await answer('SG-M01-001','die'); // genuine immediate due review, not new context
  await answer('SG-M01-005','die'); // independent new context, first attempt
  const evidence=()=>p.getByRole('region',{name:'Lernsignale aus Übung und Schreiben'});
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await evidence().getByText('1 Übungsthemen warten auf einen zweiten neuen Kontext',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Fehler',exact:true}).first().click();
  const errorCluster=p.locator('article.error-cluster').filter({hasText:'Gesellschaft'}).first();
  assert.equal(await errorCluster.getByRole('button',{name:'Neuen Kontext üben'}).isDisabled(),true);
  await errorCluster.getByText('frühestens ab',{exact:false}).waitFor();
  // The isolated browser fixture advances elapsed learner time, not browser timers.
  // This never touches production records or changes first answers/IDs.
  await p.evaluate(async()=>new Promise((resolve,reject)=>{
   const request=indexedDB.open('sprachgefuehl-learning-v1');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const db=request.result,tx=db.transaction('attempts','readwrite'),store=tx.objectStore('attempts'),get=store.getAll();
    get.onerror=()=>reject(get.error);
    get.onsuccess=()=>{
     for(const entry of get.result){
      entry.at-=86400000+600000;
      store.put(entry);
     }
    };
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onabort=()=>{db.close();reject(tx.error??Error('Fixture transaction aborted'));};
   };
  }));
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  await focus.getByText('neuer Fehlerkontext',{exact:false}).waitFor();
  await answer('SG-M01-009','das'); // new independent context after >=24h
  await p.getByRole('button',{name:'Fehler',exact:true}).first().click();
  await errorCluster.getByText('Erneut angewendet',{exact:false}).waitFor();
  await errorCluster.getByText('mindestens 24 Stunden',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await evidence().getByText('1 Themen mit mindestens zwei richtigen',{exact:false}).waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await evidence().getByText('1 Themen mit mindestens zwei richtigen',{exact:false}).waitFor();
  const rows=await p.evaluate(async()=>new Promise((resolve,reject)=>{
   const request=indexedDB.open('sprachgefuehl-learning-v1');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{const db=request.result,tx=db.transaction('attempts','readonly'),get=tx.objectStore('attempts').getAll();
    get.onsuccess=()=>{db.close();resolve(get.result)};get.onerror=()=>reject(get.error);}
  }));
  assert.equal(rows.length,4);
  assert.equal(rows.filter(x=>x.itemId==='SG-M01-001').length,2);
  assert.equal(rows.filter(x=>x.itemId==='SG-M01-005'&&x.result==='CORRECT').length,1);
  assert.equal(rows.filter(x=>x.itemId==='SG-M01-009'&&x.result==='CORRECT').length,1);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  console.log('PASS M48 cold new-context transfer 24h gate, genuine due review, spaced independent observed first answers, reload '+width);
 }finally{await ctx.close()}
}
try{await scenario(1280);await scenario(360)}finally{await browser.close()}
