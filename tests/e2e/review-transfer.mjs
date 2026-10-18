import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const origin='http://127.0.0.1:4173/';
async function seed(page){
 await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('sprachgefuehl-learning-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const t=Date.now()-3*86400000,tx=db.transaction(['attempts','cards'],'readwrite');
  tx.objectStore('attempts').add({id:'prior:SG-M01-001',itemId:'SG-M01-001',itemVersion:1,mode:'M01',skillId:'G01.GENUS',at:t,slots:{article:'die'},score:0,correct:false,hinted:false,result:'INCORRECT',sessionId:'prior',variantIndex:null});
  tx.objectStore('cards').add({id:'SG-M01-001:1',itemId:'SG-M01-001',itemVersion:1,dueAt:Date.now()-60000,stability:0.25,difficulty:5,lastReviewedAt:null,lapses:0,algorithmVersion:'sg-recall-0.1'});
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
 });
}
async function records(page){
 return page.evaluate(async()=>new Promise((resolve,reject)=>{
  const r=indexedDB.open('sprachgefuehl-learning-v1');
  r.onsuccess=()=>{
   const db=r.result,tx=db.transaction(['attempts','reviewEvents','cards'],'readonly');let left=3;const result={};
   for(const name of ['attempts','reviewEvents','cards']){
    const q=tx.objectStore(name).getAll();q.onsuccess=()=>{result[name]=q.result;if(!--left){db.close();resolve(result)}};q.onerror=()=>reject(q.error);
   }
  };r.onerror=()=>reject(r.error);
 }));
}
async function run(width){
 const context=await browser.newContext({viewport:{width,height:820},acceptDownloads:true,serviceWorkers:'allow'});
 try{
  const page=await context.newPage();await page.goto(origin,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await seed(page);await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await page.getByRole('button',{name:/Fällige Wiederholungen/}).click();
  await page.getByRole('button',{name:'Antwort abrufen'}).first().click();
  const source=await page.locator('.exercise .prompt').innerText();
  await page.getByLabel('Artikel',{exact:true}).fill('falsch');
  await page.getByRole('button',{name:'Antwort prüfen'}).click();
  await page.getByText('Noch nicht richtig').waitFor();
  await page.getByRole('button',{name:'Neuen Kontext öffnen'}).click();
  await page.waitForFunction(previous=>document.querySelector('.exercise .prompt')?.textContent?.trim()!==previous,source);
  const destination=await page.locator('.exercise .prompt').innerText();
  assert.notEqual(destination,source,'new question must differ from reviewed item');
  await page.getByLabel('Artikel',{exact:true}).fill('falsch');
  await page.getByRole('button',{name:'Antwort prüfen'}).click();
  await page.getByText('Noch nicht richtig').waitFor();
  const saved=await records(page);
  assert.equal(saved.reviewEvents.length,1,'only one scheduling event for source');
  assert.equal(saved.attempts.length,3,'historical, review, transfer first attempts');
  const link=saved.attempts.find(x=>x.sessionId.startsWith('review-transfer:'));
  assert.ok(link,'context attempt linked to review');
  assert.notEqual(link.itemId,'SG-M01-001');
  assert.equal(saved.cards[0].algorithmVersion,'sg-recall-0.2');
  await page.getByRole('button',{name:'Zur Übersicht'}).click();
  await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await page.getByText('Wiederholung → neuer Kontext').waitFor();
  await page.getByText('1 erste Transferantworten gesichert',{exact:false}).waitFor();
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await page.getByText('1 erste Transferantworten gesichert',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Daten & Sicherung'}).click();
  const awaited=page.waitForEvent('download');
  await page.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
  const dl=await awaited,filepath=await dl.path();assert.ok(filepath);
  const txt=await import('node:fs/promises').then(x=>x.readFile(filepath,'utf8'));
  assert.ok(txt.includes(link.sessionId),'existing portable backup contains linked transfer attempt');
  // Restore to a completely separate browser profile, preserving original review/transfer relationships.
  const restoredContext=await browser.newContext({viewport:{width,height:820},serviceWorkers:'allow'});
  try{
   const restored=await restoredContext.newPage();await restored.goto(origin,{waitUntil:'networkidle'});
   await restored.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
   await restored.getByRole('button',{name:'Daten & Sicherung'}).click();
   await restored.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'review-transfer.json',mimeType:'application/json',buffer:Buffer.from(txt)});
   await restored.getByText('Integrität bestätigt').waitFor();
   await restored.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
   await restored.getByText('Import abgeschlossen:').waitFor();
   const recovered=await records(restored);
   assert.equal(recovered.reviewEvents.length,1,'import retains one source review event');
   assert.equal(recovered.attempts.filter(x=>x.sessionId.startsWith('review-transfer:')).length,1,'import preserves the linked transfer first attempt');
   assert.equal(recovered.attempts.length,3,'import retains every historic first attempt');
   await restored.getByRole('button',{name:'Zurück zur Übersicht'}).click();
   await restored.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
   await restored.getByText('1 erste Transferantworten gesichert',{exact:false}).waitFor();
  }finally{await restoredContext.close()}
  await page.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await page.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await page.getByRole('button',{name:/Fällige Wiederholungen/}).click();
  await page.getByText('Eine neue Anwendung wurde mit Originalantwort dokumentiert.').waitFor();
  assert.equal(await page.getByRole('button',{name:'In neuem Kontext anwenden'}).count(),0,'completed review not offered a duplicate transfer');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
 }finally{await context.close()}
}
try{await run(1280);await run(360);console.log('PASS: review → distinct new context → immutable attempt → progress → backup → reload (desktop/mobile)');}finally{await browser.close()}
