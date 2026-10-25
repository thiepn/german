import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const a=['Die Verwaltung hat bislang nur angeregt, die Standorte neu zu ordnen und Bestände zusammenzuführen. Ein verbindlicher Ratsbeschluss über die Schließung liegt deshalb noch nicht vor.',
'Die Verwaltung erwägt vorbehaltlich einer gesonderten Haushaltsentscheidung eine auf zwei Nachmittage begrenzte Erweiterung des Angebots des mobilen Bücherbusses.',
'Der Rat kann erst nach abgeschlossener Beteiligung und positiver Prüfung der Barrierefreiheit frühestens im kommenden Frühjahr über das Standortnetz entscheiden.'];
const b=['Die zunächst lediglich vorgeschlagene Neuordnung und Bestandszusammenführung ist noch keine verbindlich durch den Rat beschlossene Schließung.',
'Die nur bei künftiger Haushaltsbewilligung denkbare Bücherbuserweiterung ist auf zwei Nachmittage nach der derzeitigen Planung beschränkt.',
'Die mögliche Ratsentscheidung im Frühjahr setzt eine abgeschlossene Beteiligung und eine positiv geprüfte Barrierefreiheit zwingend voraus.'];
const limits=['Die Stadt darf die geplante Bestandszusammenlegung nicht als bereits beschlossene Schließung darstellen, weil die Zustimmung der zuständigen Gremien noch aussteht.',
'Eine künftige Haushaltsentscheidung ist ausdrücklich erforderlich und bislang nicht erteilt; auch der angebotene Zeitumfang bleibt eine Planung.',
'Beide Voraussetzungen sind noch offen, und selbst danach kann der Rat entscheiden; der Termin ist lediglich der frühestmögliche Zeitpunkt.'];
const formal='Die geplante Neuordnung des Bibliotheksnetzes befindet sich im Stadium eines Verwaltungsvorschlags. Die Zusammenlegung von Beständen ist bislang nicht beschlossen worden. Eine ergänzende Erweiterung des Bücherbusangebots wäre von einer gesonderten Haushaltsentscheidung abhängig. Die mögliche Ratsbefassung im Frühjahr setzt die abgeschlossene Beteiligung betroffener Einrichtungen sowie eine positive Prüfung der Barrierefreiheit voraus. Die geltenden Öffnungszeiten bleiben bis zu einer tatsächlichen Ratsentscheidung bestehen.';
const publicText='Die kleine Stadtteilbibliothek ist noch nicht geschlossen. Die Stadt prüft erst, ob sie ihre Bestände an einen anderen Standort bringen sollte. Der Bücherbus könnte an zwei Nachmittagen zusätzlich kommen, aber das Geld dafür muss noch bewilligt werden. Außerdem sollen sich Schulen und betroffene Menschen äußern können. Es wird geprüft, ob alle den neuen Standort gut erreichen könnten. Frühestens im Frühjahr darf dann der Rat entscheiden.';
const why='In beiden Versionen sind der Vorschlagsstatus, die noch fehlende Finanzierung und die ausdrücklichen Bedingungen für eine spätere Entscheidung genannt. Die allgemein verständliche Fassung ersetzt schwer verständliche Nominalgruppen, ändert aber keine Zuständigkeit oder Gewissheit.';
async function open(context){
 const page=await context.newPage();await page.goto(origin,{waitUntil:'networkidle'});
 if(await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await page.getByRole('button',{name:'Satzverdichtung · G04'}).click();
 await page.getByRole('heading',{name:'Satzverdichtung und Explikation',exact:true}).waitFor();
 return page;
}
async function fill(p,i,choice){
 await p.getByLabel('Semantisch angemessene Explikation').selectOption(choice);
 await p.locator('#compression-expanded').fill(a[i]);
 await p.locator('#compression-compact').fill(b[i]);
 await p.locator('#compression-risk').fill(limits[i]);
 await p.getByRole('button',{name:'Beide Satzfassungen speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 try{
  const page=await open(ctx);
  assert.equal(await page.locator('.polysemy-paragraph').count(),3);
  assert.equal(await page.getByRole('button',{name:'Beide Satzfassungen speichern'}).isDisabled(),true);
  await page.getByLabel('Semantisch angemessene Explikation').selectOption('A');
  await page.locator('#compression-expanded').fill('Im Zuge der zum Jahresende vorgesehenen Neuordnung der Bibliotheksstandorte ist eine Zusammenlegung der Bestände des kleinsten Stadtteilhauses mit dem zentralen Medienzentrum vorgeschlagen worden.');
  await page.locator('#compression-compact').fill(b[0]);
  await page.locator('#compression-risk').fill(limits[0]);
  assert.equal(await page.getByRole('button',{name:'Beide Satzfassungen speichern'}).isDisabled(),true,'must reject literal source copying');
  await page.locator('#compression-expanded').fill(a[0]);
  await page.getByRole('button',{name:'Beide Satzfassungen speichern'}).click();
  await page.getByRole('heading',{name:'Satztransformation 2 / 3'}).waitFor();
  let other;
  if(width===1280){other=await open(ctx);await other.getByRole('heading',{name:'Satztransformation 2 / 3'}).waitFor();}
  await fill(page,1,'B');await page.getByRole('heading',{name:'Satztransformation 3 / 3'}).waitFor();
  if(other){
   await fill(other,1,'B');
   await other.getByRole('alert').getByText(/inzwischen|verändert|konflikt|gespeichert/i).waitFor();
   await other.close();
  }
  await fill(page,2,'A');
  await page.getByRole('heading',{name:'Zwei Zieltexte verfassen'}).waitFor();
  await page.getByLabel('Quellenabsatz als Anker').selectOption('p2');
  await page.getByLabel('Formal präzise Fassung').fill(formal);
  await page.getByLabel('Verständliche öffentliche Fassung').fill(publicText);
  await page.locator('#compression-reason').fill(why);
  await page.getByRole('button',{name:'Beide Zieltexte speichern'}).click();
  await page.getByRole('heading',{name:'Zieltexte überarbeiten'}).waitFor();
  await page.getByRole('button',{name:'Letzte Fassungen übernehmen'}).click();
  assert.equal(await page.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
  await page.getByLabel('Quellenabsatz als Anker').selectOption('p3');
  await page.getByLabel('Formal präzise Fassung').fill(formal+' Dies gilt ausdrücklich bis zur Entscheidung des Rates.');
  await page.locator('#compression-reason').fill('Die ergänzte Aussage präzisiert die Geltungsdauer des unveränderten Betriebs und verändert weder die rechtliche Zuständigkeit noch den Vorbehalt.');
  await page.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await page.getByRole('heading',{name:'Satzverdichtung und Explikation · G04'}).waitFor();
  await page.getByText('1/4 Fälle begonnen',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await page.locator('#archive-kind').selectOption('G04_COMPRESSION');
  await page.locator('.archive-entry').first().click();
  await page.getByRole('heading',{name:'Unveränderliche erste Satztransformation'}).waitFor();
  await page.getByText(a[0],{exact:false}).first().waitFor();
  await page.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await page.getByRole('heading',{name:'Satzverdichtung und Explikation',exact:true}).waitFor();
  await page.getByText(a[1],{exact:false}).first().waitFor();
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await page.locator('article').filter({hasText:'Syntax und Informationsstruktur'}).getByRole('button',{name:'Satzverdichtung und Explikation'}).click();
  await page.getByText(a[0],{exact:false}).first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M21 original G04 syntax decomposition, independent recompression, CAS, dual audience revisions, archive and reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
