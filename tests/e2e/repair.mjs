import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const questions=[
'Ist Freitag ein verbindlicher Liefertermin oder ein nur bei rechtzeitig abgeschlossener Rechtsprüfung erreichbares Datum ohne bisher bestätigte Zusage?',
'Meinen Sie eine positive Ersteinschätzung des dargestellten Schemas oder haben Sie alle Datenflüsse, Löschfristen und Berechtigungen bereits formal genehmigt?',
'Wurde nur die Vorbereitung einer Befassung im nächsten Gremium zugesagt, oder gibt es bereits eine förmliche Bewilligung zusätzlicher Mittel?'
];
const replies=[
'Wir vermerken den Freitag nur als mögliche Zielmarke und fordern eine ausdrückliche Bestätigung, sobald die Prüfung abgeschlossen ist; vorher gehen wir nicht von einer Lieferung aus.',
'Wir behandeln den Hinweis als vorläufige Orientierung und warten für den produktiven Betrieb die vollständige Prüfung und ausdrückliche dokumentierte Freigabe ab.',
'Wir stellen eine Kostenübersicht zusammen und bereiten die Gremienberatung vor, ohne vor dessen späterer Entscheidung eine Finanzierung als gesichert darzustellen.'
];
const limits=[
'Der Termin ist abhängig von einer noch nicht abgeschlossenen Rechtsprüfung; eine Lieferzusage kann erst nach einer gesonderten Bestätigung dokumentiert werden.',
'Die erste Einschätzung ersetzt keine formale Rechtsfreigabe und bestätigt weder alle Datenflüsse noch die erlaubte Verarbeitung realer Informationen.',
'Die Finanzierung ist noch nicht bewilligt und die Aufnahme in eine Sitzung begründet keine Ausgabebefugnis für die zusätzliche Nutzerstudie.'
];
const summary='Im heutigen Abstimmungsgespräch wurden drei noch offene Fragen zur nächsten Projektphase geklärt beziehungsweise für weitere Prüfungen vorgemerkt. Die Projektpartnerin bezeichnete eine Lieferung des Datensatzes bis Freitag lediglich als unter Voraussetzungen möglich. Der Termin hängt von einer noch nicht abgeschlossenen Rechtsprüfung ab und ist daher nicht als Zusage zu behandeln. Der Datenschutzbeauftragte äußerte auf Grundlage einer schematischen Darstellung zunächst keine grundsätzlichen Einwände, prüfte jedoch weder die vollständigen Datenflüsse noch die Löschfristen verbindlich. Eine formale Freigabe bleibt damit offen. Die Fakultätsvertretung schlug schließlich vor, die Finanzierung einer zusätzlichen Nutzerstudie im nächsten zuständigen Gremium anzusprechen. Hierfür ist eine Kostenübersicht vorzubereiten. Ein Haushaltsbeschluss wurde in der heutigen Sitzung nicht getroffen. Für die weitere Kommunikation sollten diese drei Sachverhalte als mögliche Lieferung, vorläufige Einschätzung und vorgeschlagene Beratung getrennt dokumentiert werden.';
const reason='Eine im Konjunktiv formulierte Lieferung ist kein fester Termin; die zunächst positive Sichtung ist keine formale Rechtsfreigabe; die vorgeschlagene Gremienbefassung ist kein Finanzbeschluss. Diese drei Grenzen müssen ausdrücklich erkennbar bleiben.';
async function open(ctx){
 const page=await ctx.newPage();await page.goto(origin,{waitUntil:'networkidle'});
 if(await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await page.getByRole('button',{name:'Missverständnisse klären · G12'}).click();
 await page.getByRole('heading',{name:'Missverständnisse klären',exact:true}).waitFor();
 return page;
}
async function fill(page,i,choice){
 await page.locator('#repair-choice').selectOption(choice);
 await page.locator('#repair-question').fill(questions[i]);
 await page.locator('#repair-reply').fill(replies[i]);
 await page.locator('#repair-open').fill(limits[i]);
 await page.getByRole('button',{name:'Klärung dokumentieren'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 try{
 const page=await open(ctx);assert.equal(await page.locator('.polysemy-paragraph').count(),3);
 assert.equal(await page.getByRole('button',{name:'Klärung dokumentieren'}).isDisabled(),true);
 await page.locator('#repair-choice').selectOption('A');
 await page.locator('#repair-question').fill('Die Datensatzlieferung ist noch nicht verbindlich zugesagt.');
 await page.locator('#repair-reply').fill(replies[0]);
 await page.locator('#repair-open').fill(limits[0]);
 assert.equal(await page.getByRole('button',{name:'Klärung dokumentieren'}).isDisabled(),true,'clarification must be a question');
 await page.locator('#repair-question').fill(questions[0]);
 await page.getByRole('button',{name:'Klärung dokumentieren'}).click();
 await page.getByRole('heading',{name:'Klärung 2 / 3'}).waitFor();
 let stale=null;
 if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Klärung 2 / 3'}).waitFor();}
 await fill(page,1,'B');await page.getByRole('heading',{name:'Klärung 3 / 3'}).waitFor();
 if(stale){
  await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|Konflikt|gespeichert/i).waitFor();await stale.close();
 }
 await fill(page,2,'A');await page.getByRole('heading',{name:'Neutralen Ergebnisvermerk verfassen'}).waitFor();
 await page.locator('#repair-anchor').selectOption('r1');
 await page.locator('#repair-draft').fill(summary);
 await page.locator('#repair-reason').fill(reason);
 await page.getByRole('button',{name:'Ergebnisnotiz speichern'}).click();
 await page.getByRole('heading',{name:'Ergebnisnotiz überarbeiten'}).waitFor();
 await page.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
 assert.equal(await page.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
 await page.locator('#repair-anchor').selectOption('r3');
 await page.locator('#repair-draft').fill(summary+' Zur Nachverfolgung sollen verantwortliche Personen und spätere bestätigte Fristen gesondert eingetragen werden.');
 await page.locator('#repair-reason').fill('Die Revision ergänzt eine nachprüfbare Nachverfolgung offener Fragen und behauptet weiterhin weder Freigabe noch Liefergarantie oder Bewilligung.');
 await page.getByRole('button',{name:'Überarbeitung speichern'}).click();
 await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
 await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
 await page.getByRole('heading',{name:'Missverständnisse klären · G12'}).waitFor();
 await page.getByText('1/4 Gesprächskontexte',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Schreibspuren ansehen'}).click();
 await page.locator('#archive-kind').selectOption('G12_REPAIR');
 await page.locator('.archive-entry').first().click();
 await page.getByRole('heading',{name:'Unveränderliche erste Klärungsfrage'}).waitFor();
 await page.getByText(questions[0],{exact:false}).first().waitFor();
 await page.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
 await page.getByRole('heading',{name:'Missverständnisse klären',exact:true}).waitFor();
 await page.getByText(questions[1],{exact:false}).first().waitFor();
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Lernen',exact:true}).first().click();
 await page.locator('article').filter({hasText:'Sprechen und Interaktion'}).getByRole('button',{name:'Missverständnisse klären'}).click();
 await page.getByText(questions[0],{exact:false}).first().waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal overflow');
 console.log('PASS M23 G12 source-quoted ambiguity, clarifying questions, conditional replies, CAS, neutral summary, revision, Archive/reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
