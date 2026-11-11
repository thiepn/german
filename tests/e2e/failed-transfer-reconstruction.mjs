import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const core=JSON.parse(await readFile(new URL('../../content/fixtures/syntax-collocations.demo.json',import.meta.url),'utf8'));
const byId=new Map(core.map(x=>[x.id,x]));
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const rule='Die indirekte Rede muss die Aussage aus einer anderen Perspektive wiedergeben. Dabei ist die passende Konjunktivform von Subjekt und Aussagezeit abhängig, nicht von einer bloßen Ersetzung jedes finiten Verbs.';
const difference='In den beiden Berichten stehen unterschiedliche Subjekte und Verben. Ein richtig gelöster Satz beweist deshalb nicht, dass die andere Konjunktivform automatisch unverändert übernommen werden darf.';
const revised='Ich muss das finite Verb für jede indirekte Aussage erneut nach Person, Numerus und Verbparadigma bestimmen. Im zuvor richtig gelösten Satz stand ein anderes Verb. Der neue Fehler entstand, weil ich die erste Form ohne Prüfung der konkreten Satzstruktur übertragen habe; ein korrekter Vergleich zeigt daher die passende Form im vollständigen Satz.';
async function scenario(width){
 const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'allow'});
 try{
  const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
  if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  // A controlled test-only first-encounter history. The delayed failure and real due
  // review below are executed through normal UI, grading, attempts and card CAS.
  await p.evaluate(async()=>new Promise((resolve,reject)=>{
    const r=indexedDB.open('sprachgefuehl-learning-v1');
    r.onerror=()=>reject(r.error);
    r.onsuccess=()=>{
      const db=r.result,tx=db.transaction('attempts','readwrite'),store=tx.objectStore('attempts');
      const now=Date.now();
      const seed=(itemId,at,result,form)=>store.add({
       id:'fixture:'+itemId,sessionId:'fixture:'+itemId,itemId,itemVersion:1,mode:'M04',skillId:'G04.SYNTAX',
       at,slots:{form},score:result==='CORRECT'?1:0,correct:result==='CORRECT',
       hinted:false,result,variantIndex:null
      });
      seed('SG-M04-001',now-4*86400000,'INCORRECT','sind');
      seed('SG-M04-002',now-2*86400000,'CORRECT','sei');
      tx.oncomplete=()=>{db.close();resolve()};
      tx.onabort=()=>{db.close();reject(tx.error??Error('fixture aborted'))};
    };
  }));
  await p.reload({waitUntil:'networkidle'});
  const focus=p.locator('.today-focus button.today-action').first();
  await focus.getByText('neuer Fehlerkontext',{exact:false}).waitFor();
  await focus.click();
  assert.equal(await p.locator('.exercise .prompt').innerText(),byId.get('SG-M04-003').prompt);
  await p.getByLabel('Vorgegebene Form').fill('sind');
  await p.getByRole('button',{name:'Antwort prüfen'}).click();
  const entry=p.getByRole('region',{name:'Fehlgeschlagener verzögerter Kontext'});
  await entry.getByRole('button',{name:'Fehler rekonstruieren'}).click();
  await p.getByRole('heading',{name:'Fehlerarchiv'}).waitFor();
  const review=p.getByRole('region',{name:'Fehlerrekonstruktion SG-M04-003'});
  await review.getByText('Die Kommission erklärte',{exact:false}).first().waitFor();
  assert.equal(await review.getByRole('heading',{name:'1 · Erster unsicherer Kontext',exact:false}).count(),0);
  await review.getByLabel('Welche Regel oder Unterscheidung hätte die Antwort bestimmen müssen? (mindestens 85 Zeichen)').fill(rule);
  await review.getByLabel('Worin könnte sich dieser Fall vom zuvor richtig gelösten unterscheiden? (mindestens 60 Zeichen)').fill(difference);
  await review.getByRole('button',{name:'Erstantworten und Regeln vergleichen'}).click();
  await review.getByRole('heading',{name:'1 · Erster unsicherer Kontext',exact:false}).waitFor();
  await review.getByRole('heading',{name:'2 · Neuer Kontext mit richtiger Erstantwort',exact:false}).waitFor();
  await review.getByRole('heading',{name:'3 · Verzögert erneut unsicher',exact:false}).waitFor();
  await review.getByLabel('Korrigiere deine Regel und begründe den Unterschied an den konkreten Formulierungen (mindestens 130 Zeichen)').fill(revised);
  await review.getByRole('button',{name:'Korrektur selbst abgleichen und nächsten Schritt wählen'}).click();
  await review.getByText('weder automatisch auf sprachliche Richtigkeit geprüft noch als Erfolg gespeichert',{exact:false}).waitFor();
  await review.getByRole('button',{name:'Fällige Aufgabe abrufen'}).click();
  assert.equal(await p.locator('.exercise .prompt').innerText(),byId.get('SG-M04-003').prompt);
  await p.getByLabel('Vorgegebene Form').fill('habe');
  await p.getByRole('button',{name:'Antwort prüfen'}).click();
  await p.getByRole('button',{name:'Zur Übersicht'}).click();
  await p.getByRole('button',{name:'Fehler',exact:true}).first().click();
  const cluster=p.locator('.error-cluster').filter({hasText:'Indirekte Rede'}).first();
  await cluster.getByRole('button',{name:'Neuen Kontext üben'}).click();
  assert.equal(await p.locator('.exercise .prompt').innerText(),byId.get('SG-M04-004').prompt);
  await p.getByRole('button',{name:'Training verlassen'}).click();
  const read=async()=>p.evaluate(async()=>new Promise((resolve,reject)=>{
    const r=indexedDB.open('sprachgefuehl-learning-v1');r.onerror=()=>reject(r.error);
    r.onsuccess=()=>{
     const db=r.result,tx=db.transaction(['attempts','productionEntries'],'readonly');
     const rows={};let left=2;
     for(const store of ['attempts','productionEntries']){
      const q=tx.objectStore(store).getAll();
      q.onerror=()=>reject(q.error);
      q.onsuccess=()=>{rows[store]=q.result;if(!--left){db.close();resolve(rows)}};
     }
    }
  }));
  let saved=await read();
  assert.equal(saved.attempts.length,4,'only 2 fixture first encounters + 1 failed first encounter + 1 actual due review');
  assert.equal(saved.productionEntries.length,0,'reflection does not fabricate or persist an unrelated production');
  assert.equal(saved.attempts.filter(a=>a.itemId==='SG-M04-003').length,2);
  assert.equal(saved.attempts.filter(a=>a.itemId==='SG-M04-004').length,0);
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Fehler',exact:true}).first().click();
  await p.getByRole('button',{name:'Verzögerten Fehler rekonstruieren'}).first().waitFor();
  saved=await read();
  assert.equal(saved.attempts.length,4);assert.equal(saved.productionEntries.length,0);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  console.log('PASS M49 delayed-new-context failed -> cold rule reconstruction -> three exact sources -> actual due recall -> fresh context, immutable records/reload '+width);
 }finally{await ctx.close()}
}
try{await scenario(1280);await scenario(360)}finally{await browser.close()}
