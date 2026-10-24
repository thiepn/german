import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const url='http://127.0.0.1:4173/';
async function openApp(context){
 const page=await context.newPage();
 await page.goto(url,{waitUntil:'networkidle'});
 return page;
}
try{
 const source=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});
 const a=await openApp(source);
 await a.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await a.getByRole('button',{name:'Trainieren',exact:true}).first().click();
 await a.locator('article').filter({hasText:'Kasus-Kette'}).getByRole('button',{name:'Übung starten'}).click();
 for(const input of await a.locator('input[required]').all())await input.fill('ein Testfehler');
 await a.getByRole('button',{name:'Antwort prüfen'}).click();
 await a.getByText('Noch nicht richtig').waitFor();
 await a.getByRole('button',{name:'Zur Übersicht'}).click();
 await a.getByRole('button',{name:'Daten & Sicherung'}).click();
 const promise=a.waitForEvent('download');
 await a.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
 const download=await promise;
 const path=await download.path();
 assert.ok(path);
 const raw=await import('node:fs/promises').then(m=>m.readFile(path,'utf8'));
 assert.match(raw,/sprachgefuehl-local-backup/);
 const target=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});
 const b=await openApp(target);
 await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await b.getByRole('button',{name:'Daten & Sicherung'}).click();
 await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await b.getByText('Integrität bestätigt').waitFor();
 await b.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
 await b.getByText('Import abgeschlossen:').waitFor();
 await b.getByRole('button',{name:'Zurück zur Übersicht'}).click();
 await b.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
 assert.equal(await b.locator('.metric').filter({hasText:'Versuche'}).locator('strong').innerText(),'1');
 await b.reload({waitUntil:'networkidle'});
 await b.getByRole('button',{name:'Daten & Sicherung'}).click();
 await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await b.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
 await b.getByText('0 fehlende Datensätze ergänzt').waitFor();
 const tampered=raw.replace('"score": 0','"score": 1').replace('"score": 0.0','"score": 1.0');
 if(tampered!==raw){
  await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'tampered.json',mimeType:'application/json',buffer:Buffer.from(tampered)});
  await b.getByText('Integritätsprüfung fehlgeschlagen').waitFor();
 }
 await a.close();await b.close();await source.close();await target.close();
 console.log('PASS: local backup download, cross-context import, reload, duplicate-safe merge, digest gate');
}finally{await browser.close()}
