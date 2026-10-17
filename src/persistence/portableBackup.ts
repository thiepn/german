import type {Attempt, ReviewCard, ReviewEvent, LearnerSettings, Draft} from '../domain/content/types';
import type {Mission} from '../domain/mission/mission';
import {validateMission} from '../domain/mission/mission';
import type {ProductionEntry} from '../domain/production/types';
import type {DiagnosticSession} from '../domain/diagnostic/engine';
import {DB_NAME} from './schema';

export const BACKUP_FORMAT='sprachgefuehl-local-backup';
export const BACKUP_VERSION=3;
export const MAX_BACKUP_BYTES=16*1024*1024;
export const LEGACY_BACKUP_STORES=['attempts','cards','reviewEvents','settings','drafts','diagnosticSessions'] as const;
export const LEGACY_V2_STORES=[...LEGACY_BACKUP_STORES,'productionEntries'] as const;
export const BACKUP_STORES=[...LEGACY_V2_STORES,'missions'] as const;
export type BackupStore=typeof BACKUP_STORES[number];
export type BackupRecords={
 attempts:Attempt[]; cards:ReviewCard[]; reviewEvents:ReviewEvent[];
 settings:LearnerSettings[]; drafts:Draft[]; diagnosticSessions:DiagnosticSession[]; productionEntries:ProductionEntry[]; missions:Mission[];
};
type LegacyRecords=Omit<BackupRecords,'productionEntries'|'missions'>;
type V2Records=Omit<BackupRecords,'missions'>;
type Payload={format:typeof BACKUP_FORMAT;version:1|2|3;sourceDatabase:typeof DB_NAME;createdAt:string;records:BackupRecords|LegacyRecords|V2Records};
type Envelope=Omit<Payload,'version'|'records'> & {version:3;records:BackupRecords;integrity:{algorithm:'SHA-256';digest:string}};
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const nonempty=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=2048;
const safeId=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=256&&!/[\u0000-\u001f]/.test(v);
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
const recordKey=(r:Record<string,unknown>)=>r.id;
function validateRecords(records:unknown,formatVersion:1|2|3=3):asserts records is BackupRecords {
 const expected=formatVersion===1?LEGACY_BACKUP_STORES:formatVersion===2?LEGACY_V2_STORES:BACKUP_STORES;
 if(!object(records)||Object.keys(records).sort().join('|')!==[...expected].sort().join('|'))throw Error('Backup enthält unerwartete oder fehlende Datenspeicher.');
 for(const store of expected){
  const values=records[store];
  if(!Array.isArray(values)||values.length>100000)throw Error('Ungültiger Backup-Datenspeicher: '+store);
  const ids=new Set<string>();
  for(const item of values){
   if(!object(item)||!safeId(recordKey(item))||ids.has(String(item.id)))throw Error('Ungültige oder doppelte ID in '+store);
   ids.add(String(item.id));
   if(store==='attempts'&&(!safeId(item.itemId)||!safeId(item.sessionId)||!safeId(item.skillId)||!finite(item.at)||!finite(item.score)||Number(item.score)<0||Number(item.score)>1||!object(item.slots)||!['CORRECT','PARTIAL','INCORRECT','VOID'].includes(String(item.result))))throw Error('Ungültiger Versuch');
   if(store==='attempts'&&Object.values(item.slots as Record<string,unknown>).some(x=>typeof x!=='string'||x.length>10000))throw Error('Ungültige Antwortdaten');
   if(store==='cards'&&(!safeId(item.itemId)||!finite(item.dueAt)||!finite(item.stability)||!finite(item.difficulty)))throw Error('Ungültige Wiederholungskarte');
   if(store==='reviewEvents'&&(!safeId(item.cardId)||!finite(item.at)||!['Again','Hard','Good','Easy'].includes(String(item.grade))))throw Error('Ungültiges Wiederholungsereignis');
   if(store==='settings'&&(item.id!=='local'||!['BRIDGE_C1','C1_C2','C2_PLUS'].includes(String(item.entryTrack))||![10,20,30,45,60].includes(Number(item.dailyMinutes))))throw Error('Ungültige Einstellungen');
   if(store==='drafts'&&(item.id!=='active'||!safeId(item.itemId)||!safeId(item.sessionId)||!object(item.slots)))throw Error('Ungültiger Lernentwurf');
   if(store==='diagnosticSessions'&&(!safeId(item.id)||!Array.isArray(item.itemIds)||!Array.isArray(item.responses)||!['IN_PROGRESS','PAUSED','AWAITING_ASSESSMENT','COMPLETE'].includes(String(item.phase))))throw Error('Ungültige Diagnosesitzung');
   if(store==='missions'&&!validateMission(item as Mission))throw Error('Ungültige Mission');
   if(store==='productionEntries'&&(!safeId(item.itemId)||!finite(item.createdAt)||typeof item.original!=='string'||item.original.length>3000||!Array.isArray(item.revisions)||item.revisions.length>1000||item.evaluated!=='UNASSESSED'||item.revisions.some((r:unknown)=>!object(r)||!safeId(r.id)||!finite(r.at)||typeof r.text!=='string'||r.text.length>3000||typeof r.reflection!=='string'||r.reflection.length>1200)))throw Error('Ungültige Textversion');
  }
 }
}
function canonical(p:Payload){return JSON.stringify({format:p.format,version:p.version,sourceDatabase:p.sourceDatabase,createdAt:p.createdAt,records:p.records});}
async function digest(text:string):Promise<string>{
 if(!globalThis.crypto?.subtle)throw Error('SHA-256-Prüfung ist hier nicht verfügbar.');
 const bytes=new TextEncoder().encode(text);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function backupCounts(records:BackupRecords):Record<BackupStore,number>{
 return Object.fromEntries(BACKUP_STORES.map(k=>[k,records[k].length])) as Record<BackupStore,number>;
}
export async function buildPortableBackup(records:BackupRecords,createdAt=new Date().toISOString()):Promise<string>{
 validateRecords(records);
 if(!Number.isFinite(Date.parse(createdAt)))throw Error('Ungültiges Sicherungsdatum');
 const payload:Payload={format:BACKUP_FORMAT,version:BACKUP_VERSION,sourceDatabase:DB_NAME,createdAt,records};
 const body=canonical(payload);
 if(new TextEncoder().encode(body).byteLength>MAX_BACKUP_BYTES)throw Error('Backup übersteigt die 16-MiB-Grenze. Es wurde nichts verworfen.');
 return JSON.stringify({...payload,integrity:{algorithm:'SHA-256',digest:await digest(body)}},null,2);
}
export async function inspectPortableBackup(text:string):Promise<Envelope>{
 if(new TextEncoder().encode(text).byteLength>MAX_BACKUP_BYTES*2)throw Error('Backup ist zu groß.');
 let raw:unknown;
 try{raw=JSON.parse(text);}catch{throw Error('Keine gültige JSON-Sicherung.');}
 if(!object(raw)||raw.format!==BACKUP_FORMAT||![1,2,3].includes(Number(raw.version))||raw.sourceDatabase!==DB_NAME||!nonempty(raw.createdAt)||!Number.isFinite(Date.parse(String(raw.createdAt)))||!object(raw.integrity)||raw.integrity.algorithm!=='SHA-256'||!nonempty(raw.integrity.digest))throw Error('Unbekanntes oder unvollständiges Sicherungsformat.');
 validateRecords(raw.records,raw.version as 1|2|3);
 const payload:Payload={format:BACKUP_FORMAT,version:raw.version as 1|2,sourceDatabase:DB_NAME,createdAt:String(raw.createdAt),records:raw.records};
 if(await digest(canonical(payload))!==raw.integrity.digest)throw Error('Integritätsprüfung fehlgeschlagen: Die Sicherung wurde verändert oder beschädigt.');
 return {...payload,version:BACKUP_VERSION,records:(raw.version===1?{...(raw.records as LegacyRecords),productionEntries:[],missions:[]}:raw.version===2?{...(raw.records as V2Records),missions:[]}:raw.records) as BackupRecords,integrity:{algorithm:'SHA-256',digest:String(raw.integrity.digest)}};
}
