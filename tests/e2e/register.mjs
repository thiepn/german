import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4173/';
const draft=(tag)=>('Wir benennen die belegte Einschränkung präzise und übernehmen Verantwortung, ohne eine nicht bestätigte Lösung zu versprechen. '+tag+' ').repeat(3)+'\n\n'+('Wir bieten eine konkrete Rückmeldung an, überlassen die Entscheidung aber der betroffenen Person und vermeiden jede unbegründete Schuldzuweisung. ').repeat(3);
const reason='Die ursprüngliche Formulierung ist zu pauschal. Ich benenne die belegte Einschränkung, vermeide ein nicht abgesichertes Versprechen und begründe die Entscheidungshoheit des Gegenübers ausdrücklich.';
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage();
  await page.goto(origin);await page.waitForLoadState('networkidle');
  await page.getByRole('button',{name:/Verantwortung und Register/}).first().click();
  await page.getByRole('heading',{name:/Verantwortung und Register/}).first().waitFor();
  await page.locator('#register-draft').fill(draft('Erstfassung'));
  await page.locator('#register-reason').fill(reason);
  await page.getByRole('button',{name:'Erstfassung sichern'}).click();
  await page.getByRole('button',{name:'Adressatenwechsel sichern'}).waitFor();
  await page.reload();await page.waitForLoadState('networkidle');
  await page.getByRole('button',{name:/Verantwortung und Register/}).first().click();
  await page.getByRole('button',{name:'Adressatenwechsel sichern'}).waitFor();
  await page.locator('#register-draft').fill(draft('Zielgruppe: Verwaltungsleitung'));
  await page.locator('#register-reason').fill(reason);
  await page.getByRole('button',{name:'Adressatenwechsel sichern'}).click();
  await page.getByRole('button',{name:'Revision sichern'}).waitFor();
  await page.locator('#register-draft').fill(draft('Revidierte öffentliche Mitteilung'));
  await page.locator('#register-reason').fill(reason);
  await page.getByRole('button',{name:'Revision sichern'}).click();
  await page.getByRole('text',/Revision · 2/).waitFor();
  await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
  await context.close();
 }
}finally{await browser.close()}
