import {chromium} from 'playwright';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const url='http://127.0.0.1:4173/';
async function open(context){const p=await context.newPage();await p.goto(url,{waitUntil:'networkidle'});await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();return p;}
async function exercise(width){
 const origin=await browser.newContext({viewport:{width,height:840},acceptDownloads:true,serviceWorkers:'allow'});
 const restored=await browser.newContext({viewport:{width,height:840},acceptDownloads:true,serviceWorkers:'allow'});
 try{
  const p=await open(origin);
  await p.getByRole('button',{name:'Pragmatische Situationen'}).click();
  await p.getByRole('heading',{name:'Wirkung statt nur Richtigkeit'}).waitFor();
  await p.getByRole('radio').nth(1).check();
  await p.getByLabel('Warum wählst du diese Formulierung?').fill('Ich wollte die Unsicherheit deutlicher erklären.');
  await p.getByRole('button',{name:'Wahl und Begründung speichern'}).click();
  await p.getByText('Deine ursprüngliche Entscheidung').waitFor();
  await p.getByRole('button',{name:'Wirkungsvergleich zeigen'}).click();
  await p.getByText('Mögliche Wirkungen',{exact:false}).waitFor();
  await p.getByLabel('Deine Formulierung').fill('Ich sehe weitere mögliche Erklärungen und bitte um eine vorsichtige Bewertung.');
  await p.getByRole('button',{name:'Eigene Formulierung ergänzen'}).click();
  await p.getByText('Eigene Neuformulierung 1').waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Pragmatische Situationen'}).click();
  await p.getByText('Ich wollte die Unsicherheit deutlicher erklären.').waitFor();
  await p.getByText('Eigene Neuformulierung 1').waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Lesestudien öffnen'}).click();
  await p.getByLabel('Deine erste Deutung').fill('Der beobachtete Trend ist noch nicht kausal eindeutig.');
  await p.getByRole('button',{name:'Ersten Leseeindruck speichern'}).click();
  await p.getByText('Dein ursprünglicher Leseeindruck').waitFor();
  for(let i=1;i<=3;i++){
   await p.locator('#reading-question').selectOption('q'+i);
   await p.getByLabel('Welcher Absatz stützt deine Antwort?').selectOption('p'+i);
   await p.getByLabel('Deine begründete Antwort').fill('Evidenzbezug für Abschnitt '+i);
   await p.getByRole('button',{name:'Antwort und Beleg dokumentieren'}).click();
   await p.getByText('Evidenzbezug für Abschnitt '+i).waitFor();
  }
  await p.getByRole('heading',{name:'Wissenschaftliches Kurzbriefing'}).waitFor();
  await p.getByLabel('Dein erster adressatengerechter Text').fill('Für die Forschungsleitung: Die Anmeldezahlen stiegen, aber die Ursachen bleiben ungeklärt. Weitere Vergleiche sind sinnvoll.');
  await p.getByRole('button',{name:'Erstfassung des Texttransfers speichern'}).click();
  await p.getByText('Unveränderliche Erstfassung').waitFor();
  await p.getByRole('button',{name:'Eigene Prüfkriterien anzeigen'}).click();
  await p.getByLabel('Überarbeite für die Zielgruppe').fill('Die Anmeldung nahm zu; Termine und Anmeldeprozess änderten sich gleichzeitig. Eine Vergleichsstudie wäre erforderlich.');
  await p.getByRole('button',{name:'Neue Fassung ergänzen'}).click();
  await p.getByText('Übertragung 1').waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lesestudien öffnen'}).click();
  await p.getByText('Übertragung 1').waitFor();
  await p.getByRole('button',{name:'Daten & Sicherung'}).click();
  const pending=p.waitForEvent('download');
  await p.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
  const dl=await pending;const location=await dl.path();assert.ok(location);
  const raw=await readFile(location,'utf8');const packageData=JSON.parse(raw);
  assert.equal(packageData.version,3);
  assert.equal(packageData.records.productionEntries.filter(e=>e.kind==='PRAGMATIC_STUDY').length,1);
  assert.equal(packageData.records.productionEntries.filter(e=>e.kind==='READING_TRANSFER').length,1);
  const q=await open(restored);await q.getByRole('button',{name:'Daten & Sicherung'}).click();
  await q.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await q.getByText('Integrität bestätigt').waitFor();await q.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();await q.getByText('Import abgeschlossen:').waitFor();
  await q.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await q.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await q.getByText('1 von 8 Szenarien dokumentiert').waitFor();
  await q.getByText('1 von 4 adressatengerechten Transfertexten').waitFor();
  assert.equal(await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }finally{await origin.close();await restored.close()}
}
try{await exercise(1280);await exercise(360);console.log('PASS: G08 decision and revision, G09 audience writing, restore and separated progress desktop/mobile');}finally{await browser.close()}
