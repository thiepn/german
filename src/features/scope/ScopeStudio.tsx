import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {scopeStudies,isScopeEntry,beginScope,appendScopeEvidence,appendScopeDocument,scopeProgress,nextScopeStudy,nextScope,savedScopeEvidence,latestScopeDocument,independentScope,substantialScopeRevision,type ScopeChoice} from '../../domain/scope/scope';
export default function ScopeStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(scopeStudies.some(s=>s.id===initialSelection)?initialSelection!:scopeStudies[0].id);
 const [choice,setChoice]=useState<ScopeChoice|''>(''),[interpretation,setInterpretation]=useState(''),[boundary,setBoundary]=useState(''),[example,setExample]=useState('');
 const [document,setDocument]=useState(''),[why,setWhy]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=scopeStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isScopeEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextScope(study,entry),latest=entry?latestScopeDocument(entry):null,progress=scopeProgress(entries);
 const dirty=[choice,interpretation,boundary,example,document,why].some(x=>x.trim().length>0);
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 const refresh=async()=>setEntries(await loadProductionEntries());
 function clear(){setChoice('');setInterpretation('');setBoundary('');setExample('');setDocument('');setWhy('');setAnchor('');setError('')}
 function select(id:string){if(dirty&&!window.confirm('Ungespeicherten Text verwerfen?'))return;setSelected(id);clear()}
 function exit(){if(dirty&&!window.confirm('Ungespeicherten Text verwerfen?'))return;onExit()}
 async function saveAnalysis(){
  if(!next||!choice||busy||!independentScope(next,interpretation,boundary,example))return;
  setBusy(true);setError('');
  try{
   const result=!entry?beginScope(study,next.id,choice,interpretation,boundary,example,Date.now()):appendScopeEvidence(entry,study,next.id,choice,interpretation,boundary,example,crypto.randomUUID(),Date.now());
   await saveProductionEntry(result,entry?.revisions.length??0);await refresh();clear();
  }catch(e){setError('Skopusbeleg nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveDocument(){
  if(!entry||next||busy)return;setBusy(true);setError('');
  try{
   await saveProductionEntry(appendScopeDocument(entry,study,latest?'REWRITE':'TRANSFER',document,why,anchor,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();clear();
  }catch(e){setError('Fassung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 const ready=document.trim().length>=520&&document.trim().split(/\n\s*\n/).filter(Boolean).length>=2&&why.trim().length>=95&&!!anchor&&(!latest||substantialScopeRevision(latest.text,document));
 const reports=entry?.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??[];
 return <section className="polysemy-studio scope-studio">
  <h1 className="page-title">Fokuspartikeln und Negationsskopus</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellen begonnen · {progress.analyses} Skopusbelege · {progress.transferred} eigene Vermerke · {progress.revised} Revisionen. Ohne automatische Bewertung.</p>
  <div className="field"><label htmlFor="scope-select">Dokument</label><select id="scope-select" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{scopeStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextScopeStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextScopeStudy(entries).id)}>Nächstes Dokument öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G04 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map(p=><p key={p.id} className="polysemy-paragraph"><strong>{p.id}</strong> {p.text}</p>)}<p className="small muted">{study.status} · {study.rights.kind} · redaktionell ungeprüft</p>
  </article>
  {entry&&<section className="panel"><h2>Gespeicherte Skopusbelege</h2>{study.scopes.map((q,i)=>{const saved=savedScopeEvidence(entry,q);if(!saved)return null;return <article key={q.id} className="polysemy-analysis">
   <h3>{i+1} · {q.particle} · {q.paragraphId}</h3><p><strong>Eigene Deutung:</strong> <span className="written">{saved.interpretation}</span></p><p><strong>Aussagegrenze:</strong> {saved.boundary}</p><p><strong>Gegenbeispiel:</strong> {saved.example}</p>
   <details><summary>Quellenlesart und Fallstrick</summary><p>„{q.quote}“</p><p>{q.model}</p><p>{q.trap}</p><p>Gewählte Lesart: {q.options.find(o=>o.id===saved.choice)?.text}</p></details>
  </article>})}</section>}
  {next&&<section className="panel polysemy-task"><h2>Skopusbeleg {study.scopes.indexOf(next)+1} / {study.scopes.length}</h2><p><strong>{next.particle} · {next.paragraphId}:</strong> „{next.quote}“</p><p>{next.question}</p>
   <div className="field"><label htmlFor="scope-choice">Welche Lesart ist durch den Wortlaut gedeckt?</label><select id="scope-choice" disabled={busy} value={choice} onChange={e=>setChoice(e.target.value as ScopeChoice|'')}><option value="">Lesart auswählen</option>{next.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="scope-interpretation">Deute den Skopus von Partikel oder Negation in eigenen Worten</label><textarea id="scope-interpretation" rows={5} maxLength={1500} value={interpretation} onChange={e=>setInterpretation(e.target.value)}/></div>
   <div className="field"><label htmlFor="scope-boundary">Nenne eine naheliegende, aber unzulässige Schlussfolgerung</label><textarea id="scope-boundary" rows={5} maxLength={1400} value={boundary} onChange={e=>setBoundary(e.target.value)}/></div>
   <div className="field"><label htmlFor="scope-example">Gib einen konkreten Fall an, der die Aussagegrenze überprüft</label><textarea id="scope-example" rows={5} maxLength={1500} value={example} onChange={e=>setExample(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!independentScope(next,interpretation,boundary,example)} onClick={()=>void saveAnalysis()}>Skopusbeleg speichern</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer"><h2>{latest?'Adressatengerechte Revision':'Eigenständigen Skopusvermerk schreiben'}</h2><p>{study.brief}</p>
   {latest&&<><h3>Letzte Fassung</h3><p className="written">{latest.text}</p><button className="button outline" type="button" disabled={busy} onClick={()=>setDocument(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="scope-anchor">Quellenstelle</label><select id="scope-anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="">Quellenbeleg wählen</option>{study.scopes.map(q=><option key={q.id} value={q.id}>{q.particle} · {q.paragraphId}</option>)}</select></div>
   <div className="field"><label htmlFor="scope-document">Mehrabsätziger Text mit drei präzisen Aussagegrenzen</label><textarea id="scope-document" rows={12} maxLength={3900} value={document} onChange={e=>setDocument(e.target.value)}/></div>
   <div className="field"><label htmlFor="scope-why">Begründung der Aussagen und mindestens einer konkreten Revision</label><textarea id="scope-why" rows={6} maxLength={1300} value={why} onChange={e=>setWhy(e.target.value)}/></div>
   {latest&&document.trim()&&!substantialScopeRevision(latest.text,document)&&<p role="status">Eine substanzielle Überarbeitung ist erforderlich.</p>}
   <button className="button" type="button" disabled={busy||!ready} onClick={()=>void saveDocument()}>{latest?'Überarbeitung speichern':'Skopusvermerk speichern'}</button>
   {reports.map((rev,i)=><article className="polysemy-writing" key={rev.id}><h3>{i+1} · {rev.questionId==='TRANSFER'?'Erster Vermerk':'Überarbeitete Fassung'}</h3><p className="written">{rev.text}</p><p><strong>Quellenstelle:</strong> {rev.paragraphId} · <strong>Begründung:</strong> {rev.reflection}</p>
    {i>0&&<details><summary>Versionsvergleich</summary><div className="written version-diff">{revisionDiff(reports[i-1].text,rev.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}<div className="buttonrow"><button className="button outline" type="button" onClick={exit}>Zurück zum Curriculum</button></div>
 </section>;
}
