import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const core=JSON.parse(await readFile(new URL('../../content/fixtures/core.demo.json',import.meta.url),'utf8'));
const byId=new Map(core.map(x=>[x.id,x]));
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
async function run(width){
 const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'allow'});
 try{
  const p=await context.newPage();await p.goto(origin,{waitUntil:'networkidle'});
  if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  const focus=p.locator('.today-focus button.today-action').first();
  const attempts=[];
  for(const id of ['SG-M01-001','SG-M01-005']){
   await focus.click();
   await p.getByRole('heading',{name:'Artikelblitz'}).waitFor();
   const prompt=await p.locator('.exercise .prompt').innerText();
   assert.equal(prompt,byId.get(id).prompt,'must open exact unseen same-topic context');
   await p.getByLabel('Artikel',{exact:true}).fill('falsch');
   await p.getByRole('button',{name:'Antwort prüfen'}).click();
   await p.getByRole('button',{name:'Zur Übersicht'}).click();
   attempts.push(id);
   // Incorrect first attempts create cards due immediately. Respect the existing
   // objective review scheduler before suggesting a separate unseen context.
   await focus.getByText('fällige Wiederholung',{exact:false}).waitFor();
   await focus.click();
   assert.equal(await p.locator('.exercise .prompt').innerText(),byId.get(id).prompt,'the actual due review must precede optional new context');
   await p.getByLabel('Artikel',{exact:true}).fill('die');
   await p.getByRole('button',{name:'Antwort prüfen'}).click();
   await p.getByRole('button',{name:'Zur Übersicht'}).click();
  }
  await p.locator('.daily-cycle').getByText('2 unterschiedliche Aufgaben',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  const evidence=p.getByRole('region',{name:'Lernsignale aus Übung und Schreiben'});
  await evidence.getByText('1 davon mit unsicheren Antworten',{exact:false}).waitFor();
  await evidence.getByText('Gesellschaft',{exact:false}).first().waitFor();
  assert.equal(await evidence.getByRole('button',{name:'Neuen Übungskontext starten'}).isEnabled(),true);
  await evidence.getByRole('button',{name:'Neuen Übungskontext starten'}).click();
  assert.equal(await p.locator('.exercise .prompt').innerText(),byId.get('SG-M01-009').prompt);
  await p.getByRole('button',{name:'Zur Übersicht'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await evidence.getByText('1 davon mit unsicheren Antworten',{exact:false}).waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await evidence.getByText('1 davon mit unsicheren Antworten',{exact:false}).waitFor();
  const rows=await p.evaluate(async()=>new Promise((resolve,reject)=>{
    const r=indexedDB.open('sprachgefuehl-learning-v1');
    r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('attempts','readonly'),q=tx.objectStore('attempts').getAll();
     q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=()=>reject(q.error);}
  }));
  assert.deepEqual(rows.filter(x=>x.result==='INCORRECT').map(x=>x.itemId).sort(),attempts.sort(),'original failed answers retained');
  assert.equal(rows.length,4,'two actual due-review answers exist; recommendation itself never creates an attempt');
  assert.equal(rows.filter(x=>x.result==='CORRECT').length,2,'genuine review answers remain in learner history');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  console.log('PASS M47 exact failed-topic contextual recommendation, linked source, truthful Progress, reload '+width);
 }finally{await context.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
