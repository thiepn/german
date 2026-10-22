import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
async function run(width){
 const context=await browser.newContext({viewport:{width,height:860},serviceWorkers:'allow'});
 try{
  const p=await context.newPage();await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await p.getByRole('button',{name:'Textredaktion · G11'}).click();
  await p.getByRole('heading',{name:'Textredaktion',exact:true}).waitFor();
  assert.equal(await p.locator('.editorial-source p').count(),3);
  assert.equal(await p.getByRole('button',{name:'Erstbefund unveränderlich speichern'}).isDisabled(),true);
  await p.getByLabel('Zu prüfende Textstelle').selectOption('REFERENT');
  const first='„Sie“ verweist nicht eindeutig auf eine Person oder Gruppe; der Schluss steht im Widerspruch zur Prüfung.';
  await p.getByLabel('Deine erste Diagnose mit Textbeleg').fill(first);
  await p.getByRole('button',{name:'Erstbefund unveränderlich speichern'}).click();
  await p.getByRole('heading',{name:'2 · Gesamten Text überarbeiten'}).waitFor();
  await p.getByText(first,{exact:true}).waitFor();
  await p.getByRole('button',{name:'Ausgangstext in Entwurf übernehmen'}).click();
  const field=p.getByLabel('Deine vollständige Textfassung');
  assert.match(await field.inputValue(),/Die Fachgruppe/);
  const modified=(await field.inputValue()).replace('Sie hat die Hinweise allerdings noch nicht geprüft. Deshalb werden ihre Empfehlungen im nächsten Schritt umgesetzt.','Die Projektleitung hat die Hinweise noch nicht geprüft. Über eine Umsetzung wird erst nach gemeinsamer Prüfung entschieden.');
  await field.fill(modified);
  await p.getByLabel('Welche Bezüge, Aussagen oder Folgerungen hast du geändert?').fill('Der mehrdeutige Rückbezug und der ungedeckte Handlungszwang wurden aufgehoben.');
  await p.locator('.review-checklist input').first().check();
  await p.getByRole('button',{name:'Textfassung mit Begründung speichern'}).click();
  await p.getByRole('heading',{name:'Gespeicherte Textfassungen'}).waitFor();
  await p.getByLabel('Fassungstyp').selectOption('RECONSIDER');
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  await field.fill(modified+'\n\nDie Entscheidung bleibt ausdrücklich von der Auswertung abhängig.');
  await p.getByLabel('Welche Bezüge, Aussagen oder Folgerungen hast du geändert?').fill('Die vorläufige Entscheidung ist als Bedingung ausdrücklich markiert.');
  await p.getByRole('button',{name:'Textfassung mit Begründung speichern'}).click();
  await p.getByText('Die vorläufige Entscheidung ist als Bedingung ausdrücklich markiert.').waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Textredaktion · G11'}).waitFor();
  await p.getByText('1/4 Fälle begonnen',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.getByLabel('Textart').selectOption('G11_EDITORIAL');
  await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderlicher Erstbefund'}).waitFor();
  await p.getByText(first,{exact:true}).waitFor();
  await p.getByText('Die vorläufige Entscheidung ist als Bedingung ausdrücklich markiert.').waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Textredaktion',exact:true}).waitFor();
  await p.getByText(first,{exact:true}).waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Schreiben und Überarbeiten'}).getByRole('button',{name:'Textredaktion öffnen'}).click();
  await p.getByText(first,{exact:true}).waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M11 original authored paragraphs, immutable diagnosis, full redraft, reconsideration, archive, reload '+width);
 }finally{await context.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
