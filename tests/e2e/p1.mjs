import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const base='http://127.0.0.1:4173/';
async function testLearner(viewport){
 const c=await browser.newContext({viewport,serviceWorkers:'allow'});const page=await c.newPage();
 try{
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await page.getByRole('button',{name:'Status ansehen'}).click();
  await page.getByRole('heading',{name:'Diagnostik A'}).waitFor();
  await page.getByText('0 von 72').waitFor();
  await page.getByRole('button',{name:'Zurück zum Lernen'}).click();
  await page.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await page.locator('article').filter({hasText:'Satzlabor'}).getByRole('button',{name:'Übung starten'}).click();
  await page.getByLabel('Vorgegebene Form').fill('seien');
  await page.getByRole('button',{name:'Antwort prüfen'}).click();
  await page.getByText('Korrekt',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Zur Übersicht'}).click();
  await page.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await page.locator('article').filter({hasText:'Kollokationsduell'}).getByRole('button',{name:'Übung starten'}).click();
  await page.getByLabel('Passendes Wort / Form').fill('treffen');
  await page.getByRole('button',{name:'Antwort prüfen'}).click();
  await page.getByText('Noch nicht richtig').waitFor();
  await page.getByRole('button',{name:'Zur Übersicht'}).click();
  await page.getByRole('button',{name:'Fehler',exact:true}).first().click();
  await page.getByLabel('Trainingsmodus').selectOption('M05');
  await page.getByText('Ursprünglich:').first().waitFor();
  await page.getByRole('button',{name:'Ohne Lösung wiederholen'}).first().click();
  await page.getByLabel('Passendes Wort / Form').fill('fassen');
  await page.getByRole('button',{name:'Antwort prüfen'}).click();
  await page.getByText('Korrekt',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Zur Übersicht'}).click();
  await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await page.getByText('Kollokationsduell',{exact:true}).waitFor();
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  const count=Number(await page.locator('.metric').filter({hasText:'Versuche'}).locator('strong').innerText());
  assert.ok(count>=3,'all P1 attempts survived reload');
  const stores=await page.evaluate(async()=>{
   const r=indexedDB.open('sprachgefuehl-learning-v1');
   return await new Promise((ok,fail)=>{r.onsuccess=()=>{const db=r.result;const names=[...db.objectStoreNames];const version=db.version;db.close();ok({names,version})};r.onerror=()=>fail(r.error)});
  });
  assert.equal(stores.version,2);
  assert.ok(stores.names.includes('diagnosticSessions')&&stores.names.includes('attempts'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
 }finally{await c.close()}
}
async function testMigration(){
 const c=await browser.newContext({serviceWorkers:'block'});const page=await c.newPage();
 try{
  await page.goto(base+'manifest.webmanifest');
  await page.evaluate(async()=>new Promise((resolve,reject)=>{
   const r=indexedDB.open('sprachgefuehl-learning-v1',1);
   r.onupgradeneeded=()=>{
    const db=r.result;
    for(const s of ['attempts','cards','reviewEvents','settings','drafts']){
     const store=db.createObjectStore(s,{keyPath:'id'});
     if(s==='attempts')store.createIndex('sessionItem',['sessionId','itemId'],{unique:true});
    }
   };
   r.onsuccess=()=>{
    const db=r.result;const tx=db.transaction(['settings','attempts'],'readwrite');
    tx.objectStore('settings').add({id:'local',entryTrack:'C1_C2',dailyMinutes:30,createdAt:10});
    tx.objectStore('attempts').add({id:'synthetic-legacy-attempt',itemId:'SG-M01-001',itemVersion:1,mode:'M01',skillId:'G01.GENUS',at:10,slots:{article:'die'},score:1,correct:true,hinted:false,result:'CORRECT',sessionId:'synthetic-legacy',variantIndex:0});
    tx.oncomplete=()=>{db.close();resolve(undefined)};tx.onerror=()=>reject(tx.error);
   };r.onerror=()=>reject(r.error);
  }));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  const count=Number(await page.locator('.metric').filter({hasText:'Versuche'}).locator('strong').innerText());
  assert.equal(count,1,'v1 attempt persisted across additive v2 upgrade');
 }finally{await c.close()}
}
try{
 await testLearner({width:1280,height:900});
 await testLearner({width:360,height:800});
 await testMigration();
 console.log('PASS: P1 M04/M05/diagnostic gate/progress+errors/IndexedDB v1→v2 desktop+mobile');
}finally{await browser.close()}
