import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {referenceStudies,isReferenceEntry,beginReference,appendReferenceDecision,appendReferenceTransfer,referenceProgress,nextReferenceStudy,nextReferenceDecision,savedReferenceDecision,latestReferenceTransfer,isIndependentReferenceRewrite,type ReferenceChoice} from '../../domain/reference/reference';

export default function ReferenceStudio({onExit,initialSelection}:{onExit:()=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(referenceStudies.some(s=>s.id===initialSelection)?initialSelection!:referenceStudies[0].id);
 const [choice,setChoice]=useState<ReferenceChoice|''>(''),[rewrite,setRewrite]=useState(''),[why,setWhy]=useState('');
 const [draft,setDraft]=useState(''),[draftWhy,setDraftWhy]=useState(''),[paragraph,setParagraph]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=referenceStudies.find(s=>s.id===selected)!;
 const record=entries.find(e=>isReferenceEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const current=nextReferenceDecision(study,record),latest=record?latestReferenceTransfer(record):null,stats=referenceProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setRewrite('');setWhy('');setDraft('');setDraftWhy('');setParagraph('');setError('')}
 const copied=Boolean(current&&rewrite.trim()&&!isIndependentReferenceRewrite(current,rewrite));
 async function saveDecision(){
  if(!current||!choice||!rewrite.trim()||!why.trim()||copied||busy)return;
  setBusy(true);setError('');
  try{
   if(!record)await saveProductionEntry(beginReference(study,current.id,choice,rewrite,why,Date.now()),0);
   else await saveProductionEntry(appendReferenceDecision(record,study,current.id,choice,rewrite,why,crypto.randomUUID(),Date.now()),record.revisions.length);
   await refresh();setChoice('');setRewrite('');setWhy('');
  }catch(e){setError('Referenzanalyse nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveTransfer(){
  if(!record||current||busy)return;
  setBusy(true);setError('');
  try{
   const version=appendReferenceTransfer(record,study,latest?'REWRITE':'TRANSFER',draft,draftWhy,paragraph,crypto.randomUUID(),Date.now());
   await saveProductionEntry(version,record.revisions.length);
   await refresh();setDraft('');setDraftWhy('');setParagraph('');
  }catch(e){setError('Eigenständiger Text nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 const unchanged=Boolean(latest&&draft.trim().replace(/\s+/g,' ')===latest.text.trim().replace(/\s+/g,' '));
 return <section className="reference-studio">
  <h1 className="page-title">Referenz und Determination</h1>
  <p className="small muted">{stats.started}/{stats.total} Quellen begonnen · {stats.decisions} Referenzanalysen · {stats.transferred} eigene Texte · {stats.rewritten} Revisionen. Keine automatische Bewertung.</p>
  <div className="field"><label htmlFor="reference-study">Textfall</label><select id="reference-study" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{referenceStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextReferenceStudy(entries).id!==selected&&<button type="button" className="button outline" disabled={busy} onClick={()=>select(nextReferenceStudy(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel reference-source">
   <div className="kicker">{study.band} · M16 · G01 · {study.id} · v{study.version}</div>
   <h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map((p,i)=><p className="reference-paragraph" key={p.id}><strong>Absatz {i+1} · {p.id}</strong>{p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind} · {study.rights.source}</p>
  </article>
  {record&&<section className="panel reference-history"><h2>Gespeicherte Referenzanalysen</h2>
   {study.decisions.map((d,i)=>{
    const saved=savedReferenceDecision(record,d);if(!saved)return null;
    return <article className="reference-analysis" key={d.id}>
     <h3>{i+1} · {d.topic} · {d.paragraphId}</h3>
     <div className="reference-before-after"><div><strong>Original</strong><p>{d.quote}</p></div><div><strong>Alternative</strong><p>{d.alternate}</p></div></div>
     <p><strong>Gewählte Deutung:</strong> {d.options.find(o=>o.id===saved.choice)?.text}</p>
     <p><strong>Eigene Umformulierung:</strong> <span className="written">{saved.rewrite}</span></p>
     <p><strong>Begründung:</strong> {saved.reason}</p>
     <details><summary>Autorenanalyse und Referenzwechsel</summary>
      <p><strong>Referenz:</strong> {d.model}</p><p>{d.explanation}</p>
      <p><strong>Weiterführung:</strong> {d.repairPrompt}</p>
      <p className="small muted">Nicht unabhängig sprachlich freigegeben; keine Bewertung deiner Deutung.</p>
     </details>
    </article>;
   })}
  </section>}
  {current&&<section className="panel reference-task">
   <h2>Referenzvergleich {study.decisions.indexOf(current)+1} / {study.decisions.length}</h2>
   <div className="reference-before-after"><div><strong>Beleg {current.paragraphId}</strong><p>{current.quote}</p></div><div><strong>Andere Determination</strong><p>{current.alternate}</p></div></div>
   <p>{current.question}</p>
   <div className="field"><label htmlFor="reference-choice">Bezug im Ausgangstext</label><select id="reference-choice" value={choice} disabled={busy} onChange={e=>setChoice(e.target.value as ReferenceChoice|'')}><option value="">Referenz auswählen</option>{current.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="reference-rewrite">Formuliere den Inhalt mit eindeutigem Referenzbezug neu</label><textarea id="reference-rewrite" rows={5} maxLength={1800} value={rewrite} onChange={e=>setRewrite(e.target.value)}/></div>
   <div className="field"><label htmlFor="reference-why">Begründe, welche Personen, Dinge oder Mengen gemeint sind und welche Alternative etwas anderes behauptet</label><textarea id="reference-why" rows={4} maxLength={900} value={why} onChange={e=>setWhy(e.target.value)}/></div>
   {copied&&<p role="status" className="feedback">Der Beleg wurde übernommen oder ist zu kurz. Eine eigenständige Fassung ist erforderlich.</p>}
   <button type="button" className="button" disabled={busy||!choice||!current||!isIndependentReferenceRewrite(current,rewrite)||why.trim().length<18} onClick={()=>void saveDecision()}>Referenzanalyse unveränderlich speichern</button>
  </section>}
  {record&&!current&&<section className="panel reference-transfer">
   <h2>{latest?'Eigenen Text überarbeiten':'Eigenständig formulieren'}</h2>
   <p>{study.transfer}</p>
   {latest&&<><h3>Letzte Textfassung</h3><p className="written">{latest.text}</p><button type="button" className="button outline" onClick={()=>setDraft(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="reference-paragraph">Quellenabsatz als Ausgangspunkt</label><select id="reference-paragraph" value={paragraph} onChange={e=>setParagraph(e.target.value)}><option value="">Absatz wählen</option>{study.paragraphs.map((p,i)=><option key={p.id} value={p.id}>Absatz {i+1} · {p.id}</option>)}</select></div>
   <div className="field"><label htmlFor="reference-text">Dein eigenständiger Text</label><textarea id="reference-text" rows={8} maxLength={2900} value={draft} onChange={e=>setDraft(e.target.value)}/></div>
   <div className="field"><label htmlFor="reference-reason">Begründe Erstnennung, Wiederaufnahme und begrenzte Aussagen</label><textarea id="reference-reason" rows={5} maxLength={1150} value={draftWhy} onChange={e=>setDraftWhy(e.target.value)}/></div>
   {unchanged&&<p role="status" className="feedback">Die Fassung ist unverändert. Überarbeite sie vor dem Speichern.</p>}
   <button type="button" className="button" disabled={busy||draft.trim().length<100||draftWhy.trim().length<25||!paragraph||unchanged} onClick={()=>void saveTransfer()}>{latest?'Überarbeitung speichern':'Eigenen Text speichern'}</button>
   {record.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((r,i,all)=>{
    const before=i?all[i-1]:null;
    return <article className="reference-writing" key={r.id}>
     <h3>{i+1} · {r.questionId==='TRANSFER'?'Erster eigener Text':'Überarbeitung'}</h3>
     <p className="written">{r.text}</p><p><strong>Quelle:</strong> {r.paragraphId} · <strong>Begründung:</strong> {r.reflection}</p>
     {before&&<details><summary>Vergleich mit der vorherigen Textfassung</summary><div className="written version-diff">{revisionDiff(before.text,r.text).map((part,j)=><span key={j} className={'diff-'+part.kind}>{part.text} </span>)}</div></details>}
    </article>;
   })}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button type="button" className="button outline" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
