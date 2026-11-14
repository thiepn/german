import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const syntax=JSON.parse(await readFile(new URL('../../content/fixtures/syntax-collocations.demo.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true}),url='http://127.0.0.1:4173/';
async function scenario(width){
 const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'allow'});
 try{
  const p=await ctx.newPage();await p.goto(url,{waitUntil:'networkidle'});
  if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  // Explicit fixture-only saved first answers, not simulated UI completion.
  await p.evaluate(async()=>new Promise((resolve,reject)=>{
   const r=indexedDB.open('sprachgefuehl-learning-v1');r.onerror=()=>reject(r.error);
   r.onsuccess=()=>{
    const db=r.result,tx=db.transaction('attempts','readwrite'),s=tx.objectStore('attempts'),now=Date.now();
    const data=[
     ['SG-M04-001','M04','G04.SYNTAX','form','ist'],
     ['SG-M04-006','M04','G04.SYNTAX','form','sei'],
     ['SG-M05-001','M05','G07.KOLLOKATION','collocation','schreiben']
    ];
    data.forEach(([itemId,mode,skillId,slot,answer],i)=>s.add({
     id:'fixture:'+itemId,sessionId:'fixture:'+itemId,itemId,itemVersion:1,
     mode,skillId,at:now-60000+i*1000,slots:{[slot]:answer},score:0,correct:false,
     hinted:false,result:'INCORRECT',variantIndex:null
    }));
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onabort=()=>{db.close();reject(tx.error??Error('fixture aborted'))};
   }
  }));
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Fehler',exact:true}).first().click();
  const g07=p.locator('.error-cluster').filter({hasText:'G07.KOLLOKATION'}).first();
  await g07.getByText('Funktionsverbverbindung Beschluss fassen',{exact:false}).waitFor();
  assert.equal(await g07.getByRole('button',{name:'Neuen Kontext üben'}).count(),0,'mislabeled collocations cannot schedule indirect-speech transfer');
  await g07.getByRole('button',{name:'Originalantworten & Regeln'}).click();
  await g07.getByText('einen Beschluss',{exact:false}).first().waitFor();
  const g04=p.locator('.error-cluster').filter({hasText:'G04.SYNTAX'});
  assert.equal(await g04.count(),2,'genuine and misclassified source retain distinct histories');
  const held=g04.filter({hasText:'Irrealer Konditionalsatz'});
  await held.getByText('Keine automatische neue Kontextfolge',{exact:false}).waitFor();
  const valid=g04.filter({has:p.getByRole('button',{name:'Neuen Kontext üben'})});
  assert.equal(await valid.count(),1,'genuine indirect-speech first error still has an authorized follow-up');
  await valid.getByRole('button',{name:'Neuen Kontext üben'}).click();
  assert.equal(await p.locator('.exercise .prompt').innerText(),syntax.find(i=>i.id==='SG-M04-002').prompt);
  await p.getByRole('button',{name:'Training verlassen'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  const signals=p.getByRole('region',{name:'Lernsignale aus Übung und Schreiben'});
  await signals.getByText('2 aktuelle Entwurfsaufgaben mit widersprüchlicher Themenzuordnung',{exact:false}).waitFor();
  const inspect=async()=>p.evaluate(async()=>new Promise((resolve,reject)=>{
   const r=indexedDB.open('sprachgefuehl-learning-v1');r.onerror=()=>reject(r.error);
   r.onsuccess=()=>{
    const db=r.result,stores=db.objectStoreNames.length;
    const tx=db.transaction('attempts','readonly'),q=tx.objectStore('attempts').getAll();
    q.onsuccess=()=>{db.close();resolve({stores,rows:q.result})};q.onerror=()=>reject(q.error);
   }
  }));
  let saved=await inspect();
  assert.equal(saved.stores,8);
  assert.equal(saved.rows.length,3,'recommendation must not create fake attempts');
  assert.equal(saved.rows.find(x=>x.itemId==='SG-M05-001')?.slots.collocation,'schreiben');
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Fehler',exact:true}).first().click();
  await p.locator('.error-cluster').filter({hasText:'G07.KOLLOKATION'}).getByText('Funktionsverbverbindung Beschluss fassen',{exact:false}).waitFor();
  saved=await inspect();
  assert.equal(saved.rows.length,3);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  console.log('PASS M52 source topic mismatch exclusion, coherent exact-version transfer, preserved source/history/reload '+width);
 }finally{await ctx.close()}
}
try{await scenario(1280);await scenario(360)}finally{await browser.close()}
