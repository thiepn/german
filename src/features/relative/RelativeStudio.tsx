import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {relativeStudies,isRelativeEntry,beginRelative,appendRelative,appendRelativeMemo,relativeProgress,nextRelativeStudy,nextRelative,savedRelative,latestRelativeMemo,independentRelative,substantialRelativeRevision,type RelativeChoice} from '../../domain/relative/relative';

export default function RelativeStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(relativeStudies.some(s=>s.id===initialSelection)?initialSelection!:relativeStudies[0].id);
 const [choice,setChoice]=useState<RelativeChoice|''>(''),[transformation,setReport]=useState(''),[counterreading,setMisreading]=useState(''),[syntaxEvidence,setOrigo]=useState(''),[boundary,setBoundary]=useState('');
 const [memo,setMemo]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=relativeStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isRelativeEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextRelative(study,entry),latest=entry?latestRelativeMemo(entry):null,progress=relativeProgress(entries);
 const dirty=[choice,transformation,counterreading,syntaxEvidence,boundary,memo,reason].some(x=>x.trim().length>0);
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 const refresh=async()=>setEntries(await loadProductionEntries());
 function clear(){setChoice('');setReport('');setMisreading('');setOrigo('');setBoundary('');setMemo('');setReason('');setAnchor('');setError('')}
 function select(id:string){if(dirty&&!window.confirm('Ungespeicherte Texte für dieses Dokument verwerfen?'))return;setSelected(id);clear()}
 function exit(){if(dirty&&!window.confirm('Ungespeicherte Texte verwerfen?'))return;onExit()}
 async function saveEvidence(){
  if(!next||!choice||busy||!independentRelative(next,transformation,counterreading,syntaxEvidence,boundary))return;
  setBusy(true);setError('');
  try{
   const result=!entry?beginRelative(study,next.id,choice,transformation,counterreading,syntaxEvidence,boundary,Date.now()):appendRelative(entry,study,next.id,choice,transformation,counterreading,syntaxEvidence,boundary,crypto.randomUUID(),Date.now());
   await saveProductionEntry(result,entry?.revisions.length??0);await refresh();clear();
  }catch(e){setError('Relativbeleg nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveMemo(){
  if(!entry||next||busy)return;setBusy(true);setError('');
  try{
   const result=appendRelativeMemo(entry,study,latest?'REWRITE':'TRANSFER',memo,reason,anchor,crypto.randomUUID(),Date.now());
   await saveProductionEntry(result,entry.revisions.length);await refresh();clear();
  }catch(e){setError('Vermerk nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 const ready=memo.trim().length>=560&&memo.trim().split(/\n\s*\n/).filter(Boolean).length>=2&&reason.trim().length>=110&&!!anchor&&(!latest||substantialRelativeRevision(latest.text,memo));
 const memos=entry?.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??[];
 return <section className="polysemy-studio relative-studio">
  <h1 className="page-title">Relativanschluss und Kasusautonomie</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellen begonnen · {progress.analyses} Relativerekonstruktionen · {progress.transferred} Vermerke · {progress.revised} Revisionen. Ohne automatische Bewertung.</p>
  <div className="field"><label htmlFor="relative-select">Quelldokument</label><select id="relative-select" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{relativeStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextRelativeStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextRelativeStudy(entries).id)}>Nächstes Dokument öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G02 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map(p=><p key={p.id} className="polysemy-paragraph"><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind} · redaktionell ungeprüft</p>
  </article>
  {entry&&<section className="panel"><h2>Gespeicherte Relativbelege</h2>{study.anchors.map((point,i)=>{const saved=savedRelative(entry,point);if(!saved)return null;
   return <article key={point.id} className="polysemy-analysis"><h3>{i+1} · {point.phenomenon} · {point.paragraphId}</h3>
    <p><strong>Eigenständige Relativsatz-Umschreibung:</strong> <span className="written">{saved.transformation}</span></p><p><strong>Unzulässige Kasus- oder Rollenlesart:</strong> <span className="written">{saved.counterreading}</span></p>
    <p><strong>Kasus und Satzfunktion:</strong> <span className="written">{saved.syntaxEvidence}</span></p><p><strong>Nicht gedeckte Schlussfolgerung:</strong> <span className="written">{saved.boundary}</span></p>
    <details><summary>Quelle und ungeprüfte Musterdeutung</summary><p>„{point.quote}“</p><p>{point.model}</p><p>Fallstrick: {point.trap}</p><p>Gewählte Lesart: {point.options.find(o=>o.id===saved.choice)?.text}</p></details>
   </article>})}</section>}
  {next&&<section className="panel polysemy-task"><h2>Relativbeleg {study.anchors.indexOf(next)+1} / {study.anchors.length}</h2><p><strong>{next.phenomenon} · {next.paragraphId}:</strong> „{next.quote}“</p><p>{next.question}</p>
   <div className="field"><label htmlFor="relative-choice">Welche grammatische Rolle des Relativpronomens stützt die Originaläußerung?</label><select id="relative-choice" value={choice} disabled={busy} onChange={e=>setChoice(e.target.value as RelativeChoice|'')}><option value="">Lesart wählen</option>{next.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="relative-transformation">Schreibe eine syntaktisch eindeutige Eigenfassung mit korrekter Kasus- und Antezedenszuordnung</label><textarea id="relative-transformation" rows={5} maxLength={1450} value={transformation} onChange={e=>setReport(e.target.value)}/></div>
   <div className="field"><label htmlFor="relative-counterreading">Formuliere eine plausible, aber grammatisch oder semantisch falsche Kasus- und Rollenlesart</label><textarea id="relative-counterreading" rows={5} maxLength={1450} value={counterreading} onChange={e=>setMisreading(e.target.value)}/></div>
   <div className="field"><label htmlFor="relative-syntaxEvidence">Begründe Kasus, Rektion und Bezugswort anhand einer weiteren konkreten Quelleninformation</label><textarea id="relative-syntaxEvidence" rows={5} maxLength={1650} value={syntaxEvidence} onChange={e=>setOrigo(e.target.value)}/></div>
   <div className="field"><label htmlFor="relative-boundary">Welche nicht belegte Folgerung entstünde durch einen falschen Anschluss oder eine vertauschte Satzrolle?</label><textarea id="relative-boundary" rows={5} maxLength={1400} value={boundary} onChange={e=>setBoundary(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!independentRelative(next,transformation,counterreading,syntaxEvidence,boundary)} onClick={()=>void saveEvidence()}>Relativbeleg speichern</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer"><h2>{latest?'Adressatengerechte Revision':'Eigenständigen Relativsatzbericht schreiben'}</h2><p>{study.brief}</p>
   {latest&&<><h3>Letzte Fassung</h3><p className="written">{latest.text}</p><button className="button outline" type="button" disabled={busy} onClick={()=>setMemo(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="relative-anchor">Quellenanker für die Begründung</label><select id="relative-anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="">Quellenbeleg wählen</option>{study.anchors.map(p=><option key={p.id} value={p.id}>{p.phenomenon} · {p.paragraphId}</option>)}</select></div>
   <div className="field"><label htmlFor="relative-memo">Eigenständiger mehrabsätziger Bericht zu allen drei Relativanschlüssen und deren Kasusrollen</label><textarea id="relative-memo" rows={12} maxLength={3900} value={memo} onChange={e=>setMemo(e.target.value)}/></div>
   <div className="field"><label htmlFor="relative-reason">Begründe die verschiedenen Kasusfunktionen und mindestens eine wesentliche Korrektur für die Zielgruppe</label><textarea id="relative-reason" rows={6} maxLength={1500} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {latest&&memo.trim()&&!substantialRelativeRevision(latest.text,memo)&&<p role="status">Eine substanzielle Überarbeitung ist erforderlich.</p>}
   <button className="button" type="button" disabled={busy||!ready} onClick={()=>void saveMemo()}>{latest?'Überarbeitung speichern':'Relativsatzbericht speichern'}</button>
   {memos.map((rev,i)=><article className="polysemy-writing" key={rev.id}><h3>{i+1} · {rev.questionId==='TRANSFER'?'Erster Vermerk':'Überarbeitete Fassung'}</h3><p className="written">{rev.text}</p><p><strong>Quellenanker:</strong> {rev.paragraphId} · <strong>Begründung:</strong> {rev.reflection}</p>
    {i>0&&<details><summary>Versionsvergleich</summary><div className="written version-diff">{revisionDiff(memos[i-1].text,rev.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}<div className="buttonrow"><button className="button outline" type="button" onClick={exit}>Zurück zum Curriculum</button></div>
 </section>;
}
