import {useEffect,useState} from 'react';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import type {ProductionEntry} from '../../domain/production/types';
import {revisionDiff} from '../../domain/production/continuity';
import {modalityCases,modalityFirst,modalityContrastRevision,modalityWrittenRevision,modalityProgress,nextModalityCase,isModalityEntry,nextModalityContrast,recordedContrast,lastModalityOutput,type ModalityContrast} from '../../domain/modality/modality';

export default function ModalityStudio({onExit,initialSelection}:{onExit:()=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(modalityCases.some(c=>c.id===initialSelection)?initialSelection!:modalityCases[0].id);
 const [choice,setChoice]=useState(''),[interpretation,setInterpretation]=useState(''),[limit,setLimit]=useState('');
 const [production,setProduction]=useState(''),[reason,setReason]=useState(''),[paragraph,setParagraph]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=modalityCases.find(c=>c.id===selected)!;
 const record=entries.find(e=>isModalityEntry(e)&&e.itemId===selected&&e.itemVersion===study.version)??null;
 const next=nextModalityContrast(study,record);
 const latest=record?lastModalityOutput(record):null;
 const stats=modalityProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 function chooseCase(id:string){setSelected(id);setChoice('');setInterpretation('');setLimit('');setProduction('');setReason('');setParagraph('');setError('')}
 async function saveReading(){
  if(!next||busy||!choice||!interpretation.trim())return;
  setBusy(true);setError('');
  try{
   if(!record)await saveProductionEntry(modalityFirst(study,next.id,choice,interpretation,Date.now()),0);
   else await saveProductionEntry(modalityContrastRevision(record,study,next.id,choice,interpretation,limit,crypto.randomUUID(),Date.now()),record.revisions.length);
   await refresh();setChoice('');setInterpretation('');setLimit('');
  }catch(e){setError('Deutung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveOutput(){
  if(!record||next||busy)return;
  setBusy(true);setError('');
  try{
   await saveProductionEntry(modalityWrittenRevision(record,study,latest?'REWRITE':'TRANSFER',production,reason,paragraph,crypto.randomUUID(),Date.now()),record.revisions.length);
   await refresh();setProduction('');setReason('');setParagraph('');
  }catch(e){setError('Textfassung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 const sourceText=(contrast:ModalityContrast)=>study.paragraphs.find(p=>p.id===contrast.paragraphId);
 return <section className="modality-studio">
  <h1 className="page-title">Modus, Tempus und Diathese</h1>
  <div className="banner">DEMO_ONLY · {stats.started}/{stats.total} Fälle begonnen · {stats.contrasts} Deutungen · {stats.finished} eigene Texttransfers · {stats.revised} Überarbeitungen. Keine CEFR- oder Sprachbewertung.</div>
  <div className="field"><label htmlFor="modality-case">Fall auswählen</label><select id="modality-case" disabled={busy} value={selected} onChange={e=>chooseCase(e.target.value)}>{modalityCases.map(c=><option key={c.id} value={c.id}>{c.band} · {c.title}</option>)}</select></div>
  {nextModalityCase(entries).id!==selected&&<button className="button outline" type="button" onClick={()=>chooseCase(nextModalityCase(entries).id)} disabled={busy}>Nächsten Fall öffnen</button>}
  <article className="panel modality-source"><div className="kicker">{study.band} · M12 · G05 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map((p,i)=><p className="modality-paragraph" key={p.id}><strong>Absatz {i+1} · {p.id}</strong>{p.text}</p>)}
   <p className="small muted">Quelle: {study.rights.kind} · {study.status} · {study.rights.source}</p>
  </article>
  {record&&<section className="panel modality-history"><h2>Dokumentierte Textdeutungen</h2>
    {study.contrasts.map((c,i)=>{
     const saved=recordedContrast(record,c);
     if(!saved)return null;
     const chosen=c.options.find(o=>o.id===saved.optionId);
     return <article className="modality-reading" key={c.id}><h3>{i+1} · {c.family.replaceAll('_',' ')} · {c.paragraphId}</h3><p><strong>Textstelle:</strong> {c.quote}</p>
      <p><strong>Deine Wahl:</strong> {chosen?.text??'Historische Wahl'}</p><p className="written">{saved.text}</p>
      {saved.limit&&<p><strong>Eigene Einschränkung:</strong> {saved.limit}</p>}
      <details open={i===study.contrasts.findIndex(x=>x.id===c.id)&&i===study.contrasts.filter(x=>recordedContrast(record,x)).length-1}>
       <summary>Autorenlesart und sprachliche Begründung</summary><p>{c.model}</p><p>{c.reason}</p><p className="small muted">Entwurfslesart, kein automatisch bewertetes Urteil über deine Antwort.</p>
      </details>
     </article>;
    })}
   </section>}
  {next&&<section className="panel modality-work"><h2>Textdeutung {study.contrasts.indexOf(next)+1} / {study.contrasts.length}</h2>
   <p><strong>Beleg {next.paragraphId}:</strong> {next.quote}</p><p>{next.prompt}</p>
   <div className="field"><label htmlFor="modality-choice">Mögliche Lesart</label><select id="modality-choice" value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Lesart wählen</option>{next.options.map(o=><option value={o.id} key={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="modality-reading">Deine Interpretation mit Bezug auf den Kontext</label><textarea id="modality-reading" rows={4} maxLength={2900} value={interpretation} onChange={e=>setInterpretation(e.target.value)}/></div>
   {record&&<div className="field"><label htmlFor="modality-limit">Was lässt sich aus der Textstelle nicht ableiten?</label><textarea id="modality-limit" rows={3} maxLength={1150} value={limit} onChange={e=>setLimit(e.target.value)}/></div>}
   <button className="button" disabled={busy||!choice||!interpretation.trim()||Boolean(record&&!limit.trim())} type="button" onClick={()=>void saveReading()}>Deutung unveränderlich speichern</button>
  </section>}
  {record&&!next&&<section className="panel modality-transfer"><h2>{latest?'Eigenen Text präzisieren':'Eigenständig formulieren'}</h2>
   <p>{study.transfer}</p>
   {latest&&<><h3>Letzte Textfassung</h3><p className="written">{latest.text}</p><button type="button" className="button outline" onClick={()=>setProduction(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="modality-transfer-paragraph">Textbeleg für deine Formulierung</label><select id="modality-transfer-paragraph" value={paragraph} onChange={e=>setParagraph(e.target.value)}><option value="">Absatz wählen</option>{study.paragraphs.map((p,i)=><option key={p.id} value={p.id}>Absatz {i+1} · {p.id}</option>)}</select></div>
   <div className="field"><label htmlFor="modality-transfer-text">Eigene Formulierung</label><textarea id="modality-transfer-text" rows={7} maxLength={2900} value={production} onChange={e=>setProduction(e.target.value)}/></div>
   <div className="field"><label htmlFor="modality-transfer-reason">Begründe Sprecherzuordnung, Zeitbezug und epistemische Grenze</label><textarea id="modality-transfer-reason" rows={4} maxLength={1150} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {production.trim()===latest?.text.trim()&&<p className="feedback" role="status">Der Text ist unverändert; bitte bearbeite die letzte Fassung.</p>}
   <button type="button" className="button" disabled={busy||!production.trim()||!reason.trim()||!paragraph||production.trim()===latest?.text.trim()} onClick={()=>void saveOutput()}>{latest?'Überarbeitung speichern':'Eigene Formulierung speichern'}</button>
   {record.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((r,i,all)=>{
     const prior=i===0?null:all[i-1];
     return <article key={r.id} className="modality-writing"><h3>{i+1} · {r.questionId==='TRANSFER'?'Erste Übertragung':'Überarbeitung'}</h3><p className="written">{r.text}</p>
       <p><strong>Beleg:</strong> {r.paragraphId} · <strong>Begründung:</strong> {r.reflection}</p>
       {prior&&<details><summary>Änderungen zur vorherigen Textfassung</summary><div className="written version-diff">{revisionDiff(prior.text,r.text).map((part,j)=><span key={j} className={'diff-'+part.kind}>{part.text} </span>)}</div><p className="small muted">Wortvergleich, keine automatische Qualitätsbewertung.</p></details>}
      </article>;
    })}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button type="button" className="button outline" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
