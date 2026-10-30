import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const rewrites=[
 'Die Gutachterin verwendete das Objektiv an ihrer eigenen Kamera, als sie die Technikerin auf der Baustelle für das Protokoll fotografierte.',
 'Der Ausschuss besprach schon im November die für den kommenden Frühling geplante Sanierung der Sporthalle und trennte Beratung von Ausführung.',
 'Die Verwaltung versandte jene Unterlagen der Sachverständigen, die bereits vor dem Versand handschriftlich gekennzeichnet und in den Ordner gelegt worden waren.'
];
const alternatives=[
 'In einer anderen grammatischen Anbindung hätte die Technikerin selbst das Teleobjektiv mit sich geführt, statt dass es Werkzeug der Gutachterin wäre.',
 'Als Alternative könnte der Satz besagen, die Sitzung des Ausschusses habe im Frühjahr stattgefunden, nicht die Sanierung.',
 'Eine instrumentale Lesart würde nahelegen, die Verwaltung habe während des Versands erst Markierungen angefertigt oder diese als Mittel benutzt.'
];
const contexts=[
 'Der erste Quellenabsatz schildert ausdrücklich die Entnahme des Objektivs aus dem Koffer und seine Befestigung an der Kamera der Gutachterin, während die Technikerin einen Messstab hält.',
 'Die Niederschrift nennt November für die tatsächlich durchgeführte Sitzung sowie März und April für die künftige Baumaßnahme. Das stützt eindeutig die nominale Zeitzuordnung.',
 'Das Versandregister und der vorher gefüllte Ordner dokumentieren, dass die Sachverständigen die Druckexemplare schon vor der Versendung handschriftlich markiert hatten.'
];
const boundaries=[
 'Es gibt im Bericht keinen Beleg dafür, dass die Technikerin das Objektiv trug, eine Aufnahme erstellte oder ein eigenes Kameragerät für die Dokumentation benutzte.',
 'Aus der Formulierung folgt nicht, dass der Ausschuss erst im Frühjahr tagte oder dass die Beratung im November abgesagt worden wäre.',
 'Nicht belegt ist eine zusätzlich von der Verwaltung vorgenommene Kennzeichnung beim Versand; die Annotationen gehörten schon zu den Unterlagen.'
];
const memo='Der fiktive Verwaltungsbericht enthält drei Sätze, bei denen eine Präpositionalgruppe an verschiedene Satzbestandteile anschließen könnte. Zur fotografischen Dokumentation ist der entscheidende Sachverhalt, dass die Gutachterin selbst ein Teleobjektiv auf ihre Kamera setzte. Die fotografierte Technikerin führte lediglich einen Messstab mit sich. Eine eindeutige Darstellung nennt deshalb die Kamera der Gutachterin zuerst und bezeichnet das Objektiv als Werkzeug der Aufnahme. Der Satz darf der fotografierten Person kein zusätzliches Gerät zuschreiben, das sie nach der Quelle nicht bei sich hatte.\\n\\nFür die Beratung über die Sporthalle sind zwei Zeitpunkte auseinanderzuhalten. Die Sitzung fand bereits im November statt, der geplante Zeitraum der Bauarbeiten liegt im Frühjahr. Eine ungeprüfte Anbindung von im Frühjahr an das Verb würde die Sitzung falsch datieren. Bei den versandten Unterlagen sind dagegen die vorhandenen handschriftlichen Markierungen das relevante Merkmal. Die Verwaltung schickte annotierte Exemplare an die vorgesehenen Stellen. Ein zusätzlicher Arbeitsschritt zur Herstellung der Markierungen während des Versands wird nicht behauptet. Die präzisierte Fassung erhält alle drei Sachverhalte, unterscheidet Rollen und Ereignisse und vermeidet jede unbelegte Zuschreibung.';
const reason='In meiner Fassung werden Teleobjektiv, Sanierungszeit und Dokumentmarkierungen jeweils dem durch die Quelle gestützten Satzglied zugeordnet. Die alternative Lesart wird ausdrücklich ausgeschlossen, ohne den vorliegenden Fakten neue Arbeitsschritte hinzuzufügen.';
const revised=memo+'\n\nFür eine öffentliche Kurzmitteilung erläutere ich die Geräteverwendung ausdrücklich in einem eigenen Satz. Zusätzlich wird der bereits belegte Sitzungsmonat November genannt und der spätere Bauzeitraum als Planung gekennzeichnet. Das Versandgut besteht aus schon gekennzeichneten Unterlagen, nicht aus neu bearbeiteten Dokumenten. Diese Ergänzung wahrt die Unterschiede zwischen Person, Zeitpunkt und Gegenstand auch für Leser ohne Aktenkenntnis.';
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Präpositionalanbindung und Mehrdeutigkeit · G03'}).click();
 await p.getByRole('heading',{name:'Präpositionalanbindung und Mehrdeutigkeit',exact:true}).waitFor();return p;
}
async function fill(p,i,choice){
 await p.locator('#attachment-choice').selectOption(choice);
 await p.locator('#attachment-rewrite').fill(rewrites[i]);
 await p.locator('#attachment-alternative').fill(alternatives[i]);
 await p.locator('#attachment-context').fill(contexts[i]);
 await p.locator('#attachment-boundary').fill(boundaries[i]);
 await p.getByRole('button',{name:'Anbindungsbeleg speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow',acceptDownloads:true});
 const target=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow',acceptDownloads:true});
 try{
  const p=await open(ctx);
  assert.equal(await p.locator('.polysemy-paragraph').count(),3);
  assert.equal(await p.getByRole('button',{name:'Anbindungsbeleg speichern'}).isDisabled(),true);
  await p.locator('#attachment-choice').selectOption('A');
  await p.locator('#attachment-rewrite').fill(rewrites[0]);
  await p.locator('#attachment-alternative').fill(rewrites[0]);
  await p.locator('#attachment-context').fill(contexts[0]);
  await p.locator('#attachment-boundary').fill(boundaries[0]);
  assert.equal(await p.getByRole('button',{name:'Anbindungsbeleg speichern'}).isDisabled(),true,'duplicate independent fields prevented');
  await p.locator('#attachment-alternative').fill(alternatives[0]);await p.getByRole('button',{name:'Anbindungsbeleg speichern'}).click();
  await p.getByRole('heading',{name:'Anbindungsbeleg 2 / 3'}).waitFor();
  let stale=null;if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Anbindungsbeleg 2 / 3'}).waitFor();}
  await fill(p,1,'B');await p.getByRole('heading',{name:'Anbindungsbeleg 3 / 3'}).waitFor();
  if(stale){await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|gespeichert/i).waitFor();await stale.close();}
  await fill(p,2,'B');await p.getByRole('heading',{name:'Eigenständigen Anbindungsvermerk schreiben'}).waitFor();
  await p.locator('#attachment-anchor').selectOption('a1');await p.locator('#attachment-memo').fill(memo);await p.locator('#attachment-reason').fill(reason);
  await p.getByRole('button',{name:'Anbindungsvermerk speichern'}).click();
  await p.getByRole('heading',{name:'Adressatengerechte Revision'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  await p.locator('#attachment-anchor').selectOption('a3');await p.locator('#attachment-reason').fill(reason);
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true,'unchanged revision blocked');
  await p.locator('#attachment-memo').fill(revised);await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Präpositionalanbindung und Mehrdeutigkeit · G03'}).waitFor();
  await p.getByText('1/4 Quellen begonnen',{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.locator('#archive-kind').selectOption('G03_ATTACHMENT');await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderlicher erster Anbindungsbeleg'}).waitFor();
  await p.getByText(rewrites[0],{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Präpositionalanbindung und Mehrdeutigkeit',exact:true}).waitFor();
  await p.getByText(rewrites[1],{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Rektion und Präpositionen'}).getByRole('button',{name:'Präpositionalanbindung und Mehrdeutigkeit'}).click();
  await p.getByText(rewrites[0],{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Daten & Sicherung'}).click();
  const dl=p.waitForEvent('download');await p.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
  const raw=await readFile(await (await dl).path(),'utf8'),obj=JSON.parse(raw);
  assert.equal(obj.version,3);assert.equal(obj.records.productionEntries.length,1);
  assert.equal(obj.records.productionEntries[0].kind,'ATTACHMENT_STUDY');
  assert.equal(obj.records.productionEntries[0].revisions.length,4);
  assert.ok(obj.records.productionEntries[0].original.includes(rewrites[0]));
  const b=await target.newPage();await b.goto(origin,{waitUntil:'networkidle'});
  if(await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await b.getByRole('button',{name:'Daten & Sicherung'}).click();
  await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'sprachgefuehl-backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await b.getByText('Integrität bestätigt',{exact:false}).waitFor();
  await b.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
  await b.getByText('Import abgeschlossen:',{exact:false}).waitFor();
  await b.reload({waitUntil:'networkidle'});await b.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await b.locator('article').filter({hasText:'Rektion und Präpositionen'}).getByRole('button',{name:'Präpositionalanbindung und Mehrdeutigkeit'}).click();
  await b.getByText('öffentliche Kurzmitteilung',{exact:false}).first().waitFor();
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M31 G03 attachment choices, independent rewriting, stale-tab CAS, revisions, Archive and backup v3 '+width);
 }finally{await ctx.close();await target.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
