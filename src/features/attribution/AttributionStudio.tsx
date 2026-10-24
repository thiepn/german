import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {attributionStudies,isAttributionEntry,beginAttribution,appendAttributionAnchor,appendAttributionText,attributionProgress,nextAttributionStudy,nextAttributionAnchor,savedAttributionEvidence,latestAttributionText,independentAttribution,type AttributionChoice} from '../../domain/attribution/attribution';

export default function AttributionStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(attributionStudies.some(x=>x.id===initialSelection)?initialSelection!:attributionStudies[0].id);
 const [choice,setChoice]=useState<AttributionChoice|''>(''),[paraphrase,setParaphrase]=useState(''),[embedded,setEmbedded]=useState(''),[limit,setLimit]=useState('');
 const [draft,setDraft]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=attributionStudies.find(x=>x.id===selected)!;
 const entry=entries.find(e=>isAttributionEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextAttributionAnchor(study,entry),latest=entry?latestAttributionText(entry):null,progress=attributionProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let live=true;void loadProductionEntries().then(v=>{if(live)setEntries(v)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setParaphrase('');setEmbedded('');setLimit('');setDraft('');setReason('');setAnchor('');setError('')}
 async function saveAnchor(){
  if(!next||!choice||busy||!independentAttribution(next,paraphrase,embedded,limit))return;
  setBusy(true);setError('');
  try{
   if(!entry)await saveProductionEntry(beginAttribution(study,next.id,choice,paraphrase,embedded,limit,Date.now()),0);
   else await saveProductionEntry(appendAttributionAnchor(entry,study,next.id,choice,paraphrase,embedded,limit,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setChoice('');setParaphrase('');setEmbedded('');setLimit('');
  }catch(e){setError('Quellenbeleg nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveDraft(){
  if(!entry||next||busy)return;
  setBusy(true);setError('');
  try{
   await saveProductionEntry(appendAttributionText(entry,study,latest?'REWRITE':'TRANSFER',draft,reason,anchor,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setDraft('');setReason('');setAnchor('');
  }catch(e){setError('Eigener Text nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 const same=!!latest&&draft.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE')===latest.text.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
 return <section className="polysemy-studio attribution-studio">
  <h1 className="page-title">Quellen korrekt einbinden</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellen begonnen · {progress.anchors} Belegstellen · {progress.transferred} eigene Texte · {progress.revised} Revisionen. Ohne automatische Bewertung.</p>
  <div className="field"><label htmlFor="attribution-select">Dokument</label><select id="attribution-select" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{attributionStudies.map(s=><option value={s.id} key={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextAttributionStudy(entries).id!==selected&&<button className="button outline" disabled={busy} type="button" onClick={()=>select(nextAttributionStudy(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G11 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.genre} · {study.focus}</p>
   {study.paragraphs.map(p=><p className="polysemy-paragraph" key={p.id}><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind} · {study.rights.source}</p>
  </article>
  {entry&&<section className="panel polysemy-history"><h2>Dokumentierte Quellenwiedergabe</h2>{study.anchors.map((a,i)=>{
    const saved=savedAttributionEvidence(entry,a);if(!saved)return null;
    return <article key={a.id} className="polysemy-analysis"><h3>{i+1} · {a.speaker} · {a.paragraphId}</h3>
     <p><strong>Eigenständige indirekte Wiedergabe:</strong> <span className="written">{saved.paraphrase}</span></p>
     <p><strong>Wortgetreues Zitat im eigenen Satz:</strong> <span className="written">{saved.embedded}</span></p>
     <p><strong>Beleggrenze:</strong> {saved.limit}</p>
     <details><summary>Originalquelle und Lesart</summary><p>„{a.quote}“</p><p>{a.model}</p><p><strong>Gewählte Lesart:</strong> {a.options.find(o=>o.id===saved.choice)?.text}</p><p className="small muted">Originalentwurf, redaktionell noch nicht freigegeben.</p></details>
    </article>;
   })}</section>}
  {next&&<section className="panel polysemy-task"><h2>Quellenbeleg {study.anchors.indexOf(next)+1} / {study.anchors.length}</h2>
   <div className="polysemy-before-after"><div><strong>Originalaussage · {next.paragraphId}</strong><p>„{next.quote}“</p></div><div><strong>Sprecher</strong><p>{next.speaker}</p></div></div>
   <p>{next.question}</p>
   <div className="field"><label htmlFor="attribution-choice">Texttreue Wiedergabe</label><select id="attribution-choice" disabled={busy} value={choice} onChange={e=>setChoice(e.target.value as AttributionChoice|'')}><option value="">Lesart auswählen</option>{next.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="attribution-paraphrase">Indirekte Wiedergabe in eigenen Worten, mit klarer Sprecherzuordnung</label><textarea id="attribution-paraphrase" rows={5} maxLength={1250} value={paraphrase} onChange={e=>setParaphrase(e.target.value)}/></div>
   <div className="field"><label htmlFor="attribution-embedded">Bette das exakte kurze Zitat „{next.quote}“ in einen eigenen Satz mit Sprecherzuordnung ein</label><textarea id="attribution-embedded" rows={5} maxLength={1550} value={embedded} onChange={e=>setEmbedded(e.target.value)}/></div>
   <button className="button outline" type="button" onClick={()=>setEmbedded('„'+next.quote+'“')} disabled={busy||!!embedded.trim()}>Wörtlichen Beleg einsetzen</button>
   <div className="field"><label htmlFor="attribution-limit">Welche weitergehende Schlussfolgerung lässt der Beleg nicht zu?</label><textarea id="attribution-limit" rows={4} maxLength={950} value={limit} onChange={e=>setLimit(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!independentAttribution(next,paraphrase,embedded,limit)} onClick={()=>void saveAnchor()}>Beleg und Wiedergabe speichern</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer">
   <h2>{latest?'Eigenen Text überarbeiten':'Quellenbewussten Text verfassen'}</h2><p>{study.brief}</p>
   {latest&&<><h3>Letzte Fassung</h3><p className="written">{latest.text}</p><button className="button outline" type="button" onClick={()=>setDraft(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="attribution-anchor">Hauptbeleg</label><select id="attribution-anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="">Beleg auswählen</option>{study.anchors.map(a=><option key={a.id} value={a.id}>{a.speaker} · {a.paragraphId}</option>)}</select></div>
   <div className="field"><label htmlFor="attribution-draft">Eigener Quellenabschnitt mit mindestens einem wortgetreuen Zitat</label><textarea id="attribution-draft" rows={9} maxLength={3500} value={draft} onChange={e=>setDraft(e.target.value)}/></div>
   <div className="field"><label htmlFor="attribution-reason">Erkläre Sprecherzuordnung, Gewichtung und nicht gedeckte Behauptungen</label><textarea id="attribution-reason" rows={5} maxLength={1150} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {same&&<p className="feedback" role="status">Die Textfassung wurde nicht verändert.</p>}
   <button className="button" type="button" disabled={busy||!anchor||draft.trim().length<350||!study.anchors.some(a=>draft.includes('„'+a.quote+'“'))||reason.trim().length<60||same} onClick={()=>void saveDraft()}>{latest?'Überarbeitung speichern':'Eigenen Text speichern'}</button>
   {entry.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((r,i,all)=><article className="polysemy-writing" key={r.id}>
    <h3>{i+1} · {r.questionId==='TRANSFER'?'Erster eigener Abschnitt':'Überarbeitung'}</h3><p className="written">{r.text}</p><p><strong>Hauptbeleg:</strong> {r.paragraphId} · <strong>Reflexion:</strong> {r.reflection}</p>
    {i>0&&<details><summary>Änderungen zur vorigen Fassung</summary><div className="written version-diff">{revisionDiff(all[i-1].text,r.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p role="alert" className="feedback incorrect">{error}</p>}
  <div className="buttonrow"><button className="button outline" type="button" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
