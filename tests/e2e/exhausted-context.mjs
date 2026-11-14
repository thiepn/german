import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const url='http://127.0.0.1:4173/';
const difference='Die beiden bereits bekannten Nomen erhalten im konkreten Beispielsatz verschiedene bestimmte Artikel. Das grammatische Geschlecht muss am jeweiligen Nomen überprüft werden und lässt sich nicht aus dem gemeinsamen Thema Gesellschaft ableiten.';
const repair='Der bestimmte Artikel im Nominativ Singular richtet sich nach dem grammatischen Genus des Nomens: das Argument ist Neutrum, die Befugnis ist Femininum. Inhaltlich verwandte Begriffe haben daher nicht zwangsläufig denselben Artikel; ein bloßer Analogieschluss wäre unzuverlässig.';
const example='In einem neuen Forschungsbericht werden die Folgen einer politischen Entscheidung eingehend untersucht. Das zunächst umstrittene Ergebnis führte anschließend zu einer sachlichen Debatte unter den Beteiligten.';
const why='In diesem neuen Beispiel verwende ich das Ergebnis, weil Ergebnis ein neutrales Substantiv ist. Die konkrete Wortform muss jedoch unabhängig von der Bedeutung des Beispiels überprüft werden.';
async function run(width,withDue){
 const ctx=await browser.newContext({viewport:{width,height:840},serviceWorkers:'allow'});
 try{
  const p=await ctx.newPage();await p.goto(url,{waitUntil:'networkidle'});
  if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  // Isolated known first encounters; they are NOT actual new-context outcomes.
  await p.evaluate(async(withDue)=>new Promise((resolve,reject)=>{
   const r=indexedDB.open('sprachgefuehl-learning-v1');r.onerror=()=>reject(r.error);
   r.onsuccess=()=>{
    const db=r.result,tx=db.transaction(['attempts','cards'],'readwrite'),s=tx.objectStore('attempts'),now=Date.now();
    for(const [index,id,result,article] of [[0,'SG-M01-001','INCORRECT','der'],[1,'SG-M01-005','CORRECT','die'],[2,'SG-M01-009','INCORRECT','die']])
     s.add({id:'fixture:'+id,sessionId:'fixture:'+id,itemId:id,itemVersion:1,mode:'M01',skillId:'G01.GENUS',
      at:now-50000+index*1000,slots:{article},score:result==='CORRECT'?1:0,correct:result==='CORRECT',
      hinted:false,result,variantIndex:null});
    if(withDue)tx.objectStore('cards').add({id:'SG-M01-009:1',itemId:'SG-M01-009',itemVersion:1,dueAt:now-1000,
     stability:1,difficulty:5,lastReviewedAt:null,lapses:0,algorithmVersion:'sg-recall-0.2'});
    tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>{db.close();reject(tx.error??Error('Test fixture failed'))};
   }
  }),withDue);
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Fehler',exact:true}).first().click();
  const cluster=p.locator('.error-cluster').filter({hasText:'Gesellschaft'}).first();
  await cluster.getByText('Kein unversuchter Kontext',{exact:false}).waitFor();
  assert.equal(await cluster.getByRole('button',{name:'Neuen Kontext üben'}).count(),0);
  await cluster.getByRole('button',{name:'Bekannte Aufgaben kontrastieren'}).click();
  const lesson=p.getByRole('region',{name:'Kontrastübung G01.GENUS Gesellschaft'});
  await lesson.getByRole('heading',{name:'Kontrastübung mit bekannten Aufgaben'}).waitFor();
  assert.equal(await lesson.getByText('Autorenlösungen (DEMO_ONLY)',{exact:false}).count(),0,'prior solutions hidden during cold recall');
  await lesson.getByLabel('Antwort zu SG-M01-009 · Artikel').fill('das');
  await lesson.getByLabel('Antwort zu SG-M01-005 · Artikel').fill('die');
  await lesson.getByLabel('Weshalb können diese beiden bekannten Kontexte unterschiedliche Formen verlangen? (mindestens 85 Zeichen)').fill(difference);
  await lesson.getByRole('button',{name:'Eigene Antworten mit den Quellen vergleichen'}).click();
  await lesson.getByText('Autorenlösungen (DEMO_ONLY)',{exact:false}).first().waitFor();
  await lesson.getByText('Gespeicherter ursprünglicher Erstversuch',{exact:false}).first().waitFor();
  await lesson.getByLabel('Formuliere eine korrigierte Regel und begründe konkret, welche Merkmale sich zwischen beiden Beispielen unterscheiden (mindestens 140 Zeichen)').fill(repair);
  await lesson.getByLabel('Erfinde nun einen eigenständigen dritten Beispielsatz, in dem die Unterscheidung bedeutsam wäre (mindestens 100 Zeichen)').fill(example);
  await lesson.getByLabel('Welche Form würdest du im eigenen Satz verwenden, und warum? (mindestens 85 Zeichen)').fill(why);
  await lesson.getByRole('button',{name:'Eigenes Gegenbeispiel und Regel festhalten'}).click();
  await lesson.getByText('kein neuer unabhängiger Test',{exact:false}).first().waitFor();
  if(withDue){
   await lesson.getByRole('button',{name:'Tatsächlich fällige Wiederholung starten · SG-M01-009'}).click();
   await p.getByRole('heading',{name:'Artikelblitz'}).waitFor();
   await p.getByLabel('Artikel',{exact:true}).fill('das');
   await p.getByRole('button',{name:'Antwort prüfen'}).click();
   await p.getByRole('button',{name:'Zur Übersicht'}).click();
  }else{
   await lesson.getByRole('button',{name:'Verwandte Quellenarbeit im G-Bereich öffnen'}).click();
   await p.getByRole('heading',{name:'Referenz und Determination',exact:true}).waitFor();
  }
  const saved=await p.evaluate(async()=>new Promise((resolve,reject)=>{
   const r=indexedDB.open('sprachgefuehl-learning-v1');r.onerror=()=>reject(r.error);
   r.onsuccess=()=>{
    const db=r.result,tx=db.transaction(['attempts','productionEntries','reviewEvents'],'readonly'),result={};
    let left=3;for(const name of ['attempts','productionEntries','reviewEvents']){
     const q=tx.objectStore(name).getAll();q.onerror=()=>reject(q.error);
     q.onsuccess=()=>{result[name]=q.result;if(!--left){db.close();resolve(result)}}
    }
   }
  }));
  assert.equal(saved.attempts.length,withDue?4:3);
  assert.equal(saved.attempts.filter(x=>x.itemId==='SG-M01-009').length,withDue?2:1);
  assert.equal(saved.productionEntries.length,0,'reflection is never saved as unvalidated source writing');
  assert.equal(saved.reviewEvents.length,withDue?1:0);
  assert.equal(saved.attempts.find(x=>x.id==='fixture:SG-M01-009')?.slots.article,'die');
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Fehler',exact:true}).first().click();
  await cluster.getByRole('button',{name:'Bekannte Aufgaben kontrastieren'}).waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  console.log('PASS M50 exhausted source: blind paired reuse -> real authored solutions -> own example -> '+(withDue?'real CAS reviewed attempt':'separate source studio')+' -> preserved history/reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280,false);await run(360,true)}finally{await browser.close()}
