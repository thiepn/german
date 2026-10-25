import {useEffect,useState} from 'react';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import type {ProductionEntry} from '../../domain/production/types';
import {revisionDiff} from '../../domain/production/continuity';
import {valencyStudies,isValencyEntry,beginValency,appendValencyFrame,appendValencyTransfer,valencyProgress,nextValencyStudy,nextValencyFrame,savedValencyFrame,latestValencyTransfer,type ValencyChoice} from '../../domain/valency/valency';

export default function ValencyStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selection,setSelection]=useState(valencyStudies.some(s=>s.id===initialSelection)?initialSelection!:valencyStudies[0].id);
 const [choice,setChoice]=useState<ValencyChoice|''>(''),[interpretation,setInterpretation]=useState(''),[boundary,setBoundary]=useState('');
 const [draft,setDraft]=useState(''),[reason,setReason]=useState(''),[paragraph,setParagraph]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=valencyStudies.find(s=>s.id===selection)!;
 const entry=entries.find(e=>isValencyEntry(e)&&e.itemId===study.id&&e.itemVersion===study.version&&e.sourceId===study.id)??null;
 const frame=nextValencyFrame(study,entry);
 const latest=entry?latestValencyTransfer(entry):null;
 const progress=valencyProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let active=true;void loadProductionEntries().then(records=>{if(active)setEntries(records)}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[]);
 function select(id:string){setSelection(id);setChoice('');setInterpretation('');setBoundary('');setDraft('');setReason('');setParagraph('');setError('')}
 async function saveFrame(){
  if(!frame||!choice||!interpretation.trim()||!boundary.trim()||busy)return;
  setBusy(true);setError('');
  try{
   if(!entry)await saveProductionEntry(beginValency(study,frame.id,choice,interpretation,boundary,Date.now()),0);
   else await saveProductionEntry(appendValencyFrame(entry,study,frame.id,choice,interpretation,boundary,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setChoice('');setInterpretation('');setBoundary('');
  }catch(e){setError('Deutung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveWriting(){
  if(!entry||frame||busy)return;
  setBusy(true);setError('');
  try{
   const version=appendValencyTransfer(entry,study,latest?'REWRITE':'TRANSFER',draft,reason,paragraph,crypto.randomUUID(),Date.now());
   await saveProductionEntry(version,entry.revisions.length);
   await refresh();setDraft('');setReason('');setParagraph('');
  }catch(e){setError('Textfassung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 const unchanged=Boolean(latest&&draft.trim()===latest.text.trim());
 return <section className="valency-studio">
  <h1 className="page-title">Rektion und Valenz im Text</h1>
  <p className="small muted">{progress.started}/{progress.total} Fälle begonnen · {progress.frames} Deutungen · {progress.transferred} eigene Übertragungen · {progress.revisions} Überarbeitungen. Unbewertete Originalentwürfe.</p>
  <div className="field"><label htmlFor="valency-study">Textfall</label><select id="valency-study" disabled={busy} value={selection} onChange={e=>select(e.target.value)}>{valencyStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextValencyStudy(entries).id!==selection&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextValencyStudy(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel valency-source">
   <div className="kicker">{study.band} · G03 · {study.id} · v{study.version}</div>
   <h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map((p,i)=><p className="valency-paragraph" key={p.id}><strong>Absatz {i+1} · {p.id}</strong>{p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind} · {study.rights.source}</p>
  </article>
  {entry&&<section className="panel valency-history"><h2>Deine Quellenanalysen</h2>
   {study.frames.map((f,i)=>{
    const saved=savedValencyFrame(entry,f);if(!saved)return null;
    return <article className="valency-analysis" key={f.id}>
     <h3>{i+1} · {f.paragraphId} · {f.governor}</h3>
     <p><strong>Quelle:</strong> {f.quote}</p>
     <p><strong>Vergleich:</strong> {f.alternate}</p>
     <p><strong>Gewählte Lesart:</strong> {f.options.find(x=>x.id===saved.choice)?.text}</p>
     <p><strong>Eigene Analyse:</strong> <span className="written">{saved.interpretation}</span></p>
     <p><strong>Geltungsgrenze:</strong> {saved.boundary}</p>
     <details><summary>Autorenanalyse und Bedeutungswechsel</summary>
      <p>{f.model}</p><p>{f.explanation}</p><p><strong>Eigener Transfer:</strong> {f.repairPrompt}</p>
      <p className="small muted">Editorial nicht freigegeben; keine automatische Beurteilung deiner Antwort.</p>
     </details>
    </article>;
   })}
  </section>}
  {frame&&<section className="panel valency-work">
   <h2>Rahmenvergleich {study.frames.indexOf(frame)+1} / {study.frames.length}</h2>
   <p><strong>Textbeleg {frame.paragraphId}:</strong> {frame.quote}</p>
   <p><strong>Alternative Formulierung:</strong> {frame.alternate}</p>
   <p>{frame.question}</p>
   <div className="field"><label htmlFor="valency-choice">Bedeutung im Ausgangstext</label>
    <select id="valency-choice" disabled={busy} value={choice} onChange={e=>setChoice(e.target.value as ValencyChoice|'')}><option value="">Lesart auswählen</option>{frame.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="valency-interpretation">Begründe deine Deutung mit dem Text</label><textarea id="valency-interpretation" rows={5} maxLength={1800} value={interpretation} onChange={e=>setInterpretation(e.target.value)}/></div>
   <div className="field"><label htmlFor="valency-boundary">Welche Aussage wäre nach dem Rahmenwechsel nicht mehr gedeckt?</label><textarea id="valency-boundary" rows={4} maxLength={900} value={boundary} onChange={e=>setBoundary(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!interpretation.trim()||!boundary.trim()} onClick={()=>void saveFrame()}>Quellenanalyse unveränderlich speichern</button>
  </section>}
  {entry&&!frame&&<section className="panel valency-transfer">
   <h2>{latest?'Eigene Formulierung überarbeiten':'Eigenständig formulieren'}</h2>
   <p>{study.transfer}</p>
   {latest&&<><h3>Letzte Textfassung</h3><p className="written">{latest.text}</p><button className="button outline" type="button" onClick={()=>setDraft(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="valency-paragraph">Quellenabsatz als Ausgangspunkt</label><select id="valency-paragraph" value={paragraph} onChange={e=>setParagraph(e.target.value)}><option value="">Absatz wählen</option>{study.paragraphs.map((p,i)=><option key={p.id} value={p.id}>Absatz {i+1} · {p.id}</option>)}</select></div>
   <div className="field"><label htmlFor="valency-transfer-text">Deine eigenen Sätze</label><textarea id="valency-transfer-text" rows={8} maxLength={2900} value={draft} onChange={e=>setDraft(e.target.value)}/></div>
   <div className="field"><label htmlFor="valency-transfer-reason">Welche Verbrahmen hast du gewählt, und wie begrenzen sie die Aussage?</label><textarea id="valency-transfer-reason" rows={5} maxLength={1150} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {unchanged&&<p role="status" className="feedback">Die Textfassung ist unverändert. Überarbeite sie vor dem Speichern.</p>}
   <button className="button" type="button" disabled={busy||draft.trim().length<60||!paragraph||!reason.trim()||unchanged} onClick={()=>void saveWriting()}>{latest?'Überarbeitung speichern':'Eigene Sätze speichern'}</button>
   {entry.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((r,i,all)=>{
    const before=i>0?all[i-1]:null;
    return <article className="valency-writing" key={r.id}><h3>{i+1} · {r.questionId==='TRANSFER'?'Erste eigene Formulierung':'Überarbeitung'}</h3>
     <p className="written">{r.text}</p><p><strong>Quellenabsatz:</strong> {r.paragraphId} · <strong>Begründung:</strong> {r.reflection}</p>
     {before&&<details><summary>Änderungen gegenüber vorheriger Textfassung</summary><div className="written version-diff">{revisionDiff(before.text,r.text).map((part,j)=><span key={j} className={'diff-'+part.kind}>{part.text} </span>)}</div><p className="small muted">Wortvergleich, keine Qualitätsbewertung.</p></details>}
    </article>;
   })}
  </section>}
  {error&&<p role="alert" className="feedback incorrect">{error}</p>}
  <div className="buttonrow"><button type="button" className="button outline" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
