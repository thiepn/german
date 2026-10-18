import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const root='http://127.0.0.1:4173/';
async function run(width){
 const context=await browser.newContext({viewport:{width,height:840},serviceWorkers:'allow'});
 try{
  const p=await context.newPage();await p.goto(root,{waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await p.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await p.getByRole('button',{name:'Schreibwerkstatt öffnen'}).click();
  const first='Die Sprecherin hielt das Verfahren für vorläufig.';
  const second='Die Sprecherin erklärte, das Verfahren sei vorläufig.';
  await p.getByLabel('Deine erste Formulierung').fill(first);
  await p.getByRole('button',{name:'Erstfassung unveränderlich speichern'}).click();
  await p.getByText('Gespeicherte Erstfassung',{exact:false}).waitFor();
  await p.locator('#revisionLens').selectOption('SYNTAX');
  await p.locator('.review-checklist input').first().check();
  await p.getByLabel('Deine Überarbeitung').fill(second);
  await p.getByLabel('Was hast du geändert? (optional)').fill('Konjunktiv für indirekte Rede.');
  await p.getByRole('button',{name:'Überarbeitung hinzufügen'}).click();
  await p.getByText('Überarbeitung 1',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.getByRole('heading',{name:'Schreibspuren'}).waitFor();
  await p.getByText('1 passende Originaldatensätze').waitFor();
  await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderliche Erstfassung'}).waitFor();
  await p.getByText(second).waitFor();
  await p.getByText('Konjunktiv für indirekte Rede.').waitFor();
  await p.getByRole('button',{name:'Mit vorheriger Fassung vergleichen'}).click();
  await p.getByRole('heading',{name:'Gegenüberstellung · kein Qualitätsurteil'}).waitFor();
  assert.ok(await p.locator('.archive-comparison .diff-added').count()>0);
  await p.getByLabel('In eigenen Texten suchen').fill('Konjunktiv');
  await p.getByText('1 passende Originaldatensätze').waitFor();
  await p.getByLabel('In eigenen Texten suchen').fill('völlig ausgeschlossen');
  await p.getByText('0 passende Originaldatensätze').waitFor();
  await p.getByLabel('In eigenen Texten suchen').fill('');
  await p.getByLabel('Textart').selectOption('G08');
  await p.getByText('0 passende Originaldatensätze').waitFor();
  await p.getByLabel('Textart').selectOption('M04');
  await p.getByLabel('Überarbeitungen').selectOption('REVISED');
  await p.locator('.archive-entry').first().click();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Formulieren und überarbeiten'}).waitFor();
  assert.equal(await p.locator('#productionPrompt').inputValue(),'SG-P04-001');
  await p.getByText(first).waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.locator('.archive-entry').first().click();
  await p.getByText(second).waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  console.log('PASS: writing archive search, filters, immutable versions, reflection and source continuity '+width);
 }finally{await context.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
