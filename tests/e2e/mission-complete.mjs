import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const origin='http://127.0.0.1:4173/';
try{
 for(const width of [1280,360]){
  const context=await browser.newContext({viewport:{width,height:820},serviceWorkers:'allow'});
  const page=await context.newPage();await page.goto(origin,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await page.getByRole('button',{name:'Jetzt trainieren'}).click();
  for(let i=0;i<8;i++){
   await page.getByText('Tagesmission · Aufgabe '+(i+1)+' /',{exact:false}).waitFor();
   const choices=page.locator('.exercise .choice');
   if(await choices.count()>0)await choices.first().click();
   for(const input of await page.locator('.exercise input[required]').all())await input.fill('falsch');
   await page.getByRole('button',{name:'Antwort prüfen'}).click();
   await page.locator('.exercise .feedback').waitFor();
   await page.getByRole('button',{name:'Nächste Aufgabe'}).click();
  }
  await page.getByText('Mission abgeschlossen').waitFor();
  await page.getByText('0 von 8 Erstversuchen korrekt',{exact:false}).waitFor();
  await page.reload({waitUntil:'networkidle'});
  await page.getByText('Mission abgeschlossen').waitFor();
  await page.getByRole('button',{name:'Weitere Mission starten'}).click();
  await page.getByText('Tagesmission · Aufgabe 1 /',{exact:false}).waitFor();
  const count=await page.evaluate(async()=>new Promise((ok,err)=>{
   const r=indexedDB.open('sprachgefuehl-learning-v1');r.onsuccess=()=>{const d=r.result,t=d.transaction('missions','readonly'),q=t.objectStore('missions').getAll();q.onsuccess=()=>{d.close();ok(q.result.length)};q.onerror=()=>err(q.error)};r.onerror=()=>err(r.error)
  }));
  assert.equal(count,2,'old completed mission and original attempts retained');
  await context.close();
 }
 console.log('PASS: complete eight-task session, truthful summary, reload and new mission, desktop/mobile');
}finally{await browser.close()}
