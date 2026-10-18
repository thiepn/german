import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const origin='http://127.0.0.1:4173/';
async function launch(context){
 const page=await context.newPage();await page.goto(origin,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();return page;
}
async function openReading(page){
 await page.getByRole('button',{name:'Lernen',exact:true}).first().click();
 await page.getByRole('button',{name:'Lesestudien öffnen'}).click();
 await page.getByRole('heading',{name:'Argumente genau lesen'}).waitFor();
}
async function run(width){
 const a=await browser.newContext({viewport:{width,height:820},acceptDownloads:true,serviceWorkers:'allow'});
 const b=await browser.newContext({viewport:{width,height:820},acceptDownloads:true,serviceWorkers:'allow'});
 try{
  const page=await launch(a);await openReading(page);
  const note='Der Anstieg wird beobachtet, aber eine einzelne Ursache ist ungesichert.';
  const answer='Die Anmeldungen stiegen, aber die neue Beratungsform ist nicht als alleinige Ursache belegt.';
  await page.getByLabel('Deine erste Deutung').fill(note);
  await page.getByRole('button',{name:'Ersten Leseeindruck speichern'}).click();
  await page.getByText('Dein ursprünglicher Leseeindruck').waitFor();
  await page.getByLabel('Welcher Absatz stützt deine Antwort?').selectOption('p2');
  await page.getByLabel('Deine begründete Antwort').fill(answer);
  await page.getByRole('button',{name:'Antwort und Beleg dokumentieren'}).click();
  await page.locator('#reading-question').selectOption('q1');
  await page.getByText(answer).waitFor();
  await page.getByRole('button',{name:'Musterdeutung vergleichen'}).click();
  await page.getByText('Eine mögliche Deutung',{exact:false}).waitFor();
  await page.reload({waitUntil:'networkidle'});
  await openReading(page);
  await page.getByText(note).waitFor();
  await page.getByText(answer).waitFor();
  await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await page.getByRole('button',{name:'Daten & Sicherung'}).click();
  const promise=page.waitForEvent('download');
  await page.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
  const download=await promise, location=await download.path();assert.ok(location);
  const raw=await readFile(location,'utf8'),stored=JSON.parse(raw);
  assert.equal(stored.version,3);assert.equal(stored.records.productionEntries.filter(x=>x.kind==='READING_STUDY').length,1);
  const restored=await launch(b);
  await restored.getByRole('button',{name:'Daten & Sicherung'}).click();
  await restored.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'reading-backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await restored.getByText('Integrität bestätigt').waitFor();
  await restored.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
  await restored.getByText('Import abgeschlossen:').waitFor();
  await restored.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await openReading(restored);
  await restored.getByText(note).waitFor();
  await restored.getByText(answer).waitFor();
  await restored.getByRole('button',{name:'Zum passenden Sprachtraining wechseln'}).click();
  await restored.getByRole('heading',{name:'Satzlabor'}).waitFor();
  assert.equal(await restored.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }finally{await a.close();await b.close()}
}
try{await run(1280);await run(360);console.log('PASS: source-anchored reading, evidence notes, reload, v3 backup recovery, cross-mode transfer, mobile/desktop');}finally{await browser.close()}
