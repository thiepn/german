import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const reports=[
 "Die Koordinatorin kündigte am 3. März 2025 an, dass ihre Arbeitsgruppe den Antrag am 4. März am Empfang des Stadtteilzentrums Lindenfeld einreichen werde.",
 "Die Koordinatorin erklärte am 3. März 2025, dass die nächste Beratung am 12. März 2025 im Nebenbau West stattfinden solle.",
 "Die Beiratsvorsitzende erklärte der angerufenen Vertreterin am 6. März 2025, dass sie dieser die Unterlagen am 5. März zugesandt habe."
];
const misreadings=[
 "Ein späterer Bericht könnte morgen fälschlich als Tag nach seiner Veröffentlichung im April verstehen und hier auf die Leserin des Berichts beziehen.",
 "Eine falsche Auslegung könnte dort als Empfang des Hauptgebäudes und nächste Woche relativ zum späteren Veröffentlichungsdatum auffassen.",
 "Eine Weiterleitung könnte das Wort ich der späteren Verfasserin und Ihnen sämtlichen Empfängern der Rundmail zuordnen, obwohl das Telefonat einen anderen Rahmen hatte."
];
const origines=[
 "Die Äußerung fiel am 3. März 2025 am Empfang des Stadtteilzentrums Lindenfeld. Die Koordinatorin sprach für die antragstellende Arbeitsgruppe und meinte mit hier diesen Empfang.",
 "Die Koordinatorin stand am 3. März am Empfang, zeigte jedoch auf den reservierten Nebenbau West; das Buchungsprotokoll nennt Mittwoch, den 12. März, als Beratungstermin.",
 "Im Telefonat vom 6. März 2025 sprach die Beiratsvorsitzende mit einer bestimmten Anwohnervertreterin. Der Versandvermerk dokumentiert die Sendung vom 5. März."
];
const boundaries=[
 "Die Äußerung ist kein neues Versprechen für eine Abgabe im April und bezeichnet nicht das Büro einer anderen Person, die den Bericht später liest.",
 "Aus der später kopierten Äußerung folgt weder eine Beratung im Hauptgebäude noch eine neue Einladung für eine Kalenderwoche nach der digitalen Veröffentlichung.",
 "Der Satz belegt keine zusätzliche Zusendung durch die spätere Rundmail-Absenderin und keine Adressierung sämtlicher Empfängerinnen im Verteiler."
];
const memo="Für den Jahresbericht des fiktiven Stadtteilzentrums müssen drei Äußerungen an den ursprünglichen Sprechort und das ursprüngliche Datum gebunden werden. Am Montag, dem 3. März 2025, erklärte eine Koordinatorin am Empfang des Zentrums, ihre Arbeitsgruppe werde den Antrag am folgenden Tag, dem 4. März, dort abgeben. Das Wort morgen kann nicht auf den Erscheinungstag des späteren Jahresberichts im April bezogen werden. Ebenso wenig bezeichnet das Wort wir sämtliche Personen, die den Bericht später lesen. Die zweite Erklärung derselben Koordinatorin betraf eine Beratung am 12. März im Nebenbau West. Obwohl sie am Empfang stand, war mit dort gerade nicht dieses Hauptgebäude, sondern der gesondert reservierte Nebenbau gemeint.\n\nIn einer dritten Äußerung teilte die Vorsitzende des Stadtteilbeirats am 6. März einer Anwohnervertreterin mit, sie habe ihr die Unterlagen am Vortag, dem 5. März, geschickt. Die deiktischen Pronomen ich und Ihnen beziehen sich auf die Beteiligten dieses Telefonats und dürfen nicht auf die Verfasserin oder Empfänger einer späteren Rundmail übertragen werden. Ein quellengetreuer Bericht benennt daher an jeder Stelle die ursprünglichen Sprecher, Empfänger, Orte und datierten Ereignisse. Die schriftliche Übertragung in ein anderes Publikum erfordert eine neue Formulierung der Indexwörter, nicht eine stillschweigende Verschiebung des historischen Nullpunkts.";
const reason="Ich habe Sprecherrollen, ursprüngliche Datumsangaben und den Ortswechsel zum Nebenbau explizit aufgelöst. Die neue Darstellung vermeidet die irreführende Annahme, relative Zeitangaben und Personalpronomen bezögen sich auf den späteren Jahresbericht.";
const revised="Für den Jahresbericht des fiktiven Stadtteilzentrums müssen drei Äußerungen an den ursprünglichen Sprechort und das ursprüngliche Datum gebunden werden. Am Montag, dem 3. März 2025, erklärte eine Koordinatorin am Empfang des Zentrums, ihre Arbeitsgruppe werde den Antrag am folgenden Tag, dem 4. März, dort abgeben. Das Wort morgen kann nicht auf den Erscheinungstag des späteren Jahresberichts im April bezogen werden. Ebenso wenig bezeichnet das Wort wir sämtliche Personen, die den Bericht später lesen. Die zweite Erklärung derselben Koordinatorin betraf eine Beratung am 12. März im Nebenbau West. Obwohl sie am Empfang stand, war mit dort gerade nicht dieses Hauptgebäude, sondern der gesondert reservierte Nebenbau gemeint.\n\nIn einer dritten Äußerung teilte die Vorsitzende des Stadtteilbeirats am 6. März einer Anwohnervertreterin mit, sie habe ihr die Unterlagen am Vortag, dem 5. März, geschickt. Die deiktischen Pronomen ich und Ihnen beziehen sich auf die Beteiligten dieses Telefonats und dürfen nicht auf die Verfasserin oder Empfänger einer späteren Rundmail übertragen werden. Ein quellengetreuer Bericht benennt daher an jeder Stelle die ursprünglichen Sprecher, Empfänger, Orte und datierten Ereignisse. Die schriftliche Übertragung in ein anderes Publikum erfordert eine neue Formulierung der Indexwörter, nicht eine stillschweigende Verschiebung des historischen Nullpunkts.\n\nFür eine öffentliche Informationsseite würde ich zusätzlich einen Hinweis voranstellen, dass es sich ausschließlich um Vorgänge aus dem März 2025 handelt. In der Besucherfassung werden alle institutionellen Gruppen zuerst namentlich eingeführt, Empfang und Nebenbau West ausdrücklich unterschieden und der Versand an die eine Vertreterin klar abgegrenzt. Dadurch entsteht weder eine neue Einladung noch eine zusätzliche, unbelegte Dokumentenübermittlung.";
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Deiktische Zentren und Perspektivwechsel · G01'}).click();
 await p.getByRole('heading',{name:'Deiktische Zentren und Perspektivwechsel',exact:true}).waitFor();return p;
}
async function fill(p,i,choice){
 await p.locator('#deixis-choice').selectOption(choice);
 await p.locator('#deixis-report').fill(reports[i]);
 await p.locator('#deixis-misreading').fill(misreadings[i]);
 await p.locator('#deixis-origo').fill(origines[i]);
 await p.locator('#deixis-boundary').fill(boundaries[i]);
 await p.getByRole('button',{name:'Deixisbeleg speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow',acceptDownloads:true});
 const target=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow',acceptDownloads:true});
 try{
  const p=await open(ctx);
  assert.equal(await p.locator('.polysemy-paragraph').count(),3);
  assert.equal(await p.getByRole('button',{name:'Deixisbeleg speichern'}).isDisabled(),true);
  await p.locator('#deixis-choice').selectOption('A');
  await p.locator('#deixis-report').fill(reports[0]);
  await p.locator('#deixis-misreading').fill(reports[0]);
  await p.locator('#deixis-origo').fill(origines[0]);
  await p.locator('#deixis-boundary').fill(boundaries[0]);
  assert.equal(await p.getByRole('button',{name:'Deixisbeleg speichern'}).isDisabled(),true,'duplicate independent fields prevented');
  await p.locator('#deixis-misreading').fill(misreadings[0]);await p.getByRole('button',{name:'Deixisbeleg speichern'}).click();
  await p.getByRole('heading',{name:'Deixisbeleg 2 / 3'}).waitFor();
  let stale=null;if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Deixisbeleg 2 / 3'}).waitFor();}
  await fill(p,1,'B');await p.getByRole('heading',{name:'Deixisbeleg 3 / 3'}).waitFor();
  if(stale){await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|gespeichert/i).waitFor();await stale.close();}
  await fill(p,2,'A');await p.getByRole('heading',{name:'Eigenständigen Perspektivbericht schreiben'}).waitFor();
  await p.locator('#deixis-anchor').selectOption('d1');await p.locator('#deixis-memo').fill(memo);await p.locator('#deixis-reason').fill(reason);
  await p.getByRole('button',{name:'Perspektivbericht speichern'}).click();
  await p.getByRole('heading',{name:'Adressatengerechte Revision'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  await p.locator('#deixis-anchor').selectOption('d3');await p.locator('#deixis-reason').fill(reason);
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true,'unchanged revision blocked');
  await p.locator('#deixis-memo').fill(revised);await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Deiktische Zentren und Perspektivwechsel · G01'}).waitFor();
  await p.getByText('1/4 Quellen begonnen',{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.locator('#archive-kind').selectOption('G01_DEIXIS');await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderlicher erster Deixisbeleg'}).waitFor();
  await p.getByText(reports[0],{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Deiktische Zentren und Perspektivwechsel',exact:true}).waitFor();
  await p.getByText(reports[1],{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Artikel und Genus'}).getByRole('button',{name:'Deiktische Zentren und Perspektivwechsel'}).click();
  await p.getByText(reports[0],{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Daten & Sicherung'}).click();
  const dl=p.waitForEvent('download');await p.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
  const raw=await readFile(await (await dl).path(),'utf8'),obj=JSON.parse(raw);
  assert.equal(obj.version,3);assert.equal(obj.records.productionEntries.length,1);
  assert.equal(obj.records.productionEntries[0].kind,'DEIXIS_STUDY');
  assert.equal(obj.records.productionEntries[0].revisions.length,4);
  assert.ok(obj.records.productionEntries[0].original.includes(reports[0]));
  const b=await target.newPage();await b.goto(origin,{waitUntil:'networkidle'});
  if(await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await b.getByRole('button',{name:'Daten & Sicherung'}).click();
  await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'sprachgefuehl-backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await b.getByText('Integrität bestätigt',{exact:false}).waitFor();
  await b.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
  await b.getByText('Import abgeschlossen:',{exact:false}).waitFor();
  await b.reload({waitUntil:'networkidle'});await b.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await b.locator('article').filter({hasText:'Artikel und Genus'}).getByRole('button',{name:'Deiktische Zentren und Perspektivwechsel'}).click();
  await b.getByText('öffentliche Kurzmitteilung',{exact:false}).first().waitFor();
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M31 G01 deixis choices, independent rewriting, stale-tab CAS, revisions, Archive and backup v3 '+width);
 }finally{await ctx.close();await target.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
