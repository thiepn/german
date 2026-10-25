import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const statements=[
'Die Bewilligungsquote nahm zwischen den beiden Runden um fünf Prozentpunkte und damit relativ um ein Viertel gegenüber dem ursprünglichen Anteil zu.',
'Die positive Bewertung des Bescheids geht auf einhundertfünfunddreißig der tatsächlich beantworteten Fragebögen zurück, aber nicht auf die Gesamtheit der Förderberechtigten.',
'Der erfasste Anstieg der Erstanträge wird zum Teil durch die erstmals erfassten Bewerbungen eines weiteren Studiengangs hervorgerufen.'
];
const denominators=[
'Beide Antragsrunden beziehen sich auf jeweils eintausend förderfähige Anträge; die Bewilligungszahlen lagen zunächst bei zweihundert und danach bei zweihundertfünfzig.',
'Von dreihundert angeschriebenen Geförderten antworteten nur einhundertachtzig; die angeführte positive Quote bezieht sich auf die Antwortenden und nicht alle Förderberechtigten.',
'Der Vergleich stellt fünfhundert frühere Erstanträge und fünfhundertsechzig aktuell erfasste gegenüber, wobei fünfunddreißig aus einem neu aufgenommenen Studiengang stammen.'
];
const limits=[
'Der beobachtete Quotenanstieg beweist weder den Erfolg einer konkreten Regeländerung noch das Ausbleiben von Unterschieden bei der Zusammensetzung der beiden Gruppen.',
'Wegen des freiwilligen Rücklaufs lässt sich keine repräsentative Zustimmung aller geförderten oder sonst förderfähigen Menschen behaupten.',
'Der nicht identische Fächerzuschnitt verhindert eine belastbare Behauptung, in genau denselben Studiengängen seien die Erstanträge um den gesamten ausgewiesenen Anteil gestiegen.'
];
const report='Die aktuellen Unterlagen zur Studienförderung enthalten mehrere unterschiedliche Kennzahlen, die in der öffentlichen Darstellung klar voneinander getrennt werden sollten. In zwei jeweils eintausend förderfähige Anträge umfassenden Runden erhöhte sich der Anteil bewilligter Gesuche von zwanzig auf fünfundzwanzig Prozent. Dies entspricht einer Differenz von fünf Prozentpunkten beziehungsweise einer relativen Veränderung um fünfundzwanzig Prozent. Eine kausale Erklärung liefert die Statistik nicht. Für die Befragung zur Verständlichkeit gilt ein anderer Nenner: Nur einhundertachtzig der dreihundert angeschriebenen Geförderten antworteten. Unter diesen äußerten sich einhundertfünfunddreißig positiv. Damit kann keine repräsentative Aussage über sämtliche Berechtigten getroffen werden.\n\nDie Anzahl der Erstanträge nahm in der aktuellen Gesamtzählung von fünfhundert auf fünfhundertsechzig zu. Zugleich wurde aber ein neuer Studiengang in die Statistik aufgenommen, aus dem fünfunddreißig zusätzliche Anträge stammen. Ein Vergleich ohne diesen neuen Bereich führt daher zu einem geringeren Anstieg. Für zukünftige Veröffentlichungen empfiehlt sich, Prozentänderungen und Prozentpunktabstände eindeutig zu unterscheiden, die jeweiligen Bezugsgruppen anzugeben und Änderungen in der Erfassung transparent zu kennzeichnen. Nur so bleibt die Darstellung nachvollziehbar.';
const reason='Die Überarbeitung trennt die relative Quotensteigerung von der absoluten Prozentpunktdifferenz, berücksichtigt die begrenzte Antwortgruppe und erkennt die geänderte Zahl erfasster Studiengänge als Einschränkung des Zeitvergleichs an.';
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Zahlen präzise ausdrücken · G09'}).click();
 await p.getByRole('heading',{name:'Zahlen präzise ausdrücken',exact:true}).waitFor();return p;
}
async function fill(p,i,choice){
 await p.locator('#numeric-choice').selectOption(choice);
 await p.locator('#numeric-statement').fill(statements[i]);
 await p.locator('#numeric-denominator').fill(denominators[i]);
 await p.locator('#numeric-limit').fill(limits[i]);
 await p.getByRole('button',{name:'Zahlenbeleg speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 try{
 const p=await open(ctx);assert.equal(await p.locator('.polysemy-paragraph').count(),3);assert.equal(await p.getByRole('button',{name:'Zahlenbeleg speichern'}).isDisabled(),true);
 await p.locator('#numeric-choice').selectOption('A');
 await p.locator('#numeric-statement').fill(statements[0]);
 await p.locator('#numeric-denominator').fill(statements[0]);
 await p.locator('#numeric-limit').fill(limits[0]);
 assert.equal(await p.getByRole('button',{name:'Zahlenbeleg speichern'}).isDisabled(),true,'duplicate denominator blocked');
 await p.locator('#numeric-denominator').fill(denominators[0]);await p.getByRole('button',{name:'Zahlenbeleg speichern'}).click();
 await p.getByRole('heading',{name:'Zahlenbeleg 2 / 3'}).waitFor();
 let stale=null;if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Zahlenbeleg 2 / 3'}).waitFor();}
 await fill(p,1,'B');await p.getByRole('heading',{name:'Zahlenbeleg 3 / 3'}).waitFor();
 if(stale){await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|Konflikt|gespeichert/i).waitFor();await stale.close();}
 await fill(p,2,'A');await p.getByRole('heading',{name:'Eigenen Zahlenbericht schreiben'}).waitFor();
 await p.locator('#numeric-anchor').selectOption('n1');await p.locator('#numeric-report').fill(report);await p.locator('#numeric-reason').fill(reason);
 await p.getByRole('button',{name:'Zahlenbericht speichern'}).click();
 await p.getByRole('heading',{name:'Bericht überarbeiten'}).waitFor();
 await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
 await p.locator('#numeric-anchor').selectOption('n3');await p.locator('#numeric-report').fill(report+' Künftige Darstellungen sollten außerdem den jeweiligen Zeitpunkt und die angewandten Auswahlkriterien explizit ausweisen.');
 await p.locator('#numeric-reason').fill('Die Revision ergänzt den Vergleichszeitraum und die veränderten Auswahlkriterien, ohne die Bezugsgruppen erneut zu vermischen oder eine nicht nachgewiesene Wirkung zu behaupten.');
 await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
 await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
 await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
 await p.getByRole('heading',{name:'Zahlen präzise ausdrücken · G09'}).waitFor();await p.getByText('1/4 Quellen begonnen',{exact:false}).waitFor();
 await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();await p.locator('#archive-kind').selectOption('G09_NUMERIC');await p.locator('.archive-entry').first().click();
 await p.getByRole('heading',{name:'Unveränderlicher erster Zahlenbeleg'}).waitFor();await p.getByText(statements[0],{exact:false}).first().waitFor();
 await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();await p.getByRole('heading',{name:'Zahlen präzise ausdrücken',exact:true}).waitFor();
 await p.getByText(statements[1],{exact:false}).first().waitFor();
 await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
 await p.locator('article').filter({hasText:'Lesen und Textkompetenz'}).getByRole('button',{name:'Zahlen präzise ausdrücken'}).click();
 await p.getByText(statements[0],{exact:false}).first().waitFor();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
 console.log('PASS M25 G09 quantitative precision, denominators, CAS, independent briefing, revision, Archive/reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
