import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';

async function openPolysemy(ctx){
 const p=await ctx.newPage();await p.goto(origin,{waitUntil:'networkidle'});
 if(await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).count())await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await p.getByRole('button',{name:'Mehrdeutigkeit im Fachtext · G06'}).click();
 await p.getByRole('heading',{name:'Mehrdeutigkeit im Fachtext',exact:true}).waitFor();
 return p;
}
async function choose(p,choice,rewrite,boundary){
 await p.getByLabel('Bedeutung des Wortes im Text').selectOption(choice);
 await p.getByLabel('Formuliere die gemeinte Bedeutung eigenständig um').fill(rewrite);
 await p.getByLabel('Welche andere Wortbedeutung wäre hier falsch, und woran erkennt man das?').fill(boundary);
 await p.getByRole('button',{name:'Bedeutung und Paraphrase speichern'}).click();
}
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:880},serviceWorkers:'allow'});
 let stale=null;
 try{
  const p=await openPolysemy(ctx);
  const first='Im Frühjahr verabschiedete das Gremium eine allgemein gültige Neuregelung für die Uferwege. Gebührenforderungen gegen einzelne Personen waren davon nicht betroffen.';
  const why='Erlassen bezeichnet hier die Schaffung einer allgemein geltenden Vorschrift; die Befreiung einer einzelnen Person von ihrer Gebührenpflicht folgt daraus nicht.';
  assert.equal(await p.locator('.polysemy-paragraph').count(),3);
  assert.equal(await p.locator('.polysemy-before-after').count(),1);
  assert.equal(await p.getByRole('button',{name:'Bedeutung und Paraphrase speichern'}).isDisabled(),true);
  await p.getByLabel('Bedeutung des Wortes im Text').selectOption('A');
  await p.getByLabel('Formuliere die gemeinte Bedeutung eigenständig um').fill('Der Gemeinderat erließ im Frühjahr eine neue Satzung über die Nutzung der Uferwege.');
  await p.getByLabel('Welche andere Wortbedeutung wäre hier falsch, und woran erkennt man das?').fill('Der Satz wird nur abgeschrieben.');
  assert.equal(await p.getByRole('button',{name:'Bedeutung und Paraphrase speichern'}).isDisabled(),true,'literal quote copy must not be accepted');
  await p.getByLabel('Formuliere die gemeinte Bedeutung eigenständig um').fill(first);
  await p.getByLabel('Welche andere Wortbedeutung wäre hier falsch, und woran erkennt man das?').fill(why);
  await p.getByRole('button',{name:'Bedeutung und Paraphrase speichern'}).click();
  await p.getByRole('heading',{name:'Bedeutungsvergleich 2 / 3'}).waitFor();
  const explained=p.locator('.polysemy-analysis details').first();
  await explained.locator('summary').click();
  assert.match(await explained.innerText(),/Gebühr/);
  if(width===1280){
   stale=await openPolysemy(ctx);
   await stale.getByRole('heading',{name:'Bedeutungsvergleich 2 / 3'}).waitFor();
  }
  // Author-unpreferred answer is an ungraded learner decision, not marked wrong or discarded.
  await choose(p,'A','Die Verwaltung unterbrach die Anwendung der Gebührenbestimmung nach dem Gutachten für sechs Wochen, ohne die Satzung zunächst außer Kraft zu setzen.','Aussetzen betrifft die zeitweise Unterbrechung eines Vollzugs; Menschen einer Gefahr auszusetzen wäre eine andere und hier unbelegte Aussage.');
  await p.getByRole('heading',{name:'Bedeutungsvergleich 3 / 3'}).waitFor();
  if(stale){
   await choose(stale,'B','Die Verwaltung brachte die Bürgerinnen und Bürger durch die neue Regelung ausdrücklich in eine bedrohliche Lage, die erst später beseitigt wurde.','Die Gefährdung von Personen wäre eine andere Lesart und wird nicht durch die Quelle gedeckt.');
   await stale.getByRole('alert').getByText(/Schreibversion wurde inzwischen verändert/).waitFor();
   await stale.getByRole('heading',{name:'Bedeutungsvergleich 3 / 3'}).waitFor();
   await stale.close();
  }
  await choose(p,'A','Der Rat strich später die betreffende Gebührenvorschrift endgültig aus der Satzung; alle anderen Bestimmungen blieben weiterhin gültig.','Die Rechtsvorschrift wurde außer Kraft gesetzt, nicht als physisches Schriftstück für eine spätere Verwendung aufbewahrt.');
  await p.getByRole('heading',{name:'Eigenständig formulieren'}).waitFor();
  assert.equal(await p.locator('.polysemy-analysis').count(),3);
  const text='Der Gemeinderat beschloss zunächst eine neue Satzung über die Nutzung der Uferwege. Aufgrund eines technischen Gutachtens unterbrach die Verwaltung den Vollzug der Gebührenteilregel vorübergehend. Später strich der Rat die umstrittene einzelne Bestimmung aus dem Regelwerk, während die übrige Satzung weitergalt.';
  const reason='Der erste Ausdruck meint Normsetzung, der zweite eine zeitlich begrenzte Vollzugspause und der dritte die endgültige Beseitigung einer einzelnen Vorschrift; keine dieser Handlungen ist ein individueller Gebührenerlass.';
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p3');
  await p.getByLabel('Deine eigenständige Fachzusammenfassung').fill(text);
  await p.getByLabel('Erkläre deine eindeutigen Wortbedeutungen und die ausgeschlossenen Lesarten').fill(reason);
  await p.getByRole('button',{name:'Eigenen Text speichern'}).click();
  await p.getByRole('heading',{name:'Eigenen Text überarbeiten'}).waitFor();
  await p.getByRole('button',{name:'Letzte Fassung übernehmen'}).click();
  assert.equal(await p.getByRole('button',{name:'Überarbeitung speichern'}).isDisabled(),true);
  await p.getByLabel('Deine eigenständige Fachzusammenfassung').fill(text+' Alte Akten blieben aus Nachweisgründen aufbewahrt.');
  await p.getByLabel('Quellenabsatz als Ausgangspunkt').selectOption('p2');
  await p.getByLabel('Erkläre deine eindeutigen Wortbedeutungen und die ausgeschlossenen Lesarten').fill('Der neue Satz unterscheidet das Aufbewahren schriftlicher Akten vom rechtlichen Außerkraftsetzen einer Norm.');
  await p.getByRole('button',{name:'Überarbeitung speichern'}).click();
  await p.getByText('Der neue Satz unterscheidet das Aufbewahren schriftlicher Akten vom rechtlichen Außerkraftsetzen einer Norm.').waitFor();
  await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
  await p.getByRole('heading',{name:'Mehrdeutigkeit im Fachtext · G06'}).waitFor();
  await p.getByText('1/6 Quellen begonnen',{exact:false}).waitFor();
  await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
  await p.getByLabel('Textart').selectOption('G06_POLYSEMY');
  await p.locator('.archive-entry').first().click();
  await p.getByRole('heading',{name:'Unveränderliche erste Wortbedeutungsanalyse'}).waitFor();
  await p.getByText(first,{exact:false}).first().waitFor();
  await p.getByText('Der neue Satz unterscheidet das Aufbewahren schriftlicher Akten vom rechtlichen Außerkraftsetzen einer Norm.').waitFor();
  await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
  await p.getByRole('heading',{name:'Mehrdeutigkeit im Fachtext',exact:true}).waitFor();
  await p.getByText(why,{exact:false}).first().waitFor();
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
  await p.locator('article').filter({hasText:'Wortschatz und Semantik'}).getByRole('button',{name:'Mehrdeutigkeit im Fachtext'}).click();
  await p.getByText(first,{exact:false}).first().waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  console.log('PASS M18 G06 lexical sense context, independent paraphrase, rejected copy, stale tab CAS, ungraded options, archive and reload '+width);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360)}finally{await browser.close()}
