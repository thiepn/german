import {chromium} from 'playwright';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
function wav(modified=false){const n=8000,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);if(modified)b[400]=11;return b}
async function open(c){const p=await c.newPage();await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});await p.getByRole('button',{name:'Mit dem Lernen beginnen'}).click();return p}
async function listening(p){await p.getByRole('button',{name:'Lernen',exact:true}).first().click();await p.locator('article').filter({hasText:'Hören und Hörpragmatik'}).getByRole('button',{name:'Hörschärfe öffnen'}).click();await p.getByRole('heading',{name:'Hörschärfe',exact:true}).waitFor()}
async function attach(p,buffer,name){await p.getByLabel('Lokale Audiodatei auswählen').setInputFiles({name,mimeType:'audio/wav',buffer})}
try{
 for(const width of [1280,360]){
  const first=await browser.newContext({acceptDownloads:true,viewport:{width,height:830}}),p=await open(first);
  try{
   await listening(p);await attach(p,wav(),'original.wav');
   await p.getByLabel('Erste Deutung der Kernaussage').fill('Die Kernthese wird vorsichtig formuliert.');
   await p.getByRole('button',{name:'Kernaussage unveränderlich speichern'}).click();
   await p.getByText('Unveränderliche Erstdeutung').waitFor();
   await p.reload({waitUntil:'networkidle'});await listening(p);
   await p.getByText('Die Kernthese wird vorsichtig formuliert.').waitFor();
   assert.equal(await p.locator('audio').count(),0);
   await attach(p,wav(true),'wrong.wav');
   await p.getByRole('alert').getByText(/Andere Audioquelle erkannt/).waitFor();
   assert.equal(await p.locator('audio').count(),0);
   assert.equal(await p.getByRole('button',{name:'Hörbeleg mit Zeitmarke speichern'}).isDisabled(),true);
   await attach(p,wav(),'renamed.wav');
   await p.getByText('Audio-Stichprobe stimmt').waitFor();
   await p.getByRole('button',{name:'Zeitmarke setzen'}).click();
   await p.getByLabel('Deine Interpretation und Begründung').fill('Der Vorbehalt ist hörbar.');
   await p.getByRole('button',{name:'Hörbeleg mit Zeitmarke speichern'}).click();
   await p.locator('.listen-evidence').getByText('Der Vorbehalt ist hörbar.').waitFor();
   await p.getByRole('button',{name:/Hörstelle .* mit Vorlauf anhören/}).click();
   await p.getByRole('button',{name:'Hörnotizen sichern / wiederherstellen'}).click();
   const [download]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'JSON-Sicherung herunterladen'}).click()]);
   const backup=await readFile(await download.path(),'utf8'),parsed=JSON.parse(backup);
   assert.equal(parsed.version,3);
   assert.equal(parsed.records.productionEntries.length,1);
   assert.match(parsed.records.productionEntries[0].decisionId,/^audio-sample-sha256-v1:[a-f0-9]{64}$/);
   assert.equal(backup.includes('original.wav'),false);assert.equal(backup.includes('renamed.wav'),false);
   const restored=await browser.newContext({acceptDownloads:true,viewport:{width,height:830}}),q=await open(restored);
   try{
    await q.getByRole('button',{name:'Daten & Sicherung'}).click();
    await q.getByLabel('Eigene Sprachgefühl-Sicherung auswählen').setInputFiles({name:'m08-backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});
    await q.getByText(/1 Hörsitzungen mit 1 Hörbelegen/).waitFor();
    await q.getByRole('button',{name:'Geprüfte Daten ergänzen'}).click();
    await q.getByRole('button',{name:'Hörsitzungen öffnen'}).click();
    await q.getByText('Die Kernthese wird vorsichtig formuliert.').waitFor();
    assert.equal(await q.locator('audio').count(),0);
    await attach(q,wav(true),'wrong-after-import.wav');
    await q.getByRole('alert').getByText(/Andere Audioquelle erkannt/).waitFor();
    await attach(q,wav(),'correct-after-import.wav');
    await q.getByText('Audio-Stichprobe stimmt').waitFor();
    await q.getByLabel('Deine Interpretation und Begründung').fill('Der Redner grenzt den Schluss weiter ein.');
    await q.getByRole('button',{name:'Hörbeleg mit Zeitmarke speichern'}).click();
    await q.locator('.listen-evidence').getByText('Der Redner grenzt den Schluss weiter ein.').waitFor();
    console.log('PASS M08 audio mismatch and backup roundtrip '+width);
   }finally{await restored.close()}
  }finally{await first.close()}
 }
 const c=await browser.newContext({viewport:{width:1280,height:830}}),p=await open(c);
 try{
  await p.evaluate(async()=>{
   const request=indexedDB.open('sprachgefuehl-learning-v1');const db=await new Promise((yes,no)=>{request.onsuccess=()=>yes(request.result);request.onerror=()=>no(request.error)});
   const tx=db.transaction('productionEntries','readwrite');
   tx.objectStore('productionEntries').put({id:'listening-study:legacy',kind:'LISTENING_STUDY',itemId:'SG-L08-LOCAL',itemVersion:1,sourceId:'USER_AUDIO_NOT_STORED',createdAt:Date.now(),original:'Ältere, ungeprüfte Aufnahme.',revisions:[],evaluated:'UNASSESSED'});
   await new Promise((yes,no)=>{tx.oncomplete=yes;tx.onerror=()=>no(tx.error)});
  });
  await listening(p);await p.getByText('Ältere, ungeprüfte Aufnahme.').waitFor();
  await attach(p,wav(),'legacy.wav');
  await p.getByRole('button',{name:'Ältere Audioquelle bewusst bestätigen'}).waitFor();
  await p.getByLabel('Deine Interpretation und Begründung').fill('Vermutung mit Vorbehalt.');
  assert.equal(await p.getByRole('button',{name:'Hörbeleg mit Zeitmarke speichern'}).isDisabled(),true);
  await p.getByRole('button',{name:'Ältere Audioquelle bewusst bestätigen'}).click();
  await p.getByRole('button',{name:'Hörbeleg mit Zeitmarke speichern'}).click();
  await p.locator('.listen-evidence').getByText('Vermutung mit Vorbehalt.').waitFor();
  console.log('PASS M08 legacy source consent before notes');
 }finally{await c.close()}
}finally{await browser.close()}
