import {useEffect,useRef,useState} from 'react';
import type {ChangeEvent} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {TASKS,addListeningNote,clock,decodeAnchor,isListeningEntry,limitTime,listeningEntries,listeningEvidence,newListeningEntry,nextListeningTask,validateLocalAudio} from '../../domain/listening/listening';
export default function ListeningStudio({onExit,initialSelection}:{onExit:()=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(initialSelection??'new');
 const [url,setUrl]=useState<string|null>(null);
 const [sourceName,setSourceName]=useState('');
 const [time,setTime]=useState(0),[duration,setDuration]=useState(0),[marked,setMarked]=useState<number|null>(null);
 const [speed,setSpeed]=useState(1),[first,setFirst]=useState(''),[note,setNote]=useState(''),[reflection,setReflection]=useState('');
 const [task,setTask]=useState<string>(TASKS[0].id),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const player=useRef<HTMLAudioElement>(null),rows=listeningEntries(entries),current=rows.find(e=>e.id===selected),stats=listeningEvidence(entries);
 useEffect(()=>{void loadProductionEntries().then(setEntries).catch(e=>setError(String(e)))},[]);
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url]);
 function clearSource(){setUrl(null);setSourceName('');setTime(0);setDuration(0);setMarked(null)}
 function selectSession(id:string){setSelected(id);setFirst('');setNote('');setReflection('');setError('');clearSource();const e=rows.find(x=>x.id===id);setTask(e?nextListeningTask(e).id:TASKS[0].id)}
 function selectFile(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;
  const problem=validateLocalAudio(file.name,file.type,file.size);
  if(problem){clearSource();setError(problem);e.target.value='';return;}
  setUrl(URL.createObjectURL(file));setSourceName(file.name);setTime(0);setDuration(0);setMarked(null);setError('');
 }
 function jump(delta:number,absolute=false){if(!player.current||!url)return;const target=limitTime(absolute?delta:player.current.currentTime+delta,player.current.duration);player.current.currentTime=target;setTime(target)}
 async function saveFirst(){if(!url||!first.trim()||busy)return;setBusy(true);setError('');
  try{const id='listening-study:'+crypto.randomUUID();await saveProductionEntry(newListeningEntry(id,first,Date.now()),0);setEntries(await loadProductionEntries());setSelected(id);setFirst('')}catch(e){setError('Nicht gespeichert: '+String(e))}finally{setBusy(false)}
 }
 async function saveNote(){if(!url||!current||!note.trim()||busy)return;setBusy(true);setError('');
  try{
   const latest=(await loadProductionEntries()).find(e=>e.id===current.id);
   if(!latest||latest.revisions.length!==current.revisions.length)throw Error('Sitzung wurde in einem anderen Tab geändert. Neu öffnen.');
   const updated=addListeningNote(current,task,note,reflection,marked??player.current?.currentTime??0,crypto.randomUUID(),Date.now());
   await saveProductionEntry(updated,current.revisions.length);setEntries(await loadProductionEntries());
   setTask(nextListeningTask(updated).id);setNote('');setReflection('');setMarked(null);
  }catch(e){setError('Hörbeleg nicht gespeichert: '+String(e))}finally{setBusy(false)}
 }
 return <section className="listening-studio"><div className="eyebrow">M08 · G10 · Hörschärfe</div><h1 className="page-title">Hörschärfe</h1>
 <p className="lead">Eigenes Audio hören, entscheidende Stellen wiederholen, Aussagen begründen und die Interpretation dokumentieren — ohne automatische Benotung.</p>
 <div className="banner">DEMO_ONLY · Vier ungeprüfte, offene Übungsaufträge. Verwende nur Audiodateien, die du nutzen darfst. Dateien, Dateinamen und Transkripte werden nicht gespeichert, hochgeladen oder ins Backup aufgenommen; nur ausdrücklich gesicherte Notizen und Zeitmarken bleiben lokal erhalten.</div>
 <div className="metrics"><div className="metric"><strong>{stats.sessions}</strong><small>Hörsitzungen</small></div><div className="metric"><strong>{stats.notes}</strong><small>Hörbelege</small></div><div className="metric"><strong>{stats.withEvidence}</strong><small>Sitzungen mit Zeitmarken</small></div></div>
 <div className="field"><label htmlFor="listen-sessions">Hörsitzung auswählen</label><select id="listen-sessions" value={selected} onChange={e=>selectSession(e.target.value)}><option value="new">Neue Hörsitzung</option>{rows.map(r=><option value={r.id} key={r.id}>{new Date(r.createdAt).toLocaleString('de-DE')} · {r.revisions.length} Belege</option>)}</select></div>
 <article className="panel"><h2>1 · Eigene Audioquelle</h2><p className="small muted">Lokales MP3, WAV, M4A, OGG usw., maximal 250 MiB. Nach Neuladen die ursprüngliche Datei erneut auswählen; keine Datei wird im Browser-Speicher abgelegt.</p>
 <div className="field"><label htmlFor="listen-file">Lokale Audiodatei auswählen</label><input id="listen-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm" onChange={selectFile}/></div>
 {url?<><p className="small muted">Nur in dieser Sitzung: {sourceName}</p>
 <audio ref={player} src={url} aria-label="Eigene Audiodatei abspielen" controls preload="metadata" className="listen-player" onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onLoadedMetadata={e=>{setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0);e.currentTarget.playbackRate=speed}} onError={()=>setError('Audioformat vom Browser nicht abspielbar.')}/>
 <div className="listen-controls"><button className="button outline" onClick={()=>jump(-10)}>−10 Sekunden</button><span className="listen-clock">{clock(time)} / {clock(duration)}</span><button className="button outline" onClick={()=>jump(10)}>+10 Sekunden</button>
 <label>Tempo <select aria-label="Abspieltempo" value={speed} onChange={e=>{const v=Number(e.target.value);setSpeed(v);if(player.current)player.current.playbackRate=v}}>{[0.75,1,1.25,1.5].map(n=><option key={n} value={n}>{n}×</option>)}</select></label>
 <button className="button outline" onClick={()=>setMarked(player.current?.currentTime??time)}>Zeitmarke setzen</button></div>{marked!==null&&<p role="status" className="small muted">Zeitmarke: {clock(marked)} (für den nächsten Hörbeleg)</p>}</>:<p className="small muted">Keine Audiodatei ausgewählt. Gespeicherte Notizen bleiben auch ohne Mediendatei lesbar.</p>}
 </article>
 <article className="panel listen-writing"><h2>2 · Eigene Interpretation</h2>
 {!current?<><p>Nach dem Hören die Kernaussage ohne Transkript in eigenen Worten formulieren.</p><div className="field"><label htmlFor="listen-first">Erste Deutung der Kernaussage</label><textarea id="listen-first" rows={5} maxLength={2800} value={first} onChange={e=>setFirst(e.target.value)}/></div>
 <button className="button" disabled={!url||!first.trim()||busy} onClick={()=>void saveFirst()}>Kernaussage unveränderlich speichern</button></>:<>
 <div className="panel"><div className="kicker">Unveränderliche Erstdeutung</div><p className="written">{current.original}</p></div>
 <div className="field"><label htmlFor="listen-task">Fokus der nächsten Hörnotiz</label><select id="listen-task" value={task} onChange={e=>setTask(e.target.value)}>{TASKS.map(t=><option value={t.id} key={t.id}>{t.title}{current.revisions.some(r=>r.questionId===t.id)?' · bearbeitet':''}</option>)}</select></div>
 <p className="prompt">{TASKS.find(t=>t.id===task)?.prompt}</p>
 <div className="field"><label htmlFor="listen-note">Deine Interpretation und Begründung</label><textarea id="listen-note" rows={5} maxLength={2800} value={note} onChange={e=>setNote(e.target.value)}/></div>
 <div className="field"><label htmlFor="listen-reflection">Unsicherheiten (optional)</label><textarea id="listen-reflection" rows={3} maxLength={1000} value={reflection} onChange={e=>setReflection(e.target.value)}/></div>
 <button className="button" disabled={!url||!note.trim()||busy} onClick={()=>void saveNote()}>Hörbeleg mit Zeitmarke speichern</button>
 <h3>Gesicherte Hörbelege</h3>{current.revisions.length?current.revisions.map((r,i)=>{const at=decodeAnchor(r.paragraphId);return <div className="listen-evidence" key={r.id}><div className="kicker">{i+1}. {TASKS.find(t=>t.id===r.questionId)?.title??'Frühere Aufgabe'}</div>
 {at!==null&&<button className="button text" disabled={!url} onClick={()=>jump(at,true)}>Hörstelle {clock(at)} erneut abspielen</button>}
 <p className="written">{r.text}</p>{r.reflection&&<p className="small muted">Eigene Unsicherheit: {r.reflection}</p>}</div>}):<p className="small muted">Noch keine Hörbelege gespeichert.</p>}
 </>}
 <p className="small muted">Originalfassungen bleiben unverändert. Ungespeicherte Texte gehen beim Verlassen verloren. Es gibt keine automatische Transkription, Bewertung oder GER-Einstufung.</p></article>
 {error&&<p className="banner" role="alert">{error}</p>}
 <div className="buttonrow"><button className="button outline" onClick={()=>selectSession('new')}>Neue Hörsitzung</button><button className="button text" onClick={onExit}>Zurück zum Curriculum</button></div></section>;
}
