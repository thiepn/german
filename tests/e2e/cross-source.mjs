import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
async function open(ctx){
 const page=await ctx.newPage();await page.goto(origin,{waitUntil:'networkidle'});
 if(await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await page.getByRole('button',{name:'Quellenvergleich · G09'}).click();
 await page.getByRole('heading',{name:'Quellen gegeneinander lesen',exact:true}).waitFor();
 return page;
}
async function answer(p,choice,a,b,limit){
 await p.getByLabel('Gemeinsame Schlussfolgerung').selectOption(choice);
 await p.getByLabel('Quelle A eigenständig auswerten').fill(a);
 await p.getByLabel('Quelle B eigenständig auswerten').fill(b);
 await p.getByLabel('Welche Schlussfolgerung ist trotz beider Quellen nicht gesichert?').fill(limit);
 await p.getByRole('button',{name:'Quellenvergleich speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});let stale=null;
 try{
  const page=await open(ctx);
  assert.equal(await page.locator('.cross-document').count(),2);
  assert.equal(await page.locator('.polysemy-paragraph').count(),6);
  assert.equal(await page.getByRole('button',{name:'Quellenvergleich speichern'}).isDisabled(),true);
  const a1='Die betriebliche Studie beschreibt kürzere Wochenarbeitszeiten in nur vier freiwillig ausgewählten Teams und bietet keine repräsentativen Aussagen zum gesamten Unternehmen.';
  const b1='Die Befragung erfasst die subjektive Zufriedenheit einzelner Angestellter, aber nicht einmal alle eingeladenen Mitarbeitenden haben vollständig geantwortet.';
  const limit='Weder Stichprobe noch freiwilliger Rücklauf erlauben den Schluss, dass alle Beschäftigten gleichermaßen profitieren oder dass die Effekte außerhalb der vier Teams gelten.';
  await page.getByLabel('Gemeinsame Schlussfolgerung').selectOption('A');
  await page.getByLabel('Quelle A eigenständig auswerten').fill('Bei vier freiwillig teilnehmenden Softwareteams sank die erfasste Wochenarbeitszeit im Halbjahr um durchschnittlich vier Stunden.');
  await page.getByLabel('Quelle B eigenständig auswerten').fill(b1);
  await page.getByLabel('Welche Schlussfolgerung ist trotz beider Quellen nicht gesichert?').fill(limit);
  assert.equal(await page.getByRole('button',{name:'Quellenvergleich speichern'}).isDisabled(),true,'literal copying must fail');
  await page.getByLabel('Quelle A eigenständig auswerten').fill(a1);
  await page.getByRole('button',{name:'Quellenvergleich speichern'}).click();
  await page.getByRole('heading',{name:'Quellenvergleich 2 / 3'}).waitFor();
  if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Quellenvergleich 2 / 3'}).waitFor();}
  const a2='Im internen Piloten blieb die Anzahl dokumentierter Vorgänge weitgehend unverändert, obwohl diese Kennzahl weder Qualität noch persönliche Arbeitsbelastung direkt abbildet.';
  const b2='Die freiwillig antwortenden Beschäftigten berichten von stärkerer Konzentration und auch von einer Verdichtung einzelner Besprechungen vor Abgabeterminen.';
  const reason2='Ticketzahlen und erlebte Arbeitsintensität sind unterschiedliche Größen und widersprechen sich deshalb nicht automatisch; eine allgemeine Qualitätsverbesserung ist nicht belegt.';
  await answer(page,'B',a2,b2,reason2);
  await page.getByRole('heading',{name:'Quellenvergleich 3 / 3'}).waitFor();
  if(stale){
   await answer(stale,'A','Die Pilotstudie zeigt einen stabilen Arbeitsdurchsatz in einem begrenzten Versuch, nicht aber eindeutig erhöhte Qualität oder geringeren Stress in allen Teams.','Mehrere Befragte schildern divergierende Erfahrungen mit Konzentration und Zeitdruck, die nicht allein durch Ticketzahlen aufgelöst werden können.','Die unterschiedlichen Messmethoden erlauben keine sichere Aussage über die Leistung jedes Einzelnen oder eine widerspruchsfreie Entlastung.');
   await stale.getByRole('alert').getByText(/Schreibversion wurde inzwischen verändert/).waitFor();
   await stale.close();
  }
  await answer(page,'A','Der Bericht empfiehlt eine wissenschaftlich begleitete weitere Prüfung, bevor andere Abteilungen das Modell dauerhaft übernehmen können.','Die Befragten verlangen vor einer möglichen Übertragung auf den Support geregelte Vertretungsmechanismen und verlässliche Zuständigkeiten.','Beide Empfehlungen sind noch keine verbindliche Einführungsentscheidung; über konkrete Personal- und Kostenfolgen wurde nicht entschieden.');
  await page.getByRole('heading',{name:'Eigene Quellensynthese'}).waitFor();
  const draft='Die betriebliche Pilotstudie beschreibt bei vier freiwillig ausgewählten Teams eine Verringerung der Arbeitszeit bei überwiegend stabilem Ticketdurchsatz. Diese Kennzahl sagt jedoch weder etwas Sicheres über die Arbeitsqualität noch über die Belastung sämtlicher Beschäftigter aus. Die Befragung berichtet überwiegend positive Erfahrungen bei begrenztem Rücklauf, zugleich aber gegensätzliche Einschätzungen der Arbeitsintensität. Vor einer möglichen Übertragung verlangen beide Quellen weitere Prüfungen und klare organisatorische Voraussetzungen. Eine verbindliche Einführung im gesamten Unternehmen lässt sich aus diesen beiden Texten nicht ableiten.';
  const why='Quelle A dokumentiert betriebliche Prozesszahlen, Quelle B freiwillige persönliche Bewertungen. Die Auswahlverfahren, Beobachtungseinheiten und Messgrößen weichen voneinander ab und stützen deshalb nur eine begrenzte gemeinsame Schlussfolgerung.';
  await page.getByLabel('Ankerpaar für deine Schlussfolgerung').selectOption('c2');
  await page.getByLabel('Quellenübergreifende Synthese').fill(draft);
  await page.getByLabel('Begründe die Reichweite, Unterschiede und Grenzen beider Quellen').fill(why);
  await page.getByRole('button',{name:'Synthese speichern'}).click();
  await page.getByRole('heading',{name:'Synthese überarbeiten'}).waitFor();
  await page.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  assert.equal(await page.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
  await page.getByLabel('Ankerpaar für deine Schlussfolgerung').selectOption('c3');
  await page.getByLabel('Quellenübergreifende Synthese').fill(draft+' Deshalb sollten künftige Erprobungen getrennte Kennzahlen für Leistung, Qualität und Belastung vorsehen.');
  await page.getByLabel('Begründe die Reichweite, Unterschiede und Grenzen beider Quellen').fill('Die neue Formulierung konkretisiert notwendige weitere Messungen und legt keine Zustimmung der Unternehmensleitung nahe.');
  await page.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await page.getByRole('heading',{name:'Quellenvergleich · G09'}).waitFor();
  await page.getByText('1/4 Quellenpaare begonnen',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await page.getByLabel('Textart').selectOption('G09_CROSS_SOURCE');
  await page.locator('.archive-entry').first().click();
  await page.getByRole('heading',{name:'Unveränderlicher erster Quellenvergleich'}).waitFor();
  await page.getByText(a1,{exact:false}).first().waitFor();
  await page.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await page.getByRole('heading',{name:'Quellen gegeneinander lesen',exact:true}).waitFor();
  await page.getByText(b1,{exact:false}).first().waitFor();
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await page.locator('article').filter({hasText:'Lesen und Textkompetenz'}).getByRole('button',{name:'Quellen gegeneinander lesen'}).click();
  await page.getByText(a1,{exact:false}).first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M20 paired G09 cross-document reading, independent evidence, CAS, revision, Archive, reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
