import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {definitionStudies,isDefinitionEntry,beginDefinition,appendDefinitionDistinction,appendDefinitionReport,definitionProgress,nextDefinitionStudy,nextDefinitionDistinction,savedDefinitionEvidence,latestDefinitionReport,independentDefinition,type DefinitionChoice} from '../../domain/definition/definition';

export default function DefinitionStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]),[selected,setSelected]=useState(definitionStudies.some(s=>s.id===initialSelection)?initialSelection!:definitionStudies[0].id);
 const [choice,setChoice]=useState<DefinitionChoice|''>(''),[definition,setStatement]=useState(''),[contrast,setDenominator]=useState(''),[application,setLimit]=useState('');
 const [report,setReport]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=definitionStudies.find(x=>x.id===selected)!;
 const entry=entries.find(e=>isDefinitionEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextDefinitionDistinction(study,entry),latest=entry?latestDefinitionReport(entry):null,progress=definitionProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let active=true;void loadProductionEntries().then(rows=>{if(active)setEntries(rows)}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setStatement('');setDenominator('');setLimit('');setReport('');setReason('');setAnchor('');setError('')}
 async function saveDistinction(){
  if(!next||!choice||busy||!independentDefinition(next,definition,contrast,application))return;
  setBusy(true);setError('');
  try{
   if(!entry)await saveProductionEntry(beginDefinition(study,next.id,choice,definition,contrast,application,Date.now()),0);
   else await saveProductionEntry(appendDefinitionDistinction(entry,study,next.id,choice,definition,contrast,application,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setChoice('');setStatement('');setDenominator('');setLimit('');
  }catch(e){setError('Begriffsbeleg nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveReport(){
  if(!entry||next||busy)return;setBusy(true);setError('');
  try{
   await saveProductionEntry(appendDefinitionReport(entry,study,latest?'REWRITE':'TRANSFER',report,reason,anchor,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setReport('');setReason('');setAnchor('');
  }catch(e){setError('Bericht nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 const same=!!latest&&report.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE')===latest.text.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
 return <section className="polysemy-studio numeracy-studio">
  <h1 className="page-title">Begriffe präzise abgrenzen</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellen · {progress.distinctions} Begriffsbelege · {progress.transferred} eigene Vermerke · {progress.revised} Revisionen. Ohne automatische Bewertung.</p>
  <div className="field"><label htmlFor="definition-select">Dokument</label><select id="definition-select" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{definitionStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextDefinitionStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextDefinitionStudy(entries).id)}>Nächstes Dokument öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G06 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map(p=><p key={p.id} className="polysemy-paragraph"><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind}</p>
  </article>
  {entry&&<section className="panel polysemy-history"><h2>Gespeicherte Begriffsbelege</h2>{study.distinctions.map((c,i)=>{
   const saved=savedDefinitionEvidence(entry,c);if(!saved)return null;
   return <article key={c.id} className="polysemy-analysis"><h3>{i+1} · {c.paragraphId}</h3>
    <p><strong>Eigene Definition:</strong> <span className="written">{saved.definition}</span></p>
    <p><strong>Begriffliche Abgrenzung:</strong> <span className="written">{saved.contrast}</span></p>
    <p><strong>Fallanwendung:</strong> {saved.application}</p>
    <details><summary>Original und Erläuterung</summary><p>„{c.quote}“</p><p>{c.model}</p><p><strong>Fallstrick:</strong> {c.trap}</p><p><strong>Gewählte Lesart:</strong> {c.options.find(x=>x.id===saved.choice)?.text}</p></details>
   </article>;
  })}</section>}
  {next&&<section className="panel polysemy-task"><h2>Begriffsbeleg {study.distinctions.indexOf(next)+1} / {study.distinctions.length}</h2>
   <p><strong>{next.term} / {next.nearTerm} · {next.paragraphId}:</strong> „{next.quote}“</p><p>{next.question}</p>
   <div className="field"><label htmlFor="definition-choice">Sachlich präzise Abgrenzung</label><select id="definition-choice" value={choice} disabled={busy} onChange={e=>setChoice(e.target.value as DefinitionChoice|'')}><option value="">Lesart wählen</option>{next.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="definition-definition">Definiere den Fachbegriff in eigenen Worten und nenne seinen Geltungsbereich</label><textarea id="definition-definition" rows={5} maxLength={1450} value={definition} onChange={e=>setStatement(e.target.value)}/></div>
   <div className="field"><label htmlFor="definition-contrast">Grenze den Begriff ausdrücklich vom benachbarten Fachbegriff ab</label><textarea id="definition-contrast" rows={4} maxLength={1200} value={contrast} onChange={e=>setDenominator(e.target.value)}/></div>
   <div className="field"><label htmlFor="definition-application">Gib einen konkreten Anwendungsfall oder begründeten Grenzfall an</label><textarea id="definition-application" rows={5} maxLength={1300} value={application} onChange={e=>setLimit(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!independentDefinition(next,definition,contrast,application)} onClick={()=>void saveDistinction()}>Begriffsbeleg speichern</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer"><h2>{latest?'Bericht überarbeiten':'Eigenen Begriffsvermerk schreiben'}</h2><p>{study.brief}</p>
   {latest&&<><h3>Letzte Fassung</h3><p className="written">{latest.text}</p><button className="button outline" type="button" onClick={()=>setReport(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="definition-anchor">Begriff und Quellenstelle</label><select id="definition-anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="">Beleg wählen</option>{study.distinctions.map(c=><option key={c.id} value={c.id}>{c.id} · {c.paragraphId}</option>)}</select></div>
   <div className="field"><label htmlFor="definition-report">Mehrabsätziger fachsprachlicher Vermerk mit drei konsistenten Definitionen, Anwendungsgrenzen und einem korrigierten Fehlgebrauch</label><textarea id="definition-report" rows={10} maxLength={3800} value={report} onChange={e=>setReport(e.target.value)}/></div>
   <div className="field"><label htmlFor="definition-reason">Begründe, welche begriffliche Verwechslung du korrigiert und welchen Grenzfall du berücksichtigt hast</label><textarea id="definition-reason" rows={5} maxLength={1250} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {same&&<p className="feedback" role="status">Keine Textänderung erfasst.</p>}
   <button className="button" type="button" disabled={busy||!anchor||report.trim().length<480||reason.trim().length<75||same} onClick={()=>void saveReport()}>{latest?'Überarbeitung speichern':'Begriffsvermerk speichern'}</button>
   {entry.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((rev,i,all)=><article key={rev.id} className="polysemy-writing"><h3>{i+1} · {rev.questionId==='TRANSFER'?'Erste eigene Fassung':'Überarbeitung'}</h3>
    <p className="written">{rev.text}</p><p><strong>Quellenstelle:</strong> {rev.paragraphId} · <strong>Begründung:</strong> {rev.reflection}</p>
    {i>0&&<details><summary>Änderungen gegenüber der vorherigen Fassung</summary><div className="written version-diff">{revisionDiff(all[i-1].text,rev.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button className="button outline" type="button" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
