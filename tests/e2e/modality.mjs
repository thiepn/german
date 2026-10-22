import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const root='http://127.0.0.1:4173/';
async function choose(context){
 const p=await context.newPage();await p.goto(root,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Modus und Tempus · G05'}).click();
 await p.getByRole('heading',{name:'Modus, Tempus und Diathese'}).waitFor();
 return p;
}
async function answer(p,id,interpretation,limit){
 await p.getByLabel('Mögliche Lesart').selectOption(id);
 await p.getByLabel('Deine Interpretation mit Bezug auf den Kontext').fill(interpretation);
 if(limit)await p.getByLabel('Was lässt sich aus der Textstelle nicht ableiten?').fill(limit);
 await p.getByRole('button',{name:'Deutung unveränderlich speichern'}).click();
 await p.getByRole('heading',{name:'Dokumentierte Textdeutungen'}).waitFor();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:850},serviceWorkers:'allow'});
 let secondTab=null;
 try{
  const p=await choose(ctx);
  const intro='Die Leitung berichtet den Entwurf als abgeschlossen, ohne dass eine unabhängige Freigabe belegt wäre.';
  assert.equal(await p.locator('.modality-paragraph').count(),3);
  assert.equal(await p.getByRole('button',{name:'Deutung unveränderlich speichern'}).isDisabled(),true);
  await answer(p,'A',intro);
  await p.getByRole('heading',{name:'Textdeutung 2 / 3'}).waitFor();
  assert.equal(await p.locator('.modality-reading').count(),1);
  await p.getByText('Autorenlesart und sprachliche Begründung').first().click();
  assert.match(await p.locator('.modality-reading').first().innerText(),/Die Leitung behauptet/);
  // Both tabs now hold the same immutable source and revision counter.
  if(width===1280){
   secondTab=await choose(ctx);
   await secondTab.getByRole('heading',{name:'Textdeutung 2 / 3'}).waitFor();
  }
  await answer(p,'B','Die Ergänzung war aus damaliger Sicht der Leitung geplant, nicht bestätigt.','Aus der Ankündigung folgt keine Einreichung.');
  await p.getByRole('heading',{name:'Textdeutung 3 / 3'}).waitFor();
  if(secondTab){
   await secondTab.getByLabel('Mögliche Lesart').selectOption('A');
   await secondTab.getByLabel('Deine Interpretation mit Bezug auf den Kontext').fill('Die zweite Registerkarte versucht zu überschreiben.');
   await secondTab.getByLabel('Was lässt sich aus der Textstelle nicht ableiten?').fill('Keine sichere Erfüllung.');
   await secondTab.getByRole('button',{name:'Deutung unveränderlich speichern'}).click();
   await secondTab.getByRole('alert').getByText(/Schreibversion wurde inzwischen verändert/).waitFor();
   await secondTab.getByRole('heading',{name:'Textdeutung 3 / 3'}).waitFor();
   await secondTab.close();
  }
  await answer(p,'A','Die Leitung meldet eine abgeschlossene Einreichung, ohne dass die Kommission den Eingang geprüft hat.','Die Freigabe wurde nicht bestätigt.');
  await p.getByRole('heading',{name:'Eigenständig formulieren'}).waitFor();
  const sentence='Die Projektleitung erklärte, der Entwurf sei abgeschlossen. Sie gab an, die Nachweise seien eingereicht worden; eine Freigabe durch die Kommission stehe allerdings noch aus.';
  await p.getByLabel('Textbeleg für deine Formulierung').selectOption('p3');
  await p.getByLabel('Eigene Formulierung').fill(sentence);
  await p.getByLabel('Begründe Sprecherzuordnung, Zeitbezug und epistemische Grenze').fill('Ich unterscheide berichteten Abschluss und noch nicht verifizierte Freigabe.');
  await p.getByRole('button',{name:'Eigene Formulierung speichern'}).click();
  await p.getByRole('heading',{name:'Eigenen Text präzisieren'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  await p.getByRole('button',{name:'Überarbeitung speichern'}).waitFor();
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true,'unchanged revision disabled');
  await p.getByLabel('Eigene Formulierung').fill(sentence+' Die Entscheidung steht damit weiterhin unter Vorbehalt.');
  await p.getByLabel('Textbeleg für deine Formulierung').selectOption('p2');
  await p.getByLabel('Begründe Sprecherzuordnung, Zeitbezug und epistemische Grenze').fill('Die spätere Ergänzungsabsicht wird vom tatsächlichen Prüfergebnis getrennt.');
  await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByText('Die spätere Ergänzungsabsicht wird vom tatsächlichen Prüfergebnis getrennt.').waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Modus, Tempus und Diathese · G05'}).waitFor();
  await p.getByText('1/6 Fälle begonnen',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.getByLabel('Textart').selectOption('G05_MODALITY');
  await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderliche Erstinterpretation'}).waitFor();
  await p.getByText(intro,{exact:true}).waitFor();
  await p.getByText('Die spätere Ergänzungsabsicht wird vom tatsächlichen Prüfergebnis getrennt.').waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Modus, Tempus und Diathese'}).waitFor();
  await p.getByText(intro,{exact:true}).waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Modus, Tempus und Diathese'}).getByRole('button',{name:'Modus und Aussageperspektive öffnen'}).click();
  await p.getByText(intro,{exact:true}).waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M12 contrasts, no grading, authored repair, output, CAS stale tab, archive, reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
