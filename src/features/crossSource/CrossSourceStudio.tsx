import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {crossStudies,isCrossEntry,beginCross,appendCrossComparison,appendCrossTransfer,crossProgress,nextCrossStudy,nextCrossComparison,savedCrossEvidence,latestCrossTransfer,independentCrossReading,type CrossChoice} from '../../domain/crossSource/crossSource';

export default function CrossSourceStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(crossStudies.some(s=>s.id===initialSelection)?initialSelection!:crossStudies[0].id);
 const [choice,setChoice]=useState<CrossChoice|''>(''),[readingA,setReadingA]=useState(''),[readingB,setReadingB]=useState(''),[boundary,setBoundary]=useState('');
 const [draft,setDraft]=useState(''),[reason,setReason]=useState(''),[pair,setPair]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const s=crossStudies.find(x=>x.id===selected)!;
 const e=entries.find(x=>isCrossEntry(x)&&x.itemId===s.id&&x.sourceId===s.id&&x.itemVersion===s.version)??null;
 const next=nextCrossComparison(s,e),latest=e?latestCrossTransfer(e):null,progress=crossProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let active=true;void loadProductionEntries().then(rows=>{if(active)setEntries(rows)}).catch(err=>{if(active)setError(String(err))});return()=>{active=false}},[]);
 function choose(id:string){setSelected(id);setChoice('');setReadingA('');setReadingB('');setBoundary('');setDraft('');setReason('');setPair('');setError('')}
 async function saveAnalysis(){
  if(!next||!choice||busy||!independentCrossReading(next,readingA,readingB,boundary))return;
  setBusy(true);setError('');
  try{
   if(!e)await saveProductionEntry(beginCross(s,next.id,choice,readingA,readingB,boundary,Date.now()),0);
   else await saveProductionEntry(appendCrossComparison(e,s,next.id,choice,readingA,readingB,boundary,crypto.randomUUID(),Date.now()),e.revisions.length);
   await refresh();setChoice('');setReadingA('');setReadingB('');setBoundary('');
  }catch(err){setError('Quellenvergleich nicht gespeichert: '+String(err));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveSynthesis(){
  if(!e||next||busy)return;
  setBusy(true);setError('');
  try{
   const updated=appendCrossTransfer(e,s,latest?'REWRITE':'TRANSFER',draft,reason,pair,crypto.randomUUID(),Date.now());
   await saveProductionEntry(updated,e.revisions.length);
   await refresh();setDraft('');setReason('');setPair('');
  }catch(err){setError('Synthese nicht gespeichert: '+String(err));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 const same=!!latest&&draft.trim().replace(/\s+/g,' ').toLowerCase()===latest.text.trim().replace(/\s+/g,' ').toLowerCase();
 return <section className="polysemy-studio cross-source-studio">
  <h1 className="page-title">Quellen gegeneinander lesen</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellenpaare begonnen · {progress.comparisons} Vergleiche · {progress.transferred} Synthesen · {progress.revisions} Überarbeitungen. Nicht automatisch bewertet.</p>
  <div className="field"><label htmlFor="cross-select">Quellenpaar</label><select id="cross-select" value={selected} onChange={ev=>choose(ev.target.value)} disabled={busy}>{crossStudies.map(x=><option value={x.id} key={x.id}>{x.band} · {x.title}</option>)}</select></div>
  {nextCrossStudy(entries).id!==selected&&<button type="button" className="button outline" disabled={busy} onClick={()=>choose(nextCrossStudy(entries).id)}>Nächstes Quellenpaar öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{s.band} · G09 · {s.id} · v{s.version}</div><h2>{s.title}</h2><p>{s.focus}</p>
   {s.sources.map(src=><section key={src.id} className="cross-document" aria-label={'Quelle '+src.id}>
    <h3>{src.title}</h3>{src.paragraphs.map(p=><p className="polysemy-paragraph" key={p.id}><strong>{p.id}</strong> {p.text}</p>)}
   </section>)}
   <p className="small muted">{s.status} · {s.rights.kind} · {s.rights.source}</p>
  </article>
  {e&&<section className="panel polysemy-history"><h2>Dokumentierte Quellenvergleiche</h2>{s.comparisons.map((c,i)=>{
   const saved=savedCrossEvidence(e,c);if(!saved)return null;
   return <article className="polysemy-analysis" key={c.id}><h3>{i+1}. {c.issue} · {c.sourceA}/{c.sourceB}</h3>
    <p><strong>Quelle A:</strong> <span className="written">{saved.readingA}</span></p><p><strong>Quelle B:</strong> <span className="written">{saved.readingB}</span></p>
    <p><strong>Gewählte Schlussfolgerung:</strong> {c.options.find(x=>x.id===saved.choice)?.text}</p>
    <p><strong>Nicht ableitbar:</strong> {saved.boundary}</p>
    <details><summary>Quellenabgleich des Originalentwurfs</summary><p>{c.model}</p><p>{c.transferCue}</p><p className="small muted">Redaktionell nicht freigegebener Lösungsvorschlag; keine Bewertung.</p></details>
   </article>;
  })}</section>}
  {next&&<section className="panel polysemy-task">
   <h2>Quellenvergleich {s.comparisons.indexOf(next)+1} / {s.comparisons.length}</h2>
   <h3>{next.issue}</h3>
   <div className="polysemy-before-after"><div><strong>Quelle A · {next.sourceA}</strong><p>{next.quoteA}</p></div><div><strong>Quelle B · {next.sourceB}</strong><p>{next.quoteB}</p></div></div>
   <p>{next.question}</p>
   <div className="field"><label htmlFor="cross-choice">Gemeinsame Schlussfolgerung</label><select id="cross-choice" value={choice} disabled={busy} onChange={ev=>setChoice(ev.target.value as CrossChoice|'')}><option value="">Lesart wählen</option>{next.options.map(x=><option value={x.id} key={x.id}>{x.text}</option>)}</select></div>
   <div className="field"><label htmlFor="cross-a">Quelle A eigenständig auswerten</label><textarea id="cross-a" rows={4} maxLength={1000} value={readingA} onChange={ev=>setReadingA(ev.target.value)}/></div>
   <div className="field"><label htmlFor="cross-b">Quelle B eigenständig auswerten</label><textarea id="cross-b" rows={4} maxLength={1000} value={readingB} onChange={ev=>setReadingB(ev.target.value)}/></div>
   <div className="field"><label htmlFor="cross-boundary">Welche Schlussfolgerung ist trotz beider Quellen nicht gesichert?</label><textarea id="cross-boundary" rows={4} maxLength={850} value={boundary} onChange={ev=>setBoundary(ev.target.value)}/></div>
   {(readingA.trim()||readingB.trim())&&!independentCrossReading(next,readingA,readingB,boundary)&&<p role="status" className="feedback">Eigenständige Aussagen zu beiden Quellen und eine begründete Grenze sind erforderlich.</p>}
   <button type="button" className="button" disabled={busy||!choice||!independentCrossReading(next,readingA,readingB,boundary)} onClick={()=>void saveAnalysis()}>Quellenvergleich speichern</button>
  </section>}
  {e&&!next&&<section className="panel polysemy-transfer"><h2>{latest?'Synthese überarbeiten':'Eigene Quellensynthese'}</h2>
   <p>{s.transfer}</p>
   {latest&&<><h3>Letzte Fassung</h3><p className="written">{latest.text}</p><button type="button" className="button outline" onClick={()=>setDraft(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="cross-pair">Ankerpaar für deine Schlussfolgerung</label><select id="cross-pair" value={pair} onChange={ev=>setPair(ev.target.value)}><option value="">Belegpaar auswählen</option>{s.comparisons.map(c=><option value={c.id} key={c.id}>{c.sourceA} + {c.sourceB} · {c.issue}</option>)}</select></div>
   <div className="field"><label htmlFor="cross-draft">Quellenübergreifende Synthese</label><textarea id="cross-draft" rows={9} maxLength={2900} value={draft} onChange={ev=>setDraft(ev.target.value)}/></div>
   <div className="field"><label htmlFor="cross-reason">Begründe die Reichweite, Unterschiede und Grenzen beider Quellen</label><textarea id="cross-reason" rows={5} maxLength={1100} value={reason} onChange={ev=>setReason(ev.target.value)}/></div>
   {same&&<p role="status" className="feedback">Die Fassung ist unverändert.</p>}
   <button type="button" className="button" disabled={busy||!pair||draft.trim().length<200||reason.trim().length<50||same} onClick={()=>void saveSynthesis()}>{latest?'Überarbeitung speichern':'Synthese speichern'}</button>
   {e.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((rev,i,revs)=><article className="polysemy-writing" key={rev.id}>
    <h3>{i+1} · {rev.questionId==='TRANSFER'?'Erste Quellensynthese':'Überarbeitung'}</h3><p className="written">{rev.text}</p><p><strong>Belege:</strong> {rev.paragraphId} · <strong>Begründung:</strong> {rev.reflection}</p>
    {i>0&&<details><summary>Änderungen gegenüber der vorherigen Fassung</summary><div className="written version-diff">{revisionDiff(revs[i-1].text,rev.text).map((part,k)=><span key={k} className={'diff-'+part.kind}>{part.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button type="button" className="button outline" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
