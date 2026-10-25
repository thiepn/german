import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const base='http://127.0.0.1:4173/';
async function snapshots(page){
 return page.evaluate(async()=>new Promise((resolve,reject)=>{
  const r=indexedDB.open('sprachgefuehl-learning-v1');
  r.onsuccess=()=>{
   const db=r.result,tx=db.transaction(['attempts','reviewEvents','cards'],'readonly');
   const result={};
   let left=3;
   for(const name of ['attempts','reviewEvents','cards']){
    const q=tx.objectStore(name).getAll();q.onsuccess=()=>{result[name]=q.result;if(!--left){db.close();resolve(result)}};q.onerror=()=>reject(q.error);
   }
  };r.onerror=()=>reject(r.error);
 }));
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:820},serviceWorkers:'allow'});
 try{
  const a=await ctx.newPage();await a.goto(base,{waitUntil:'networkidle'});
  await a.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await a.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{
    const r=indexedDB.open('sprachgefuehl-learning-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   const t=Date.now()-3*86400000,tx=db.transaction(['attempts','cards'],'readwrite');
   tx.objectStore('attempts').add({id:'prior:SG-M01-001',itemId:'SG-M01-001',itemVersion:1,mode:'M01',skillId:'G01.GENUS',at:t,slots:{article:'die'},score:0,correct:false,hinted:false,result:'INCORRECT',sessionId:'prior',variantIndex:null});
   tx.objectStore('cards').add({id:'SG-M01-001:1',itemId:'SG-M01-001',itemVersion:1,dueAt:Date.now()-60000,stability:0.25,difficulty:5,lastReviewedAt:null,lapses:0,algorithmVersion:'sg-recall-0.1'});
   await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
   db.close();
  });
  await a.reload({waitUntil:'networkidle'});
  const b=await ctx.newPage();await b.goto(base,{waitUntil:'networkidle'});
  for(const page of [a,b]){
   await page.getByRole('button',{name:'Trainieren',exact:true}).first().click();
   await page.getByRole('button',{name:/Fällige Wiederholungen/}).click();
   await page.getByRole('heading',{name:'Wiederholen'}).waitFor();
   await page.getByRole('button',{name:'Antwort abrufen'}).first().click();
   await page.getByRole('heading',{name:'Artikelblitz'}).waitFor();
  }
  await a.getByLabel('Artikel',{exact:true}).fill('falsch');
  await a.getByRole('button',{name:'Antwort prüfen'}).click();
  await a.getByText('Noch nicht richtig').waitFor();
  await b.getByLabel('Artikel',{exact:true}).fill('falsch');
  await b.getByRole('button',{name:'Antwort prüfen'}).click();
  await b.getByText('Versuch wurde nicht bestätigt',{exact:false}).waitFor();
  const s=await snapshots(a);
  assert.equal(s.attempts.length,2,'one earlier attempt and one newly scheduled retrieval only');
  assert.equal(s.reviewEvents.length,1,'exactly one retrieval event');
  assert.equal(s.reviewEvents[0].algorithmVersion,'sg-recall-0.2');
  assert.equal(s.reviewEvents[0].grade,'Again');
  assert.equal(s.cards[0].algorithmVersion,'sg-recall-0.2');
  assert.equal(s.cards[0].lapses,1);
  assert.ok(s.cards[0].dueAt>Date.now(),'new review scheduled in the future');
  await a.reload({waitUntil:'networkidle'});
  await a.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await a.getByText('Später erneut abgerufen').waitFor();
  await a.getByText('1 verzögerte Abrufe',{exact:false}).waitFor();
  await a.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await a.getByRole('button',{name:/Fällige Wiederholungen/}).click();
  await a.getByText('Für heute steht keine freigegebene Wiederholung an.').waitFor();
  await ctx.setOffline(true);
  await a.reload({waitUntil:'domcontentloaded'});
  await a.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await a.getByRole('button',{name:/Fällige Wiederholungen/}).click();
  await a.getByRole('heading',{name:'Wiederholen'}).waitFor();
  await ctx.setOffline(false);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360);console.log('PASS: legacy recall, atomic first attempt/event/card, stale tab rejection, delayed evidence, offline reload desktop/mobile');}finally{await browser.close()}
