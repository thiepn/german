import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:1280,height:900},{width:360,height:800}]){
  const context=await browser.newContext({viewport,serviceWorkers:'allow'});const page=await context.newPage();
  try{
   await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
   await page.getByRole('button',{name:'Trainieren',exact:true}).first().click();
   for(const mode of ['Wortgefühl','Stilwechsel']){
    await page.locator('article').filter({has:page.getByRole('heading',{name:mode,exact:true})}).getByRole('button',{name:'Übung starten'}).click();
    const buttons=page.getByRole('group',{name:'Wähle die kontextuell angemessene Formulierung'}).getByRole('button');
    assert.equal(await buttons.count(),3);await buttons.first().click();
    await page.getByRole('button',{name:'Antwort prüfen'}).click();
    await page.getByText('Vorgeschlagene Lösung (Entwurf):').waitFor();
    await page.getByRole('button',{name:'Zur Übersicht'}).click();
    await page.getByRole('button',{name:'Trainieren',exact:true}).first().click();
   }
   await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
   await page.reload({waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
   const total=Number(await page.locator('.metric').filter({hasText:'Versuche'}).locator('strong').innerText());
   assert.equal(total,2,'both original attempts persisted');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
  }finally{await context.close();}
 }
 console.log('PASS M06/M07 desktop/mobile and reload');
}finally{await browser.close();}
