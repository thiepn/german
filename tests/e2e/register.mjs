import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const origin='http://127.0.0.1:4173/';
const first=(tag)=>('Wir benennen die belegte Einschränkung präzise und übernehmen Verantwortung, ohne eine nicht bestätigte Lösung zu versprechen. '+tag+' ').repeat(3)+'\n\n'+('Wir bieten eine konkrete Rückmeldung an, überlassen die Entscheidung aber der betroffenen Person und vermeiden jede unbegründete Schuldzuweisung. ').repeat(3);
const reason='Die ursprüngliche Formulierung ist zu pauschal. Ich benenne die belegte Einschränkung, vermeide ein nicht abgesichertes Versprechen und begründe die Entscheidungshoheit des Gegenübers ausdrücklich.';
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Verantwortung und Register · G08'}).click();
 await p.getByRole('heading',{name:/Verantwortung und Register/}).waitFor();return p;
}
async function fill(p,text,button){
 await p.locator('#register-draft').fill(text);await p.locator('#register-reason').fill(reason);
 await p.getByRole('button',{name:button}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:850},acceptDownloads:true,serviceWorkers:'allow'});
 const target=await browser.newContext({viewport:{width,height:850},acceptDownloads:true,serviceWorkers:'allow'});
 try{
  const p=await open(ctx);
  assert.equal(await p.getByRole('button',{name:'Erstfassung sichern'}).isDisabled(),true);
  assert.equal(await p.getByText('DEMO_ONLY',{exact:false}).count()>0,true);
  await fill(p,first('Erstfassung'),'Erstfassung sichern');
  await p.getByRole('button',{name:'Adressatenwechsel sichern'}).waitFor();
  const stale=await open(ctx);
  await fill(p,first('An die Verwaltungsleitung'),'Adressatenwechsel sichern');
  await p.getByRole('button',{name:'Revision sichern'}).waitFor();
  await fill(stale,first('Widersprüchliche zweite Zielgruppe'),'Adressatenwechsel sichern');
  await stale.getByRole('alert').getByText(/inzwischen verändert|Nicht gespeichert/).waitFor();
  await stale.close();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.getByRole('button',{name:'Verantwortung und Register'}).first().click();
  await p.getByRole('button',{name:'Revision sichern'}).waitFor();
  await p.getByRole('button',{name:'Revision sichern'}).isDisabled().then(disabled=>assert.equal(disabled,true));
  await fill(p,first('Revidierte öffentliche Mitteilung'),'Revision sichern');
  await p.getByText('Revision · 2').waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Verantwortung und Register · G08'}).waitFor();
  await p.getByText('1/4 Quellen begonnen',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.locator('#archive-kind').selectOption('G08_REGISTER_RESPONSIBILITY');
  await p.locator('.archive-entry').first().click();
  await p.getByText('Eigene Begründung:',{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:/Verantwortung und Register/}).waitFor();
  await p.getByText('Erstfassung',{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Daten & Sicherung'}).click();
  const dl=p.waitForEvent('download');await p.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
  const downloaded=await dl;const raw=await readFile(await downloaded.path(),'utf8'),obj=JSON.parse(raw);
  assert.equal(obj.version,3);
  assert.equal(obj.records.productionEntries.length,1);
  const saved=obj.records.productionEntries[0];
  assert.equal(saved.kind,'REGISTER_RESPONSIBILITY_STUDY');
  assert.equal(saved.revisions.length,2);
  assert.ok(saved.original.includes('Erstfassung'));
  assert.equal(obj.records.missions.length>=0,true);
  const b=await target.newPage();await b.goto(origin,{waitUntil:'networkidle'});
  if(await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await b.getByRole('button',{name:'Daten & Sicherung'}).click();
  await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'sprachgefuehl-backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await b.getByText('Integrität bestätigt',{exact:false}).waitFor();
  await b.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
  await b.getByText('Import abgeschlossen:',{exact:false}).waitFor();
  await b.reload({waitUntil:'networkidle'});
  await b.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await b.getByRole('button',{name:'Verantwortung und Register'}).first().click();
  await b.getByRole('button',{name:'Revision sichern'}).waitFor();
  await b.getByText('Revidierte öffentliche Mitteilung',{exact:false}).first().waitFor();
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M29 G08 first/transfer/revision, stale-tab CAS, archive recovery, backup v3 '+width);
 }finally{await ctx.close();await target.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
