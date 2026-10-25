import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const claims=[
'Die rückläufigen Fehlzeiten sind in der kleinen freiwilligen Gruppe beobachtbar, beweisen aber ohne Vergleich noch nicht die generelle Wirkung einer kürzeren Arbeitswoche.',
'Eine unveränderte Öffnungszeit am Montag sichert einen Teil des Zugangs, ersetzt aber keinen Nachweis gleichbleibender Wartezeiten und Qualität an allen Tagen.',
'Die zeitlich befristete Fortsetzung mit transparentem Vergleich kann eine weitere Entscheidung vorbereiten, darf aber nicht als dauerhafte Zustimmung ausgegeben werden.'
];
const warrants=[
'Ein ursächlicher Zusammenhang wäre nur bei geeigneter Vergleichsgruppe zu begründen, weil Selbstselektion und veränderte Aufgabenverteilung unabhängig Einfluss nehmen könnten.',
'Ein ausreichender Zugang setzt voraus, dass auch terminliche Verfügbarkeit, Beschwerden und Nachfrage über alle Dienstzeiten systematisch erfasst und verglichen werden.',
'Eine verantwortbare Fortsetzung erfordert vorher veröffentlichte Kriterien für Wirkung, Erreichbarkeit und Kosten und ein zuständiges Gremium für die anschließende Entscheidung.'
];
const counters=[
'Besonders motivierte Beschäftigte könnten die freiwillige Pilotgruppe geprägt haben, sodass der Rückgang der Fehlzeiten auch ohne kürzere Arbeitszeit eingetreten wäre.',
'Menschen mit festem Zeitfenster am Nachmittag könnten trotz montäglicher Öffnung länger auf Termine warten, was ein ernstzunehmender Einwand gegen eine vorschnelle Ausweitung ist.',
'Weitere sechs Monate binden Geld und Personal; ohne überprüfbare Abbruchkriterien kann auch ein kleiner Versuch unverhältnismäßig werden.'
];
const essay='Der kommunale Pilot zur Vier-Tage-Woche enthält einen bemerkenswerten Befund, aber noch keinen Beweis für eine dauerhaft bessere Organisation. In der freiwillig ausgewählten Gruppe wurden weniger kurzfristige Fehlzeiten erfasst. Daraus lässt sich eine weitere Prüfung begründen, jedoch kein kausaler Nutzen für sämtliche Dienststellen ableiten. Alternativ könnten besonders motivierte Beschäftigte und andere Schichtmodelle den Unterschied erklärt haben. Ein ernstzunehmender Einwand betrifft die Erreichbarkeit. Zwar blieb die Bürgerberatung montags geöffnet, doch an anderen Tagen waren Wartezeiten uneinheitlich erfasst. Gerade Menschen mit festen beruflichen und familiären Verpflichtungen könnten unter einem ungünstigen Terminangebot leiden.\n\nDie Stadt sollte deshalb keine allgemeine Einführung beschließen, sondern allenfalls eine klar begrenzte Fortsetzung in unterschiedlich organisierten Dienststellen prüfen. Dafür braucht es eine geeignete Vergleichsgruppe, nachvollziehbare Wartezeitdaten und eine transparente Rechnung zu zusätzlichem Personalaufwand. Die Personalvertretung hat eine sechsmonatige Fortsetzung vorgeschlagen; dieser Vorschlag ist noch keine dauerhafte verbindliche Regel. Eine spätere Entscheidung wäre nur gerechtfertigt, wenn zuvor benannte Kriterien eine erkennbare Verbesserung belegen und Nachteile für die öffentliche Erreichbarkeit nicht übersehen werden.';
const reason='Ich unterscheide den empirischen Fehlzeitenbefund von einer kausalen Behauptung, erkenne den erheblichen Einwand unzureichender Erreichbarkeit an und begrenze die Empfehlung auf eine Evaluation mit vorher festgelegten Kriterien. Eine dauerhafte Entscheidung bleibt gesondert offen.';
async function open(ctx){
 const page=await ctx.newPage();await page.goto(origin,{waitUntil:'networkidle'});
 if(await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await page.getByRole('button',{name:'Argumente begründen · G11'}).click();
 await page.getByRole('heading',{name:'Argumente begründen und prüfen',exact:true}).waitFor();
 return page;
}
async function fill(p,i,choice){
 await p.locator('#argument-choice').selectOption(choice);
 await p.locator('#argument-claim').fill(claims[i]);
 await p.locator('#argument-warrant').fill(warrants[i]);
 await p.locator('#argument-counter').fill(counters[i]);
 await p.getByRole('button',{name:'Argumentkette speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 try{
 const p=await open(ctx);assert.equal(await p.locator('.polysemy-paragraph').count(),3);assert.equal(await p.getByRole('button',{name:'Argumentkette speichern'}).isDisabled(),true);
 await p.locator('#argument-choice').selectOption('A');
 await p.locator('#argument-claim').fill(claims[0]);await p.locator('#argument-warrant').fill(claims[0]);await p.locator('#argument-counter').fill(counters[0]);
 assert.equal(await p.getByRole('button',{name:'Argumentkette speichern'}).isDisabled(),true,'cannot duplicate claim as warrant');
 await p.locator('#argument-warrant').fill(warrants[0]);await p.getByRole('button',{name:'Argumentkette speichern'}).click();
 await p.getByRole('heading',{name:'Argumentkette 2 / 3'}).waitFor();
 let stale=null;if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Argumentkette 2 / 3'}).waitFor();}
 await fill(p,1,'B');await p.getByRole('heading',{name:'Argumentkette 3 / 3'}).waitFor();
 if(stale){await fill(stale,1,'B');await stale.getByRole('alert').getByText(/inzwischen|verändert|Konflikt|gespeichert/i).waitFor();await stale.close();}
 await fill(p,2,'A');await p.getByRole('heading',{name:'Eigenen Argumenttext schreiben'}).waitFor();
 await p.locator('#argument-anchor').selectOption('a1');await p.locator('#argument-essay').fill(essay);await p.locator('#argument-reason').fill(reason);
 await p.getByRole('button',{name:'Argumenttext speichern'}).click();
 await p.getByRole('heading',{name:'Argumenttext überarbeiten'}).waitFor();
 await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
 await p.locator('#argument-anchor').selectOption('a3');
 await p.locator('#argument-essay').fill(essay+' Deshalb sind auch die Kriterien einer möglichen Beendigung des Pilots ausdrücklich vorab zu benennen.');
 await p.locator('#argument-reason').fill('Die überarbeitete Fassung macht eine mögliche vorzeitige Beendigung unter überprüfbaren Kriterien sichtbar und erhält die Trennung zwischen Beobachtung, Hypothese und politischer Entscheidung.');
 await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
 await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
 await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
 await p.getByRole('heading',{name:'Argumente begründen und prüfen · G11'}).waitFor();await p.getByText('1/4 Quellen begonnen',{exact:false}).waitFor();
 await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();await p.locator('#archive-kind').selectOption('G11_ARGUMENT');await p.locator('.archive-entry').first().click();
 await p.getByRole('heading',{name:'Unveränderliche erste Argumentkette'}).waitFor();await p.getByText(claims[0],{exact:false}).first().waitFor();
 await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();await p.getByRole('heading',{name:'Argumente begründen und prüfen',exact:true}).waitFor();
 await p.getByText(claims[1],{exact:false}).first().waitFor();
 await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
 await p.locator('article').filter({hasText:'Schreiben und Überarbeiten'}).getByRole('button',{name:'Argumente begründen und prüfen'}).click();
 await p.getByText(claims[0],{exact:false}).first().waitFor();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'mobile/desktop horizontal overflow');
 console.log('PASS M24 G11 warranted argument, source evidence, real counterargument, CAS, independent essay revision, Archive/reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
