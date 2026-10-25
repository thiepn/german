import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4173/',browser=await chromium.launch({headless:true});
const rewrite=[
'Eine schriftliche Anfechtung von Prüfungsentscheidungen muss innerhalb von vier Wochen ab Zustellung eingehen; eine Bestätigung ihres Eingangs ist noch keine Entscheidung über den Einspruch.',
'Die Einsicht in Prüfungsakten wird durch die zuständige Verwaltung terminiert und in einer geschützten Umgebung gewährt, ohne die individuellen Umstände öffentlich darstellen zu müssen.',
'Das Ergebnis eines Einspruchs wird erst nach gesonderter inhaltlicher Prüfung bekanntgegeben; derzeit ist dafür kein verbindlicher Termin oder Ausgang zugesagt.'
];
const actions=[
'Die Verwaltung soll zunächst den schriftlichen Eingang und den Fristbeginn dokumentieren und eine getrennte Sachprüfung anschließen.',
'Zur geschützten Einsicht sollen Berechtigung und Termin mit der zuständigen Prüfungsverwaltung abgestimmt werden.',
'Die Stelle dokumentiert den fortbestehenden Prüfstatus und benachrichtigt erst nach Abschluss der inhaltlichen Prüfung.'
];
const omit=[
'Eine nicht öffentliche persönliche Bearbeitungsnummer ist für den allgemein zugänglichen Fristenhinweis nicht erforderlich und bleibt geschützt.',
'Eine interne Raumbezeichnung und individuelle Lebensumstände werden weggelassen, damit nur der erforderliche geschützte Terminweg erklärt wird.',
'Interne Nummern eines noch offenen Einzelfalls werden nicht veröffentlicht, weil sie die allgemeine Entscheidungslage nicht erklären.'
];
const publicText='Wer gegen eine Prüfungsentscheidung schriftlich Einspruch einlegen möchte, muss die Eingabe innerhalb von vier Wochen nach Zustellung an die zuständige Prüfungsverwaltung richten. Dort wird zunächst der Eingang bestätigt. Diese Bestätigung sagt nichts darüber aus, ob die angefochtene Entscheidung später geändert wird. Wer Akteneinsicht benötigt, kann dafür über die Prüfungsverwaltung einen Termin in einem geschützten Raum vereinbaren. Persönliche Begründungen und andere private Umstände müssen hierzu nicht allgemein veröffentlicht werden.\n\nDie inhaltliche Prüfung erfolgt getrennt vom Eingang des Einspruchs. Über ihr Ergebnis informiert die zuständige Stelle erst nach Abschluss der Bearbeitung. Ein verbindlicher Zeitpunkt ist derzeit nicht festgelegt. Für Einzelfragen sollte ausschließlich der vorgesehene Kontaktweg genutzt werden. Die veröffentlichten Informationen enthalten deshalb nur Fristen, den Zugang zur Akteneinsicht und den Hinweis auf das noch offene Ergebnis.';
const internalText='Die interne Koordination führt die schriftliche Eingangsprüfung, die geschützte Akteneinsicht und die anschließende Sachentscheidung als getrennte Schritte. Zunächst wird die Vierwochenfrist nach dem Zustellungszeitpunkt geprüft und der Eingang nachvollziehbar registriert. Diese Bestätigung darf nicht als bereits erteilte Stattgabe ausgegeben werden. Falls Akteneinsicht beantragt wird, sind die Berechtigung zu klären und ein geschützter Raum über die Prüfungsverwaltung zu reservieren. Eine allgemeine Mitteilung benötigt keine individuellen Lebensumstände.\n\nDie Sachprüfung ist erst dann abgeschlossen, wenn ein überprüfbares Ergebnis vorliegt. Erst danach soll die Mitteilung über den autorisierten Kontaktweg erfolgen. Da kein Datum zugesagt ist, darf die Koordination keinen festen Termin erfinden. Persönliche Angaben werden ausschließlich innerhalb des dafür vorgesehenen Bearbeitungskontexts genutzt und nicht in eine allgemeine Information übernommen.';
const rationale='Die öffentliche Version nennt Frist, Zugang und offene Sachprüfung; die interne Version ordnet Arbeitsschritte zu. Beide lassen unnötige Kennungen aus und machen weder eine Entscheidung noch eine vorzeitige Freigabe geltend.';
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Informationen gezielt vermitteln · G13'}).click();
 await p.getByRole('heading',{name:'Informationen gezielt vermitteln',exact:true}).waitFor();return p;
}
async function fill(p,i,option){
 await p.locator('#disclosure-choice').selectOption(option);
 await p.locator('#disclosure-rewrite').fill(rewrite[i]);
 await p.locator('#disclosure-action').fill(actions[i]);
 await p.locator('#disclosure-omission').fill(omit[i]);
 await p.getByRole('button',{name:'Übertragung speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 try{
 const p=await open(ctx);assert.equal(await p.locator('.polysemy-paragraph').count(),3);assert.equal(await p.getByRole('button',{name:'Übertragung speichern'}).isDisabled(),true);
 await p.locator('#disclosure-choice').selectOption('A');
 await p.locator('#disclosure-rewrite').fill(rewrite[0]+' PX-7316');
 await p.locator('#disclosure-action').fill(actions[0]);await p.locator('#disclosure-omission').fill(omit[0]);
 assert.equal(await p.getByRole('button',{name:'Übertragung speichern'}).isDisabled(),true,'private synthetic identifier must be blocked');
 await p.locator('#disclosure-rewrite').fill(rewrite[0]);await p.getByRole('button',{name:'Übertragung speichern'}).click();
 await p.getByRole('heading',{name:'Information 2 / 3'}).waitFor();
 let stale=null;if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Information 2 / 3'}).waitFor();}
 await fill(p,1,'B');await p.getByRole('heading',{name:'Information 3 / 3'}).waitFor();
 if(stale){await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|Konflikt|gespeichert/i).waitFor();await stale.close();}
 await fill(p,2,'A');await p.getByRole('heading',{name:'Für zwei Adressaten schreiben'}).waitFor();
 await p.locator('#disclosure-text-PUBLIC').fill(publicText+' PX-7316');await p.locator('#disclosure-why-PUBLIC').fill(rationale);
 assert.equal(await p.getByRole('button',{name:'Fassung speichern'}).first().isDisabled(),true);
 await p.locator('#disclosure-text-PUBLIC').fill(publicText);await p.getByRole('button',{name:'Fassung speichern'}).first().click();
 const pub=p.locator('article.polysemy-writing').filter({has:p.getByRole('heading',{name:'Öffentliche FAQ'})}).first();
 await pub.getByRole('button',{name:'Überarbeitung speichern'}).waitFor();
 await p.locator('#disclosure-text-INTERNAL').fill(internalText);await p.locator('#disclosure-why-INTERNAL').fill(rationale);
 const internal=p.locator('article.polysemy-writing').filter({has:p.getByRole('heading',{name:'Verfahrenskoordination'})}).first();
 await internal.getByRole('button',{name:'Fassung speichern'}).click();
 await internal.getByRole('button',{name:'Überarbeitung speichern'}).waitFor();
 await pub.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
 assert.equal(await pub.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
 await p.locator('#disclosure-text-PUBLIC').fill(publicText+' Der konkrete Fristbeginn richtet sich stets nach dem individuell nachweisbaren Zustellungszeitpunkt.');
 await p.locator('#disclosure-why-PUBLIC').fill('Die Revision präzisiert die Prüfung des Fristbeginns, ohne vertrauliche Kennungen oder persönliche Umstände aufzunehmen. Die Regeln zur Akteneinsicht und zum offenen Ergebnis bleiben erhalten.');
 await pub.getByRole('button',{name:'Überarbeitung speichern'}).click();
 await pub.getByRole('heading',{name:'Überarbeitung 1'}).waitFor();
 await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
 await p.getByRole('heading',{name:'Informationen gezielt vermitteln · G13'}).waitFor();await p.getByText('1/4 Quellen begonnen',{exact:false}).waitFor();
 await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();await p.locator('#archive-kind').selectOption('G13_DISCLOSURE');await p.locator('.archive-entry').first().click();
 await p.getByRole('heading',{name:'Unveränderliche erste Vermittlung'}).waitFor();await p.getByText(rewrite[0],{exact:false}).first().waitFor();
 await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();await p.getByRole('heading',{name:'Informationen gezielt vermitteln',exact:true}).waitFor();await p.getByText(rewrite[1],{exact:false}).first().waitFor();
 await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
 await p.locator('article').filter({hasText:'Mediation und Transfer'}).getByRole('button',{name:'Informationen gezielt vermitteln'}).click();
 await p.getByText('Wer gegen eine Prüfungsentscheidung schriftlich Einspruch einlegen möchte',{exact:false}).first().waitFor();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal overflow');
 console.log('PASS M26 G13 selective disclosure, confidential-token gate, two independent audiences, CAS, revision, Archive/reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
