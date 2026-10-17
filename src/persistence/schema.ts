import type {Mission} from '../domain/mission/mission';
import type {ProductionEntry} from '../domain/production/types';
import type {DiagnosticSession} from '../domain/diagnostic/engine';
import type {Attempt,ReviewCard,ReviewEvent,LearnerSettings,Draft} from '../domain/content/types';
export const DB_NAME='sprachgefuehl-learning-v1';
export const DB_VERSION=4;
import {BACKUP_STORES,type BackupRecords,type BackupStore} from './portableBackup';
export type Snapshot={attempts:Attempt[];cards:ReviewCard[];reviewEvents:ReviewEvent[];settings:LearnerSettings|null;draft:Draft|null;};
let singleton:Promise<IDBDatabase>|null=null;
export function openLearnerDB():Promise<IDBDatabase>{
 if(singleton)return singleton;
 singleton=new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(Error('IndexedDB ist nicht verfügbar.'));return;}
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;
   if(!db.objectStoreNames.contains('attempts')){const s=db.createObjectStore('attempts',{keyPath:'id'});s.createIndex('sessionItem',['sessionId','itemId'],{unique:true});}
   if(!db.objectStoreNames.contains('cards'))db.createObjectStore('cards',{keyPath:'id'});
   if(!db.objectStoreNames.contains('reviewEvents'))db.createObjectStore('reviewEvents',{keyPath:'id'});
   if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings',{keyPath:'id'});
   if(!db.objectStoreNames.contains('drafts'))db.createObjectStore('drafts',{keyPath:'id'});
   if(!db.objectStoreNames.contains('diagnosticSessions'))db.createObjectStore('diagnosticSessions',{keyPath:'id'});
   if(!db.objectStoreNames.contains('productionEntries'))db.createObjectStore('productionEntries',{keyPath:'id'});
   if(!db.objectStoreNames.contains('missions'))db.createObjectStore('missions',{keyPath:'id'});
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>{singleton=null;reject(req.error)};
  req.onblocked=()=>{singleton=null;reject(Error('Datenbank ist in einem anderen Tab geöffnet.'))};
 });
 return singleton;
}
function done(tx:IDBTransaction):Promise<void>{return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('Abgebrochene Transaktion'));});}
export async function loadSnapshot():Promise<Snapshot>{
 const db=await openLearnerDB();const tx=db.transaction(['attempts','cards','reviewEvents','settings','drafts'],'readonly');
 const q=<T>(store:string):Promise<T[]>=>new Promise((resolve,reject)=>{const req=tx.objectStore(store).getAll();req.onsuccess=()=>resolve(req.result as T[]);req.onerror=()=>reject(req.error)});
 const [attempts,cards,reviewEvents,settings,drafts]=await Promise.all([q<Attempt>('attempts'),q<ReviewCard>('cards'),q<ReviewEvent>('reviewEvents'),q<LearnerSettings>('settings'),q<Draft>('drafts')]);
 await done(tx);return {attempts,cards,reviewEvents,settings:settings.find(x=>x.id==='local')??null,draft:drafts.find(x=>x.id==='active')??null};
}
export async function saveSettings(settings:LearnerSettings):Promise<void>{const db=await openLearnerDB();const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(settings);await done(tx);}
export async function saveDraft(draft:Draft|null):Promise<void>{const db=await openLearnerDB();const tx=db.transaction('drafts','readwrite');if(draft)tx.objectStore('drafts').put(draft);else tx.objectStore('drafts').delete('active');await done(tx);}
export async function saveAttemptOnce(attempt:Attempt,card:ReviewCard|null):Promise<boolean>{
 const db=await openLearnerDB();const tx=db.transaction(['attempts','cards','drafts'],'readwrite');const store=tx.objectStore('attempts');
 const idx=store.index('sessionItem');const existing=await new Promise<Attempt|undefined>((resolve,reject)=>{const r=idx.get([attempt.sessionId,attempt.itemId]);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 if(existing){tx.abort();try{await done(tx);}catch{}return false;}
 store.add(attempt);
 if(card){const cs=tx.objectStore('cards');const got=cs.get(card.id);got.onsuccess=()=>{if(!got.result)cs.add(card)};}
 tx.objectStore('drafts').delete('active');await done(tx);return true;
}
export async function saveReview(event:ReviewEvent,card:ReviewCard):Promise<boolean>{
 const db=await openLearnerDB();const tx=db.transaction(['reviewEvents','cards'],'readwrite');
 const s=tx.objectStore('reviewEvents');const existing=await new Promise<ReviewEvent|undefined>((resolve,reject)=>{const r=s.get(event.id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 if(existing){tx.abort();try{await done(tx)}catch{}return false;}
 s.add(event);tx.objectStore('cards').put(card);await done(tx);return true;
}

// Additive v1 -> v2 migration: existing stores and keys are never renamed or cleared.
export async function saveDiagnosticSession(s:DiagnosticSession):Promise<void>{
 const db=await openLearnerDB();const tx=db.transaction('diagnosticSessions','readwrite');tx.objectStore('diagnosticSessions').put(s);await done(tx);
}
export async function loadDiagnosticSession(id:string):Promise<DiagnosticSession|null>{
 const db=await openLearnerDB();const tx=db.transaction('diagnosticSessions','readonly');
 const value=await new Promise<DiagnosticSession|undefined>((resolve,reject)=>{const req=tx.objectStore('diagnosticSessions').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
 await done(tx);return value??null;
}

/** Read all six stores, including paused and historical diagnostic sessions. */
export async function readAllRecords():Promise<BackupRecords>{
 const db=await openLearnerDB();const stores=[...BACKUP_STORES] as BackupStore[];
 const tx=db.transaction(stores,'readonly');const finished=done(tx);
 const result=await Promise.all(stores.map(store=>new Promise<unknown[]>((resolve,reject)=>{
  const q=tx.objectStore(store).getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
 })));
 await finished;
 return Object.fromEntries(stores.map((store,i)=>[store,result[i]])) as BackupRecords;
}
/** Merge-only restoration. A conflicting history ID rejects the whole import before any write. */
export async function mergeBackupRecords(incoming:BackupRecords):Promise<{inserted:number;skipped:number}>{
 const stores=[...BACKUP_STORES] as BackupStore[];
 const current=await readAllRecords();const toInsert:Partial<Record<BackupStore,unknown[]>>={};let inserted=0,skipped=0;
 for(const store of stores){
  const known=new Map((current[store] as {id:string}[]).map(row=>[row.id,row]));
  const pending:unknown[]=[];
  for(const record of incoming[store]){
   const old=known.get(record.id);
   if(old){
    if(store!=='settings'&&store!=='drafts'&&JSON.stringify(old)!==JSON.stringify(record))throw Error('Abweichender vorhandener Datensatz in '+store+': '+record.id);
    skipped++;continue;
   }
   pending.push(record);inserted++;
  }
  toInsert[store]=pending;
 }
 if(inserted===0)return {inserted,skipped};
 const db=await openLearnerDB();const tx=db.transaction(stores,'readwrite');const finished=done(tx);
 for(const store of stores)for(const row of toInsert[store]??[])tx.objectStore(store).add(row);
 await finished;return {inserted,skipped};
}

export async function loadProductionEntries():Promise<ProductionEntry[]>{
 const db=await openLearnerDB();const tx=db.transaction('productionEntries','readonly');const completed=done(tx);
 const records=await new Promise<ProductionEntry[]>((resolve,reject)=>{const q=tx.objectStore('productionEntries').getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 await completed;return records.sort((a,b)=>b.createdAt-a.createdAt);
}
/** Immutable first draft. A revision appends without replacing the original text. */
export async function saveProductionEntry(entry:ProductionEntry,revisionExpected:number):Promise<void>{
 const db=await openLearnerDB();const tx=db.transaction('productionEntries','readwrite');const completed=done(tx);
 const s=tx.objectStore('productionEntries');const previous=await new Promise<ProductionEntry|undefined>((resolve,reject)=>{const q=s.get(entry.id);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 const count=previous?.revisions.length??0;
 if(count!==revisionExpected){tx.abort();try{await completed}catch{}throw Error('Schreibversion wurde inzwischen verändert. Bitte neu laden.');}
 if(previous&&(previous.original!==entry.original||previous.itemId!==entry.itemId||previous.createdAt!==entry.createdAt||entry.revisions.length!==count+1||entry.revisions.slice(0,-1).some((r,i)=>JSON.stringify(r)!==JSON.stringify(previous.revisions[i])))){
  tx.abort();try{await completed}catch{}throw Error('Gespeicherte Erstfassungen und Überarbeitungen sind unveränderlich.');
 }
 if(!previous&&(!entry.original.trim()||entry.revisions.length!==0)){tx.abort();try{await completed}catch{}throw Error('Ungültige Erstfassung.');}
 s.put(entry);await completed;
}

/** Mission writes stay in the same original learner database. */
export async function loadActiveMission():Promise<Mission|null>{
 const db=await openLearnerDB();const tx=db.transaction('missions','readonly');const finished=done(tx);
 const all=await new Promise<Mission[]>((resolve,reject)=>{const q=tx.objectStore('missions').getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 await finished;return all.filter(m=>m.phase!=='COMPLETE').sort((a,b)=>b.updatedAt-a.updatedAt)[0]??null;
}
export async function saveMission(m:Mission):Promise<void>{
 const db=await openLearnerDB();const tx=db.transaction('missions','readwrite');
 tx.objectStore('missions').put(m);await done(tx);
}
/** Advance is atomic with a check for an immutable first attempt at the current step. */
export async function completeMissionStep(m:Mission,now:number):Promise<Mission>{
 const db=await openLearnerDB();
 const tx=db.transaction(['missions','attempts','drafts'],'readwrite');const finished=done(tx);
 const get=<T>(store:string,key:string)=>new Promise<T|undefined>((resolve,reject)=>{const q=tx.objectStore(store).get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 const current=await get<Mission>('missions',m.id);
 if(!current||current.phase!=='IN_PROGRESS'||current.index!==m.index){tx.abort();try{await finished}catch{}throw Error('Mission wurde in einem anderen Tab verändert.');}
 const step=current.steps[current.index];
 if(!step){tx.abort();try{await finished}catch{}throw Error('Mission ist bereits abgeschlossen.');}
 const attempt=await get<Attempt>('attempts',current.id+':'+step.itemId);
 if(!attempt||attempt.itemVersion!==step.itemVersion){tx.abort();try{await finished}catch{}throw Error('Zuerst Antwort dauerhaft speichern.');}
 const index=current.index+1;
 const next:Mission={...current,index,updatedAt:now,phase:index===current.steps.length?'COMPLETE':'IN_PROGRESS'};
 tx.objectStore('missions').put(next);tx.objectStore('drafts').delete('active');
 await finished;return next;
}
