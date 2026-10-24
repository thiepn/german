import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {repairStudies,isRepairEntry,beginRepair,appendRepairTurn,appendRepairSummary,repairProgress,nextRepairStudy,nextRepairTurn,savedRepairEvidence,latestRepairSummary,independentRepair,type RepairChoice} from '../../domain/repair/repair';

export default function RepairStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(repairStudies.some(s=>s.id===initialSelection)?initialSelection!:repairStudies[0].id);
 const [choice,setChoice]=useState<RepairChoice|''>(''),[question,setQuestion]=useState(''),[reply,setReply]=useState(''),[unresolved,setUnresolved]=useState('');
 const [draft,setDraft]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=repairStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isRepairEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextRepairTurn(study,entry),latest=entry?latestRepairSummary(entry):null,progress=repairProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setQuestion('');setReply('');setUnresolved('');setDraft('');setReason('');setAnchor('');setError('')}
 async function saveTurn(){
  if(!next||!choice||busy||!independentRepair(next,question,reply,unresolved))return;
  setBusy(true);setError('');
  try{
   if(!entry)await saveProductionEntry(beginRepair(study,next.id,choice,question,reply,unresolved,Date.now()),0);
   else await saveProductionEntry(appendRepairTurn(entry,study,next.id,choice,question,reply,unresolved,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setChoice('');setQuestion('');setReply('');setUnresolved('');
  }catch(e){setError('Klärungsfrage nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveSummary(){
  if(!entry||next||busy)return;setBusy(true);setError('');
  try{
   await saveProductionEntry(appendRepairSummary(entry,study,latest?'REWRITE':'TRANSFER',draft,reason,anchor,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setDraft('');setReason('');setAnchor('');
  }catch(e){setError('Ergebnisnotiz nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 const same=!!latest&&draft.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE')===latest.text.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
 return <section className="polysemy-studio repair-studio">
  <h1 className="page-title">Missverständnisse klären</h1>
  <p className="small muted">{progress.started}/{progress.total} Gesprächskontexte · {progress.questions} Klärungen · {progress.transferred} Ergebnisnotizen · {progress.revised} Revisionen. Unbewertet.</p>
  <div className="field"><label htmlFor="repair-select">Gespräch</label><select id="repair-select" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{repairStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextRepairStudy(entries).id!==selected&&<button type="button" className="button outline" disabled={busy} onClick={()=>select(nextRepairStudy(entries).id)}>Nächstes Gespräch öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G12 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map(p=><p className="polysemy-paragraph" key={p.id}><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind}</p>
  </article>
  {entry&&<section className="panel polysemy-history"><h2>Dokumentierte Klärungen</h2>{study.repairs.map((t,i)=>{
   const evidence=savedRepairEvidence(entry,t);if(!evidence)return null;
   return <article className="polysemy-analysis" key={t.id}><h3>{i+1} · {t.speaker}</h3><p><strong>Original:</strong> „{t.quote}“</p>
    <p><strong>Nachfrage:</strong> <span className="written">{evidence.clarification}</span></p>
    <p><strong>Vorbehaltliche Antwort:</strong> <span className="written">{evidence.reply}</span></p>
    <p><strong>Offen:</strong> {evidence.open}</p>
    <details><summary>Fiktive Antwort und Quellenabgleich</summary><p>{t.clarified}</p><p>{t.model}</p><p><strong>Gewählte Lesart:</strong> {t.options.find(x=>x.id===evidence.choice)?.text}</p></details>
   </article>;
  })}</section>}
  {next&&<section className="panel polysemy-task"><h2>Klärung {study.repairs.indexOf(next)+1} / {study.repairs.length}</h2>
   <div className="polysemy-before-after"><div><strong>{next.speaker} · {next.paragraphId}</strong><p>„{next.quote}“</p></div><div><strong>Gesicherte Aussage?</strong><p>{next.question}</p></div></div>
   <div className="field"><label htmlFor="repair-choice">Gesicherte Lesart</label><select id="repair-choice" value={choice} disabled={busy} onChange={e=>setChoice(e.target.value as RepairChoice|'')}><option value="">Lesart auswählen</option>{next.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="repair-question">Stelle eine präzise, sachliche Nachfrage zu Umfang, Termin oder Zuständigkeit</label><textarea id="repair-question" rows={4} maxLength={800} value={question} onChange={e=>setQuestion(e.target.value)}/></div>
   <div className="field"><label htmlFor="repair-reply">Formuliere deine Antwort unter ausdrücklichem Vorbehalt der Klärung</label><textarea id="repair-reply" rows={5} maxLength={1400} value={reply} onChange={e=>setReply(e.target.value)}/></div>
   <div className="field"><label htmlFor="repair-open">Welche Festlegung bleibt ohne Antwort auf deine Nachfrage ungesichert?</label><textarea id="repair-open" rows={4} maxLength={1100} value={unresolved} onChange={e=>setUnresolved(e.target.value)}/></div>
   <button type="button" className="button" disabled={busy||!choice||!independentRepair(next,question,reply,unresolved)} onClick={()=>void saveTurn()}>Klärung dokumentieren</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer"><h2>{latest?'Ergebnisnotiz überarbeiten':'Neutralen Ergebnisvermerk verfassen'}</h2><p>{study.brief}</p>
   {latest&&<><h3>Letzte Fassung</h3><p className="written">{latest.text}</p><button type="button" className="button outline" onClick={()=>setDraft(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="repair-anchor">Anker für eine offene Entscheidung</label><select id="repair-anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="">Quellenstelle wählen</option>{study.repairs.map(r=><option key={r.id} value={r.id}>{r.speaker} · {r.paragraphId}</option>)}</select></div>
   <div className="field"><label htmlFor="repair-draft">Eigene Ergebnisnotiz mit Zusagen, Prüfaufträgen und offenen Punkten</label><textarea id="repair-draft" rows={9} maxLength={3300} value={draft} onChange={e=>setDraft(e.target.value)}/></div>
   <div className="field"><label htmlFor="repair-reason">Begründe die Abgrenzung von tatsächlich Vereinbartem und offen Gebliebenem</label><textarea id="repair-reason" rows={5} maxLength={1100} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {same&&<p role="status" className="feedback">Keine Textänderung erfasst.</p>}
   <button type="button" className="button" disabled={busy||!anchor||draft.trim().length<360||reason.trim().length<65||same} onClick={()=>void saveSummary()}>{latest?'Überarbeitung speichern':'Ergebnisnotiz speichern'}</button>
   {entry.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((rev,i,all)=><article className="polysemy-writing" key={rev.id}><h3>{i+1} · {rev.questionId==='TRANSFER'?'Erstfassung':'Überarbeitung'}</h3><p className="written">{rev.text}</p><p><strong>Quellenstelle:</strong> {rev.paragraphId} · <strong>Begründung:</strong> {rev.reflection}</p>
    {i>0&&<details><summary>Änderungen gegenüber dem vorherigen Vermerk</summary><div className="written version-diff">{revisionDiff(all[i-1].text,rev.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p role="alert" className="feedback incorrect">{error}</p>}
  <div className="buttonrow"><button type="button" className="button outline" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
