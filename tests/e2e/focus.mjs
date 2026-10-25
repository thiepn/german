import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
async function openFocus(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Informationsstruktur · G04'}).click();
 await p.getByRole('heading',{name:'Informationsstruktur und Fokus',exact:true}).waitFor();
 return p;
}
async function save(p,choice,rewrite,reason){
 await p.getByLabel('Geeignete Formulierung im Kontext').selectOption(choice);
 await p.getByLabel('Formuliere den Satz eigenständig um').fill(rewrite);
 await p.getByLabel('Begründe Thema, neue Information und Geltungsbereich').fill(reason);
 await p.getByRole('button',{name:'Umformung und Begründung speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 let stale=null;
 try{
  const p=await openFocus(ctx);
  const first='Der Ausschuss begann nicht am angekündigten Montag mit der Abstimmung; er eröffnete sie erst, nachdem die unabhängige Stellungnahme eingetroffen war.';
  const why='Die Zeitkorrektur trägt den Fokus; „erst“ verhindert die Behauptung eines früheren Beginns.';
  assert.equal(await p.locator('.focus-paragraph').count(),3);
  assert.equal(await p.getByRole('button',{name:'Umformung und Begründung speichern'}).isDisabled(),true);
  await p.getByLabel('Geeignete Formulierung im Kontext').selectOption('A');
  await p.getByLabel('Formuliere den Satz eigenständig um').fill('Erst nach Eingang der unabhängigen Stellungnahme leitete der Ausschuss die Abstimmung ein.');
  await p.getByLabel('Begründe Thema, neue Information und Geltungsbereich').fill('Dies ist die unveränderte Vorgabe.');
  assert.equal(await p.getByRole('button',{name:'Umformung und Begründung speichern'}).isDisabled(),true,'copying source is rejected');
  await p.getByLabel('Formuliere den Satz eigenständig um').fill(first);
  await p.getByLabel('Begründe Thema, neue Information und Geltungsbereich').fill(why);
  await p.getByRole('button',{name:'Umformung und Begründung speichern'}).click();
  await p.getByRole('heading',{name:'Kontextvergleich 2 / 3'}).waitFor();
  const details=p.locator('.focus-analysis details').first();
  await details.locator('summary').click();assert.match(await details.innerText(),/Vorfeld/);
  if(width===1280){
   stale=await openFocus(ctx);
   await stale.getByRole('heading',{name:'Kontextvergleich 2 / 3'}).waitFor();
  }
  // Author-unpreferred alternative remains ungraded learner evidence.
  await save(p,'A','Die Prüfstelle verlangte den zweiten Nachweis erst am Montag; über den ersten hatte der Ausschuss schon zuvor beraten.','Die bekannte Unterlage ist der Bezugspunkt, während der spätere Nachweis den Kontrast liefert.');
  await p.getByRole('heading',{name:'Kontextvergleich 3 / 3'}).waitFor();
  if(stale){
   await save(stale,'B','Den zweiten Nachweis verlangte die Prüfstelle erst am Montag, obwohl der erste längst besprochen worden war.','Der zweite Nachweis ist das kontrastierte, bereits angekündigte Thema.');
   await stale.getByRole('alert').getByText(/Schreibversion wurde inzwischen verändert/).waitFor();
   await stale.getByRole('heading',{name:'Kontextvergleich 3 / 3'}).waitFor();
   await stale.close();
  }
  await save(p,'B','Die Zustimmung für eine Veröffentlichung war weiterhin unvollständig; einige Beteiligte hatten noch nicht zugestimmt.','Die Aussage „nicht alle“ bedeutet nicht, dass überhaupt keine Zustimmung vorlag.');
  await p.getByRole('heading',{name:'Eigenständig formulieren'}).waitFor();
  assert.equal(await p.locator('.focus-analysis').count(),3);
  const text='Nicht am ursprünglich geplanten Montag, sondern erst nach Eingang der unabhängigen Stellungnahme begann der Ausschuss die Abstimmung. Den zweiten Nachweis forderte die Prüfstelle erst am Montag an. Für die Veröffentlichung fehlte weiterhin die Zustimmung einiger Beteiligter.';
  const rationale='Die Korrektur steht zeitlich im Vordergrund; das Akkusativobjekt knüpft an den bekannten Nachweiskontrast an; die Negation vermeidet eine pauschale Ablehnung.';
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p3');
  await p.getByLabel('Dein eigenständiger Text').fill(text);
  await p.getByLabel('Begründe die Schwerpunktsetzung und was deine Sätze ausdrücklich nicht behaupten').fill(rationale);
  await p.getByRole('button',{name:'Eigenen Text speichern'}).click();
  await p.getByRole('heading',{name:'Eigenen Text überarbeiten'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true,'unchanged revision blocked');
  await p.getByLabel('Dein eigenständiger Text').fill(text+' Die endgültige Entscheidung blieb damit ausdrücklich offen.');
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p2');
  await p.getByLabel('Begründe die Schwerpunktsetzung und was deine Sätze ausdrücklich nicht behaupten').fill('Die zusätzliche Schlussfolgerung grenzt den Stand der Beratung ein, ohne eine fertige Entscheidung zu unterstellen.');
  await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByText('Die zusätzliche Schlussfolgerung grenzt den Stand der Beratung ein, ohne eine fertige Entscheidung zu unterstellen.').waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Informationsstruktur · G04'}).waitFor();
  await p.getByText('1/6 Texte begonnen',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.getByLabel('Textart').selectOption('G04_FOCUS');
  await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderliche erste Fokusanalyse'}).waitFor();
  await p.getByText(first,{exact:false}).first().waitFor();
  await p.getByText('Die zusätzliche Schlussfolgerung grenzt den Stand der Beratung ein, ohne eine fertige Entscheidung zu unterstellen.').waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Informationsstruktur und Fokus',exact:true}).waitFor();
  await p.getByText(why,{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Syntax und Informationsstruktur'}).getByRole('button',{name:'Informationsstruktur bearbeiten'}).click();
  await p.getByText(first,{exact:false}).first().waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M15 G04 Vorfeld/Mittelfeld/Nachfeld contrast, independent rewrite, CAS stale tab, archive, reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
