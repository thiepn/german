import {useEffect,useRef,useState} from 'react';
import type {ChangeEvent} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {TASKS,addListeningNote,clock,decodeAnchor,limitTime,listeningEntries,listeningEvidence,newListeningEntry,nextListeningTask,validateLocalAudio,fingerprintAudio,sourceMatch} from '../../domain/listening/listening';

export default function ListeningStudio({onExit,onBackup,initialSelection}:{onExit:()=>void;onBackup:()=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(initialSelection??'new');
 const [url,setUrl]=useState<string|null>(null);
 const [sourceName,setSourceName]=useState('');
 const [signature,setSignature]=useState<string|null>(null);
 const [checking,setChecking]=useState(false);
 const [legacyConfirmed,setLegacyConfirmed]=useState(false);
 const [time,setTime]=useState(0),[duration,setDuration]=useState(0),[marked,setMarked]=useState<number|null>(null);
 const [speed,setSpeed]=useState(1),[first,setFirst]=useState(''),[note,setNote]=useState(''),[reflection,setReflection]=useState('');
 const [task,setTask]=useState<string>(TASKS[0].id),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const player=useRef<HTMLAudioElement>(null),sourceToken=useRef(0);
 const rows=listeningEntries(entries),current=rows.find(e=>e.id===selected)??null,stats=listeningEvidence(entries);
 const match=signature?sourceMatch(current,signature):null;
 const sourceReady=Boolean(url&&signature&&(match==='NEW'||match==='MATCH'||(match==='LEGACY'&&legacyConfirmed)));
 useEffect(()=>{
  let alive=true;
  void loadProductionEntries().then(items=>{
   if(!alive)return;setEntries(items);
   const row=listeningEntries(items).find(r=>r.id===initialSelection)??(initialSelection?null:listeningEntries(items)[0]);
   if(row){setSelected(row.id);setTask(nextListeningTask(row).id);}
  }).catch(e=>{if(alive)setError(String(e))});
  return ()=>{alive=false;sourceToken.current++};
 },[initialSelection]);
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url]);
 function clearSource(){sourceToken.current++;setUrl(null);setSourceName('');setSignature(null);setChecking(false);setLegacyConfirmed(false);setTime(0);setDuration(0);setMarked(null);}
 function selectSession(id:string){setSelected(id);setFirst('');setNote('');setReflection('');setError('');clearSource();
  const e=rows.find(x=>x.id===id);setTask(e?nextListeningTask(e).id:TASKS[0].id);
 }
 async function selectFile(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;
  e.target.value=''; // allow reattaching the same file after an error
  clearSource();const token=sourceToken.current;
  const problem=validateLocalAudio(file.name,file.type,file.size);
  if(problem){setError(problem);return;}
  setChecking(true);setError('');
  try{
   const digest=await fingerprintAudio(file);
   if(token!==sourceToken.current)return;
   const state=sourceMatch(current,digest);
   if(state==='MISMATCH'){setError('Andere Audioquelle erkannt. Diese Datei passt nicht zur gesicherten Hörsitzung. Keine neue Notiz wurde gespeichert.');return;}
   setSignature(digest);setSourceName(file.name);setUrl(URL.createObjectURL(file));
  }catch(ex){if(token===sourceToken.current)setError('Audioquelle konnte nicht geprüft werden: '+String(ex))}
  finally{if(token===sourceToken.current)setChecking(false)}
 }
 function jump(delta:number,absolute=false){
  if(!player.current||!sourceReady)return;
  const target=limitTime(absolute?delta:player.current.currentTime+delta,player.current.duration);
  player.current.currentTime=target;setTime(target);
 }
 function replayAt(seconds:number){
  if(!player.current||!sourceReady)return;
  jump(Math.max(0,seconds-3),true);
  void player.current.play().catch(()=>setError('Autoplay wurde blockiert. Starte die Wiedergabe über die Audiosteuerung.'));
 }
 async function saveFirst(){
  if(!sourceReady||!signature||!first.trim()||busy)return;
  setBusy(true);setError('');
  try{
   const id='listening-study:'+crypto.randomUUID();
   await saveProductionEntry(newListeningEntry(id,first,Date.now(),signature),0);
   setEntries(await loadProductionEntries());setSelected(id);setFirst('');
  }catch(e){setError('Nicht gespeichert: '+String(e))}finally{setBusy(false)}
 }
 async function saveNote(){
  if(!sourceReady||!signature||!current||!note.trim()||busy)return;
  setBusy(true);setError('');
  try{
   if(sourceMatch(current,signature)==='MISMATCH'||(sourceMatch(current,signature)==='LEGACY'&&!legacyConfirmed))throw Error('Audioquelle nicht bestätigt.');
   const latest=(await loadProductionEntries()).find(e=>e.id===current.id);
   if(!latest||latest.revisions.length!==current.revisions.length||latest.decisionId!==current.decisionId)throw Error('Sitzung wurde in einem anderen Tab geändert. Bitte erneut öffnen.');
   const updated=addListeningNote(current,task,note,reflection,marked??player.current?.currentTime??0,crypto.randomUUID(),Date.now());
   await saveProductionEntry(updated,current.revisions.length);
   setEntries(await loadProductionEntries());setTask(nextListeningTask(updated).id);setNote('');setReflection('');setMarked(null);
  }catch(e){setError('Hörbeleg nicht gespeichert: '+String(e))}finally{setBusy(false)}
 }
 return <section className="listening-studio"><h1 className="page-title">Hörschärfe</h1>
 
 <div className="banner">DEMO_ONLY · 4 unbewertete Höraufträge. Verwende nur erlaubte Audiodateien. Audio und Dateinamen werden nicht gespeichert. Eine SHA-256-Stichprobenprüfsumme schützt vor versehentlich falscher Wiederzuordnung, beweist aber keine vollständige Dateigleichheit.</div>
 <div className="metrics"><div className="metric"><strong>{stats.sessions}</strong><small>Hörsitzungen</small></div><div className="metric"><strong>{stats.notes}</strong><small>Hörbelege</small></div><div className="metric"><strong>{stats.withEvidence}</strong><small>Sitzungen mit Zeitmarken</small></div></div>
 <div className="field"><label htmlFor="listen-sessions">Hörsitzung auswählen</label><select id="listen-sessions" value={selected} onChange={e=>selectSession(e.target.value)}><option value="new">Neue Hörsitzung</option>{rows.map(r=><option value={r.id} key={r.id}>{new Date(r.createdAt).toLocaleString('de-DE')} · {r.revisions.length} Belege</option>)}</select></div>
 {current&&<p className="small muted" role="status">{current.revisions.length} Hörbelege · {current.decisionId?'Originaldatei erneut auswählen.':'Ältere Sitzung: Originaldatei manuell bestätigen.'}</p>}
 <article className="panel"><h2>1 · Eigene Audioquelle</h2><p className="small muted">Max. 250 MiB · nach Neuladen Originaldatei erneut auswählen.</p>
 <div className="field"><label htmlFor="listen-file">Lokale Audiodatei auswählen</label><input id="listen-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm" onChange={e=>void selectFile(e)}/></div>
 {checking&&<p role="status" className="muted small">Lokale Audioquelle wird geprüft …</p>}
 {url?<><p className="small muted">Nur in dieser Sitzung: {sourceName}</p>
 {match==='MATCH'&&<p role="status" className="small muted">Audio-Stichprobe stimmt mit der gesicherten Sitzung überein.</p>}
 {match==='LEGACY'&&!legacyConfirmed&&<div className="banner" role="status"><p>Diese ältere Hörsitzung besitzt keine Prüfsumme. Die App kann nicht feststellen, ob du die ursprüngliche Datei ausgewählt hast. Prüfe sie selbst, bevor du fortfährst.</p><button className="button outline" type="button" onClick={()=>setLegacyConfirmed(true)}>Ältere Audioquelle bewusst bestätigen</button></div>}
 {match==='LEGACY'&&legacyConfirmed&&<p role="status" className="small muted">Ältere Aufnahme manuell bestätigt · nicht technisch verifiziert. </p>}
 <audio ref={player} src={url} aria-label="Eigene Audiodatei abspielen" controls preload="metadata" className="listen-player" onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onLoadedMetadata={e=>{setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0);e.currentTarget.playbackRate=speed}} onError={()=>setError('Audioformat vom Browser nicht abspielbar.')}/>
 <div className="listen-controls"><button className="button outline" disabled={!sourceReady} onClick={()=>jump(-10)}>−10 Sekunden</button><span className="listen-clock">{clock(time)} / {clock(duration)}</span><button className="button outline" disabled={!sourceReady} onClick={()=>jump(10)}>+10 Sekunden</button>
 <label>Tempo <select aria-label="Abspieltempo" value={speed} onChange={e=>{const v=Number(e.target.value);setSpeed(v);if(player.current)player.current.playbackRate=v}}>{[0.75,1,1.25,1.5].map(n=><option key={n} value={n}>{n}×</option>)}</select></label>
 <button className="button outline" disabled={!sourceReady} onClick={()=>setMarked(player.current?.currentTime??time)}>Zeitmarke setzen</button></div>
 {marked!==null&&<p role="status" className="small muted">Zeitmarke: {clock(marked)} (für den nächsten Hörbeleg)</p>}
 </>:<p className="small muted">Keine Audiodatei ausgewählt.</p>}
 </article>
 <article className="panel listen-writing"><h2>2 · Eigene Interpretation</h2>
 {!current?<><p>Nach dem Hören die Kernaussage ohne Transkript in eigenen Worten formulieren.</p><div className="field"><label htmlFor="listen-first">Erste Deutung der Kernaussage</label><textarea id="listen-first" rows={5} maxLength={2800} value={first} onChange={e=>setFirst(e.target.value)}/></div>
 <button className="button" disabled={!sourceReady||!first.trim()||busy} onClick={()=>void saveFirst()}>Kernaussage unveränderlich speichern</button></>:<>
 <div className="panel"><div className="kicker">Unveränderliche Erstdeutung</div><p className="written">{current.original}</p></div>
 <div className="field"><label htmlFor="listen-task">Fokus der nächsten Hörnotiz</label><select id="listen-task" value={task} onChange={e=>setTask(e.target.value)}>{TASKS.map(t=><option value={t.id} key={t.id}>{t.title}{current.revisions.some(r=>r.questionId===t.id)?' · bearbeitet':''}</option>)}</select></div>
 <p className="prompt">{TASKS.find(t=>t.id===task)?.prompt}</p>
 <div className="field"><label htmlFor="listen-note">Deine Interpretation und Begründung</label><textarea id="listen-note" rows={5} maxLength={2800} value={note} onChange={e=>setNote(e.target.value)}/></div>
 <div className="field"><label htmlFor="listen-reflection">Unsicherheiten (optional)</label><textarea id="listen-reflection" rows={3} maxLength={1000} value={reflection} onChange={e=>setReflection(e.target.value)}/></div>
 <button className="button" disabled={!sourceReady||!note.trim()||busy} onClick={()=>void saveNote()}>Hörbeleg mit Zeitmarke speichern</button>
 <h3>Gesicherte Hörbelege</h3>{current.revisions.length?current.revisions.map((r,i)=>{const at=decodeAnchor(r.paragraphId);return <div className="listen-evidence" key={r.id}><div className="kicker">{i+1}. {TASKS.find(t=>t.id===r.questionId)?.title??'Frühere Aufgabe'}</div>
 {at!==null&&<button className="button text" disabled={!sourceReady} onClick={()=>replayAt(at)}>Hörstelle {clock(at)} mit Vorlauf anhören</button>}
 <p className="written">{r.text}</p>{r.reflection&&<p className="small muted">Eigene Unsicherheit: {r.reflection}</p>}</div>}):<p className="small muted">Noch keine Hörbelege gespeichert.</p>}
 </>}
 <p className="small muted">Ungespeicherte Eingaben gehen beim Verlassen verloren.</p></article>
 {error&&<p className="banner" role="alert">{error}</p>}
 <div className="buttonrow"><button className="button outline" onClick={()=>selectSession('new')}>Neue Hörsitzung</button><button className="button outline" onClick={onBackup}>Hörnotizen sichern / wiederherstellen</button><button className="button text" onClick={onExit}>Zurück zum Curriculum</button></div></section>;
}
