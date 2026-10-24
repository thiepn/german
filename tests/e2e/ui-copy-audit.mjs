import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
async function audit(page,label){
 await page.locator('main').waitFor();
 const snapshot=await page.evaluate(()=>{
  const w=window.innerWidth;
  const selectors='.small,.banner,.status,.kicker,.tag,.reading-paragraph-id,.metric small';
  const undersized=[...document.querySelectorAll(selectors)].filter(el=>{
   const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
   return rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&Number.parseFloat(style.fontSize)<13.9;
  }).map(el=>({node:el.tagName,selector:el.className,text:el.textContent?.trim().slice(0,55),font:getComputedStyle(el).fontSize}));
  const title=document.querySelector('main h1'),main=document.querySelector('main');
  return {width:w,scroll:document.documentElement.scrollWidth,undersized,title:title?.textContent?.trim(),mainWidth:main?.getBoundingClientRect().width,panelWidths:[...document.querySelectorAll('main .panel')].filter(el=>el.getBoundingClientRect().width>0).map(el=>el.getBoundingClientRect().right)};
 });
 assert.ok(snapshot.title,'visible main heading '+label);
 assert.ok(snapshot.mainWidth>0,'main width '+label);
 assert.ok(snapshot.scroll<=snapshot.width+1,'horizontal overflow '+label+' '+JSON.stringify(snapshot));
 assert.deepEqual(snapshot.undersized,[],'small copy should be readable '+label);
 assert.ok(snapshot.panelWidths.every(x=>x<=snapshot.width+2),'panels within viewport '+label);
 const png=await page.screenshot({animations:'disabled',fullPage:false});
 assert.ok(png.byteLength>2500,'rendered screenshot not empty '+label);
 return snapshot;
}
async function nav(page,name){await page.getByRole('button',{name,exact:true}).first().click()}
try{
 for(const width of [1280,360]){
  const context=await browser.newContext({viewport:{width,height:820},serviceWorkers:'allow'}),page=await context.newPage();
  try{
   await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
   await audit(page,'onboarding');
   await page.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
   await audit(page,'today');
   assert.equal(await page.locator('.mission-step').count(),0,'static decorative mission timeline removed');
   await page.getByRole('button',{name:'Diagnostik A · Status ansehen'}).click();await audit(page,'diagnostic');await page.getByRole('button',{name:'Zurück zum Lernen'}).click();
   await nav(page,'Heute');
   await page.getByRole('button',{name:'Schreibwerkstatt öffnen'}).click();await audit(page,'writing');await page.getByRole('button',{name:'Zurück zur Übersicht'}).click();
   await nav(page,'Heute');
   await page.getByRole('button',{name:'Lesestudien öffnen'}).click();await audit(page,'reading');await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
   await nav(page,'Heute');
   await page.getByRole('button',{name:'Pragmatische Situationen'}).click();await audit(page,'pragmatics');await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
   await nav(page,'Heute');
   await page.getByRole('button',{name:'Hörschärfe · Eigene Audiodatei'}).click();await audit(page,'listening');await page.getByRole('button',{name:'Zurück zum Curriculum'}).click();
   await nav(page,'Heute');
   await page.getByRole('button',{name:'Backup und Wiederherstellung'}).click();await audit(page,'data');await page.getByRole('button',{name:'Zurück zur Übersicht'}).click();
   await nav(page,'Lernen');await audit(page,'curriculum');
   await nav(page,'Trainieren');await audit(page,'training overview');
   await page.getByRole('button',{name:/Fällige Wiederholungen \(/}).click();await audit(page,'review queue');
   await nav(page,'Fehler');await audit(page,'error archive');
   await nav(page,'Fortschritt');await audit(page,'progress');
   await page.getByRole('button',{name:'Schreibspuren ansehen'}).click();await audit(page,'writing archive');
   console.log('PASS copy audit: 13 screens, readable secondary text, reflow '+width);
  }finally{await context.close()}
 }
}finally{await browser.close()}
