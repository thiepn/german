import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const host='http://127.0.0.1:4173/';
async function run(width){
 const ctx=await browser.newContext({viewport:{width,height:820},serviceWorkers:'allow'});
 try{
  const page=await ctx.newPage();await page.goto(host,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
  await page.getByRole('button',{name:'Trainieren',exact:true}).first().click();
  await page.locator('article').filter({hasText:'Artikelblitz'}).getByRole('button',{name:'Übung starten'}).click();
  const first=await page.locator('.exercise .prompt').innerText();
  for(const input of await page.locator('.exercise input[required]').all())await input.fill('falsch');
  await page.getByRole('button',{name:'Antwort prüfen'}).click();
  await page.getByText('Noch nicht richtig').waitFor();
  await page.getByRole('button',{name:'Zur Übersicht'}).click();
  await page.getByRole('button',{name:'Fehler',exact:true}).first().click();
  await page.getByRole('heading',{name:'Fehlerarchiv'}).waitFor();
  await page.getByText('1 Themen mit unsicheren Erstversuchen',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Originalantworten & Regeln'}).click();
  await page.getByText('Deine Antwort:').waitFor();
  await page.getByText(first).waitFor();
  const newer=page.getByRole('button',{name:'Neuen Kontext üben'});
  if(await newer.count()){
   await newer.first().click();
   await page.getByRole('heading',{name:'Artikelblitz'}).waitFor();
   const second=await page.locator('.exercise .prompt').innerText();
   assert.notEqual(second,first,'the new-context button must not repeat the failed item');
  }else{
   await page.getByText('Kein unversuchter Kontext',{exact:false}).waitFor();
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Fehler',exact:true}).first().click();
  await page.getByText('1 Themen mit unsicheren Erstversuchen',{exact:false}).waitFor();
 }finally{await ctx.close()}
}
try{await run(1280);await run(360);console.log('PASS: clustered errors, immutable first attempt, unseen contextual transfer, reload, desktop/mobile');}finally{await browser.close()}
