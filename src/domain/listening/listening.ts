import type {ProductionEntry} from '../production/types';
export const LISTENING_ITEM='SG-L08-LOCAL';
/** Sampled SHA-256 is a file-reattachment aid, NOT proof that every byte matches. */
export const SOURCE_SIGNATURE_PREFIX='audio-sample-sha256-v1:';
const SAMPLE_BYTES=65536;
export async function fingerprintAudio(file:Blob):Promise<string>{
 if(!Number.isFinite(file.size)||file.size<=0||file.size>250*1024*1024)throw Error('Ungültige Audiodateigröße.');
 if(!globalThis.crypto?.subtle)throw Error('SHA-256 ist in diesem Browser nicht verfügbar.');
 const locations=[0,Math.floor(Math.max(0,file.size-SAMPLE_BYTES)/2),Math.max(0,file.size-SAMPLE_BYTES)];
 const parts=await Promise.all(locations.map(async p=>new Uint8Array(await file.slice(p,p+SAMPLE_BYTES).arrayBuffer())));
 const header=new TextEncoder().encode('Sprachgefuehl M08 local sample v1:'+file.size+':'+locations.join(',')+':');
 const bytes=new Uint8Array(header.length+parts.reduce((n,p)=>n+p.length,0));
 bytes.set(header);let position=header.length;
 for(const part of parts){bytes.set(part,position);position+=part.length;}
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return SOURCE_SIGNATURE_PREFIX+[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function sourceMatch(entry:ProductionEntry|null,digest:string):'NEW'|'MATCH'|'MISMATCH'|'LEGACY'{
 if(!entry)return 'NEW';
 if(!isListeningEntry(entry))return 'MISMATCH';
 const saved=entry.decisionId;
 if(!saved)return 'LEGACY';
 return /^audio-sample-sha256-v1:[a-f0-9]{64}$/.test(saved)&&saved===digest?'MATCH':'MISMATCH';
}

export const TASKS=[
 {id:'position',title:'Position und Perspektive',prompt:'Was vertritt die sprechende Person? Trenne hörbare Aussage und eigene Interpretation.'},
 {id:'reasons',title:'Begründung und Belege',prompt:'Welche Begründung wird tatsächlich genannt? Markiere die hörbare Stelle.'},
 {id:'limits',title:'Einschränkung und Ton',prompt:'Wo relativiert oder begrenzt die Person ihre Aussage? Beachte Modalität und Betonung.'},
 {id:'transfer',title:'Verständliche Zusammenfassung',prompt:'Fasse die Kernaussage neutral für eine fachfremde Person zusammen, ohne zusätzliche Fakten.'}
] as const;
export type ListeningTaskId=typeof TASKS[number]['id'];
export function isListeningEntry(e:ProductionEntry):boolean{return e.kind==='LISTENING_STUDY'&&e.itemId===LISTENING_ITEM&&e.id.startsWith('listening-study:')}
export function listeningEntries(entries:readonly ProductionEntry[]):ProductionEntry[]{return entries.filter(isListeningEntry).sort((a,b)=>b.createdAt-a.createdAt)}
export function listeningEvidence(entries:readonly ProductionEntry[]){
 const sessions=listeningEntries(entries);
 return {sessions:sessions.length,notes:sessions.reduce((n,e)=>n+e.revisions.length,0),withEvidence:sessions.filter(e=>e.revisions.some(r=>decodeAnchor(r.paragraphId)!==null)).length};
}
export function validateLocalAudio(name:string,mime:string,size:number):string|null{
 if(!Number.isFinite(size)||size<=0||size>250*1024*1024)return 'Audiodatei: erlaubte Größe 1 Byte bis 250 MiB.';
 if(!/\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|webm)$/i.test(name)&&!mime.startsWith('audio/'))return 'Bitte eine echte Audiodatei auswählen.';
 return null;
}
export function clock(seconds:number):string{const s=Math.floor(Number.isFinite(seconds)?Math.max(0,seconds):0);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
export function limitTime(s:number,length:number):number{return Number.isFinite(s)?Math.max(0,Math.min(s,Number.isFinite(length)&&length>0?length:Math.max(0,s))):0}
export function encodeAnchor(s:number):string{if(!Number.isFinite(s)||s<0||s>86400)throw Error('Invalid time anchor');return 't='+s.toFixed(1)}
export function decodeAnchor(s:string|undefined):number|null{if(!s||!/^t=\d{1,5}\.\d$/.test(s))return null;const n=Number(s.slice(2));return Number.isFinite(n)&&n<=86400?n:null}
export function newListeningEntry(id:string,text:string,at:number,fingerprint?:string):ProductionEntry{
 if(!id.startsWith('listening-study:')||!text.trim()||!Number.isFinite(at))throw Error('Invalid listening note');
 if(fingerprint&&!/^audio-sample-sha256-v1:[a-f0-9]{64}$/.test(fingerprint))throw Error('Invalid audio signature');
 return {id,kind:'LISTENING_STUDY',itemId:LISTENING_ITEM,itemVersion:1,sourceId:'USER_AUDIO_NOT_STORED',...(fingerprint?{decisionId:fingerprint}:{}),createdAt:at,original:text.trim(),revisions:[],evaluated:'UNASSESSED'};
}
export function addListeningNote(old:ProductionEntry,taskId:string,text:string,reflection:string,time:number,id:string,at:number):ProductionEntry{
 if(!isListeningEntry(old)||!TASKS.some(t=>t.id===taskId)||!id||!text.trim()||text.length>3000||reflection.length>1200||!Number.isFinite(at))throw Error('Invalid listening revision');
 return {...old,revisions:[...old.revisions,{id,at,text:text.trim(),reflection:reflection.trim(),questionId:taskId,paragraphId:encodeAnchor(time)}]};
}
export function nextListeningTask(entry:ProductionEntry){return TASKS.find(t=>!entry.revisions.some(r=>r.questionId===t.id))??TASKS[0]}
