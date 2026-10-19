import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
async function run(width){
 const context=await browser.newContext({viewport:{width,height:820},serviceWorkers:'allow'});
 try{
  const page=await context.newPage();await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await page.getByRole('button',{name:'Sprachmittlung · G13'}).click();
  await page.getByRole('heading',{name:'Sprachmittlung und Argumentation'}).waitFor();
  const s=await page.locator('.mediation-source .reading-paragraph').allTextContents();
  assert.equal(s.length,3,'canonical source paragraphs shown');
  assert.match(s[1],/keinen eindeutigen Schluss/);
  const create=page.getByRole('button',{name:'Erstinterpretation speichern'});
  assert.equal(await create.isDisabled(),true);
  await page.getByLabel('Zielgruppe',{exact:true}).selectOption('STUDENTS');
  await page.getByLabel('Textbeleg für die Erstinterpretation').selectOption('p2');
  const original='Mehr Personen nahmen teil, aber wegen weiterer Änderungen ist kein sicherer Ursachenbeleg möglich.';
  await page.getByLabel('Erste Deutung mit Einschränkung').fill(original);await create.click();
  await page.getByText(original).waitFor();
  assert.match(await page.locator('.mediation-work').innerText(),/Textbeleg:\s*p2/,'first cited source paragraph remains visible');
  await page.getByLabel('Beleg für diese Fassung').selectOption('p2');
  await page.getByLabel('Deine adressatengerechte Fassung').fill('Die Anmeldungen stiegen; offen bleibt, welche Änderung dazu beitrug.');
  await page.getByLabel('Welche Unsicherheit oder Grenze bleibt?').fill('Keine isolierte Wirkung messbar.');
  await page.getByRole('button',{name:'Fassung mit Beleg speichern'}).click();
  await page.getByText('Gesicherte Fassungen').waitFor();
  await page.getByLabel('Aufgabe',{exact:true}).selectOption('ARGUMENT');
  await page.getByLabel('Beleg für diese Fassung').selectOption('p3');
  await page.getByLabel('Deine abwägende Argumentation').fill('Die Zunahme verdient Beachtung, beweist aber keine einzelne Ursache. Weitere Gruppenvergleiche helfen.');
  await page.getByLabel('Welche Unsicherheit oder Grenze bleibt?').fill('Vergleichsgruppen fehlen noch.');
  await page.getByRole('button',{name:'Fassung mit Beleg speichern'}).click();
  await page.getByText('Vergleichsgruppen fehlen noch.').waitFor();
  await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await page.getByRole('heading',{name:'Sprachmittlung · G13'}).waitFor();
  await page.getByText('1/4 Quellen begonnen',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await page.getByLabel('Textart').selectOption('G13_MEDIATION');
  await page.locator('.archive-entry').first().click();
  await page.getByText(original).waitFor();
  await page.getByText('Vergleichsgruppen fehlen noch.').waitFor();
  await page.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await page.getByRole('heading',{name:'Sprachmittlung und Argumentation'}).waitFor();
  await page.getByText('Zielgruppe: Studierendenvertretung',{exact:false}).waitFor();
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await page.locator('article').filter({hasText:'Mediation und Transfer'}).getByRole('button',{name:'Sprachmittlung öffnen'}).click();
  await page.getByLabel('Ausgangstext auswählen').selectOption('SG-M09-001');
  await page.getByText(original).waitFor();
  await page.getByRole('button',{name:'Original-Lesestudie öffnen'}).click();
  await page.getByRole('heading',{name:'Argumente genau lesen'}).waitFor();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(overflow,false,'no horizontal overflow');
  console.log('PASS M09 source-backed mediation, audience, argumentation, archive, return, reload '+width);
 }finally{await context.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
