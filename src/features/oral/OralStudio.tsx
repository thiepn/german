import {useEffect,useRef,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {oralStudies,isOralEntry,beginOral,appendOral,appendOralDocument,
 oralProgress,nextOralStudy,nextOral,savedOral,latestOralDocument,independentOral,substantialOralRevision,
 type OralMode} from '../../domain/oral/oral';

type CaptureState='idle'|'requesting'|'recording'|'processing'|'ready'|'text'|'error';
const MAX_RECORDING_MS=90_000,MAX_RECORDING_BYTES=20*1024*1024;

export default function OralStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(oralStudies.some(s=>s.id===initialSelection)?initialSelection!:oralStudies[0].id);
 const [preparation,setPreparation]=useState(''),[selfReview,setSelfReview]=useState(''),[sourceReason,setSourceReason]=useState(''),[boundary,setBoundary]=useState('');
 const [mode,setMode]=useState<OralMode|''>(''),[capture,setCapture]=useState<CaptureState>('idle'),[clip,setClip]=useState<string|null>(null);
 const [memo,setMemo]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const recorderRef=useRef<MediaRecorder|null>(null),streamRef=useRef<MediaStream|null>(null);
 const clipRef=useRef<string|null>(null),tokenRef=useRef(0),timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const study=oralStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isOralEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextOral(study,entry),latest=entry?latestOralDocument(entry):null,progress=oralProgress(entries);
 const dirty=[preparation,selfReview,sourceReason,boundary,memo,reason].some(v=>v.trim().length>0)||!!mode||capture==='recording'||capture==='requesting';
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});
 return()=>{live=false;disposeAudio()};},[]);
 function disposeAudio(){
  tokenRef.current++;
  if(timerRef.current!==null){clearTimeout(timerRef.current);timerRef.current=null}
  const recorder=recorderRef.current;recorderRef.current=null;
  if(recorder){recorder.onstop=null;recorder.ondataavailable=null;recorder.onerror=null;
   if(recorder.state!=='inactive')try{recorder.stop()}catch{/* device already stopped */}}
  streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
  if(clipRef.current){URL.revokeObjectURL(clipRef.current);clipRef.current=null;}
 }
 function resetAudio(){disposeAudio();setClip(null);setMode('');setCapture('idle')}
 function clearText(){setPreparation('');setSelfReview('');setSourceReason('');setBoundary('');setMemo('');setReason('');setAnchor('');setError('')}
 function choose(id:string){
  if(dirty&&!window.confirm('Ungespeicherte Sprachprobe und Texte verwerfen?'))return;
  resetAudio();clearText();setSelected(id);
 }
 function exit(){if(dirty&&!window.confirm('Ungespeicherte Sprachprobe und Texte verwerfen?'))return;disposeAudio();onExit()}
 async function startRecording(){
  if(busy||capture==='recording'||capture==='requesting'||capture==='processing')return;
  resetAudio();setError('');setCapture('requesting');
  const token=tokenRef.current;
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Mikrofonaufnahme wird von diesem Browser nicht unterstützt.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   if(token!==tokenRef.current){stream.getTracks().forEach(t=>t.stop());return}
   streamRef.current=stream;const recorder=new MediaRecorder(stream),chunks:Blob[]=[];let bytes=0;
   recorderRef.current=recorder;
   recorder.ondataavailable=ev=>{if(token!==tokenRef.current||!ev.data?.size)return;bytes+=ev.data.size;
    if(bytes<=MAX_RECORDING_BYTES)chunks.push(ev.data);else{setError('Aufnahme zu groß. Maximal 20 MiB; bitte erneut beginnen.');resetAudio();}};
   recorder.onerror=()=>{if(token===tokenRef.current){setError('Die lokale Aufnahme ist fehlgeschlagen.');resetAudio();setCapture('error')}};
   recorder.onstop=()=>{
    if(timerRef.current!==null){clearTimeout(timerRef.current);timerRef.current=null}
    stream.getTracks().forEach(t=>t.stop());if(streamRef.current===stream)streamRef.current=null;
    if(token!==tokenRef.current)return;
    recorderRef.current=null;const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
    if(blob.size<16){setError('Die Aufnahme enthielt keine abspielbaren Daten.');setCapture('error');return}
    const url=URL.createObjectURL(blob);clipRef.current=url;setClip(url);setMode('MIC');setCapture('ready');
   };
   recorder.start();
   timerRef.current=setTimeout(()=>{if(recorder.state==='recording')recorder.stop()},MAX_RECORDING_MS);
   setCapture('recording');
  }catch(e){
   if(token!==tokenRef.current)return;
   streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
   setCapture('error');setMode('');setError('Mikrofon nicht verfügbar oder Zugriff abgelehnt: '+String(e));
  }
 }
 function stopRecording(){if(recorderRef.current?.state==='recording'){setCapture('processing');recorderRef.current.stop()}}
 function withoutMic(){resetAudio();setMode('TEXT');setCapture('text');setError('')}
 async function saveEvidence(){
  if(!next||!mode||busy||capture==='recording'||capture==='requesting'||capture==='processing'||
   (mode==='MIC'&&!clip)||!independentOral(next,preparation,selfReview,sourceReason,boundary))return;
  setBusy(true);setError('');
  try{
   const result=!entry?beginOral(study,next.id,mode,preparation,selfReview,sourceReason,boundary,Date.now()):
    appendOral(entry,study,next.id,mode,preparation,selfReview,sourceReason,boundary,crypto.randomUUID(),Date.now());
   await saveProductionEntry(result,entry?.revisions.length??0);
   await refresh();resetAudio();clearText();
  }catch(e){setError('Sprechbeleg wurde nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveMemo(){
  if(!entry||next||busy)return;setBusy(true);setError('');
  try{
   const result=appendOralDocument(entry,study,latest?'REWRITE':'TRANSFER',memo,reason,anchor,crypto.randomUUID(),Date.now());
   await saveProductionEntry(result,entry.revisions.length);await refresh();clearText();
  }catch(e){setError('Eigener Text wurde nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 const ready=memo.trim().length>=560&&memo.trim().split(/\n\s*\n/).filter(Boolean).length>=2&&reason.trim().length>=110&&!!anchor&&(!latest||substantialOralRevision(latest.text,memo));
 const canSave=!!next&&!!mode&&!(mode==='MIC'&&!clip)&&capture!=='recording'&&capture!=='requesting'&&capture!=='processing'&&
 independentOral(next,preparation,selfReview,sourceReason,boundary);
 const memos=entry?.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??[];
 return <section className="polysemy-studio oral-studio">
  <h1 className="page-title">Mündliche Stellungnahmen</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellen begonnen · {progress.analyses} Sprechbelege · {progress.withMic} lokal mit Mikrofon geprobt · {progress.transferred} Berichte · {progress.revised} Revisionen. Keine automatische Bewertung.</p>
  <div className="field"><label htmlFor="oral-select">Gesprächsquelle auswählen</label>
   <select id="oral-select" value={selected} disabled={busy||capture==='recording'} onChange={e=>choose(e.target.value)}>
   {oralStudies.map(s=><option value={s.id} key={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextOralStudy(entries).id!==selected&&<button className="button outline" disabled={busy||capture==='recording'} onClick={()=>choose(nextOralStudy(entries).id)}>Nächstes Gespräch öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G12 · {study.id} · v{study.version}</div>
   <h2>{study.title}</h2><p>{study.focus}</p><p><strong>Zielgruppe:</strong> {study.audience}</p>
   {study.paragraphs.map(p=><p className="polysemy-paragraph" key={p.id}><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">DEMO_ONLY · ORIGINAL_DRAFT · unabhängige Sprachredaktion ausstehend</p>
  </article>
  {entry&&<section className="panel"><h2>Gespeicherte Sprechbelege</h2>{study.turns.map((t,i)=>{const saved=savedOral(entry,t);if(!saved)return null;
   return <article className="polysemy-analysis" key={t.id}><h3>{i+1} · {t.speaker} · {t.paragraphId}</h3>
    <p><strong>Übungsart:</strong> {saved.mode==='MIC'?'Lokale Aufnahme erstellt; Audio nicht gespeichert':'Ohne Mikrofon bearbeitet'}.</p>
    <p><strong>Eigene Antwortvorbereitung:</strong> <span className="written">{saved.preparation}</span></p>
    <p><strong>Selbstprüfung:</strong> <span className="written">{saved.selfReview}</span></p>
    <p><strong>Quellenbezug:</strong> <span className="written">{saved.sourceReason}</span></p>
    <p><strong>Grenze:</strong> <span className="written">{saved.boundary}</span></p>
    <details><summary>Originalbeitrag und Auftrag</summary><p>„{t.quote}“</p><p>{t.goal}</p></details>
   </article>})}</section>}
  {next&&<section className="panel polysemy-task" aria-label="Aktueller mündlicher Auftrag">
   <h2>Sprechbeleg {study.turns.indexOf(next)+1} / 3</h2>
   <p><strong>{next.speaker} · {next.paragraphId}</strong>: „{next.quote}“</p><p>{next.goal}</p>
   <p><strong>Beleg:</strong> {next.anchor}</p><p><strong>Grenze:</strong> {next.limit}</p>
   <div className="panel"><h3>Lokale mündliche Probe</h3>
    <p>Das Mikrofon wird nur nach einem Klick aktiviert. Die Aufnahme dient ausschließlich zum unmittelbaren Anhören; Audio wird nicht hochgeladen, gespeichert oder in die Sicherung übernommen. Schriftliche Selbstbeurteilung ist keine Spracherkennung.</p>
    <div className="buttonrow">
     <button className="button" type="button" onClick={()=>void startRecording()} disabled={busy||capture==='recording'||capture==='requesting'||capture==='processing'}>Mikrofonaufnahme starten</button>
     {capture==='recording'&&<button className="button outline" type="button" onClick={stopRecording}>Aufnahme stoppen</button>}
     <button className="button outline" type="button" onClick={withoutMic} disabled={busy}>Ohne Mikrofon bearbeiten</button>
     {clip&&<button className="button outline" type="button" onClick={resetAudio}>Aufnahme verwerfen</button>}
    </div>
    {capture==='requesting'&&<p role="status">Mikrofonzugriff wird angefragt.</p>}
    {capture==='recording'&&<p role="status">Aufnahme läuft · maximal 90 Sekunden. Stoppen beendet den Mikrofonzugriff.</p>}
    {capture==='processing'&&<p role="status">Aufnahme wird lokal abgeschlossen.</p>}
    {clip&&<><p role="status">Aufnahme für diese Sprechprobe bereit. Nach dem Speichern oder Verlassen wird sie verworfen.</p>
     <audio controls src={clip} aria-label="Eigene lokale Sprechprobe anhören" preload="metadata"/></>}
    {mode==='TEXT'&&<p role="status">Ohne Mikrofon: Nur die schriftliche Eigenanalyse wird gespeichert.</p>}
   </div>
   <div className="field"><label htmlFor="oral-preparation">Eigene mündliche Antwort vorbereiten und nach der Probe schriftlich festhalten</label>
    <textarea id="oral-preparation" rows={5} maxLength={1800} value={preparation} onChange={e=>setPreparation(e.target.value)}/></div>
   <div className="field"><label htmlFor="oral-self-review">Welche Formulierung, Betonung oder Gesprächsstrategie würdest du nach dem Anhören verbessern?</label>
    <textarea id="oral-self-review" rows={5} maxLength={1550} value={selfReview} onChange={e=>setSelfReview(e.target.value)}/></div>
   <div className="field"><label htmlFor="oral-source-reason">Begründe deine Antwort mit einer weiteren konkreten Information aus der Quelle</label>
    <textarea id="oral-source-reason" rows={5} maxLength={1650} value={sourceReason} onChange={e=>setSourceReason(e.target.value)}/></div>
   <div className="field"><label htmlFor="oral-boundary">Welche Zusage oder Schlussfolgerung wäre durch die Quelle nicht gedeckt?</label>
    <textarea id="oral-boundary" rows={5} maxLength={1400} value={boundary} onChange={e=>setBoundary(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!canSave} onClick={()=>void saveEvidence()}>Sprechbeleg speichern (nur Text)</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer">
   <h2>{latest?'Adressatengerechte Revision':'Eigenständige Schlussstellungnahme schreiben'}</h2><p>{study.brief}</p>
   {latest&&<><h3>Letzte vollständige Fassung</h3><p className="written">{latest.text}</p>
    <button className="button outline" type="button" onClick={()=>setMemo(latest.text)} disabled={busy}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="oral-anchor">Quellenanker für die Begründung</label>
    <select id="oral-anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}>
     <option value="">Quellenanker wählen</option>{study.turns.map(t=><option key={t.id} value={t.id}>{t.speaker} · {t.paragraphId}</option>)}
    </select></div>
   <div className="field"><label htmlFor="oral-memo">Eigener mehrabsätziger Bericht zu allen drei Gesprächspositionen</label>
    <textarea id="oral-memo" rows={12} maxLength={4000} value={memo} onChange={e=>setMemo(e.target.value)}/></div>
   <div className="field"><label htmlFor="oral-reason">Begründe Quellenbindung, Zielgruppenwechsel und eine wesentliche Änderung</label>
    <textarea id="oral-reason" rows={6} maxLength={1500} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {latest&&memo.trim()&&!substantialOralRevision(latest.text,memo)&&<p role="status">Eine substanzielle Änderung der vollständigen Fassung ist erforderlich.</p>}
   <button className="button" type="button" disabled={busy||!ready} onClick={()=>void saveMemo()}>{latest?'Überarbeitung speichern':'Schlussstellungnahme speichern'}</button>
   {memos.map((v,i)=><article key={v.id} className="polysemy-writing">
    <h3>{i+1} · {v.questionId==='TRANSFER'?'Erstfassung':'Überarbeitung'}</h3><p className="written">{v.text}</p>
    <p><strong>Quellenbezug:</strong> {v.paragraphId} · <strong>Änderungsbegründung:</strong> {v.reflection}</p>
    {i>0&&<details><summary>Änderungen vergleichen</summary><p className="written version-diff">{revisionDiff(memos[i-1].text,v.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</p></details>}
   </article>)}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button className="button outline" type="button" onClick={exit}>Zurück zum Curriculum</button></div>
 </section>;
}
