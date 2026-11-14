import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const recalled='Die von außen beauftragte Fachfrau prüfte mehrere Anträge und sagte offenbar bereits zu, dass das gesamte Förderverfahren endgültig freigegeben sei. Ihre Aufgabe war aber eher begrenzt; ob die Zusage tatsächlich alle Vorhaben umfasste, ist mir aus der Erinnerung unklar.';
const uncertain='Ich kann nicht mehr sicher unterscheiden, ob die Gutachterin die Unterlagen nur überprüfte oder ob sie wirklich eine endgültige Entscheidung für die Kommission traf.';
const corrected='Eine externe Gutachterin wurde mit der Prüfung des Antrags beauftragt. Die Gutachterin untersuchte die Berechnungen und legte einen vorläufigen Bericht vor. Der spätere Eingang dieses Berichts in der Geschäftsstelle ist keine Förderentscheidung und belegt auch keine generelle Bewilligung sämtlicher Projekte.';
const why='Die Quelle nennt einen Prüfauftrag und dokumentiert nur den Eingang eines Berichts. Meine ursprüngliche Erinnerung fügte eine allgemeine Freigabe hinzu, die in dem gewählten Absatz überhaupt nicht belegt ist.';
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'allow'});
 try{
  const p=await ctx.newPage();
  await p.goto(origin,{waitUntil:'networkidle'});
  if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await p.getByRole('button',{name:'Referenz und Determination · G01'}).click();
  await p.getByRole('heading',{name:'Referenz und Determination',exact:true}).waitFor();
  const record=async(choice,rewrite,reason)=>{
   await p.getByLabel('Bezug im Ausgangstext').selectOption(choice);
   await p.getByLabel('Formuliere den Inhalt mit eindeutigem Referenzbezug neu').fill(rewrite);
   await p.getByLabel('Begründe, welche Personen, Dinge oder Mengen gemeint sind und welche Alternative etwas anderes behauptet').fill(reason);
   await p.getByRole('button',{name:'Referenzanalyse unveränderlich speichern'}).click();
  };
  await record('A','Im März wurde erstmals eine Fachfrau von außen mit der Prüfung des Antrags beauftragt. Zuvor war nur die Kommission mit dem Verfahren befasst.','Die Gutachterin ist erstmals eingeführt; eine bestimmte Nominalgruppe würde ihre Bekanntheit voraussetzen.');
  await record('A','Die bereits bestellte Gutachterin überprüfte danach die Berechnungen; die Kommission forderte sie zusätzlich zur Erläuterung der Unsicherheit auf.','Die bestimmte Nominalgruppe knüpft an dieselbe Person an, statt eine weitere Fachfrau einzuführen.');
  await record('A','Am Freitag ging der von derselben Gutachterin vorbereitete Bericht in der Geschäftsstelle ein; eine Entscheidung war damit nicht verbunden.','Die bestimmte Form nimmt den im vorigen Absatz genannten Bericht erneut auf und führt kein beliebiges neues Gutachten ein.');
  const first='Eine externe Gutachterin nahm den Antrag zur Prüfung entgegen. Die Gutachterin untersuchte die eingereichten Berechnungen und schrieb einen vorläufigen Bericht. Der Bericht traf am Freitag bei der Geschäftsstelle ein; eine endgültige Entscheidung war damit nicht getroffen.';
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p3');
  await p.getByLabel('Dein eigenständiger Text').fill(first);
  await p.getByLabel('Begründe Erstnennung, Wiederaufnahme und begrenzte Aussagen').fill('Eine führt die neue Person ein; die nimmt dieselbe Person und dasselbe Gutachten wieder auf. Der Dokumenteingang ist nicht mit der Entscheidung gleichzusetzen.');
  await p.getByRole('button',{name:'Eigenen Text speichern'}).click();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  assert.equal(await p.locator('.delayed-summary').getByText('Noch kein späterer Textabruf fällig').count(),1);
  // Isolated test fixture: backdate only the newly authored local source record.
  // Do not replace browser timers or use wall-clock waits for the 24-hour eligibility gate.
  await p.evaluate(async()=>new Promise((resolve,reject)=>{
   const request=indexedDB.open('sprachgefuehl-learning-v1');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const db=request.result,tx=db.transaction('productionEntries','readwrite'),store=tx.objectStore('productionEntries'),all=store.getAll();
    all.onerror=()=>reject(all.error);
    all.onsuccess=()=>{
     const entry=all.result.find(e=>e.kind==='REFERENCE_STUDY');
     if(!entry){tx.abort();reject(Error('Missing original reference source for the test'));return;}
     entry.createdAt-=86400001;
     entry.revisions=entry.revisions.map(r=>({...r,at:r.at-86400001}));
     store.put(entry);
    };
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onabort=()=>{db.close();reject(tx.error??Error('Failed to age isolated fixture'))};
   };
  }));
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  await p.locator('.delayed-summary').getByRole('button',{name:'Jetzt ungestützt abrufen'}).click();
  await p.getByRole('heading',{name:'Späterer Abruf und Quellenkorrektur'}).waitFor();
  assert.equal(await p.getByRole('heading',{name:'Gespeicherte frühere Fassung'}).count(),0);
  assert.equal(await p.getByRole('heading',{name:'Ausgangsquelle',exact:false}).count(),0);
  await p.getByLabel('Erinnerte Darstellung in eigenen Worten (mindestens 150 Zeichen)').fill(recalled);
  await p.getByLabel('Was ist unsicher oder könnte falsch erinnert sein? (mindestens 60 Zeichen)').fill(uncertain);
  await p.getByRole('button',{name:'Ungestützten Abruf speichern'}).click();
  await p.getByRole('heading',{name:'Gespeicherte frühere Fassung'}).waitFor();
  await p.getByText(first,{exact:false}).first().waitFor();
  await p.getByLabel('Quellenabsatz für die konkrete Korrektur').selectOption('p3');
  await p.getByLabel('Eigenständige korrigierte Darstellung (mindestens 170 Zeichen)').fill(recalled);
  await p.getByLabel('Welche Erinnerung war falsch oder unvollständig, und was belegt der gewählte Absatz? (mindestens 90 Zeichen)').fill(why);
  await p.getByRole('button',{name:'Quellengebundene Korrektur speichern'}).click();
  await p.getByRole('alert').getByText(/Abruf nicht gespeichert/).waitFor();
  await p.getByLabel('Eigenständige korrigierte Darstellung (mindestens 170 Zeichen)').fill(corrected);
  await p.getByRole('button',{name:'Quellengebundene Korrektur speichern'}).click();
  await p.getByRole('heading',{name:'Kein Textabruf fällig'}).waitFor();
  await p.getByRole('button',{name:'Zurück zu Heute'}).click();
  await p.locator('.delayed-summary').getByText('1 abgeschlossen').waitFor();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('region',{name:'Verzögerter Schreibabruf'}).getByText('1 abgeschlossene Abruf-Korrektur-Paare').waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('region',{name:'Verzögerter Schreibabruf'}).getByText('1 abgeschlossene Abruf-Korrektur-Paare').waitFor();
  // Canonical first draft and first transfer remain unchanged, with two append-only review revisions.
  const entries=await p.evaluate(async()=>new Promise((resolve,reject)=>{
   const r=indexedDB.open('sprachgefuehl-learning-v1');
   r.onsuccess=()=>{const db=r.result,tx=db.transaction('productionEntries','readonly'),q=tx.objectStore('productionEntries').getAll();q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=()=>reject(q.error)};
   r.onerror=()=>reject(r.error)
  }));
  const entry=entries.find(e=>e.kind==='REFERENCE_STUDY');
  assert.equal(entry.revisions.filter(r=>r.questionId==='SG_DELAYED_RECALL:1').length,1);
  assert.equal(entry.revisions.filter(r=>r.questionId==='SG_DELAYED_REPAIR:1').length,1);
  assert.equal(entry.revisions.find(r=>r.questionId==='TRANSFER').text,first);
  assert.equal(entry.evaluated,'UNASSESSED');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  console.log('PASS M46 delayed source recall -> blind write -> evidence-based repair -> Progress/IDB/reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
