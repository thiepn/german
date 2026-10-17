import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
async function open(viewport){
 const context=await browser.newContext({viewport,serviceWorkers:'allow'});
 const page=await context.newPage();await page.goto(base,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
 await page.getByRole('button',{name:'Jetzt trainieren'}).click();
 await page.getByLabel('Artikel',{exact:true}).fill('der');
 await page.getByRole('button',{name:'Antwort prüfen'}).click();
 await page.getByText('Noch nicht richtig').waitFor();
 await page.getByRole('button',{name:'Zur Übersicht'}).click();
 await page.getByRole('button',{name:'Fehler',exact:true}).first().click();
 await page.getByText('Ursprünglich:').waitFor();
 await page.getByRole('button',{name:'Ohne Lösung wiederholen'}).first().click();
 await page.getByLabel('Artikel',{exact:true}).fill('die');
 await page.getByRole('button',{name:'Antwort prüfen'}).click();
 await page.getByText('Korrekt',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Zur Übersicht'}).click();
 await page.getByRole('button',{name:'Trainieren',exact:true}).first().click();
 await page.locator('article').filter({hasText:'Kasus-Kette'}).getByRole('button',{name:'Übung starten'}).click();
 await page.getByLabel('Artikel',{exact:true}).fill('dem');
 await page.getByLabel('Adjektivform').fill('neuen');
 await page.getByRole('button',{name:'Antwort prüfen'}).click();
 await page.getByText('Korrekt',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Zur Übersicht'}).click();
 await page.getByRole('button',{name:'Trainieren',exact:true}).first().click();
 await page.locator('article').filter({hasText:'Präpositionsjagd'}).getByRole('button',{name:'Übung starten'}).click();
 await page.getByLabel('Präposition').fill('auf');
 await page.getByLabel('Kasus').fill('Dativ');
 await page.getByRole('button',{name:'Antwort prüfen'}).click();
 await page.getByText('Korrekt',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Zur Übersicht'}).click();
 await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
 await page.getByText('Gespeicherte Versuche',{exact:true}).count();
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
 const stored=Number(await page.locator('.metric').filter({hasText:'Versuche'}).locator('strong').innerText());
 assert.ok(stored>=4,'attempts persist across a reload');
 // Real service-worker offline test against the production build.
 await page.waitForFunction(()=>navigator.serviceWorker?.controller!==null,null,{timeout:15000});
 const state=await page.evaluate(async()=>{const keys=await caches.keys();return keys.filter(k=>k.startsWith('sprachgefuehl-shell-')).length;});
 assert.ok(state>0,'offline cache installed');
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByText('Sprachgefühl SG-01',{exact:false}).first().waitFor();
 await context.setOffline(false);
 const hasOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 assert.equal(hasOverflow,false,'no horizontal overflow');
 // This checks actual persistence and rendering. Offline readiness is separately measured.
 await context.close();
}
try{
 await open({width:1280,height:900});
 await open({width:360,height:800});
 console.log('PASS: Chromium desktop/mobile M01–M03, error retry, IndexedDB reload, reflow');
}finally{await browser.close();}
