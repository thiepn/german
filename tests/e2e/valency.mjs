import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';

async function openValency(context){
 const page=await context.newPage();await page.goto(origin,{waitUntil:'networkidle'});
 if(await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await page.getByRole('button',{name:'Rektion und Valenz · G03'}).click();
 await page.getByRole('heading',{name:'Rektion und Valenz im Text',exact:true}).waitFor();
 return page;
}
async function answer(page,choice,interpretation,boundary){
 await page.getByLabel('Bedeutung im Ausgangstext').selectOption(choice);
 await page.getByLabel('Begründe deine Deutung mit dem Text').fill(interpretation);
 await page.getByLabel('Welche Aussage wäre nach dem Rahmenwechsel nicht mehr gedeckt?').fill(boundary);
 await page.getByRole('button',{name:'Quellenanalyse unveränderlich speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:860},serviceWorkers:'allow'});
 let stale=null;
 try{
  const p=await openValency(ctx),first='Die Kommission verlangt die schriftliche Begründung als Voraussetzung weiterer Beratung.';
  const limit='Eine Zusammensetzung der Kommission aus Begründungstexten wird nicht behauptet.';
  assert.equal(await p.locator('.valency-paragraph').count(),3);
  assert.equal(await p.getByRole('button',{name:'Quellenanalyse unveränderlich speichern'}).isDisabled(),true);
  await answer(p,'A',first,limit);
  await p.getByRole('heading',{name:'Rahmenvergleich 2 / 3'}).waitFor();
  assert.equal(await p.locator('.valency-analysis').count(),1);
  await p.locator('.valency-analysis details').first().locator('summary').click();
  assert.match(await p.locator('.valency-analysis details[open]').first().innerText(),/bestehen auf/);
  if(width===1280){
   stale=await openValency(ctx);
   await stale.getByRole('heading',{name:'Rahmenvergleich 2 / 3'}).waitFor();
  }
  // Deliberately choose the author-unpreferred reading. It stays evidence, never a score.
  await answer(p,'A','Die Formulierung ließe sich als Inanspruchnahme einer Autorität verstehen, was im Kontext zu stark wäre.','Die Quelle belegt nur den sachlichen Bezug auf Vergleichswerte.');
  await p.getByRole('heading',{name:'Rahmenvergleich 3 / 3'}).waitFor();
  if(stale){
   await answer(stale,'B','Die Verfasserin bezieht sich auf Vergleichswerte, nicht auf ein Autoritätsargument.','Aus der Quelle folgt keine unbedingte externe Bestätigung.');
   await stale.getByRole('alert').getByText(/Schreibversion wurde inzwischen verändert/).waitFor();
   await stale.getByRole('heading',{name:'Rahmenvergleich 3 / 3'}).waitFor();
   await stale.close();
  }
  await answer(p,'A','Die endgültige Entscheidung ist ausdrücklich durch die Ergebnisse der weiteren Prüfung bedingt.','Solange die Prüfung offen ist, darf keine endgültige Umsetzung behauptet werden.');
  await p.getByRole('heading',{name:'Eigenständig formulieren'}).waitFor();
  assert.equal(await p.locator('.valency-analysis').count(),3);
  const text='Die Kommission besteht auf einer schriftlichen Begründung, bevor sie den Antrag behandelt. Ob die Maßnahmen freigegeben werden, hängt von den Ergebnissen einer weiteren unabhängigen Prüfung ab.';
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p3');
  await p.getByLabel('Deine eigenen Sätze').fill(text);
  await p.getByLabel('Welche Verbrahmen hast du gewählt, und wie begrenzen sie die Aussage?').fill('„Bestehen auf“ beschreibt ein verbindliches Beharren, „abhängen von“ eine Bedingung; weder die Freigabe noch ihre Ablehnung steht fest.');
  await p.getByRole('button',{name:'Eigene Sätze speichern'}).click();
  await p.getByRole('heading',{name:'Eigene Formulierung überarbeiten'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
  await p.getByLabel('Deine eigenen Sätze').fill(text+' Der Zeitplan bleibt bis zu dieser Prüfung offen.');
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p2');
  await p.getByLabel('Welche Verbrahmen hast du gewählt, und wie begrenzen sie die Aussage?').fill('Die zusätzliche Bedingung verhindert eine unbelegte Entscheidung; der Bezug auf Daten bleibt sachlich.');
  await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByText('Die zusätzliche Bedingung verhindert eine unbelegte Entscheidung; der Bezug auf Daten bleibt sachlich.').waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Rektion und Valenz · G03'}).waitFor();
  await p.getByText('1/6 Texte begonnen',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.getByLabel('Textart').selectOption('G03_VALENCY');
  await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderliche erste Rahmenanalyse'}).waitFor();
  await p.getByText(first,{exact:false}).first().waitFor();
  await p.getByText('Die zusätzliche Bedingung verhindert eine unbelegte Entscheidung; der Bezug auf Daten bleibt sachlich.').waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Rektion und Valenz im Text',exact:true}).waitFor();
  await p.getByText(limit,{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Rektion und Präpositionen'}).getByRole('button',{name:'Verbrahmen vergleichen'}).click();
  await p.getByText(first,{exact:false}).first().waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M14 G03 source frame shifts, ungraded alternatives, transfer, CAS stale tab, archive and reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
