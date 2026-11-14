import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const statements=[
'Die Geschäftsstelle bestätigte am Montag ausschließlich den Eingang der Dokumente und nicht ihre inhaltliche oder rechtliche Freigabe zur Veröffentlichung.',
'Am Dienstag konnte nur der inhaltliche Teil abgeschlossen werden; ohne einen zusätzlichen Rechtevermerk darf die eigentlich geplante Freigaberunde nicht beginnen.',
'Die für Donnerstag vorgesehene Entscheidung wurde wegen eines weiterhin fehlenden Nachweises vertagt und darf deshalb nicht als bereits erteilte Erlaubnis dargestellt werden.'
];
const prerequisites=[
'Der am Montag dokumentierte Zeitpunkt eröffnet zwei getrennte Prüfphasen, die beide abgeschlossen sein müssen, bevor die zuständige Stelle eine Freigabe erteilen kann.',
'Vor einer Entscheidung müssen die fachliche und die rechtliche Prüfung jeweils vollständig dokumentiert sein; ein vorbereiteter Text ersetzt den Rechtsvermerk nicht.',
'Zuerst muss der offene Nachweis eingehen, dann ist eine weitere Sitzung anzusetzen und erst danach kann eine verbindliche Veröffentlichung entschieden werden.'
];
const limits=[
'Der ursprünglich vorgesehene Freitag war ein möglicher Termin ohne Zusage und die bloße technische Eingangsbestätigung begründet keine Freigabe.',
'Der Entwurf einer Pressemitteilung darf vor dem rechtmäßigen Abschluss der Gremienentscheidung nicht als öffentliche Nachricht verschickt werden.',
'Eine vertagte Entscheidung ist keine rückwirkende Genehmigung; für den kommenden Sitzungstag gibt es noch keinen bestätigten Termin.'
];
const report='Am Montag hat das Forschungsarchiv eine technische Eingangsbestätigung für die eingereichten Projektunterlagen ausgestellt. Der Eingang dokumentiert nur die Annahme der Dateien und bedeutet noch keine inhaltliche oder rechtliche Freigabe. Die im Begleitschreiben erwähnte Veröffentlichung am Freitag war daher eine Planung, keine bereits erteilte Genehmigung. Am Dienstag beendete die zuständige Fachabteilung einen Teil ihrer Prüfung; die Rechteprüfung blieb allerdings am Mittwoch wegen eines ausstehenden Nachweises unvollständig. Nach der internen Verfahrensanweisung darf eine Freigaberunde erst beginnen, wenn beide Prüfvermerke vollständig vorliegen. Ein vorab entworfener Pressetext ändert daran nichts.\n\nDie für Donnerstag geplante Sitzung war deshalb kein abschließender Freigabebeschluss. Stattdessen wurde die Entscheidung ausdrücklich vertagt, ohne dass bislang ein neuer verbindlicher Sitzungstag bestimmt ist. Das Projektteam darf intern bereits überprüfte Metadaten überarbeiten, doch eine externe Veröffentlichung bleibt bis zur getrennten Freigabe ausgeschlossen. Für eine verlässliche Statusmeldung sind in dieser Reihenfolge der offene Rechtevermerk, die erneute Freigaberunde und gegebenenfalls erst danach ein bestätigter Veröffentlichungstermin zu benennen.';
const reason='Ich habe zwischen dem technischen Eingang und einer tatsächlichen Freigabe unterschieden, die notwendige Abfolge beider Prüfvermerke erläutert und eine lediglich angekündigte Sitzung nicht zu einer bereits beschlossenen Veröffentlichung umgedeutet.';
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Verfahrensfolgen präzise darstellen · G09'}).click();
 await p.getByRole('heading',{name:'Verfahrensfolgen präzise darstellen',exact:true}).waitFor();return p;
}
async function fill(p,i,choice){
 await p.locator('#chronology-choice').selectOption(choice);
 await p.locator('#chronology-statement').fill(statements[i]);
 await p.locator('#chronology-denominator').fill(prerequisites[i]);
 await p.locator('#chronology-limit').fill(limits[i]);
 await p.getByRole('button',{name:'Verfahrensbeleg speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 try{
 const p=await open(ctx);assert.equal(await p.locator('.polysemy-paragraph').count(),3);
 assert.equal(await p.getByRole('button',{name:'Verfahrensbeleg speichern'}).isDisabled(),true);
 await p.locator('#chronology-choice').selectOption('A');
 await p.locator('#chronology-statement').fill(statements[0]);await p.locator('#chronology-denominator').fill(statements[0]);await p.locator('#chronology-limit').fill(limits[0]);
 assert.equal(await p.getByRole('button',{name:'Verfahrensbeleg speichern'}).isDisabled(),true,'duplicate precondition rejected');
 await p.locator('#chronology-denominator').fill(prerequisites[0]);await p.getByRole('button',{name:'Verfahrensbeleg speichern'}).click();
 await p.getByRole('heading',{name:'Verfahrensbeleg 2 / 3'}).waitFor();
 let stale=null;if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Verfahrensbeleg 2 / 3'}).waitFor();}
 await fill(p,1,'B');await p.getByRole('heading',{name:'Verfahrensbeleg 3 / 3'}).waitFor();
 if(stale){await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|Konflikt|gespeichert/i).waitFor();await stale.close();}
 await fill(p,2,'A');await p.getByRole('heading',{name:'Eigenen Statusvermerk schreiben'}).waitFor();
 await p.locator('#chronology-anchor').selectOption('t1');await p.locator('#chronology-report').fill(report);await p.locator('#chronology-reason').fill(reason);
 await p.getByRole('button',{name:'Statusvermerk speichern'}).click();
 await p.getByRole('heading',{name:'Bericht überarbeiten'}).waitFor();
 await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
 await p.locator('#chronology-anchor').selectOption('t3');await p.locator('#chronology-report').fill(report+' Die nächste Sitzung ist noch nicht terminiert und darf nicht als gesichert angekündigt werden.');
 await p.locator('#chronology-reason').fill('Meine Revision trennt den erwarteten Termin der erneuten Sitzung ausdrücklich von einem tatsächlich feststehenden Zeitpunkt und bleibt beim ursprünglichen Verfahrensstand.');
 await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
 await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
 await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
 await p.getByRole('heading',{name:'Verfahrensfolgen präzise darstellen · G09'}).waitFor();await p.getByText('1/4 Quellen begonnen',{exact:false}).waitFor();
 await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();await p.locator('#archive-kind').selectOption('G09_CHRONOLOGY');await p.locator('.archive-entry').first().click();
 await p.getByRole('heading',{name:'Unveränderliche erste Verfahrensanalyse'}).waitFor();await p.getByText(statements[0],{exact:false}).first().waitFor();
 await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();await p.getByRole('heading',{name:'Verfahrensfolgen präzise darstellen',exact:true}).waitFor();
 await p.getByText(statements[1],{exact:false}).first().waitFor();
 await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
 await p.locator('article').filter({hasText:'Lesen und Textkompetenz'}).getByRole('button',{name:'Verfahrensfolgen präzise darstellen'}).click();
 await p.getByText(statements[0],{exact:false}).first().waitFor();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
 console.log('PASS M27 G09 literal chronological source, conditional decisions, CAS, independent status memo, revision Archive/reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
