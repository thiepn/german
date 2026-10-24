import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1280,360]){
  const context=await browser.newContext({viewport:{width,height:820},serviceWorkers:'allow'});
  const page=await context.newPage();await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await page.getByRole('button',{name:'Jetzt trainieren'}).click();
  await page.getByText('Tagesmission · Aufgabe 1 /',{exact:false}).waitFor();
  const before=await page.locator('.exercise .prompt').innerText();
  await page.locator('.exercise input[required]').first().fill('dies ist ein Test');
  // Leave an unfinished task without answering; reload must keep it.
  await page.reload({waitUntil:'networkidle'});
  const after=await page.locator('.exercise .prompt').innerText();
  assert.equal(after,before);
  await page.getByRole('button',{name:'Training verlassen'}).click();
  await page.getByRole('button',{name:'Mission fortsetzen'}).click();
  await page.getByText('Tagesmission · Aufgabe 1 /',{exact:false}).waitFor();
  for(const input of await page.locator('.exercise input[required]').all())await input.fill('Test');
  await page.getByRole('button',{name:'Antwort prüfen'}).click();
  await page.getByText('Noch nicht richtig').waitFor();
  await page.getByRole('button',{name:'Nächste Aufgabe'}).click();
  await page.getByText('Tagesmission · Aufgabe 2 /',{exact:false}).waitFor();
  await page.reload({waitUntil:'networkidle'});
  await page.getByText('Tagesmission · Aufgabe 2 /',{exact:false}).waitFor();
  const m=await page.evaluate(async()=>new Promise((resolve,reject)=>{const r=indexedDB.open('sprachgefuehl-learning-v1');r.onsuccess=()=>{const db=r.result,tx=db.transaction('missions','readonly'),q=tx.objectStore('missions').getAll();q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=()=>reject(q.error)};r.onerror=()=>reject(r.error)}));
  assert.equal(m.length,1);assert.equal(m[0].index,1);assert.ok(m[0].steps.length>=2);
  await context.close();
 }
 console.log('PASS: finite mission plan, pause, answer, next and IndexedDB resume on desktop/mobile');
}finally{await browser.close()}
