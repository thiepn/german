import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const interpretations=[
 'Der Bericht verneint, dass sämtliche geförderten Projekte im Herbst vorgestellt worden sind. Einzelne Präsentationen bleiben ausdrücklich möglich, obwohl nicht die gesamte Menge betroffen war.',
 'Die Veröffentlichung setzt eine schriftliche Rückmeldung voraus, doch diese Rückmeldung garantiert noch keineswegs die unmittelbare Freigabe des Entwurfs.',
 'Vereine erhalten zusätzlich zu den bisher Beteiligten die Möglichkeit, eine Korrektur vorzuschlagen. Daraus folgt weder ein Ausschluss anderer noch eine automatische Übernahme.'
];
const boundaries=[
 'Eine pauschale Überschrift über das vollständige Scheitern sämtlicher Präsentationen wäre unzulässig, da der Wortlaut ausdrücklich nur die nicht vollständige Abdeckung behauptet.',
 'Eine eingegangene schriftliche Rückmeldung ersetzt keine notwendigen weiteren Prüfungen. Der Bericht nennt nur die vorauszusetzende Handlung und verspricht kein Ergebnis.',
 'Die Vereine besitzen kein exklusives Änderungsrecht und ihre Vorschläge werden weiterhin geprüft; die additive Formulierung behauptet keine automatische Annahme.'
];
const examples=[
 'Ein Projekt zeigt seine Ausstellung und ein anderes sagt den Vortrag kurzfristig ab. Diese Ausgangslage ist mit nicht alle vereinbar, ohne dass man alle Projekte verneinen müsste.',
 'Ein Verein antwortet schriftlich, doch die Veröffentlichung bleibt wegen einer offenen Bildfreigabe aus. Das verletzt die notwendige Bedingung nicht.',
 'Ein Mitglied der Redaktion und ein Vereinsmitglied übermitteln jeweils einen Korrekturvorschlag, doch nur die nachweisbare Änderung wird übernommen.'
];
const memo='In der fiktiven Übersicht über die Kulturförderung muss die Reichweite von drei sprachlichen Einschränkungen klar unterschieden werden. Der Bericht besagt zunächst nicht, dass jede Initiative ihre Arbeit vorgestellt hat. Er behauptet jedoch ebenso wenig, dass keine einzige Präsentation stattgefunden habe. Die Negation des Gesamtheitsanspruchs lässt einzelne abweichende Fälle zu und darf nicht zur vollständigen Negation verstärkt werden. Auch die Erklärung des Veröffentlichungsverfahrens muss die Richtung des Bedingungsgefüges bewahren: Eine schriftliche Rückmeldung wird als notwendige Voraussetzung genannt, ohne dadurch automatisch einen hinreichenden Auslöser für die Freigabe zu schaffen.\\n\\nSchließlich ist das Recht, eine Korrektur anzuregen, durch das zusätzliche auch ausdrücklich um eine Gruppe erweitert worden. Die bisher beteiligten Personen verlieren dadurch ihre Möglichkeit zur Rückmeldung nicht. Ebenso wenig verpflichtet der Zusatz die Redaktion dazu, jede vorgeschlagene Änderung ungeprüft zu übernehmen. Für die Bürgerversammlung ist deshalb eine klare Unterscheidung wichtig: Nicht alle heißt nicht keine, nur nach heißt nicht sofort wenn und auch kennzeichnet keine exklusive Zuständigkeit. Diese Aussagegrenzen schützen die öffentliche Darstellung vor unbelegten Zusagen und irreführenden Ausschlüssen.';
const why='Die erste Fassung grenzt die tatsächlichen Aussagen von Totalnegation, automatischer Freigabe und exklusivem Vorschlagsrecht ab. Die öffentliche Darstellung enthält ausdrücklich keine unbelegten Versprechen.';
const revision=memo+'\\n\\nFür eine sachliche Pressefassung soll außerdem deutlich werden, dass bereits einzelne Kulturveranstaltungen stattfanden. Der Einzelfall wird konkret geprüft und eine neue Zuständigkeitsregel nicht bloß vermutet. Diese Ergänzung vermeidet missverständliche Pauschalisierungen, erläutert die Grenzen jeder Bedingung und hält die Beteiligungsrechte nachvollziehbar auseinander.';
async function open(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Fokuspartikeln und Negationsskopus · G04'}).click();
 await p.getByRole('heading',{name:'Fokuspartikeln und Negationsskopus',exact:true}).waitFor();
 return p;
}
async function fill(p,i,choice){
 await p.locator('#scope-choice').selectOption(choice);
 await p.locator('#scope-interpretation').fill(interpretations[i]);
 await p.locator('#scope-boundary').fill(boundaries[i]);
 await p.locator('#scope-example').fill(examples[i]);
 await p.getByRole('button',{name:'Skopusbeleg speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},acceptDownloads:true,serviceWorkers:'allow'});
 const target=await browser.newContext({viewport:{width,height:880},acceptDownloads:true,serviceWorkers:'allow'});
 try{
 const p=await open(ctx);
 assert.equal(await p.locator('.polysemy-paragraph').count(),3);
 assert.equal(await p.getByRole('button',{name:'Skopusbeleg speichern'}).isDisabled(),true);
 await p.locator('#scope-choice').selectOption('B');
 await p.locator('#scope-interpretation').fill(interpretations[0]);
 await p.locator('#scope-boundary').fill(interpretations[0]);
 await p.locator('#scope-example').fill(examples[0]);
 assert.equal(await p.getByRole('button',{name:'Skopusbeleg speichern'}).isDisabled(),true,'duplicated evidence rejected');
 await p.locator('#scope-boundary').fill(boundaries[0]);
 await p.getByRole('button',{name:'Skopusbeleg speichern'}).click();
 await p.getByRole('heading',{name:'Skopusbeleg 2 / 3'}).waitFor();
 let stale=null;
 if(width===1280){stale=await open(ctx);await stale.getByRole('heading',{name:'Skopusbeleg 2 / 3'}).waitFor();}
 await fill(p,1,'A');await p.getByRole('heading',{name:'Skopusbeleg 3 / 3'}).waitFor();
 if(stale){await fill(stale,1,'A');await stale.getByRole('alert').getByText(/inzwischen|verändert|gespeichert/i).waitFor();await stale.close();}
 await fill(p,2,'B');await p.getByRole('heading',{name:'Eigenständigen Skopusvermerk schreiben'}).waitFor();
 await p.locator('#scope-anchor').selectOption('s1');await p.locator('#scope-document').fill(memo);await p.locator('#scope-why').fill(why);
 await p.getByRole('button',{name:'Skopusvermerk speichern'}).click();
 await p.getByRole('heading',{name:'Adressatengerechte Revision'}).waitFor();
 await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
 await p.locator('#scope-anchor').selectOption('s3');await p.locator('#scope-why').fill(why);
 assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true,'identical rewrite blocked');
 await p.locator('#scope-document').fill(revision);
 await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
 await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
 await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
 await p.getByRole('heading',{name:'Fokuspartikeln und Negationsskopus · G04'}).waitFor();
 await p.getByText('1/4 Quellen begonnen',{exact:false}).first().waitFor();
 await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
 await p.locator('#archive-kind').selectOption('G04_SCOPE');await p.locator('.archive-entry').first().click();
 await p.getByRole('heading',{name:'Unveränderlicher erster Skopusbeleg'}).waitFor();
 await p.getByText(interpretations[0],{exact:false}).first().waitFor();
 await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
 await p.getByRole('heading',{name:'Fokuspartikeln und Negationsskopus',exact:true}).waitFor();
 await p.getByText(interpretations[1],{exact:false}).first().waitFor();
 await p.reload({waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
 await p.locator('article').filter({hasText:'Satzbau'}).getByRole('button',{name:'Fokuspartikeln und Negationsskopus'}).click();
 await p.getByText(interpretations[0],{exact:false}).first().waitFor();
 await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
 await p.getByRole('button',{name:'Daten & Sicherung'}).click();
 const dl=p.waitForEvent('download');await p.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click();
 const raw=await readFile(await (await dl).path(),'utf8'),obj=JSON.parse(raw);
 assert.equal(obj.version,3);
 assert.equal(obj.records.productionEntries.length,1);
 assert.equal(obj.records.productionEntries[0].kind,'SCOPE_STUDY');
 assert.equal(obj.records.productionEntries[0].revisions.length,4);
 assert.ok(obj.records.productionEntries[0].original.includes(interpretations[0]));
 const b=await target.newPage();await b.goto(origin,{waitUntil:'networkidle'});
 if(await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await b.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await b.getByRole('button',{name:'Daten & Sicherung'}).click();
 await b.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'sprachgefuehl-backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await b.getByText('Integrität bestätigt',{exact:false}).waitFor();
 await b.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
 await b.getByText('Import abgeschlossen:',{exact:false}).waitFor();
 await b.reload({waitUntil:'networkidle'});
 await b.getByRole('button',{name:'Lernen',exact:true}).first().click();
 await b.locator('article').filter({hasText:'Satzbau'}).getByRole('button',{name:'Fokuspartikeln und Negationsskopus'}).click();
 await b.getByText('sachliche Pressefassung',{exact:false}).first().waitFor();
 assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
 console.log('PASS M30 G04 source and scope reasoning, CAS stale tab, revision, archive, backup v3 and reload '+width);
 }finally{await ctx.close();await target.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
