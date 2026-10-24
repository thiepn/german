import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';

async function openPhraseology(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Phraseologie im Text · G07'}).click();
 await p.getByRole('heading',{name:'Phraseologie im Zusammenhang',exact:true}).waitFor();
 return p;
}
async function save(p,choice,rewrite,limit){
 await p.getByLabel('Bedeutung der Quellenaussage').selectOption(choice);
 await p.getByLabel('Formuliere die Quellenaussage eigenständig und präzise um').fill(rewrite);
 await p.getByLabel('Welche nicht belegte Zusage, Handlung oder Verantwortung würde die Alternative nahelegen?').fill(limit);
 await p.getByRole('button',{name:'Bedeutungsanalyse speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 let stale=null;
 try{
  const p=await openPhraseology(ctx);
  const first='Die Referentin stellte eine zusätzliche finanzielle Unterstützung lediglich als Möglichkeit dar; die Höhe des Zuschusses muss noch geprüft werden.';
  const why='Die Aussicht ist ausdrücklich keine verbindliche Förderzusage, weshalb das Budget noch keine gesicherten Mittel verbuchen darf.';
  assert.equal(await p.locator('.phraseology-paragraph').count(),3);
  assert.equal(await p.locator('.phraseology-before-after').count(),1);
  assert.equal(await p.getByRole('button',{name:'Bedeutungsanalyse speichern'}).isDisabled(),true);
  await p.getByLabel('Bedeutung der Quellenaussage').selectOption('A');
  await p.getByLabel('Formuliere die Quellenaussage eigenständig und präzise um').fill('Die Referentin stellte eine zusätzliche Förderung in Aussicht');
  await p.getByLabel('Welche nicht belegte Zusage, Handlung oder Verantwortung würde die Alternative nahelegen?').fill('Der Ausgangssatz wird unverändert kopiert.');
  assert.equal(await p.getByRole('button',{name:'Bedeutungsanalyse speichern'}).isDisabled(),true,'copying an exact source excerpt blocked');
  await p.getByLabel('Formuliere die Quellenaussage eigenständig und präzise um').fill(first);
  await p.getByLabel('Welche nicht belegte Zusage, Handlung oder Verantwortung würde die Alternative nahelegen?').fill(why);
  await p.getByRole('button',{name:'Bedeutungsanalyse speichern'}).click();
  await p.getByRole('heading',{name:'Kontextvergleich 2 / 3'}).waitFor();
  const details=p.locator('.phraseology-analysis details').first();
  await details.locator('summary').click();
  assert.match(await details.innerText(),/in Aussicht stellen/);
  if(width===1280){
   stale=await openPhraseology(ctx);
   await stale.getByRole('heading',{name:'Kontextvergleich 2 / 3'}).waitFor();
  }
  // An author-unpreferred option remains immutable ungraded learner evidence.
  await save(p,'A','Die Geschäftsstelle bestätigte den Eingang der Hinweise, ohne sich damit deren Einschätzung als eigene Meinung zuzuschreiben.','Kenntnisnahme beschreibt nur den Erhalt; eine vorbehaltlose Zustimmung zu den Hinweisen lässt sich daraus nicht herleiten.');
  await p.getByRole('heading',{name:'Kontextvergleich 3 / 3'}).waitFor();
  if(stale){
   await save(stale,'B','Die Geschäftsstelle erklärte die eingegangenen Hinweise nun zu ihrer eigenen Position und sprach sich ausdrücklich für die Argumente aus.','Dies wäre ein stärkerer inhaltlicher Standpunkt, der von einer schlichten Kenntnisnahme abweicht.');
   await stale.getByRole('alert').getByText(/Schreibversion wurde inzwischen verändert/).waitFor();
   await stale.getByRole('heading',{name:'Kontextvergleich 3 / 3'}).waitFor();
   await stale.close();
  }
  await save(p,'A','Die Gruppe erhob Einwände gegen die vorgesehene Abfolge der Termine und verlangte eine weitere gemeinsame Entscheidung.','Das Vorbringen von Bedenken beseitigt sie nicht; eine einvernehmliche Terminregelung existierte zu diesem Zeitpunkt noch nicht.');
  await p.getByRole('heading',{name:'Eigenständig formulieren'}).waitFor();
  assert.equal(await p.locator('.phraseology-analysis').count(),3);
  const text='Die Referentin stellte eine ergänzende Förderung in Aussicht, ohne eine verbindliche Summe zuzusagen. Die Geschäftsstelle nahm die Hinweise zur Kenntnis, billigte ihren Inhalt aber nicht. Die Projektgruppe meldete Vorbehalte gegen den Zeitplan an, die bei der nächsten Sitzung erst geprüft werden sollen.';
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p3');
  await p.getByLabel('Deine eigenständige Sachstandsmitteilung').fill(text);
  await p.getByLabel('Begründe die festen Wendungen, ihren Verbindlichkeitsgrad und mögliche Fehlinterpretationen').fill('Die erste Wendung ist eine Aussicht ohne Gewähr; die zweite bestätigt nur Kenntnisnahme, und das Anmelden von Vorbehalten dokumentiert offene Bedenken.');
  await p.getByRole('button',{name:'Eigenen Text speichern'}).click();
  await p.getByRole('heading',{name:'Eigenen Text überarbeiten'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
  await p.getByLabel('Deine eigenständige Sachstandsmitteilung').fill(text+' Eine endgültige Förderung und ein verbindlicher Termin sind damit ausdrücklich noch nicht beschlossen.');
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p2');
  await p.getByLabel('Begründe die festen Wendungen, ihren Verbindlichkeitsgrad und mögliche Fehlinterpretationen').fill('Die Revision grenzt ausdrücklich den Sachstand gegenüber einer Zusage und einer abgeschlossenen Terminentscheidung ab.');
  await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByText('Die Revision grenzt ausdrücklich den Sachstand gegenüber einer Zusage und einer abgeschlossenen Terminentscheidung ab.').waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Phraseologie im Zusammenhang · G07'}).waitFor();
  await p.getByText('1/6 Quellen begonnen',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.getByLabel('Textart').selectOption('G07_PHRASEOLOGY');
  await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderliche erste Bedeutungsanalyse'}).waitFor();
  await p.getByText(first,{exact:false}).first().waitFor();
  await p.getByText('Die Revision grenzt ausdrücklich den Sachstand gegenüber einer Zusage und einer abgeschlossenen Terminentscheidung ab.').waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Phraseologie im Zusammenhang',exact:true}).waitFor();
  await p.getByText(why,{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Kollokationen und Phraseologie'}).getByRole('button',{name:'Phraseologie im Zusammenhang'}).click();
  await p.getByText(first,{exact:false}).first().waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M17 G07 connected phraseology, commitments, ungraded choices, CAS stale tab, archive and reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
