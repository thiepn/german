import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const interpretations=[
 'Der Satz räumt eine höhere Nutzung des Museumsportals ein, obwohl die Objektsuche trotz dieser positiven Entwicklung weiter schwierig geblieben ist. Die beiden Tatsachen schließen einander nicht aus.',
 'Die ausstehenden Bildrechte sind der ausdrücklich angeführte Grund für die verzögerte Freigabe; der technische Import war nach dem Bericht längst abgeschlossen.',
 'Eine weitere Veröffentlichung wird nur unter geklärten Rechten als Möglichkeit beschrieben. Dadurch werden keine bestimmte Frist und keine automatische Freigabe aller Bilder versprochen.'
];
const alternatives=[
 'Eine fälschliche Kausalparaphrase würde behaupten, die steigenden Seitenaufrufe hätten die Schwierigkeiten bei der Suche verursacht; diese Wirkung wird gerade nicht belegt.',
 'Als falsche Ursache-Folge-Richtung könnte man schreiben, die Verzögerung der Freigabe habe erst die ungeklärten Bildrechte hervorgerufen.',
 'Eine unzutreffende Bedingungslesart würde alle Bilder schon jetzt für unbedingt veröffentlichbar erklären und zusätzlich eine sofortige Verpflichtung behaupten.'
];
const contexts=[
 'Die Statistik verzeichnet steigende Seitenaufrufe, während ein getrennter Nutzertest ausdrücklich belegt, dass Besucherinnen bestimmte Objekte nur über Umwege fanden. Die Berichte betreffen unterschiedliche Größen.',
 'Für historische Fotografien musste die rechtliche Verwendung gesondert dokumentiert werden, obwohl der technische Import bereits fertig war. Die noch ungeklärte Rechteprüfung verursachte damit die Verzögerung.',
 'Die Leitung plante einzelne Freigabeentscheidungen für getrennte Bildgruppen. Eine Rechteklärung konnte diese ermöglichen, während sonstige organisatorische Arbeiten anschließend noch ausstehen durften.'
];
const boundaries=[
 'Daraus folgt weder ein ursächlicher Einfluss der höheren Seitenaufrufe auf die schwierige Suche noch die Behauptung, die Suche sei bei sämtlichen Objekten bereits leicht geworden.',
 'Die kausale Begründung ist keine Terminankündigung und erlaubt keinen Schluss, dass sämtliche anderen Fotografien ohne Ausnahme unbefristet gesperrt wären.',
 'Aus sofern und kann folgt nicht, dass sämtliche Bestände ohne zusätzliche Prüfung automatisch veröffentlicht werden müssen oder schon jetzt freigegeben sind.'
];
const memo='Das fiktive Stadtmuseum muss in seiner öffentlichen Kommunikation drei verschiedene sprachliche Beziehungen bewahren. Die steigenden Seitenaufrufe sind eine positive Entwicklung, die jedoch die weiterhin schwierige Suche nach bestimmten Objekten nicht beseitigt hat. Mit obwohl wird gerade dieser Gegensatz zur naheliegenden Erwartung ausgedrückt. Eine hohe Reichweite kann neben einem Zugangsproblem bestehen, ohne dass die eine Beobachtung die andere verursacht. Die Berichte über die Bildfreigabe enthalten dagegen eine ausdrückliche kausale Verbindung. Weil mehrere Bildrechte ungeklärt waren, verzögerte sich die Freigabe, obwohl der technische Import bereits abgeschlossen war. Das Museum sollte den rechtlichen Grund nennen, ohne daraus ein unbefristetes Verbot oder eine bestimmte spätere Frist abzuleiten.\n\nEin weiterer Satz betrifft einen konditionalen Rahmen für künftig mögliche Freischaltungen. Sofern die Rechte geklärt werden, können einzelne Bildgruppen freigegeben werden. Der Satz garantiert nicht, dass diese Freigabe unmittelbar und ohne organisatorische Prüfung erfolgen muss. Für eine Besucherinformation sollte die Redaktion daher klar zwischen der eingeräumten positiven Reichweite, einer tatsächlich genannten Ursache für die Verzögerung und einer rechtlich bedingten Möglichkeit der späteren Veröffentlichung unterscheiden. Diese Aussagen haben unterschiedliche logische Richtungen und dürfen nicht aus sprachlicher Bequemlichkeit in Zusagen oder Ursachen umgeschrieben werden.';
const reason='Ich habe die konzessive Einräumung von der ausdrücklich begründeten Verzögerung und der konditionalen Freigabemöglichkeit getrennt. Für das fachfremde Publikum bleibt die Ursache-Folge-Richtung sichtbar und es entsteht kein unbelegtes Versprechen.';
const revision=memo+'\n\nFür Besucherinnen und Besucher wird die eigentliche Suchfunktion in einem eigenen Satz erläutert. Dabei vermeide ich jede unbelegte Erfolgsmeldung und kündige keine bestimmte Frist an. Ein eventuell später erscheinender Katalogabschnitt bleibt von seiner einzelnen Rechteklärung und gesonderten organisatorischen Prüfung abhängig. Diese Umschreibung unterscheidet Zugänglichkeit, Rechtssituation und den weiterhin offenen Zeitpunkt ohne zusätzliche Tatsachenbehauptungen.';
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Konnektoren und Relationslogik · G04'}).click();
 await p.getByRole('heading',{name:'Konnektoren und Relationslogik',exact:true}).waitFor();
 return p;
}
async function fill(p,i,choice){
 await p.locator('#relation-choice').selectOption(choice);
 await p.locator('#relation-rewrite').fill(interpretations[i]);
 await p.locator('#relation-alternative').fill(alternatives[i]);
 await p.locator('#relation-context').fill(contexts[i]);
 await p.locator('#relation-boundary').fill(boundaries[i]);
 await p.getByRole('button',{name:'Relationsbeleg speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow',acceptDownloads:true});
 const target=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow',acceptDownloads:true});
 try{
  const p=await open(ctx);
  assert.equal(await p.locator('.polysemy-paragraph').count(),3);
  assert.equal(await p.getByRole('button',{name:'Relationsbeleg speichern'}).isDisabled(),true);
  await p.locator('#relation-choice').selectOption('A');
  await p.locator('#relation-rewrite').fill(interpretations[0]);
  await p.locator('#relation-alternative').fill(interpretations[0]);
  await p.locator('#relation-context').fill(contexts[0]);
  await p.locator('#relation-boundary').fill(boundaries[0]);
  assert.equal(await p.getByRole('button',{name:'Relationsbeleg speichern'}).isDisabled(),true,'duplicate independent reading blocked');
  await p.locator('#relation-alternative').fill(alternatives[0]);
  await p.getByRole('button',{name:'Relationsbeleg speichern'}).click();
  await p.getByRole('heading',{name:'Relationsbeleg 2 / 3'}).waitFor();
  let stale=null;if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Relationsbeleg 2 / 3'}).waitFor();}
  await fill(p,1,'B');await p.getByRole('heading',{name:'Relationsbeleg 3 / 3'}).waitFor();
  if(stale){await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|gespeichert/i).waitFor();await stale.close();}
  await fill(p,2,'A');await p.getByRole('heading',{name:'Eigenständigen Relationsvermerk schreiben'}).waitFor();
  await p.locator('#relation-anchor').selectOption('r1');await p.locator('#relation-memo').fill(memo);await p.locator('#relation-reason').fill(reason);
  await p.getByRole('button',{name:'Relationsvermerk speichern'}).click();
  await p.getByRole('heading',{name:'Adressatengerechte Revision'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  await p.locator('#relation-anchor').selectOption('r3');await p.locator('#relation-reason').fill(reason);
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true,'identical rewrite blocked');
  await p.locator('#relation-memo').fill(revision);await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Konnektoren und Relationslogik · G04'}).waitFor();
  await p.getByText('1/4 Quellen begonnen',{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.locator('#archive-kind').selectOption('G04_RELATION');await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderlicher erster Relationsbeleg'}).waitFor();
  await p.getByText(interpretations[0],{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Konnektoren und Relationslogik',exact:true}).waitFor();
  await p.getByText(interpretations[1],{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Syntax und Informationsstruktur'}).getByRole('button',{name:'Konnektoren und Relationslogik'}).click();
  await p.getByText(interpretations[0],{exact:false}).first().waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Daten & Sicherung'}).click();
  const dl=p.waitForEvent('download');await p.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
  const raw=await readFile(await (await dl).path(),'utf8'),obj=JSON.parse(raw);
  assert.equal(obj.version,3);assert.equal(obj.records.productionEntries.length,1);
  assert.equal(obj.records.productionEntries[0].kind,'RELATION_STUDY');
  assert.equal(obj.records.productionEntries[0].revisions.length,4);
  assert.ok(obj.records.productionEntries[0].original.includes(interpretations[0]));
  const b=await target.newPage();await b.goto(origin,{waitUntil:'networkidle'});
  if(await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await b.getByRole('button',{name:'Daten & Sicherung'}).click();
  await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'sprachgefuehl-backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await b.getByText('Integrität bestätigt',{exact:false}).waitFor();
  await b.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
  await b.getByText('Import abgeschlossen:',{exact:false}).waitFor();
  await b.reload({waitUntil:'networkidle'});await b.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await b.locator('article').filter({hasText:'Syntax und Informationsstruktur'}).getByRole('button',{name:'Konnektoren und Relationslogik'}).click();
  await b.getByText('Besucherinnen und Besucher',{exact:false}).first().waitFor();
  assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M32 G04 connector relations, independent explanations, stale-tab CAS, revision, Archive, backup v3 and reload '+width);
 }finally{await ctx.close();await target.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
