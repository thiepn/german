import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
function silentWav(){const n=8000,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);return b}
try{
 for(const width of [1280,360]){
  const c=await browser.newContext({viewport:{width,height:820},serviceWorkers:'allow'}),p=await c.newPage();
  try{
   await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
   await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();
   await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
   await p.locator('article').filter({hasText:'Hören und Hörpragmatik'}).getByRole('button',{name:'Hörschärfe öffnen'}).click();
   assert.equal(await p.getByRole('button',{name:'Kernaussage unveränderlich speichern'}).isDisabled(),true);
   await p.getByLabel('Lokale Audiodatei auswählen').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('bad')});
   await p.getByRole('alert').waitFor();
   await p.getByLabel('Lokale Audiodatei auswählen').setInputFiles({name:'private.wav',mimeType:'audio/wav',buffer:silentWav()});
   await p.waitForFunction(()=>{const a=document.querySelector('audio');return !!a&&a.readyState>=1&&Number.isFinite(a.duration)});
   await p.getByLabel('Erste Deutung der Kernaussage').fill('Die Aussage bleibt vorläufig.');
   await p.getByRole('button',{name:'Kernaussage unveränderlich speichern'}).click();
   await p.getByText('Unveränderliche Erstdeutung').waitFor();
   await p.getByRole('button',{name:'Zeitmarke setzen'}).click();
   await p.getByLabel('Deine Interpretation und Begründung').fill('Eine ausdrückliche Einschränkung ist hörbar.');
   await p.getByRole('button',{name:'Hörbeleg mit Zeitmarke speichern'}).click();
   await p.getByText('Eine ausdrückliche Einschränkung ist hörbar.').waitFor();
   await p.reload({waitUntil:'networkidle'});
   await p.getByRole('button',{name:'Lernen',exact:true}).first().click();
   await p.locator('article').filter({hasText:'Hören und Hörpragmatik'}).getByRole('button',{name:'Hörschärfe öffnen'}).click();
   await p.getByLabel('Hörsitzung auswählen').selectOption({index:1});
   await p.getByText('Die Aussage bleibt vorläufig.').waitFor();
   assert.equal(await p.locator('audio').count(),0);
   assert.equal(await p.getByRole('button',{name:'Hörbeleg mit Zeitmarke speichern'}).isDisabled(),true);
   const entries=await p.evaluate(async()=>{const req=indexedDB.open('sprachgefuehl-learning-v1');const db=await new Promise((yes,no)=>{req.onsuccess=()=>yes(req.result);req.onerror=()=>no(req.error)});const q=db.transaction('productionEntries','readonly').objectStore('productionEntries').getAll();return new Promise((yes,no)=>{q.onsuccess=()=>yes(q.result);q.onerror=()=>no(q.error)})});
   assert.equal(entries.length,1);assert.equal(entries[0].revisions.length,1);
   assert.equal(entries[0].sourceId,'USER_AUDIO_NOT_STORED');assert.equal(JSON.stringify(entries).includes('private.wav'),false);
   await p.getByRole('button',{name:'Zurück zum Curriculum'}).click();
   await p.getByRole('button',{name:'Fortschritt',exact:true}).first().click();
   await p.getByRole('heading',{name:'Hörschärfe · G10'}).waitFor();
   await p.getByRole('button',{name:'Schreibspuren ansehen'}).click();
   await p.getByLabel('Textart').selectOption('G10_LISTENING');
   await p.locator('.archive-entry').first().click();
   await p.getByRole('button',{name:'Originalen Lernbereich öffnen'}).click();
   await p.getByText('Die Aussage bleibt vorläufig.').waitFor();
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   console.log('PASS M08 local audio, evidence and resume '+width);
  }finally{await c.close()}
 }
}finally{await browser.close()}
