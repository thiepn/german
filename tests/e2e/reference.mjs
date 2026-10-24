import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const origin='http://127.0.0.1:4173/';

async function openReference(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Referenz und Determination · G01'}).click();
 await p.getByRole('heading',{name:'Referenz und Determination',exact:true}).waitFor();
 return p;
}
async function record(p,choice,rewrite,reason){
 await p.getByLabel('Bezug im Ausgangstext').selectOption(choice);
 await p.getByLabel('Formuliere den Inhalt mit eindeutigem Referenzbezug neu').fill(rewrite);
 await p.getByLabel('Begründe, welche Personen, Dinge oder Mengen gemeint sind und welche Alternative etwas anderes behauptet').fill(reason);
 await p.getByRole('button',{name:'Referenzanalyse unveränderlich speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 let stale=null;
 try{
  const p=await openReference(ctx);
  const first='Im März wurde erstmals eine Fachfrau von außen mit der Prüfung des Antrags beauftragt. Zuvor war nur die Kommission mit dem Verfahren befasst.';
  const why='Die Gutachterin ist eine erstmals eingeführte Person; eine bestimmte Nominalgruppe würde ihre Bekanntheit voraussetzen.';
  assert.equal(await p.locator('.reference-paragraph').count(),3);
  assert.equal(await p.locator('.reference-before-after').count(),1);
  assert.equal(await p.getByRole('button',{name:'Referenzanalyse unveränderlich speichern'}).isDisabled(),true);
  await p.getByLabel('Bezug im Ausgangstext').selectOption('A');
  await p.getByLabel('Formuliere den Inhalt mit eindeutigem Referenzbezug neu').fill('Eine externe Gutachterin nahm den Förderantrag im März entgegen.');
  await p.getByLabel('Begründe, welche Personen, Dinge oder Mengen gemeint sind und welche Alternative etwas anderes behauptet').fill('Unveränderte Quelle ohne eigenständige Fassung.');
  assert.equal(await p.getByRole('button',{name:'Referenzanalyse unveränderlich speichern'}).isDisabled(),true,'literal source copy rejected');
  await p.getByLabel('Formuliere den Inhalt mit eindeutigem Referenzbezug neu').fill(first);
  await p.getByLabel('Begründe, welche Personen, Dinge oder Mengen gemeint sind und welche Alternative etwas anderes behauptet').fill(why);
  await p.getByRole('button',{name:'Referenzanalyse unveränderlich speichern'}).click();
  await p.getByRole('heading',{name:'Referenzvergleich 2 / 3'}).waitFor();
  const details=p.locator('.reference-analysis details').first();
  await details.locator('summary').click();
  assert.match(await details.innerText(),/unbestimmte/);
  if(width===1280){
   stale=await openReference(ctx);
   await stale.getByRole('heading',{name:'Referenzvergleich 2 / 3'}).waitFor();
  }
  // Intentionally preserve author-unpreferred A without grading.
  await record(p,'A','Die bereits bestellte Gutachterin überprüfte danach die Berechnungen; die Kommission forderte sie zusätzlich zur Erläuterung der Unsicherheit auf.','Die bestimmte Nominalgruppe knüpft an dieselbe Person an, statt eine weitere Fachfrau einzuführen.');
  await p.getByRole('heading',{name:'Referenzvergleich 3 / 3'}).waitFor();
  if(stale){
   await record(stale,'B','Eine andere Gutachterin überprüfte die Berechnungen und reichte einen zusätzlichen Bericht ein, der zuvor nicht erwähnt worden war.','Dies würde den ursprünglichen Bezug zu der zuerst genannten Person verändern.');
   await stale.getByRole('alert').getByText(/Schreibversion wurde inzwischen verändert/).waitFor();
   await stale.getByRole('heading',{name:'Referenzvergleich 3 / 3'}).waitFor();
   await stale.close();
  }
  await record(p,'A','Am Freitag ging der von derselben Gutachterin vorbereitete Bericht in der Geschäftsstelle ein; eine Entscheidung war damit nicht verbunden.','Die bestimmte Form nimmt den im vorigen Absatz genannten Bericht erneut auf und führt kein beliebiges neues Gutachten ein.');
  await p.getByRole('heading',{name:'Eigenständig formulieren'}).waitFor();
  assert.equal(await p.locator('.reference-analysis').count(),3);
  const text='Eine externe Gutachterin nahm den Antrag zur Prüfung entgegen. Die Gutachterin untersuchte die eingereichten Berechnungen und schrieb einen vorläufigen Bericht. Der Bericht traf am Freitag bei der Geschäftsstelle ein; eine endgültige Entscheidung war damit nicht getroffen.';
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p3');
  await p.getByLabel('Dein eigenständiger Text').fill(text);
  await p.getByLabel('Begründe Erstnennung, Wiederaufnahme und begrenzte Aussagen').fill('Eine führt die neue Person ein; die nimmt dieselbe Person und dasselbe Gutachten wieder auf. Der Dokumenteingang ist nicht mit der Entscheidung gleichzusetzen.');
  await p.getByRole('button',{name:'Eigenen Text speichern'}).click();
  await p.getByRole('heading',{name:'Eigenen Text überarbeiten'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
  await p.getByLabel('Dein eigenständiger Text').fill(text+' Ein Beschluss wurde an diesem Freitag ausdrücklich noch nicht gefasst.');
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p2');
  await p.getByLabel('Begründe Erstnennung, Wiederaufnahme und begrenzte Aussagen').fill('Der ergänzte Satz begrenzt die Deutung des Berichtseingangs und vermeidet eine erfundene Freigabeentscheidung.');
  await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByText('Der ergänzte Satz begrenzt die Deutung des Berichtseingangs und vermeidet eine erfundene Freigabeentscheidung.').waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Referenz und Determination · G01'}).waitFor();
  await p.getByText('1/6 Quellen begonnen',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.getByLabel('Textart').selectOption('G01_REFERENCE');
  await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderliche erste Referenzanalyse'}).waitFor();
  await p.getByText(first,{exact:false}).first().waitFor();
  await p.getByText('Der ergänzte Satz begrenzt die Deutung des Berichtseingangs und vermeidet eine erfundene Freigabeentscheidung.').waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Referenz und Determination',exact:true}).waitFor();
  await p.getByText(why,{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Artikel und Genus'}).getByRole('button',{name:'Referenz im Text prüfen'}).click();
  await p.getByText(first,{exact:false}).first().waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M16 G01 reference tracing, original reformulation, ungraded choice, CAS stale tab, archive and reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
