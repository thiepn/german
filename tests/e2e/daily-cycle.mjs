import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'allow'});
 try{
  const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
  if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  const cycle=p.locator('.daily-cycle');
  await cycle.getByRole('heading',{name:'C1–C2-Lernweg'}).waitFor();
  await cycle.getByText('0 von 4 Schritten').waitFor();
  // Real objective attempt, not a fabricated score or daily-cycle storage write.
  await p.locator('.today-focus button.today-action').first().click();
  for(const input of await p.locator('.exercise input[required]').all())await input.fill('falsch');
  await p.getByRole('button',{name:'Antwort prüfen'}).click();
  await p.getByRole('button',{name:'Zur Übersicht'}).click();
  await cycle.getByText('1 von 4 Schritten').waitFor();
  await cycle.getByRole('button',{name:/Quelle analysieren/}).click();
  await p.getByRole('heading',{name:'Referenz und Determination',exact:true}).waitFor();
  const first='Im März wurde erstmals eine Fachfrau von außen mit der Prüfung des Antrags beauftragt. Zuvor war nur die Kommission mit dem Verfahren befasst.';
  const why='Die Gutachterin ist eine erstmals eingeführte Person; eine bestimmte Nominalgruppe würde ihre Bekanntheit voraussetzen.';
  await p.getByLabel('Bezug im Ausgangstext').selectOption('A');
  await p.getByLabel('Formuliere den Inhalt mit eindeutigem Referenzbezug neu').fill(first);
  await p.getByLabel('Begründe, welche Personen, Dinge oder Mengen gemeint sind und welche Alternative etwas anderes behauptet').fill(why);
  await p.getByRole('button',{name:'Referenzanalyse unveränderlich speichern'}).click();
  await p.getByRole('heading',{name:'Referenzvergleich 2 / 3'}).waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  await cycle.getByText('2 von 4 Schritten').waitFor();
  assert.equal(await cycle.getByRole('button',{name:/Eigenen Text verfassen/}).isEnabled(),true);
  assert.equal(await cycle.getByRole('button',{name:/Text überarbeiten/}).isDisabled(),true);
  // Exact source is reopened, not an arbitrary G01 document.
  await cycle.getByRole('button',{name:/Eigenen Text verfassen/}).click();
  await p.getByRole('heading',{name:'Referenzvergleich 2 / 3'}).waitFor();
  const record=async(choice,rewrite,reason)=>{
   await p.getByLabel('Bezug im Ausgangstext').selectOption(choice);
   await p.getByLabel('Formuliere den Inhalt mit eindeutigem Referenzbezug neu').fill(rewrite);
   await p.getByLabel('Begründe, welche Personen, Dinge oder Mengen gemeint sind und welche Alternative etwas anderes behauptet').fill(reason);
   await p.getByRole('button',{name:'Referenzanalyse unveränderlich speichern'}).click();
  };
  // Subsequent analyses use the existing exact-version persistence/CAS path.
  await record('A','Die bereits bestellte Gutachterin überprüfte danach die Berechnungen; die Kommission forderte sie zusätzlich zur Erläuterung der Unsicherheit auf.','Die bestimmte Nominalgruppe knüpft an dieselbe Person an, statt eine weitere Fachfrau einzuführen.');
  await p.getByRole('heading',{name:'Referenzvergleich 3 / 3'}).waitFor();
  await record('A','Am Freitag ging der von derselben Gutachterin vorbereitete Bericht in der Geschäftsstelle ein; eine Entscheidung war damit nicht verbunden.','Die bestimmte Form nimmt den im vorigen Absatz genannten Bericht erneut auf und führt kein beliebiges neues Gutachten ein.');
  await p.getByRole('heading',{name:'Eigenständig formulieren'}).waitFor();
  const text='Eine externe Gutachterin nahm den Antrag zur Prüfung entgegen. Die Gutachterin untersuchte die eingereichten Berechnungen und schrieb einen vorläufigen Bericht. Der Bericht traf am Freitag bei der Geschäftsstelle ein; eine endgültige Entscheidung war damit nicht getroffen.';
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p3');
  await p.getByLabel('Dein eigenständiger Text').fill(text);
  await p.getByLabel('Begründe Erstnennung, Wiederaufnahme und begrenzte Aussagen').fill('Eine führt die neue Person ein; die nimmt dieselbe Person und dasselbe Gutachten wieder auf. Der Dokumenteingang ist nicht mit der Entscheidung gleichzusetzen.');
  await p.getByRole('button',{name:'Eigenen Text speichern'}).click();
  await p.getByRole('heading',{name:'Eigenen Text überarbeiten'}).waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  await cycle.getByText('3 von 4 Schritten').waitFor();
  assert.equal(await cycle.getByRole('button',{name:/Text überarbeiten/}).isEnabled(),true);
  await cycle.getByRole('button',{name:/Text überarbeiten/}).click();
  await p.getByRole('heading',{name:'Eigenen Text überarbeiten'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  await p.getByLabel('Dein eigenständiger Text').fill(text+' Ein verbindlicher Förderbeschluss lag ausdrücklich noch nicht vor.');
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p2');
  await p.getByLabel('Begründe Erstnennung, Wiederaufnahme und begrenzte Aussagen').fill('Die spätere Überarbeitung unterscheidet die Meldung einer Akte ausdrücklich von einer bindenden Entscheidung.');
  await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  await cycle.getByText('4 von 4 Schritten').waitFor();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('region',{name:'Tageslernweg – beobachtete Arbeit'}).getByText('4 von 4 Schritten').waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  await cycle.getByText('4 von 4 Schritten').waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  console.log('PASS daily objective -> exact G01 source -> independent writing -> revision -> Progress/reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
