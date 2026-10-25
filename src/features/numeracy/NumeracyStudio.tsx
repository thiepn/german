import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {numericStudies,isNumericEntry,beginNumeric,appendNumericClaim,appendNumericReport,numericProgress,nextNumericStudy,nextNumericClaim,savedNumericEvidence,latestNumericReport,independentNumeric,type NumericChoice} from '../../domain/numeracy/numeracy';

export default function NumeracyStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]),[selected,setSelected]=useState(numericStudies.some(s=>s.id===initialSelection)?initialSelection!:numericStudies[0].id);
 const [choice,setChoice]=useState<NumericChoice|''>(''),[statement,setStatement]=useState(''),[denominator,setDenominator]=useState(''),[limit,setLimit]=useState('');
 const [report,setReport]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=numericStudies.find(x=>x.id===selected)!;
 const entry=entries.find(e=>isNumericEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextNumericClaim(study,entry),latest=entry?latestNumericReport(entry):null,progress=numericProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let active=true;void loadProductionEntries().then(rows=>{if(active)setEntries(rows)}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setStatement('');setDenominator('');setLimit('');setReport('');setReason('');setAnchor('');setError('')}
 async function saveClaim(){
  if(!next||!choice||busy||!independentNumeric(next,statement,denominator,limit))return;
  setBusy(true);setError('');
  try{
   if(!entry)await saveProductionEntry(beginNumeric(study,next.id,choice,statement,denominator,limit,Date.now()),0);
   else await saveProductionEntry(appendNumericClaim(entry,study,next.id,choice,statement,denominator,limit,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setChoice('');setStatement('');setDenominator('');setLimit('');
  }catch(e){setError('Zahlenbeleg nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveReport(){
  if(!entry||next||busy)return;setBusy(true);setError('');
  try{
   await saveProductionEntry(appendNumericReport(entry,study,latest?'REWRITE':'TRANSFER',report,reason,anchor,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setReport('');setReason('');setAnchor('');
  }catch(e){setError('Bericht nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 const same=!!latest&&report.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE')===latest.text.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
 return <section className="polysemy-studio numeracy-studio">
  <h1 className="page-title">Zahlen präzise ausdrücken</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellen · {progress.claims} Zahlenbelege · {progress.transferred} eigene Berichte · {progress.revised} Revisionen. Ohne automatische Bewertung.</p>
  <div className="field"><label htmlFor="numeric-select">Dokument</label><select id="numeric-select" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{numericStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextNumericStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextNumericStudy(entries).id)}>Nächstes Dokument öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G09 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map(p=><p key={p.id} className="polysemy-paragraph"><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind}</p>
  </article>
  {entry&&<section className="panel polysemy-history"><h2>Gespeicherte Zahlenbelege</h2>{study.claims.map((c,i)=>{
   const saved=savedNumericEvidence(entry,c);if(!saved)return null;
   return <article key={c.id} className="polysemy-analysis"><h3>{i+1} · {c.paragraphId}</h3>
    <p><strong>Eigene präzise Wiedergabe:</strong> <span className="written">{saved.statement}</span></p>
    <p><strong>Bezugsgröße und Einheit:</strong> <span className="written">{saved.denominator}</span></p>
    <p><strong>Nicht gedeckte Folgerung:</strong> {saved.limit}</p>
    <details><summary>Original und Erläuterung</summary><p>„{c.quote}“</p><p>{c.model}</p><p><strong>Fallstrick:</strong> {c.trap}</p><p><strong>Gewählte Lesart:</strong> {c.options.find(x=>x.id===saved.choice)?.text}</p></details>
   </article>;
  })}</section>}
  {next&&<section className="panel polysemy-task"><h2>Zahlenbeleg {study.claims.indexOf(next)+1} / {study.claims.length}</h2>
   <p><strong>Originalbeleg · {next.paragraphId}:</strong> „{next.quote}“</p><p>{next.question}</p>
   <div className="field"><label htmlFor="numeric-choice">Korrekte Lesart</label><select id="numeric-choice" value={choice} disabled={busy} onChange={e=>setChoice(e.target.value as NumericChoice|'')}><option value="">Lesart wählen</option>{next.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="numeric-statement">Formuliere die begrenzte numerische Aussage in eigenen Worten</label><textarea id="numeric-statement" rows={5} maxLength={1450} value={statement} onChange={e=>setStatement(e.target.value)}/></div>
   <div className="field"><label htmlFor="numeric-denominator">Nenne Nenner, Einheit und Vergleichszeitraum oder deren Fehlen</label><textarea id="numeric-denominator" rows={4} maxLength={1200} value={denominator} onChange={e=>setDenominator(e.target.value)}/></div>
   <div className="field"><label htmlFor="numeric-limit">Welche quantitative oder kausale Folgerung ist unzulässig?</label><textarea id="numeric-limit" rows={5} maxLength={1300} value={limit} onChange={e=>setLimit(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!independentNumeric(next,statement,denominator,limit)} onClick={()=>void saveClaim()}>Zahlenbeleg speichern</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer"><h2>{latest?'Bericht überarbeiten':'Eigenen Zahlenbericht schreiben'}</h2><p>{study.brief}</p>
   {latest&&<><h3>Letzte Fassung</h3><p className="written">{latest.text}</p><button className="button outline" type="button" onClick={()=>setReport(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="numeric-anchor">Zentrale Quellenstelle</label><select id="numeric-anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="">Beleg wählen</option>{study.claims.map(c=><option key={c.id} value={c.id}>{c.id} · {c.paragraphId}</option>)}</select></div>
   <div className="field"><label htmlFor="numeric-report">Eigenständiger mehrabsätziger Bericht mit korrekten Größen, Zeiträumen und Grenzen</label><textarea id="numeric-report" rows={10} maxLength={3800} value={report} onChange={e=>setReport(e.target.value)}/></div>
   <div className="field"><label htmlFor="numeric-reason">Begründe, welche Zahlenangabe du korrigiert und welche Reichweite du begrenzt hast</label><textarea id="numeric-reason" rows={5} maxLength={1250} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {same&&<p className="feedback" role="status">Keine Textänderung erfasst.</p>}
   <button className="button" type="button" disabled={busy||!anchor||report.trim().length<480||reason.trim().length<75||same} onClick={()=>void saveReport()}>{latest?'Überarbeitung speichern':'Zahlenbericht speichern'}</button>
   {entry.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((rev,i,all)=><article key={rev.id} className="polysemy-writing"><h3>{i+1} · {rev.questionId==='TRANSFER'?'Erste eigene Fassung':'Überarbeitung'}</h3>
    <p className="written">{rev.text}</p><p><strong>Quellenstelle:</strong> {rev.paragraphId} · <strong>Begründung:</strong> {rev.reflection}</p>
    {i>0&&<details><summary>Änderungen gegenüber der vorherigen Fassung</summary><div className="written version-diff">{revisionDiff(all[i-1].text,rev.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button className="button outline" type="button" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
