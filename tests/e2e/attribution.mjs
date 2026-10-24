import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const study=JSON.parse(readFileSync('content/fixtures/g11-attribution.demo.json','utf8'))[0];
const paraphrases=[
'Die Projektkoordinatorin erklärte, dass ihre Untersuchung bisher nur Gebäude erfasse, bei denen ein technischer Anschluss überhaupt denkbar erscheine.',
'Die Mietendenvertretung macht nach eigener Aussage eine mögliche Unterstützung des Vorhabens von transparenten und nachvollziehbaren Betriebskosten abhängig.',
'Nach Darstellung des Ausschussvorsitzenden beschränkt sich der gegenwärtige Beschluss auf die Finanzierung der Vorprüfung und nicht auf den späteren Bau.'
];
const embedded=[
'Die Projektkoordinatorin zog eine deutliche methodische Grenze: „'+study.anchors[0].quote+'“ Damit ist eine allgemeine Anschlusszusage ausdrücklich nicht verbunden.',
'Die Mietendenvertretung stellte eine Bedingung für mögliche Zustimmung: „'+study.anchors[1].quote+'“ Daraus folgt kein gegenwärtiges Einverständnis mit der Planung.',
'Der Ausschussvorsitzende stellte vor der Abstimmung klar: „'+study.anchors[2].quote+'“ Die Entscheidung betrifft damit keinen verbindlichen Baubeginn.'
];
const limits=[
'Die Erhebung belegt weder die technische Erreichbarkeit sämtlicher Häuser noch eine bereits erteilte Genehmigung der geplanten Ausbaumaßnahmen.',
'Das Fehlen transparenter Betriebskosten bedeutet, dass bisher keine verbindliche Zustimmung des Interessenverbandes dokumentiert wurde.',
'Ein Auftrag zur Vorprüfung ersetzt weder einen Beschluss über den Bau noch eine verbindliche Entscheidung über die spätere Finanzierung des Betriebs.'
];
const draft='Der kommunale Prüfprozess zum geplanten Quartierswärmenetz befindet sich weiterhin in einer frühen Phase. Nach Darstellung der Projektkoordination wurden bislang lediglich technisch erreichbare Gebäude untersucht. Die Koordinatorin bezeichnete diese Einschränkung ausdrücklich mit den Worten „'+study.anchors[0].quote+'“ Daraus lässt sich keine Anschlusszusage für sämtliche Gebäude ableiten. Auch die Mietendenvertretung hat sich noch nicht abschließend festgelegt. Sie verlangt vor einer etwaigen Unterstützung nachvollziehbare Berechnungen zu den Betriebskosten und weist damit auf eine bisher ungelöste zentrale Frage hin. Der Haushaltsausschuss hat unterdessen ausschließlich Mittel zur weiteren Prüfung bewilligt. Ein gesonderter Beschluss über eine Errichtung oder Finanzierung des Betriebs liegt noch nicht vor. Die Aussagen der beteiligten Akteure betreffen also unterschiedliche Verfahrensschritte und dürfen in der öffentlichen Darstellung nicht als gemeinsame verbindliche Bauentscheidung zusammengefasst werden.';
const reason='Der Projektkoordination ordne ich den methodischen Zuschnitt der Erhebung zu, der Mietendenvertretung die Bedingung an eine mögliche Zustimmung und dem Haushaltsausschuss ausschließlich die Entscheidung über die Finanzierung weiterer Prüfung.';
async function open(ctx){
 const page=await ctx.newPage();await page.goto(origin,{waitUntil:'networkidle'});
 if(await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await page.getByRole('button',{name:'Quellen korrekt einbinden · G11'}).click();
 await page.getByRole('heading',{name:'Quellen korrekt einbinden',exact:true}).waitFor();
 return page;
}
async function fill(page,i,option){
 await page.locator('#attribution-choice').selectOption(option);
 await page.locator('#attribution-paraphrase').fill(paraphrases[i]);
 await page.locator('#attribution-embedded').fill(embedded[i]);
 await page.locator('#attribution-limit').fill(limits[i]);
 await page.getByRole('button',{name:'Beleg und Wiedergabe speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 try{
  const page=await open(ctx);assert.equal(await page.locator('.polysemy-paragraph').count(),3);
  assert.equal(await page.getByRole('button',{name:'Beleg und Wiedergabe speichern'}).isDisabled(),true);
  await page.locator('#attribution-choice').selectOption('A');
  await page.locator('#attribution-paraphrase').fill(paraphrases[0]);
  await page.locator('#attribution-embedded').fill(embedded[0].replace(study.anchors[0].quote,'Die Untersuchung schließt alle Häuser ein.'));
  await page.locator('#attribution-limit').fill(limits[0]);
  assert.equal(await page.getByRole('button',{name:'Beleg und Wiedergabe speichern'}).isDisabled(),true,'altered literal quote must be rejected');
  await page.locator('#attribution-embedded').fill(embedded[0]);
  await page.getByRole('button',{name:'Beleg und Wiedergabe speichern'}).click();
  await page.getByRole('heading',{name:'Quellenbeleg 2 / 3'}).waitFor();
  let stale=null;
  if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Quellenbeleg 2 / 3'}).waitFor();}
  await fill(page,1,'B');
  await page.getByRole('heading',{name:'Quellenbeleg 3 / 3'}).waitFor();
  if(stale){
   await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|Konflikt|gespeichert/i).waitFor();await stale.close();
  }
  await fill(page,2,'A');
  await page.getByRole('heading',{name:'Quellenbewussten Text verfassen'}).waitFor();
  await page.locator('#attribution-anchor').selectOption('q1');
  await page.locator('#attribution-draft').fill(draft);
  await page.locator('#attribution-reason').fill(reason);
  await page.getByRole('button',{name:'Eigenen Text speichern'}).click();
  await page.getByRole('heading',{name:'Eigenen Text überarbeiten'}).waitFor();
  await page.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  assert.equal(await page.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
  await page.locator('#attribution-anchor').selectOption('q3');
  await page.locator('#attribution-draft').fill(draft+' Vor einer Entscheidung über eine Errichtung muss daher eine gesonderte und überprüfbare Vorlage erstellt werden.');
  await page.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await page.getByRole('heading',{name:'Quellen korrekt einbinden · G11'}).waitFor();
  await page.getByText('1/4 Dokumente begonnen',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await page.locator('#archive-kind').selectOption('G11_ATTRIBUTION');
  await page.locator('.archive-entry').first().click();
  await page.getByRole('heading',{name:'Unveränderlicher erster Zitierbeleg'}).waitFor();
  await page.getByText(paraphrases[0],{exact:false}).first().waitFor();
  await page.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await page.getByRole('heading',{name:'Quellen korrekt einbinden',exact:true}).waitFor();
  await page.getByText(paraphrases[1],{exact:false}).first().waitFor();
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await page.locator('article').filter({hasText:'Schreiben und Überarbeiten'}).getByRole('button',{name:'Quellen korrekt einbinden'}).click();
  await page.getByText(paraphrases[0],{exact:false}).first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M22 original G11 attributed paraphrase, verbatim quote, CAS, independent text/rewrite, Archive/reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
