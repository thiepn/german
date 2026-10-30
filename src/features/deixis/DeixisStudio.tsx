import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {deixisStudies,isDeixisEntry,beginDeixis,appendDeixis,appendDeixisMemo,deixisProgress,nextDeixisStudy,nextDeixis,savedDeixis,latestDeixisMemo,independentDeixis,substantialDeixisRevision,type DeixisChoice} from '../../domain/deixis/deixis';

export default function DeixisStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(deixisStudies.some(s=>s.id===initialSelection)?initialSelection!:deixisStudies[0].id);
 const [choice,setChoice]=useState<DeixisChoice|''>(''),[report,setReport]=useState(''),[misreading,setMisreading]=useState(''),[origo,setOrigo]=useState(''),[boundary,setBoundary]=useState('');
 const [memo,setMemo]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=deixisStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isDeixisEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextDeixis(study,entry),latest=entry?latestDeixisMemo(entry):null,progress=deixisProgress(entries);
 const dirty=[choice,report,misreading,origo,boundary,memo,reason].some(x=>x.trim().length>0);
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 const refresh=async()=>setEntries(await loadProductionEntries());
 function clear(){setChoice('');setReport('');setMisreading('');setOrigo('');setBoundary('');setMemo('');setReason('');setAnchor('');setError('')}
 function select(id:string){if(dirty&&!window.confirm('Ungespeicherte Texte für dieses Dokument verwerfen?'))return;setSelected(id);clear()}
 function exit(){if(dirty&&!window.confirm('Ungespeicherte Texte verwerfen?'))return;onExit()}
 async function saveEvidence(){
  if(!next||!choice||busy||!independentDeixis(next,report,misreading,origo,boundary))return;
  setBusy(true);setError('');
  try{
   const result=!entry?beginDeixis(study,next.id,choice,report,misreading,origo,boundary,Date.now()):appendDeixis(entry,study,next.id,choice,report,misreading,origo,boundary,crypto.randomUUID(),Date.now());
   await saveProductionEntry(result,entry?.revisions.length??0);await refresh();clear();
  }catch(e){setError('Deixisbeleg nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveMemo(){
  if(!entry||next||busy)return;setBusy(true);setError('');
  try{
   const result=appendDeixisMemo(entry,study,latest?'REWRITE':'TRANSFER',memo,reason,anchor,crypto.randomUUID(),Date.now());
   await saveProductionEntry(result,entry.revisions.length);await refresh();clear();
  }catch(e){setError('Vermerk nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 const ready=memo.trim().length>=560&&memo.trim().split(/\n\s*\n/).filter(Boolean).length>=2&&reason.trim().length>=110&&!!anchor&&(!latest||substantialDeixisRevision(latest.text,memo));
 const memos=entry?.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??[];
 return <section className="polysemy-studio deixis-studio">
  <h1 className="page-title">Deiktische Zentren und Perspektivwechsel</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellen begonnen · {progress.analyses} Deixisrekonstruktionen · {progress.transferred} Vermerke · {progress.revised} Revisionen. Ohne automatische Bewertung.</p>
  <div className="field"><label htmlFor="deixis-select">Quelldokument</label><select id="deixis-select" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{deixisStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextDeixisStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextDeixisStudy(entries).id)}>Nächstes Dokument öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G01 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map(p=><p key={p.id} className="polysemy-paragraph"><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind} · redaktionell ungeprüft</p>
  </article>
  {entry&&<section className="panel"><h2>Gespeicherte Deixisbelege</h2>{study.anchors.map((point,i)=>{const saved=savedDeixis(entry,point);if(!saved)return null;
   return <article key={point.id} className="polysemy-analysis"><h3>{i+1} · {point.phenomenon} · {point.paragraphId}</h3>
    <p><strong>Datierter eigener Bericht:</strong> <span className="written">{saved.report}</span></p><p><strong>Falsche Verankerung:</strong> <span className="written">{saved.misreading}</span></p>
    <p><strong>Deiktischer Nullpunkt:</strong> <span className="written">{saved.origo}</span></p><p><strong>Ungedeckte Verschiebung:</strong> <span className="written">{saved.boundary}</span></p>
    <details><summary>Quelle und ungeprüfte Musterdeutung</summary><p>„{point.quote}“</p><p>{point.model}</p><p>Fallstrick: {point.trap}</p><p>Gewählte Lesart: {point.options.find(o=>o.id===saved.choice)?.text}</p></details>
   </article>})}</section>}
  {next&&<section className="panel polysemy-task"><h2>Deixisbeleg {study.anchors.indexOf(next)+1} / {study.anchors.length}</h2><p><strong>{next.phenomenon} · {next.paragraphId}:</strong> „{next.quote}“</p><p>{next.question}</p>
   <div className="field"><label htmlFor="deixis-choice">Welche deiktische Verankerung stützt die Originaläußerung?</label><select id="deixis-choice" value={choice} disabled={busy} onChange={e=>setChoice(e.target.value as DeixisChoice|'')}><option value="">Deixis wählen</option>{next.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="deixis-report">Schreibe eine eindeutig datierte indirekte Wiedergabe mit aufgelösten Orts- und Personenbezügen</label><textarea id="deixis-report" rows={5} maxLength={1450} value={report} onChange={e=>setReport(e.target.value)}/></div>
   <div className="field"><label htmlFor="deixis-misreading">Beschreibe eine plausible, aber falsch verankerte spätere Lesart</label><textarea id="deixis-misreading" rows={5} maxLength={1450} value={misreading} onChange={e=>setMisreading(e.target.value)}/></div>
   <div className="field"><label htmlFor="deixis-origo">Erläutere Sprecher, Äußerungsdatum, Ort und Adressat anhand einer konkreten Quelleninformation</label><textarea id="deixis-origo" rows={5} maxLength={1650} value={origo} onChange={e=>setOrigo(e.target.value)}/></div>
   <div className="field"><label htmlFor="deixis-boundary">Welche anachronistische oder falsch zugeordnete Folgerung ist nicht gedeckt?</label><textarea id="deixis-boundary" rows={5} maxLength={1400} value={boundary} onChange={e=>setBoundary(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!independentDeixis(next,report,misreading,origo,boundary)} onClick={()=>void saveEvidence()}>Deixisbeleg speichern</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer"><h2>{latest?'Adressatengerechte Revision':'Eigenständigen Perspektivbericht schreiben'}</h2><p>{study.brief}</p>
   {latest&&<><h3>Letzte Fassung</h3><p className="written">{latest.text}</p><button className="button outline" type="button" disabled={busy} onClick={()=>setMemo(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="deixis-anchor">Quellenanker für die Begründung</label><select id="deixis-anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="">Quellenbeleg wählen</option>{study.anchors.map(p=><option key={p.id} value={p.id}>{p.phenomenon} · {p.paragraphId}</option>)}</select></div>
   <div className="field"><label htmlFor="deixis-memo">Eigenständiger mehrabsätziger Bericht zu allen drei deiktischen Perspektiven</label><textarea id="deixis-memo" rows={12} maxLength={3900} value={memo} onChange={e=>setMemo(e.target.value)}/></div>
   <div className="field"><label htmlFor="deixis-reason">Begründe den deiktischen Nullpunkt und mindestens eine wesentliche Adressatenkorrektur</label><textarea id="deixis-reason" rows={6} maxLength={1500} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {latest&&memo.trim()&&!substantialDeixisRevision(latest.text,memo)&&<p role="status">Eine substanzielle Überarbeitung ist erforderlich.</p>}
   <button className="button" type="button" disabled={busy||!ready} onClick={()=>void saveMemo()}>{latest?'Überarbeitung speichern':'Perspektivbericht speichern'}</button>
   {memos.map((rev,i)=><article className="polysemy-writing" key={rev.id}><h3>{i+1} · {rev.questionId==='TRANSFER'?'Erster Vermerk':'Überarbeitete Fassung'}</h3><p className="written">{rev.text}</p><p><strong>Quellenanker:</strong> {rev.paragraphId} · <strong>Begründung:</strong> {rev.reflection}</p>
    {i>0&&<details><summary>Versionsvergleich</summary><div className="written version-diff">{revisionDiff(memos[i-1].text,rev.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}<div className="buttonrow"><button className="button outline" type="button" onClick={exit}>Zurück zum Curriculum</button></div>
 </section>;
}
