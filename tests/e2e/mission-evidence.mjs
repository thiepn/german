import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const core=JSON.parse(await readFile(new URL('../../content/fixtures/core.demo.json',import.meta.url),'utf8'));
const byId=new Map(core.map(x=>[x.id,x]));
const browser=await chromium.launch({headless:true}),url='http://127.0.0.1:4173/';
async function scenario(width){
 const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'allow'});
 try{
  const p=await ctx.newPage();await p.goto(url,{waitUntil:'networkidle'});
  if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  // Seed explicitly fixture-only first encounters; due review uses real form + CAS.
  await p.evaluate(async()=>new Promise((resolve,reject)=>{
   const r=indexedDB.open('sprachgefuehl-learning-v1');r.onerror=()=>reject(r.error);
   r.onsuccess=()=>{
    const db=r.result,tx=db.transaction(['attempts','cards'],'readwrite'),s=tx.objectStore('attempts'),now=Date.now();
    const previous=(itemId,at,result,article)=>s.add({
     id:'fixture:'+itemId,sessionId:'fixture:'+itemId,itemId,itemVersion:1,mode:'M01',skillId:'G01.GENUS',
     at,slots:{article},score:result==='CORRECT'?1:0,correct:result==='CORRECT',
     hinted:false,result,variantIndex:null
    });
    previous('SG-M01-001',now-3*86400000,'INCORRECT','der');
    previous('SG-M01-005',now-30*60000,'CORRECT','die');
    for(const [itemId,dueAt] of [['SG-M01-001',now-1000],['SG-M01-005',now+86400000]])
     tx.objectStore('cards').add({id:itemId+':1',itemId,itemVersion:1,dueAt,stability:.25,difficulty:5,
      lastReviewedAt:null,lapses:0,algorithmVersion:'sg-recall-0.2'});
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onabort=()=>{db.close();reject(tx.error??Error('fixture failed'))};
   };
  }));
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Jetzt trainieren'}).click();
  await p.getByText('Tagesmission · Aufgabe 1 /',{exact:false}).waitFor();
  assert.equal(await p.locator('.exercise .prompt').innerText(),byId.get('SG-M01-001').prompt);
  const read=async()=>p.evaluate(async()=>new Promise((resolve,reject)=>{
   const r=indexedDB.open('sprachgefuehl-learning-v1');r.onerror=()=>reject(r.error);
   r.onsuccess=()=>{
    const db=r.result,tx=db.transaction(['attempts','missions','reviewEvents'],'readonly'),out={};let pending=3;
    for(const name of ['attempts','missions','reviewEvents']){
     const q=tx.objectStore(name).getAll();q.onerror=()=>reject(q.error);
     q.onsuccess=()=>{out[name]=q.result;if(!--pending){db.close();resolve(out)}};
    }
   };
  }));
  const before=await read(),steps=before.missions[0].steps,groups=new Set();
  assert.equal(steps[0].kind,'REVIEW');
  assert.equal(steps.some(x=>x.itemId==='SG-M01-009'),false,'new context still on M48 hold');
  assert.equal(steps.some(x=>x.itemId==='SG-M01-005'),false,'future review not accelerated');
  for(const step of steps){
   if(step.kind!=='EXPLORE'&&step.kind!=='TRANSFER')continue;
   assert.equal(before.attempts.some(a=>a.itemId===step.itemId),false,'new question truly unseen');
   const item=byId.get(step.itemId);if(!item)continue;
   const key=[item.mode,item.skillId,item.topic].join('::');
   assert.equal(groups.has(key),false,'one novel context per authored group');
   groups.add(key);
  }
  assert.equal(before.attempts.length,2,'mission planning makes no fake attempts');
  await p.getByLabel('Artikel',{exact:true}).fill('die');
  await p.getByRole('button',{name:'Antwort prüfen'}).click();
  await p.locator('.exercise .feedback').waitFor();
  await p.getByRole('button',{name:'Nächste Aufgabe'}).click();
  await p.getByText('Tagesmission · Aufgabe 2 /',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Training verlassen'}).click();
  // onExit persists a PAUSED mission under CAS before returning to Today.
  // Do not race that IndexedDB transaction with a reload.
  await p.getByRole('button',{name:'Mission fortsetzen'}).waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Mission fortsetzen'}).click();
  await p.getByText('Tagesmission · Aufgabe 2 /',{exact:false}).waitFor();
  const after=await read();
  assert.deepEqual(after.missions[0].steps,steps,'original persisted mission retained');
  assert.equal(after.attempts.length,3,'real review appended, old attempts preserved');
  assert.equal(after.reviewEvents.length,1,'real atomic review event');
  assert.equal(after.attempts.find(a=>a.id==='fixture:SG-M01-001')?.slots.article,'der');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  console.log('PASS M51 due-review mission, M48 held context, future-card exclusion, CAS, stable reload '+width);
 }finally{await ctx.close()}
}
try{await scenario(1280);await scenario(360)}finally{await browser.close()}
