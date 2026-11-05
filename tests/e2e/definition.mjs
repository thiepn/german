import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const definitions=[
'Die Projektgruppe meint mit Transparenz, dass Bürgerinnen und Bürger die allgemein verwendeten Zuordnungskriterien eines digitalen Dienstes öffentlich nachlesen können.',
'Nachvollziehbarkeit meint im Projekt die nachträgliche Rekonstruktion einer bestimmten Weiterleitung anhand dokumentierter Eingaben und einer konkreten Regelversion.',
'Unter Erklärbarkeit versteht die Arbeitsgruppe eine konkrete und verständliche Erläuterung, warum eine bestimmte Regel auf die Eingabe einer betroffenen Person angewandt wurde.'
];
const contrasts=[
'Öffentlich sichtbare Regeln machen den Ablauf im Allgemeinen offen, sie erlauben ohne zusätzliche Fallprotokolle noch keine vollständige Rekonstruktion einer individuellen Zuordnung.',
'Die bloße Dokumentation eines konkreten Vorgangs garantiert noch keine für die betroffene Person verständliche Erklärung und auch keine sachliche Rechtfertigung.',
'Eine adressatengerechte Erklärung geht über eine allgemeine Regelübersicht hinaus und ersetzt keineswegs die getrennte Prüfung, ob die Entscheidung richtig war.'
];
const applications=[
'Wenn jemand die allgemeine Regelübersicht herunterladen kann, ist Transparenz gegeben; ohne die Eingaben des eigenen Vorgangs bleibt dessen Verlauf dennoch offen.',
'Ein Einzelfallprotokoll kann den dokumentierten Regelpfad erkennbar machen, obwohl die betroffene Person dessen Zweckmäßigkeit weiter bestreiten könnte.',
'Eine verständliche individuelle Auskunft nennt den konkreten Eingabewert und die relevante Regel, begründet aber noch keine Garantie der Richtigkeit sämtlicher Systementscheidungen.'
];
const memo='Das Pilotprojekt zur automatisierten Weiterleitung kommunaler Anfragen verwendet drei Begriffe mit ausdrücklich unterschiedlichen Funktionen. Transparenz meint zunächst die öffentliche Offenlegung der allgemeinen Kriterien, die einen Vorgang beeinflussen können. Die Lesbarkeit solcher Regeln auf einer Webseite ist deshalb eine relevante Information, erlaubt jedoch noch nicht den Schluss, dass der Verlauf einer individuellen Weiterleitung nachträglich geprüft werden kann. Nachvollziehbarkeit setzt für diesen zweiten Zweck ein Protokoll mit Eingaben und der jeweils gültigen Regelversion voraus. Es macht den dokumentierten Weg rekonstruierbar, bescheinigt aber weder seine sachliche Richtigkeit noch seine Verständlichkeit für jeden Betroffenen.\n\nErklärbarkeit verlangt im gegebenen Bericht zusätzlich eine konkrete Kommunikation über die angewandte Regel und ihren Bezug zu dem einzelnen Anliegen. Eine verständliche Auskunft kann auch auf mögliche Korrekturen hinweisen. Die Darstellung der drei Eigenschaften darf deshalb weder eine allgemeine Regelübersicht als vollständige Erklärung aller Vorgänge ausgeben noch die Existenz eines internen Protokolls mit einer materiellen Rechtfertigung verwechseln. Die zuvor verwendete Formulierung über eine automatisch garantierte Prüfbarkeit jeder Entscheidung sollte entsprechend berichtigt werden.';
const why='Die Fachdefinitionen trennen bewusst die Offenlegung allgemeiner Kriterien von Einzelfallrekonstruktion und adressatengerechter Erklärung. Ich habe die missverständliche Gleichsetzung berichtigt und eine abgrenzende Fallanwendung ergänzt.';
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Begriffe präzise abgrenzen · G06'}).click();
 await p.getByRole('heading',{name:'Begriffe präzise abgrenzen',exact:true}).waitFor();return p;
}
async function fill(p,i,choice){
 await p.locator('#definition-choice').selectOption(choice);
 await p.locator('#definition-definition').fill(definitions[i]);
 await p.locator('#definition-contrast').fill(contrasts[i]);
 await p.locator('#definition-application').fill(applications[i]);
 await p.getByRole('button',{name:'Begriffsbeleg speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 try{
 const p=await open(ctx);assert.equal(await p.locator('.polysemy-paragraph').count(),3);
 assert.equal(await p.getByRole('button',{name:'Begriffsbeleg speichern'}).isDisabled(),true);
 await p.locator('#definition-choice').selectOption('A');
 await p.locator('#definition-definition').fill(definitions[0]);await p.locator('#definition-contrast').fill(definitions[0]);await p.locator('#definition-application').fill(applications[0]);
 assert.equal(await p.getByRole('button',{name:'Begriffsbeleg speichern'}).isDisabled(),true,'duplicate distinction blocked');
 await p.locator('#definition-contrast').fill(contrasts[0]);await p.getByRole('button',{name:'Begriffsbeleg speichern'}).click();
 await p.getByRole('heading',{name:'Begriffsbeleg 2 / 3'}).waitFor();
 let stale=null;if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Begriffsbeleg 2 / 3'}).waitFor();}
 await fill(p,1,'B');await p.getByRole('heading',{name:'Begriffsbeleg 3 / 3'}).waitFor();
 if(stale){await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|Konflikt|gespeichert/i).waitFor();await stale.close();}
 await fill(p,2,'A');await p.getByRole('heading',{name:'Eigenen Begriffsvermerk schreiben'}).waitFor();
 await p.locator('#definition-anchor').selectOption('d1');await p.locator('#definition-report').fill(memo);await p.locator('#definition-reason').fill(why);
 await p.getByRole('button',{name:'Begriffsvermerk speichern'}).click();
 await p.getByRole('heading',{name:'Bericht überarbeiten'}).waitFor();
 await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
 await p.locator('#definition-anchor').selectOption('d3');await p.locator('#definition-report').fill(memo+' In der öffentlichen Fassung muss der projektbezogene Geltungsbereich jeder Definition ausdrücklich benannt werden.');
 await p.locator('#definition-reason').fill('Die Revision ergänzt ausdrücklich den projektspezifischen Rahmen der drei Begriffe und verhindert die Übertragung dieser Definitionen auf jeden denkbaren Fall.');
 await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
 await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
 await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
 await p.getByRole('heading',{name:'Begriffe präzise abgrenzen · G06'}).waitFor();await p.getByText('1/4 Quellen begonnen',{exact:false}).waitFor();
 await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();await p.locator('#archive-kind').selectOption('G06_DEFINITION');await p.locator('.archive-entry').first().click();
 await p.getByRole('heading',{name:'Unveränderliche erste Begriffsklärung'}).waitFor();await p.getByText(definitions[0],{exact:false}).first().waitFor();
 await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();await p.getByRole('heading',{name:'Begriffe präzise abgrenzen',exact:true}).waitFor();
 await p.getByText(definitions[1],{exact:false}).first().waitFor();
 await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
 await p.locator('article').filter({hasText:'Wortschatz und Semantik'}).getByRole('button',{name:'Begriffe präzise abgrenzen'}).click();
 await p.getByText(definitions[0],{exact:false}).first().waitFor();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
 console.log('PASS M28 G06 term boundaries, independent definitions and examples, stale-tab CAS, coherent memo revision, Archive/reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
