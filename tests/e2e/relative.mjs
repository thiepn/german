import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transformations,counterreadings,syntaxEvidences,boundaries,memo,reason,revised} from '../fixtures/relative.mjs';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Relativanschluss und Kasusautonomie · G02'}).click();
 await p.getByRole('heading',{name:'Relativanschluss und Kasusautonomie',exact:true}).waitFor();return p;
}
async function fill(p,i,choice){
 await p.locator('#relative-choice').selectOption(choice);
 await p.locator('#relative-transformation').fill(transformations[i]);
 await p.locator('#relative-counterreading').fill(counterreadings[i]);
 await p.locator('#relative-syntaxEvidence').fill(syntaxEvidences[i]);
 await p.locator('#relative-boundary').fill(boundaries[i]);
 await p.getByRole('button',{name:'Relativbeleg speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow',acceptDownloads:true});
 const target=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow',acceptDownloads:true});
 try{
  const p=await open(ctx);
  assert.equal(await p.locator('.polysemy-paragraph').count(),3);
  assert.equal(await p.getByRole('button',{name:'Relativbeleg speichern'}).isDisabled(),true);
  await p.locator('#relative-choice').selectOption('A');
  await p.locator('#relative-transformation').fill(transformations[0]);
  await p.locator('#relative-counterreading').fill(transformations[0]);
  await p.locator('#relative-syntaxEvidence').fill(syntaxEvidences[0]);
  await p.locator('#relative-boundary').fill(boundaries[0]);
  assert.equal(await p.getByRole('button',{name:'Relativbeleg speichern'}).isDisabled(),true,'duplicate independent explanation blocked');
  await p.locator('#relative-counterreading').fill(counterreadings[0]);await p.getByRole('button',{name:'Relativbeleg speichern'}).click();
  await p.getByRole('heading',{name:'Relativbeleg 2 / 3'}).waitFor();
  let stale=null;if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Relativbeleg 2 / 3'}).waitFor();}
  await fill(p,1,'B');await p.getByRole('heading',{name:'Relativbeleg 3 / 3'}).waitFor();
  if(stale){await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|gespeichert/i).waitFor();await stale.close();}
  await fill(p,2,'A');await p.getByRole('heading',{name:'Eigenständigen Relativsatzbericht schreiben'}).waitFor();
  await p.locator('#relative-anchor').selectOption('r1');await p.locator('#relative-memo').fill(memo);await p.locator('#relative-reason').fill(reason);
  await p.getByRole('button',{name:'Relativsatzbericht speichern'}).click();
  await p.getByRole('heading',{name:'Adressatengerechte Revision'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  await p.locator('#relative-anchor').selectOption('r3');await p.locator('#relative-reason').fill(reason);
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true,'unchanged report rejected');
  await p.locator('#relative-memo').fill(revised);await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Relativanschluss und Kasusautonomie · G02'}).waitFor();
  await p.getByText('1/4 Quellen begonnen',{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.locator('#archive-kind').selectOption('G02_RELATIVE');await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderlicher erster Relativbeleg'}).waitFor();
  await p.getByText(transformations[0],{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Relativanschluss und Kasusautonomie',exact:true}).waitFor();
  await p.getByText(transformations[1],{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Kasus und Flexion'}).getByRole('button',{name:'Relativanschluss und Kasusautonomie'}).click();
  await p.getByText(transformations[0],{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Daten & Sicherung'}).click();
  const dl=p.waitForEvent('download');await p.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
  const raw=await readFile(await (await dl).path(),'utf8'),obj=JSON.parse(raw);
  assert.equal(obj.version,3);assert.equal(obj.records.productionEntries.length,1);
  assert.equal(obj.records.productionEntries[0].kind,'RELATIVE_STUDY');
  assert.equal(obj.records.productionEntries[0].revisions.length,4);
  assert.ok(obj.records.productionEntries[0].original.includes(transformations[0]));
  const b=await target.newPage();await b.goto(origin,{waitUntil:'networkidle'});
  if(await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await b.getByRole('button',{name:'Daten & Sicherung'}).click();
  await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'sprachgefuehl-backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await b.getByText('Integrität bestätigt',{exact:false}).waitFor();
  await b.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
  await b.getByText('Import abgeschlossen:',{exact:false}).waitFor();
  await b.reload({waitUntil:'networkidle'});await b.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await b.locator('article').filter({hasText:'Kasus und Flexion'}).getByRole('button',{name:'Relativanschluss und Kasusautonomie'}).click();
  await b.getByText('Bürgerinformation',{exact:false}).first().waitFor();
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M34 G02 relative-clause case autonomy, independent transformation, stale-tab CAS, Archive, revision, backup v3 and reload '+width);
 }finally{await ctx.close();await target.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
