import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {preparations,selfReviews,sourceReasons,boundaries,memo,reason,revised} from '../fixtures/oral.mjs';

const origin='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Mündliche Stellungnahmen · G12'}).click();
 await p.getByRole('heading',{name:'Mündliche Stellungnahmen',exact:true}).waitFor();
 return p;
}
async function fill(p,index){
 await p.locator('#oral-preparation').fill(preparations[index]);
 await p.locator('#oral-self-review').fill(selfReviews[index]);
 await p.locator('#oral-source-reason').fill(sourceReasons[index]);
 await p.locator('#oral-boundary').fill(boundaries[index]);
}
async function testWithMic(p){
 await p.getByRole('button',{name:'Mikrofonaufnahme starten'}).click();
 await p.getByRole('status').filter({hasText:'Aufnahme läuft'}).waitFor({timeout:15000});
 await p.waitForTimeout(700);await p.getByRole('button',{name:'Aufnahme stoppen'}).click();
 await p.getByLabel('Eigene lokale Sprechprobe anhören').waitFor({timeout:15000});
 const stopped=await p.evaluate(()=>window.__oralTestStream?.getTracks().every(t=>t.readyState==='ended'));
 assert.equal(stopped,true,'microphone tracks stopped immediately after local take');
 await fill(p,0);
 await p.getByRole('button',{name:'Sprechbeleg speichern (nur Text)'}).click();
 await p.getByRole('heading',{name:'Sprechbeleg 2 / 3'}).waitFor();
 assert.equal(await p.locator('audio[aria-label="Eigene lokale Sprechprobe anhören"]').count(),0,'take discarded after saving');
}
async function withoutMic(p,index){
 await p.getByRole('button',{name:'Ohne Mikrofon bearbeiten'}).click();
 await p.getByRole('status').filter({hasText:'Ohne Mikrofon:'}).waitFor();
 await fill(p,index);
 await p.getByRole('button',{name:'Sprechbeleg speichern (nur Text)'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,permissions:['microphone'],serviceWorkers:'allow'});
 const restored=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,permissions:['microphone'],serviceWorkers:'allow'});
 await ctx.addInitScript(()=>{
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await original(...args);window.__oralTestStream=stream;return stream};
 });
 try{
  const p=await open(ctx);assert.equal(await p.locator('.polysemy-paragraph').count(),3);
  assert.equal(await p.getByRole('button',{name:'Sprechbeleg speichern (nur Text)'}).isDisabled(),true);
  await testWithMic(p);
  let stale=null;
  if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Sprechbeleg 2 / 3'}).waitFor()}
  await withoutMic(p,1);await p.getByRole('heading',{name:'Sprechbeleg 3 / 3'}).waitFor();
  if(stale){
   await stale.getByRole('button',{name:'Ohne Mikrofon bearbeiten'}).click();
   await fill(stale,1);
   await stale.getByRole('button',{name:'Sprechbeleg speichern (nur Text)'}).click();
   await stale.getByRole('alert').getByText(/Sprechbeleg wurde nicht gespeichert/).waitFor();
   await stale.close();
  }
  await withoutMic(p,2);
  await p.getByRole('heading',{name:'Eigenständige Schlussstellungnahme schreiben'}).waitFor();
  await p.locator('#oral-anchor').selectOption('t1');
  await p.locator('#oral-memo').fill(memo);await p.locator('#oral-reason').fill(reason);
  await p.getByRole('button',{name:'Schlussstellungnahme speichern'}).click();
  await p.getByRole('heading',{name:'Adressatengerechte Revision'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  await p.locator('#oral-anchor').selectOption('t3');await p.locator('#oral-reason').fill(reason);
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true,'identical revision rejected');
  await p.locator('#oral-memo').fill(revised);await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Mündliche Stellungnahmen · G12'}).waitFor();
  await p.getByText('1/4 Quellen begonnen',{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.locator('#archive-kind').selectOption('G12_ORAL');await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderlicher erster Sprechbeleg (nur Text)'}).waitFor();
  await p.getByText(preparations[0],{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Mündliche Stellungnahmen',exact:true}).waitFor();
  await p.getByText(preparations[1],{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Sprechen und Interaktion'}).getByRole('button',{name:'Mündliche Stellungnahmen erproben'}).click();
  await p.getByText(preparations[0],{exact:false}).first().waitFor();
  assert.equal(await p.locator('audio[aria-label="Eigene lokale Sprechprobe anhören"]').count(),0,'audio absent after reload');
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Daten & Sicherung'}).click();
  const dl=p.waitForEvent('download');
  await p.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
  const raw=await readFile(await (await dl).path(),'utf8'),obj=JSON.parse(raw);
  assert.equal(obj.version,3);
  assert.equal(obj.records.productionEntries.length,1);
  assert.equal(obj.records.productionEntries[0].kind,'ORAL_STUDY');
  assert.equal(obj.records.productionEntries[0].decisionId,'t1|MIC|p1');
  assert.equal(obj.records.productionEntries[0].revisions.length,4);
  assert.ok(obj.records.productionEntries[0].original.includes(preparations[0]));
  assert.equal(raw.includes('blob:'),false);assert.equal(raw.includes('"audio"'),false);
  const b=await restored.newPage();await b.goto(origin,{waitUntil:'networkidle'});
  if(await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await b.getByRole('button',{name:'Daten & Sicherung'}).click();
  await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'sprachgefuehl-backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await b.getByText('Integrität bestätigt',{exact:false}).waitFor();
  await b.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
  await b.getByText('Import abgeschlossen:',{exact:false}).waitFor();
  await b.reload({waitUntil:'networkidle'});await b.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await b.locator('article').filter({hasText:'Sprechen und Interaktion'}).getByRole('button',{name:'Mündliche Stellungnahmen erproben'}).click();
  await b.getByText('Für ein formelles Sitzungsprotokoll',{exact:false}).first().waitFor();
  assert.equal(await b.locator('audio[aria-label="Eigene lokale Sprechprobe anhören"]').count(),0);
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal overflow');
  if(width===1280){
   const denied=await browser.newContext({viewport:{width:360,height:800},serviceWorkers:'allow'});
   try{
    await denied.addInitScript(()=>{navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Permission denied','NotAllowedError'))});
    const d=await open(denied);await d.getByRole('button',{name:'Mikrofonaufnahme starten'}).click();
    await d.getByRole('alert').getByText(/Mikrofon nicht verfügbar oder Zugriff abgelehnt/).waitFor();
    await d.getByRole('button',{name:'Ohne Mikrofon bearbeiten'}).click();
    await d.getByRole('status').filter({hasText:'Ohne Mikrofon:'}).waitFor();
    console.log('PASS M35 explicit microphone denial and accessible text-only fallback');
   }finally{await denied.close()}
  }
  console.log('PASS M35 G12 real Chromium microphone take, track shutdown, stale-tab CAS, written transfer, revision, Archive and backup v3 '+width);
 }finally{await ctx.close();await restored.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
