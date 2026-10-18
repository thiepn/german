import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const origin='http://127.0.0.1:4173/';
try{
 for(const width of [1280,360]){
  const ctx=await browser.newContext({viewport:{width,height:840},serviceWorkers:'allow'});
  const a=await ctx.newPage();await a.goto(origin,{waitUntil:'networkidle'});
  await a.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  const b=await ctx.newPage();await b.goto(origin,{waitUntil:'networkidle'});
  await a.getByRole('button',{name:'Jetzt trainieren'}).click();
  await a.getByText('Tagesmission · Aufgabe 1 /',{exact:false}).waitFor();
  // Tab B loaded before A created a mission. It must reuse the saved plan, not replace it.
  await b.getByRole('button',{name:'Jetzt trainieren'}).click();
  await b.getByText('Tagesmission · Aufgabe 1 /',{exact:false}).waitFor();
  const ids=await a.evaluate(async()=>new Promise((ok,err)=>{
   const open=indexedDB.open('sprachgefuehl-learning-v1');
   open.onsuccess=()=>{const db=open.result,tx=db.transaction('missions','readonly'),q=tx.objectStore('missions').getAll();q.onsuccess=()=>{db.close();ok(q.result.map(x=>x.id))};q.onerror=()=>err(q.error)};open.onerror=()=>err(open.error);
  }));
  assert.equal(ids.length,1,'two tabs never create separate competing missions');
  // Tab B pauses, so A's previous mission revision cannot accept stale answers.
  await b.getByRole('button',{name:'Training verlassen'}).click();
  await b.getByRole('button',{name:'Mission fortsetzen'}).click(); // advances revision
  for(const input of await a.locator('.exercise input[required]').all())await input.fill('unpassend');
  await a.getByText('Entwurf konnte nicht gespeichert werden',{exact:false}).waitFor();
  await a.getByRole('button',{name:'Antwort prüfen'}).click();
  await a.getByText('Versuch wurde nicht bestätigt',{exact:false}).waitFor();
  const attemptCount=await b.evaluate(async()=>new Promise((ok,err)=>{
   const o=indexedDB.open('sprachgefuehl-learning-v1');o.onsuccess=()=>{const db=o.result,t=db.transaction('attempts','readonly'),q=t.objectStore('attempts').count();q.onsuccess=()=>{db.close();ok(q.result)};q.onerror=()=>err(q.error)};o.onerror=()=>err(o.error)
  }));
  assert.equal(attemptCount,0,'stale tab cannot create an orphan attempt');
  for(const input of await b.locator('.exercise input[required]').all())await input.fill('unpassend');
  await b.getByRole('button',{name:'Antwort prüfen'}).click();
  await b.getByText('Noch nicht richtig').waitFor();
  await b.getByRole('button',{name:'Nächste Aufgabe'}).click();
  await b.getByText('Tagesmission · Aufgabe 2 /',{exact:false}).waitFor();
  await b.reload({waitUntil:'networkidle'});
  await b.getByText('Tagesmission · Aufgabe 2 /',{exact:false}).waitFor();
  await ctx.close();
 }
 console.log('PASS: two-tab mission create/reuse, stale answer isolation, CAS progress, reload desktop/mobile');
}finally{await browser.close()}
