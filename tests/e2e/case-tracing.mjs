import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const root='http://127.0.0.1:4173/';
async function openCase(context){
 const p=await context.newPage();await p.goto(root,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Kasus und Nominalgruppen · G02'}).click();
 await p.getByRole('heading',{name:'Kasus und Nominalgruppen',exact:true}).waitFor();
 return p;
}
async function save(p,role,phrase,reason){
 await p.getByLabel('Kasus der Nominalgruppe').selectOption(role);
 await p.getByLabel('Deine korrigierte Nominalgruppe').fill(phrase);
 await p.getByLabel('Begründung: Kasusauslöser, Genus, Numerus und Flexion').fill(reason);
 await p.getByRole('button',{name:'Analyse unveränderlich speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:860},serviceWorkers:'allow'});
 let stale=null;
 try{
  const p=await openCase(ctx),first='auf den vorläufigen Bericht',reason='Die Verbindung „sich auf etwas stützen“ verlangt den Akkusativ; „den“ gibt die schwache Endung -en vor.';
  assert.equal(await p.locator('.case-tracing-paragraph').count(),3);
  await p.getByText('Unredigierter fiktiver Übungsauszug mit absichtlich fehlerhaften Nominalgruppen.').waitFor();
  assert.equal(await p.getByRole('button',{name:'Analyse unveränderlich speichern'}).isDisabled(),true);
  await p.getByLabel('Kasus der Nominalgruppe').selectOption('AKKUSATIV');
  await p.getByLabel('Deine korrigierte Nominalgruppe').fill('auf dem vorläufige Bericht');
  await p.getByLabel('Begründung: Kasusauslöser, Genus, Numerus und Flexion').fill('Die Originalform ist noch nicht korrigiert.');
  assert.equal(await p.getByRole('button',{name:'Analyse unveränderlich speichern'}).isDisabled(),true);
  await p.getByLabel('Deine korrigierte Nominalgruppe').fill(first);
  await p.getByLabel('Begründung: Kasusauslöser, Genus, Numerus und Flexion').fill(reason);
  await p.getByRole('button',{name:'Analyse unveränderlich speichern'}).click();
  await p.getByRole('heading',{name:'Flexionsreparatur 2 / 3'}).waitFor();
  const explain=p.locator('.case-tracing-analysis details').first();
  await explain.locator('summary').click();
  assert.match(await explain.innerText(),/sich auf etwas stützen/);
  if(width===1280){
   stale=await openCase(ctx);await stale.getByRole('heading',{name:'Flexionsreparatur 2 / 3'}).waitFor();
  }
  // Intentionally incorrect learner case selection persists ungraded.
  await save(p,'AKKUSATIV','dem zuständigen Kollegen','Die Endung folgt aus der Empfängerrolle. Ich werde die Kasuszuordnung erneut prüfen.');
  await p.getByRole('heading',{name:'Flexionsreparatur 3 / 3'}).waitFor();
  if(stale){
   await save(stale,'DATIV','dem zuständigen Kollegen','Übergeben nennt den Empfänger im Dativ.');
   await stale.getByRole('alert').getByText(/Schreibversion wurde inzwischen verändert/).waitFor();
   await stale.getByRole('heading',{name:'Flexionsreparatur 3 / 3'}).waitFor();
   await stale.close();
  }
  await save(p,'GENITIV','Wegen der unerwartet hohen Kosten','Der Plural steht im formellen Genitiv nach wegen, die Adjektivform lautet hohen.');
  await p.getByRole('heading',{name:'Eigenständig formulieren'}).waitFor();
  const text='Das Team stützt sich auf den aktuellen Bericht der Fachleute. Wegen der erheblich gestiegenen Kosten verschiebt es die endgültige Vergabe.';
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p1');
  await p.getByLabel('Deine eigenständigen Sätze').fill(text);
  await p.getByLabel('Begründe die Kasusformen und ihre Auslöser').fill('„sich stützen auf“ regiert den Akkusativ; „wegen“ verlangt hier den Genitiv Plural.');
  await p.getByRole('button',{name:'Eigene Sätze speichern'}).click();
  await p.getByRole('heading',{name:'Eigene Formulierung überarbeiten'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
  await p.getByLabel('Deine eigenständigen Sätze').fill(text+' Die Prüfung bleibt bis zum nächsten Termin unvollständig.');
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p2');
  await p.getByLabel('Begründe die Kasusformen und ihre Auslöser').fill('Die zusätzlichen Angaben begrenzen die Aussage, ohne die Nominalgruppen falsch zu flektieren.');
  await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByText('Die zusätzlichen Angaben begrenzen die Aussage, ohne die Nominalgruppen falsch zu flektieren.').waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Kasus und Nominalgruppen · G02'}).waitFor();
  await p.getByText('1/6 Texte begonnen',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.getByLabel('Textart').selectOption('G02_CASE_TRACING');
  await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderliche erste Kasusanalyse'}).waitFor();
  await p.getByText(first,{exact:false}).first().waitFor();
  await p.getByText('Die zusätzlichen Angaben begrenzen die Aussage, ohne die Nominalgruppen falsch zu flektieren.').waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Kasus und Nominalgruppen',exact:true}).waitFor();
  await p.getByText(reason,{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Kasus und Flexion'}).getByRole('button',{name:'Kasus im Text prüfen'}).click();
  await p.getByText(first,{exact:false}).first().waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal overflow');
  console.log('PASS M13 case government, source repair, ungraded choice, CAS stale tab, archive and reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
