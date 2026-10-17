import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const origin='http://127.0.0.1:4173/';
async function start(context){const page=await context.newPage();await page.goto(origin,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();return page;}
async function visitData(page){await page.getByRole('button',{name:'Daten & Sicherung'}).click();await page.getByRole('heading',{name:'Daten & Sicherung'}).waitFor();}
async function restore(page,str){
 await page.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'sprachgefuehl-backup.json',mimeType:'application/json',buffer:Buffer.from(str)});
 await page.getByText('Integrität bestätigt',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
 await page.getByText('Import abgeschlossen:',{exact:false}).waitFor();
}
async function scenario(width){
 const source=await browser.newContext({viewport:{width,height:840},acceptDownloads:true,serviceWorkers:'allow'});
 const target=await browser.newContext({viewport:{width,height:840},acceptDownloads:true,serviceWorkers:'allow'});
 try{
  const a=await start(source);
  await a.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await a.getByRole('button',{name:'Kontrast üben'}).click();
  await a.getByRole('button',{name:'ablehnen',exact:true}).click();
  await a.getByRole('button',{name:'Antwort prüfen'}).click();
  await a.getByText('Noch nicht richtig').waitFor();
  await a.getByText('Warum die Alternative problematisch ist',{exact:false}).waitFor();
  await a.getByRole('button',{name:'Zur Übersicht'}).click();
  await a.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await a.getByRole('button',{name:'Schreibwerkstatt öffnen'}).click();
  const original='Die Sprecherin erklärte, die Zahlen seien klar; die Ursachen seien weiterhin unbekannt.';
  const rewrite='Die Sprecherin betonte, die Zahlen seien eindeutig, die Ursachen jedoch noch nicht bekannt.';
  await a.getByLabel('Deine erste Formulierung').fill(original);
  await a.getByRole('button',{name:'Erstfassung unveränderlich speichern'}).click();
  await a.getByText('Gespeicherte Erstfassung',{exact:false}).waitFor();
  await a.getByLabel('Deine Überarbeitung').fill(rewrite);
  await a.getByLabel('Was hast du geändert? (optional)').fill('Weniger direkte Rede, stärkere Einschränkung.');
  await a.getByRole('button',{name:'Überarbeitung hinzufügen'}).click();
  await a.getByText('Überarbeitung 1').waitFor();
  await a.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await visitData(a);
  const dl=a.waitForEvent('download');
  await a.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
  const item=await dl;const path=await item.path();assert.ok(path);
  const raw=await import('node:fs/promises').then(m=>m.readFile(path,'utf8'));
  const obj=JSON.parse(raw);
  assert.equal(obj.version,2);assert.equal(obj.records.productionEntries.length,1);
  assert.equal(obj.records.productionEntries[0].original,original);
  assert.equal(obj.records.productionEntries[0].revisions[0].text,rewrite);
  assert.equal(obj.records.attempts.length,1);

  const b=await start(target);await visitData(b);await restore(b,raw);
  await b.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await b.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await b.getByText('1 Erstfassungen',{exact:false}).waitFor();
  await b.reload({waitUntil:'networkidle'});
  await b.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await b.getByRole('button',{name:'Schreibwerkstatt öffnen'}).click();
  await b.getByText(original).waitFor();
  await b.getByText(rewrite).waitFor();
  await b.getByText('Überarbeitung 1').waitFor();
  await b.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await visitData(b);await restore(b,raw);
  await b.getByText('0 fehlende Datensätze ergänzt',{exact:false}).waitFor();

  // Verify legacy v1 six-store backups, re-signed in test only, remain importable.
  const oldRecords={...obj.records};delete oldRecords.productionEntries;
  const body={format:obj.format,version:1,sourceDatabase:obj.sourceDatabase,createdAt:obj.createdAt,records:oldRecords};
  const hash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
  await restore(b,JSON.stringify({...body,integrity:{algorithm:'SHA-256',digest:hash}}));
  await b.getByText('0 fehlende Datensätze ergänzt',{exact:false}).waitFor();

  const corrupt=raw.replace(original,original+' verändert');
  await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'corrupt.json',mimeType:'application/json',buffer:Buffer.from(corrupt)});
  await b.getByText('Integritätsprüfung fehlgeschlagen',{exact:false}).waitFor();
  await b.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await b.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await b.getByText('1 Erstfassungen',{exact:false}).waitFor();
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
 }finally{await source.close();await target.close();}
}
try{await scenario(1280);await scenario(360);console.log('PASS: M04 immutable writing/revision, M05 contextual contrast, v1/v2 backup merge+checksum, desktop/mobile');}
finally{await browser.close()}
