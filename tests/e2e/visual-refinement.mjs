import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const base='http://127.0.0.1:4173/';
async function geometry(page,label){
 const g=await page.evaluate(()=>{
  const main=document.querySelector('main');
  const title=main?.querySelector('h1.page-title');
  const width=window.innerWidth;
  const nav=[...document.querySelectorAll('.bottomnav button')].filter(el=>el.getClientRects().length>0);
  return {
   width,overflow:document.documentElement.scrollWidth-width,
   heading:title?.textContent?.trim()??'',titleOffset:title&&main?title.getBoundingClientRect().top-main.getBoundingClientRect().top-parseFloat(getComputedStyle(main).paddingTop):null,
   nav:nav.map(el=>({text:el.textContent?.trim(),height:el.getBoundingClientRect().height,width:el.clientWidth,scrollWidth:el.scrollWidth,border:getComputedStyle(el).borderTopWidth})),
  };
 });
 assert.ok(g.heading,'main heading '+label);
 assert.ok(g.overflow<=1,'no horizontal overflow '+label+' '+JSON.stringify(g));
 if(!g.nav.length)assert.ok(label.startsWith('onboarding')||g.width>700,'mobile tabs expected outside onboarding '+label);
 else{
  assert.equal(g.nav.length,5,'five mobile routes '+label);
  assert.ok(g.nav.every(n=>n.height>=44&&n.border==='3px'&&n.scrollWidth<=n.width+1),'stable accessible mobile navigation '+label+' '+JSON.stringify(g.nav));
  assert.ok(Math.max(...g.nav.map(n=>n.height))-Math.min(...g.nav.map(n=>n.height))<1,'same nav row height '+label);
 }
 const screenshot=await page.screenshot({animations:'disabled'});
 assert.ok(screenshot.length>2500,'actual browser screenshot '+label);
 return g;
}
async function select(page,tab){await page.getByRole('button',{name:tab,exact:true}).first().click()}
try{
 for(const [width,scheme] of [[320,'light'],[360,'light'],[768,'light'],[1280,'light'],[360,'dark']]){
  const context=await browser.newContext({viewport:{width,height:820},colorScheme:scheme,serviceWorkers:'allow'});
  const page=await context.newPage();
  try{
   await page.goto(base,{waitUntil:'networkidle'});
   let g=await geometry(page,'onboarding '+width+' '+scheme);
   assert.ok(g.titleOffset!==null&&Math.abs(g.titleOffset)<3,'no orphan top margin on onboarding '+JSON.stringify(g));
   await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
   g=await geometry(page,'today '+width+' '+scheme);
   assert.ok(Math.abs(g.titleOffset)<3,'no extra headline offset '+JSON.stringify(g));
   if(width<=700){
    await select(page,'Lernen');
    let other=await geometry(page,'learning '+width+' '+scheme);
    assert.ok(Math.abs(other.titleOffset)<3,'curriculum heading aligns '+JSON.stringify(other));
    await select(page,'Heute');
    g=await geometry(page,'today return '+width+' '+scheme);
    assert.ok(g.nav[0].text==='Heute');
   }
   await page.getByRole('button',{name:'Lesestudien öffnen'}).click();
   await geometry(page,'reading '+width+' '+scheme);
   await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
   await select(page,'Heute');
   await page.getByRole('button',{name:'Hörschärfe · Eigene Audiodatei'}).click();
   await geometry(page,'listening '+width+' '+scheme);
   await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
   await select(page,'Heute');
   await page.getByRole('button',{name:'Schreibwerkstatt öffnen'}).click();
   await geometry(page,'writing '+width+' '+scheme);
   await page.getByLabel('Deine erste Formulierung').fill('Die Aussage ist zwar korrekt, aber im Kontext nicht präzise genug.');
   await page.getByRole('button',{name:'Erstfassung unveränderlich speichern'}).click();
   const label=page.locator('.review-checklist label').first();
   await label.waitFor();
   const hit=await label.evaluate(el=>({height:el.getBoundingClientRect().height,min:getComputedStyle(el).minHeight}));
   assert.ok(hit.height>=44,'checkbox touch area at least 44px '+width+' '+JSON.stringify(hit));
   await page.getByRole('button',{name:'Zurück zur Übersicht'}).click();
   await select(page,'Trainieren');
   await page.getByRole('button',{name:'Übung starten'}).first().click();
   await geometry(page,'exercise '+width+' '+scheme);
   assert.equal(await page.getByRole('button',{name:'Training verlassen'}).count(),1);
   for(const input of await page.locator('.exercise input').all())await input.fill('x');
   await page.getByRole('button',{name:'Antwort prüfen'}).click();
   await page.getByRole('button',{name:'Zur Übersicht',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Training verlassen'}).count(),0,'graded exercise has only one exit option');
   await geometry(page,'graded exercise '+width+' '+scheme);
   await page.getByRole('button',{name:'Zur Übersicht',exact:true}).click();
   await select(page,'Fortschritt');
   await page.getByRole('button',{name:'Schreibspuren ansehen'}).click();
   await geometry(page,'archive '+width+' '+scheme);
   const filters=await page.locator('.archive-filters .field').evaluateAll(els=>els.map(el=>({m:getComputedStyle(el).marginTop,width:el.getBoundingClientRect().width})));
   assert.ok(filters.every(x=>x.m==='0px'&&x.width>0),'no doubled field margins '+JSON.stringify(filters));
   console.log('PASS visual-refinement: rendered typography, hierarchy, mobile navigation, touch targets and archive '+width+' '+scheme);
  }finally{await context.close()}
 }
}finally{await browser.close()}
