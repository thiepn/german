import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const origin='http://127.0.0.1:4173/';
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Haltung und Schlussfolgerung · G08'}).click();
 await p.getByRole('heading',{name:'Haltung und Schlussfolgerung im Text',exact:true}).waitFor();
 return p;
}
async function answer(p,choice,rewrite,why){
 await p.getByLabel('Durch den Text gestützte Lesart').selectOption(choice);
 await p.getByLabel('Rekonstruiere Aussage und Einschränkung in eigenen Sätzen').fill(rewrite);
 await p.getByLabel('Welche stärkere Schlussfolgerung ist nicht gedeckt, und warum?').fill(why);
 await p.getByRole('button',{name:'Deutung und Rekonstruktion speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880}});
 try{
  const p=await open(ctx);
  const first='Die gemessenen niedrigeren Temperaturen in grüneren Straßenzügen legen einen Zusammenhang nahe, der bei fehlenden Vergleichswerten noch nicht als allgemein kausal gesichert gelten darf.';
  const why='Die Stichprobe betrifft bestimmte Straßentypen, während andere städtische Räume noch nicht untersucht wurden; die Ursache bleibt daher offen.';
  assert.equal(await p.locator('.polysemy-paragraph').count(),3);
  assert.equal(await p.getByRole('button',{name:'Deutung und Rekonstruktion speichern'}).isDisabled(),true);
  await p.getByLabel('Durch den Text gestützte Lesart').selectOption('A');
  await p.getByLabel('Rekonstruiere Aussage und Einschränkung in eigenen Sätzen').fill('Die Messreihe deutet auf eine geringere nächtliche Wärmebelastung in den begrünten Straßenzügen hin.');
  await p.getByLabel('Welche stärkere Schlussfolgerung ist nicht gedeckt, und warum?').fill(why);
  assert.equal(await p.getByRole('button',{name:'Deutung und Rekonstruktion speichern'}).isDisabled(),true,'literal copy must fail');
  await p.getByLabel('Rekonstruiere Aussage und Einschränkung in eigenen Sätzen').fill(first);
  await p.getByRole('button',{name:'Deutung und Rekonstruktion speichern'}).click();
  await p.getByRole('heading',{name:'Schlussfolgerung 2 / 3'}).waitFor();
  let stale=null;
  if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Schlussfolgerung 2 / 3'}).waitFor();}
  await answer(p,'B','Die Autorinnen stellen gerade keine kausale Erklärung sicher, weil parallel Verkehrsänderungen und Sensorwartungen stattgefunden haben.','Die Behauptung einer eindeutigen Ursache ist durch die Befunde ausdrücklich nicht gedeckt und würde diese Unsicherheiten unterschlagen.');
  await p.getByRole('heading',{name:'Schlussfolgerung 3 / 3'}).waitFor();
  if(stale){
   await answer(stale,'A','Der Bericht beschreibt eine eindeutige Ursache, ohne an der technischen Dokumentation weitere Fragen zu stellen.','Die technischen Umstände lassen die Ursache tatsächlich noch offen, sodass eine sichere Zuschreibung nicht möglich ist.');
   await stale.getByRole('alert').getByText(/Schreibversion wurde inzwischen verändert/).waitFor();
   await stale.close();
  }
  await answer(p,'A','Das Forschungsteam empfiehlt eine vertiefende Vergleichsstudie, doch die zuständige Stelle muss über eine mögliche Finanzierung erst noch entscheiden.','Die Formulierung wäre sinnvoll drückt lediglich eine Empfehlung aus; eine bewilligte Förderung wird an keiner Stelle dokumentiert.');
  await p.getByRole('heading',{name:'Eigenständig formulieren'}).waitFor();
  const writing='Die vorhandenen Messungen deuten auf eine niedrigere nächtliche Wärmebelastung in begrünten Straßenzügen hin. Eine eindeutige Kausalzuordnung ist jedoch noch nicht möglich, zumal andere Einflüsse und fehlende Vergleichswerte bestehen. Das Stadtklimalabor empfiehlt eine kontrollierte Folgestudie, über deren Finanzierung eine andere Stelle entscheiden muss.';
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p2');
  await p.getByLabel('Deine Stellungnahme für die Zielgruppe').fill(writing);
  await p.getByLabel('Begründe Positionierung, Nachweisgrenzen und ausgeschlossene Folgerungen').fill('Ein Hinweis ist kein Kausalnachweis; zudem darf eine fachliche Empfehlung nicht in eine bereits zugesagte Förderentscheidung umgedeutet werden.');
  await p.getByRole('button',{name:'Eigenen Text speichern'}).click();
  await p.getByRole('heading',{name:'Eigenen Text überarbeiten'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
  await p.getByLabel('Deine Stellungnahme für die Zielgruppe').fill(writing+' Für ein methodisch belastbares Urteil sind weitere Vergleichswerte erforderlich.');
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p3');
  await p.getByLabel('Begründe Positionierung, Nachweisgrenzen und ausgeschlossene Folgerungen').fill('Die zusätzliche Aussage betrifft die Grenzen des Datensatzes und fügt keine nicht belegte Mittelbewilligung hinzu.');
  await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Haltung und Schlussfolgerung · G08'}).waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.getByLabel('Textart').selectOption('G08_STANCE');
  await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderliche erste Haltungsanalyse'}).waitFor();
  await p.getByText(first,{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Haltung und Schlussfolgerung im Text',exact:true}).waitFor();
  await p.getByText(why,{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Stil, Register und Pragmatik'}).getByRole('button',{name:'Haltung und Schlussfolgerung im Text'}).click();
  await p.getByText(first,{exact:false}).first().waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M19 G08 original context, independent stance, rejected copy, multi-tab CAS, transfer, versioned archive and reload '+width);
 }finally{await ctx.close();}
}
try{await run(1280);await run(360)}finally{await browser.close()}
