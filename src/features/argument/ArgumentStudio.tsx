import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {argumentStudies,isArgumentEntry,beginArgument,appendArgumentNode,appendArgumentEssay,argumentProgress,nextArgumentStudy,nextArgumentNode,savedArgumentEvidence,latestArgumentEssay,independentArgument,type ArgumentChoice} from '../../domain/argument/argument';
export default function ArgumentStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]),[selected,setSelected]=useState(argumentStudies.some(s=>s.id===initialSelection)?initialSelection!:argumentStudies[0].id);
 const [choice,setChoice]=useState<ArgumentChoice|''>(''),[claim,setClaim]=useState(''),[warrant,setWarrant]=useState(''),[counter,setCounter]=useState('');
 const [essay,setEssay]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=argumentStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isArgumentEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextArgumentNode(study,entry),latest=entry?latestArgumentEssay(entry):null,progress=argumentProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let active=true;void loadProductionEntries().then(v=>{if(active)setEntries(v)}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setClaim('');setWarrant('');setCounter('');setEssay('');setReason('');setAnchor('');setError('')}
 async function saveNode(){
  if(!next||!choice||busy||!independentArgument(next,claim,warrant,counter))return;
  setBusy(true);setError('');
  try{
   if(!entry)await saveProductionEntry(beginArgument(study,next.id,choice,claim,warrant,counter,Date.now()),0);
   else await saveProductionEntry(appendArgumentNode(entry,study,next.id,choice,claim,warrant,counter,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setChoice('');setClaim('');setWarrant('');setCounter('');
  }catch(e){setError('Argument nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveEssay(){
  if(!entry||next||busy)return;setBusy(true);setError('');
  try{
   await saveProductionEntry(appendArgumentEssay(entry,study,latest?'REWRITE':'TRANSFER',essay,reason,anchor,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setEssay('');setReason('');setAnchor('');
  }catch(e){setError('Textfassung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 const same=!!latest&&essay.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE')===latest.text.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
 return <section className="polysemy-studio argument-studio">
  <h1 className="page-title">Argumente begründen und prüfen</h1>
  <p className="small muted">{progress.started}/{progress.total} Dokumente · {progress.chains} Argumentketten · {progress.transferred} eigene Texte · {progress.revised} Überarbeitungen. Unbewertet.</p>
  <div className="field"><label htmlFor="argument-select">Quelle</label><select id="argument-select" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{argumentStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextArgumentStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextArgumentStudy(entries).id)}>Nächste Quelle öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G11 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map(p=><p className="polysemy-paragraph" key={p.id}><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind}</p>
  </article>
  {entry&&<section className="panel polysemy-history"><h2>Eigene Argumentketten</h2>{study.arguments.map((a,i)=>{
   const saved=savedArgumentEvidence(entry,a);if(!saved)return null;
   return <article key={a.id} className="polysemy-analysis"><h3>{i+1} · {a.paragraphId}</h3>
    <p><strong>Begrenzte Schlussfolgerung:</strong> <span className="written">{saved.claim}</span></p>
    <p><strong>Verbindende Annahme:</strong> <span className="written">{saved.warrant}</span></p>
    <p><strong>Stärkster Einwand:</strong> <span className="written">{saved.counter}</span></p>
    <details><summary>Originalbeleg und Gegenprüfung</summary><p>„{a.quote}“</p><p>{a.model}</p><p><strong>Beispiel für einen Einwand:</strong> {a.counter}</p><p><strong>Gewählte Schlussfolgerung:</strong> {a.options.find(x=>x.id===saved.choice)?.text}</p></details>
   </article>;
  })}</section>}
  {next&&<section className="panel polysemy-task"><h2>Argumentkette {study.arguments.indexOf(next)+1} / {study.arguments.length}</h2>
   <p><strong>Originalbeleg · {next.paragraphId}:</strong> „{next.quote}“</p><p>{next.question}</p>
   <div className="field"><label htmlFor="argument-choice">Quellengedeckte Schlussfolgerung</label><select id="argument-choice" value={choice} disabled={busy} onChange={e=>setChoice(e.target.value as ArgumentChoice|'')}><option value="">Lesart wählen</option>{next.options.map(x=><option key={x.id} value={x.id}>{x.text}</option>)}</select></div>
   <div className="field"><label htmlFor="argument-claim">Formuliere eine begrenzte eigene Schlussfolgerung</label><textarea id="argument-claim" rows={5} maxLength={1350} value={claim} onChange={e=>setClaim(e.target.value)}/></div>
   <div className="field"><label htmlFor="argument-warrant">Welche zusätzliche Annahme verbindet den Beleg mit deiner Schlussfolgerung?</label><textarea id="argument-warrant" rows={4} maxLength={1150} value={warrant} onChange={e=>setWarrant(e.target.value)}/></div>
   <div className="field"><label htmlFor="argument-counter">Formuliere den stärksten ernstzunehmenden Einwand gegen deine Schlussfolgerung</label><textarea id="argument-counter" rows={5} maxLength={1300} value={counter} onChange={e=>setCounter(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!independentArgument(next,claim,warrant,counter)} onClick={()=>void saveNode()}>Argumentkette speichern</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer"><h2>{latest?'Argumenttext überarbeiten':'Eigenen Argumenttext schreiben'}</h2><p>{study.brief}</p>
   {latest&&<><h3>Letzte Fassung</h3><p className="written">{latest.text}</p><button className="button outline" type="button" onClick={()=>setEssay(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="argument-anchor">Zentrale Quellenstelle</label><select id="argument-anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="">Quellenstelle wählen</option>{study.arguments.map(a=><option value={a.id} key={a.id}>{a.id} · {a.paragraphId}</option>)}</select></div>
   <div className="field"><label htmlFor="argument-essay">Eigener mehrabsätziger Kommentar mit begründetem Urteil und Gegenargument</label><textarea id="argument-essay" rows={10} maxLength={3800} value={essay} onChange={e=>setEssay(e.target.value)}/></div>
   <div className="field"><label htmlFor="argument-reason">Wie hast du Evidenz, Annahmen, Einwände und Schlussfolgerung gegeneinander abgewogen?</label><textarea id="argument-reason" rows={5} maxLength={1250} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {same&&<p className="feedback" role="status">Keine Textänderung erfasst.</p>}
   <button className="button" type="button" disabled={busy||!anchor||essay.trim().length<480||reason.trim().length<75||same} onClick={()=>void saveEssay()}>{latest?'Überarbeitung speichern':'Argumenttext speichern'}</button>
   {entry.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((r,i,all)=><article key={r.id} className="polysemy-writing">
    <h3>{i+1} · {r.questionId==='TRANSFER'?'Erste eigene Fassung':'Überarbeitung'}</h3><p className="written">{r.text}</p><p><strong>Quellenanker:</strong> {r.paragraphId} · <strong>Begründung:</strong> {r.reflection}</p>
    {i>0&&<details><summary>Änderungen gegenüber der vorherigen Fassung</summary><div className="written version-diff">{revisionDiff(all[i-1].text,r.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button className="button outline" type="button" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
