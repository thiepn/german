import {useEffect,useState} from 'react';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import type {ProductionEntry} from '../../domain/production/types';
import {revisionDiff} from '../../domain/production/continuity';
import {focusStudies,isFocusEntry,beginFocus,appendFocusContrast,appendFocusTransfer,focusProgress,nextFocusStudy,nextFocusContrast,savedFocusContrast,latestFocusTransfer,type FocusChoice} from '../../domain/focus/focus';

export default function FocusStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(focusStudies.some(s=>s.id===initialSelection)?initialSelection!:focusStudies[0].id);
 const [choice,setChoice]=useState<FocusChoice|''>(''),[reformulation,setReformulation]=useState(''),[justification,setJustification]=useState('');
 const [draft,setDraft]=useState(''),[reason,setReason]=useState(''),[paragraph,setParagraph]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=focusStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isFocusEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const current=nextFocusContrast(study,entry),latest=entry?latestFocusTransfer(entry):null,progress=focusProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let live=true;void loadProductionEntries().then(e=>{if(live)setEntries(e)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setReformulation('');setJustification('');setDraft('');setReason('');setParagraph('');setError('')}
 const normalize=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
 const copied=Boolean(current&&[current.quote,...current.options.map(o=>o.text)].some(s=>normalize(s)===normalize(reformulation)));
 async function saveContrast(){
  if(!current||!choice||!reformulation.trim()||!justification.trim()||busy||copied)return;
  setBusy(true);setError('');
  try{
   if(!entry)await saveProductionEntry(beginFocus(study,current.id,choice,reformulation,justification,Date.now()),0);
   else await saveProductionEntry(appendFocusContrast(entry,study,current.id,choice,reformulation,justification,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setChoice('');setReformulation('');setJustification('');
  }catch(e){setError('Fokusanalyse nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveWriting(){
  if(!entry||current||busy)return;
  setBusy(true);setError('');
  try{
   const version=appendFocusTransfer(entry,study,latest?'REWRITE':'TRANSFER',draft,reason,paragraph,crypto.randomUUID(),Date.now());
   await saveProductionEntry(version,entry.revisions.length);
   await refresh();setDraft('');setReason('');setParagraph('');
  }catch(e){setError('Textfassung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 const unchanged=Boolean(latest&&draft.trim()===latest.text.trim());
 return <section className="focus-studio">
  <h1 className="page-title">Informationsstruktur und Fokus</h1>
  <p className="small muted">{progress.started}/{progress.total} Texte begonnen · {progress.contrasts} Kontextanalysen · {progress.transfers} eigene Texte · {progress.rewrites} Überarbeitungen. Ohne automatische Bewertung.</p>
  <div className="field"><label htmlFor="focus-study">Textfall</label><select id="focus-study" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{focusStudies.map(s=><option value={s.id} key={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextFocusStudy(entries).id!==selected&&<button type="button" className="button outline" disabled={busy} onClick={()=>select(nextFocusStudy(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel focus-source">
   <div className="kicker">{study.band} · G04 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map((p,i)=><p className="focus-paragraph" key={p.id}><strong>Absatz {i+1} · {p.id}</strong>{p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind} · {study.rights.source}</p>
  </article>
  {entry&&<section className="panel focus-history"><h2>Gespeicherte Satzanalysen</h2>
   {study.contrasts.map((c,i)=>{
    const saved=savedFocusContrast(entry,c);if(!saved)return null;
    return <article className="focus-analysis" key={c.id}>
     <h3>{i+1} · {c.family.replaceAll('_',' ')} · {c.paragraphId}</h3>
     <p><strong>Original:</strong> {c.quote}</p><p><strong>Gewählte Variante:</strong> {c.options.find(o=>o.id===saved.choice)?.text}</p>
     <p><strong>Deine Formulierung:</strong> <span className="written">{saved.rewrite}</span></p>
     <p><strong>Deine Begründung:</strong> {saved.reason}</p>
     <details><summary>Autorenvergleich und Fokuserklärung</summary>
      <p>{c.model}</p><p>{c.explanation}</p><p><strong>Weiterführung:</strong> {c.repairPrompt}</p>
      <p className="small muted">Ungeprüfter Autorenentwurf, keine Bewertung deiner Wortstellung oder CEFR-Einstufung.</p>
     </details>
    </article>;
   })}
  </section>}
  {current&&<section className="panel focus-task">
   <h2>Kontextvergleich {study.contrasts.indexOf(current)+1} / {study.contrasts.length}</h2>
   <p><strong>Textstelle {current.paragraphId}:</strong> {current.quote}</p>
   <p>{current.question}</p>
   <div className="field"><label htmlFor="focus-choice">Geeignete Formulierung im Kontext</label><select id="focus-choice" value={choice} onChange={e=>setChoice(e.target.value as FocusChoice|'')} disabled={busy}><option value="">Variante auswählen</option>{current.options.map(o=><option value={o.id} key={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="focus-rewrite">Formuliere den Satz eigenständig um</label><textarea id="focus-rewrite" rows={4} maxLength={1800} value={reformulation} onChange={e=>setReformulation(e.target.value)} /></div>
   <div className="field"><label htmlFor="focus-reason">Begründe Thema, neue Information und Geltungsbereich</label><textarea id="focus-reason" rows={4} maxLength={850} value={justification} onChange={e=>setJustification(e.target.value)} /></div>
   {copied&&<p className="feedback" role="status">Die Formulierung entspricht einer vorgegebenen Variante. Eine eigene Fassung ist erforderlich.</p>}
   <button type="button" className="button" disabled={busy||!choice||reformulation.trim().length<30||justification.trim().length<12||copied} onClick={()=>void saveContrast()}>Umformung und Begründung speichern</button>
  </section>}
  {entry&&!current&&<section className="panel focus-transfer">
   <h2>{latest?'Eigenen Text überarbeiten':'Eigenständig formulieren'}</h2><p>{study.transfer}</p>
   {latest&&<><h3>Letzte Textfassung</h3><p className="written">{latest.text}</p><button type="button" className="button outline" onClick={()=>setDraft(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="focus-paragraph">Quellenabsatz als Ausgangspunkt</label><select id="focus-paragraph" value={paragraph} onChange={e=>setParagraph(e.target.value)}><option value="">Absatz wählen</option>{study.paragraphs.map((p,i)=><option key={p.id} value={p.id}>Absatz {i+1} · {p.id}</option>)}</select></div>
   <div className="field"><label htmlFor="focus-transfer-text">Dein eigenständiger Text</label><textarea id="focus-transfer-text" rows={8} maxLength={2900} value={draft} onChange={e=>setDraft(e.target.value)} /></div>
   <div className="field"><label htmlFor="focus-transfer-reason">Begründe die Schwerpunktsetzung und was deine Sätze ausdrücklich nicht behaupten</label><textarea id="focus-transfer-reason" rows={5} maxLength={1150} value={reason} onChange={e=>setReason(e.target.value)} /></div>
   {unchanged&&<p className="feedback" role="status">Die Textfassung ist unverändert. Überarbeite sie vor dem Speichern.</p>}
   <button type="button" className="button" disabled={busy||draft.trim().length<80||reason.trim().length<20||!paragraph||unchanged} onClick={()=>void saveWriting()}>{latest?'Überarbeitung speichern':'Eigenen Text speichern'}</button>
   {entry.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((r,i,all)=>{
    const previous=i?all[i-1]:null;
    return <article className="focus-writing" key={r.id}>
     <h3>{i+1} · {r.questionId==='TRANSFER'?'Erster eigener Text':'Überarbeitung'}</h3><p className="written">{r.text}</p>
     <p><strong>Beleg:</strong> {r.paragraphId} · <strong>Begründung:</strong> {r.reflection}</p>
     {previous&&<details><summary>Änderungen zur vorherigen Textfassung</summary><div className="written version-diff">{revisionDiff(previous.text,r.text).map((part,j)=><span key={j} className={'diff-'+part.kind}>{part.text} </span>)}</div><p className="small muted">Wortvergleich, keine sprachliche Bewertung.</p></details>}
    </article>;
   })}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button type="button" className="button outline" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
