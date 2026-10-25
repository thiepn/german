import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const url='http://127.0.0.1:4173/';
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:840},serviceWorkers:'allow'});
 try{
  const page=await ctx.newPage();await page.goto(url,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await page.getByRole('button',{name:'Schreibwerkstatt öffnen'}).click();
  await page.getByText('0 / 20',{exact:false}).first().waitFor();
  const old='Die Ergebnisse sind aussagekräftig, die Ursachen aber noch offen.';
  const newText='Die Ergebnisse seien aussagekräftig; die Ursachen blieben hingegen offen.';
  await page.getByLabel('Deine erste Formulierung').fill(old);
  await page.getByRole('button',{name:'Erstfassung unveränderlich speichern'}).click();
  await page.getByRole('button',{name:'Beispiel ausblenden'}).waitFor();
  await page.locator('#revisionLens').selectOption('REGISTER');
  await page.locator('.review-checklist input').first().check();
  await page.getByLabel('Deine Überarbeitung').fill(newText);
  await page.getByLabel('Was hast du geändert? (optional)').fill('Indirekte Rede präzisiert.');
  await page.getByRole('button',{name:'Überarbeitung hinzufügen'}).click();
  await page.getByText('Überarbeitung 1',{exact:false}).waitFor();
  await page.getByText('Was hat sich verändert?').waitFor();
  assert.ok(await page.locator('.diff-added').count()>0);
  assert.ok(await page.locator('.diff-removed').count()>0);
  // The revision journey persists over a real reload.
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Schreibwerkstatt öffnen'}).click();
  await page.getByText('1 / 20',{exact:false}).first().waitFor();
  await page.getByText(old).waitFor();
  await page.getByText(newText).waitFor();
  await page.getByLabel('Deine Überarbeitung').fill('Die Ergebnisse seien aussagekräftig. Die Ursachen ließen sich daraus noch nicht bestimmen.');
  await page.locator('#revisionLens').selectOption('BEDEUTUNG');
  await page.getByRole('button',{name:'Überarbeitung hinzufügen'}).click();
  await page.getByText('Überarbeitung 2',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Nächste Schreibaufgabe fortsetzen'}).click();
  assert.equal(await page.locator('#productionPrompt').inputValue(),'SG-P04-002');
  // Dictionary-grounded contrast is a separate objective exercise, not editorial certification.
  await page.getByRole('button',{name:'Zurück zur Übersicht'}).click();
  await page.getByRole('button',{name:'Beleggestützte Wendungen üben'}).click();
  await page.getByRole('button',{name:'Aussicht',exact:true}).click();
  await page.getByRole('button',{name:'Antwort prüfen'}).click();
  await page.getByText('Noch nicht richtig').waitFor();
  await page.locator('a[href="https://www.duden.de/rechtschreibung/Betracht"]').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }finally{await ctx.close()}
}
try{await run(1280);await run(360);console.log('PASS: advanced writing history, two revisions, guided self-check, lexical source anchor, desktop/mobile');}
finally{await browser.close()}
