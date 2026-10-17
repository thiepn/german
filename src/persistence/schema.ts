import type {Attempt,ReviewCard,ReviewEvent,LearnerSettings,Draft} from '../domain/content/types';
export const DB_NAME='sprachgefuehl-learning-v1';
export const DB_VERSION=1;
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
