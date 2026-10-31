import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {preparations,selfReviews,sourceReasons,boundaries} from '../fixtures/oral.mjs';
const origin='http://127.0.0.1:4173/',browser=await chromium.launch({headless:true});
const title='Stadtteilversammlung: allgemeine Behauptung, Freigabevorbehalt und offene Aufgaben';
async function run(width){
 const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'allow'});
 try{
  const p=await context.newPage();await p.goto(origin,{waitUntil:'networkidle'});
  if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  assert.equal(await p.getByRole('heading',{name:'Zuletzt bearbeitet'}).count(),0);
  // Earlier native M04 writing must still resume on the Trainieren tab.
  await p.getByRole('button',{name:'Schreibwerkstatt öffnen'}).click();
  const first='Die Befragung stützt nur eine eng begrenzte Aussage über die drei untersuchten Orte. Eine allgemeine Übertragung bedarf weiterer Belege.';
  await p.getByLabel('Deine erste Formulierung').fill(first);
  await p.getByRole('button',{name:'Erstfassung unveränderlich speichern'}).click();
  await p.getByText('Gespeicherte Erstfassung',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  await p.getByRole('heading',{name:'Zuletzt bearbeitet'}).waitFor();
  await p.locator('.today-continuation').getByRole('button',{name:/^Fortsetzen:/}).click();
  await p.getByRole('heading',{name:'Formulieren und überarbeiten'}).waitFor();
  assert.equal(await p.locator('#productionPrompt').inputValue(),'SG-P04-001');
  await p.getByText(first).first().waitFor();
  await p.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  // New G12 oral pathway; documented evidence is text only.
  await p.getByRole('button',{name:'Mündliche Stellungnahmen · G12'}).click();
  await p.getByRole('heading',{name:'Mündliche Stellungnahmen',exact:true}).waitFor();
  await p.getByRole('button',{name:'Ohne Mikrofon bearbeiten'}).click();
  await p.locator('#oral-preparation').fill(preparations[0]);
  await p.locator('#oral-self-review').fill(selfReviews[0]);
  await p.locator('#oral-source-reason').fill(sourceReasons[0]);
  await p.locator('#oral-boundary').fill(boundaries[0]);
  await p.getByRole('button',{name:'Sprechbeleg speichern (nur Text)'}).click();
  await p.getByRole('heading',{name:'Sprechbeleg 2 / 3'}).waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  const recent=p.locator('.today-continuation');
  await recent.getByRole('button',{name:new RegExp('Stadtteilversammlung')}).waitFor();
  assert.equal(await recent.locator('button.today-action').count(),2);
  await recent.getByRole('button',{name:new RegExp('Stadtteilversammlung')}).click();
  await p.getByRole('heading',{name:'Sprechbeleg 2 / 3'}).waitFor();
  await p.getByText(preparations[0],{exact:false}).first().waitFor();
  // Curriculum reuses one native source record for its domain-specific return.
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  const g12=p.locator('article.panel').filter({has:p.getByRole('heading',{name:'Sprechen und Interaktion'})});
  await g12.getByRole('button',{name:'Letzte Arbeit fortsetzen: '+title}).click();
  await p.getByRole('heading',{name:'Sprechbeleg 2 / 3'}).waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  const prog=p.getByRole('region',{name:'Zuletzt bearbeitete Quellen'});
  await prog.getByRole('button',{name:new RegExp('Stadtteilversammlung')}).click();
  await p.getByRole('heading',{name:'Sprechbeleg 2 / 3'}).waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  await p.getByRole('button',{name:'Alle Schreibspuren öffnen'}).click();
  await p.getByRole('heading',{name:'Schreibspuren'}).waitFor();
  await p.getByText('2 Einträge').waitFor();
  await p.locator('#archive-kind').selectOption('G12_ORAL');
  await p.locator('.archive-entry').first().click();
  await p.getByText(preparations[0],{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Sprechbeleg 2 / 3'}).waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Heute',exact:true}).first().click();
  await p.locator('.today-continuation').getByRole('button',{name:new RegExp('Stadtteilversammlung')}).click();
  await p.getByRole('heading',{name:'Sprechbeleg 2 / 3'}).waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  // Shared catalog must retain all legacy G01-G13 navigation labels.
  const c=p.locator('article.panel').filter({has:p.getByRole('heading',{name:'Kasus und Flexion'})});
  await c.getByRole('button',{name:'Relativanschluss und Kasusautonomie'}).click();
  await p.getByRole('heading',{name:'Relativanschluss und Kasusautonomie',exact:true}).waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  console.log('PASS M36 source-exact M04/G12 continuation from Today/Curriculum/Progress/Archive, cross-tab navigation, reload and all-domain catalog '+width);
 }finally{await context.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
