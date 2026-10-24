import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {compressionStudies,isCompressionEntry,beginCompression,appendCompressionOperation,appendCompressionTransfer,compressionProgress,nextCompressionStudy,nextCompressionOperation,savedCompressionEvidence,latestCompressionTransfer,independentCompression,splitCompressionTransfer,type CompressionChoice} from '../../domain/compression/compression';

export default function CompressionStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(compressionStudies.some(s=>s.id===initialSelection)?initialSelection!:compressionStudies[0].id);
 const [choice,setChoice]=useState<CompressionChoice|''>(''),[expanded,setExpanded]=useState(''),[compact,setCompact]=useState(''),[risk,setRisk]=useState('');
 const [formal,setFormal]=useState(''),[publicText,setPublicText]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const s=compressionStudies.find(x=>x.id===selected)!;
 const e=entries.find(x=>isCompressionEntry(x)&&x.itemId===s.id&&x.sourceId===s.id&&x.itemVersion===s.version)??null;
 const op=nextCompressionOperation(s,e),previous=e?latestCompressionTransfer(e):null,progress=compressionProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let active=true;void loadProductionEntries().then(rows=>{if(active)setEntries(rows)}).catch(err=>{if(active)setError(String(err))});return()=>{active=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setExpanded('');setCompact('');setRisk('');setFormal('');setPublicText('');setReason('');setAnchor('');setError('')}
 async function saveOperation(){
  if(!op||!choice||busy||!independentCompression(op,expanded,compact,risk))return;
  setBusy(true);setError('');
  try{
   if(!e)await saveProductionEntry(beginCompression(s,op.id,choice,expanded,compact,risk,Date.now()),0);
   else await saveProductionEntry(appendCompressionOperation(e,s,op.id,choice,expanded,compact,risk,crypto.randomUUID(),Date.now()),e.revisions.length);
   await refresh();setChoice('');setExpanded('');setCompact('');setRisk('');
  }catch(err){setError('Satzarbeit nicht gespeichert: '+String(err));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveTransfer(){
  if(!e||op||busy)return;setBusy(true);setError('');
  try{
   await saveProductionEntry(appendCompressionTransfer(e,s,previous?'REWRITE':'TRANSFER',formal,publicText,reason,anchor,crypto.randomUUID(),Date.now()),e.revisions.length);
   await refresh();setFormal('');setPublicText('');setReason('');setAnchor('');
  }catch(err){setError('Textfassungen nicht gespeichert: '+String(err));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 const unchanged=!!previous&&(formal.trim()+'\n\nVerständliche Mitteilung:\n'+publicText.trim()).replace(/\s+/g,' ').toLowerCase()===previous.text.replace(/\s+/g,' ').toLowerCase();
 return <section className="polysemy-studio compression-studio">
  <h1 className="page-title">Satzverdichtung und Explikation</h1>
  <p className="small muted">{progress.started}/{progress.total} Dokumente begonnen · {progress.operations} Satztransformationen · {progress.transferred} Textpaare · {progress.rewritten} Überarbeitungen. Nicht automatisch bewertet.</p>
  <div className="field"><label htmlFor="compression-select">Dokument</label><select id="compression-select" value={selected} disabled={busy} onChange={ev=>select(ev.target.value)}>{compressionStudies.map(x=><option value={x.id} key={x.id}>{x.band} · {x.title}</option>)}</select></div>
  {nextCompressionStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextCompressionStudy(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{s.band} · G04 · {s.id} · v{s.version}</div><h2>{s.title}</h2><p>{s.focus} · {s.audience}</p>
   {s.paragraphs.map(p=><p key={p.id} className="polysemy-paragraph"><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">{s.status} · {s.rights.kind} · {s.rights.source}</p>
  </article>
  {e&&<section className="panel polysemy-history"><h2>Gespeicherte Satztransformationen</h2>{s.operations.map((o,i)=>{
   const saved=savedCompressionEvidence(e,o);if(!saved)return null;
   return <article className="polysemy-analysis" key={o.id}><h3>{i+1} · {o.family} · {o.paragraphId}</h3><p><strong>Ausgangssatz:</strong> {o.quote}</p>
    <p><strong>Explikation:</strong> <span className="written">{saved.expanded}</span></p>
    <p><strong>Eigene Verdichtung:</strong> <span className="written">{saved.compact}</span></p>
    <p><strong>Erhaltener Geltungsbereich:</strong> {saved.risk}</p>
    <details><summary>Originalentwurf zur Kontrolle</summary><p>{o.model}</p><p><strong>Gewählte Lesart:</strong> {o.options.find(x=>x.id===saved.choice)?.text}</p><p className="small muted">Redaktionell nicht freigegebene Lesehilfe. Keine automatische Qualitätsbewertung.</p></details>
   </article>;
  })}</section>}
  {op&&<section className="panel polysemy-task"><h2>Satztransformation {s.operations.indexOf(op)+1} / {s.operations.length}</h2>
   <h3>{op.family}</h3><p><strong>Original · {op.paragraphId}:</strong> {op.quote}</p><p>{op.question}</p>
   <div className="field"><label htmlFor="compression-choice">Semantisch angemessene Explikation</label><select id="compression-choice" value={choice} disabled={busy} onChange={ev=>setChoice(ev.target.value as CompressionChoice|'')}><option value="">Lesart wählen</option>{op.options.map(x=><option value={x.id} key={x.id}>{x.text}</option>)}</select></div>
   <div className="field"><label htmlFor="compression-expanded">{op.expandPrompt}</label><textarea id="compression-expanded" rows={5} maxLength={1350} value={expanded} onChange={ev=>setExpanded(ev.target.value)}/></div>
   <div className="field"><label htmlFor="compression-compact">{op.compressPrompt}</label><textarea id="compression-compact" rows={4} maxLength={950} value={compact} onChange={ev=>setCompact(ev.target.value)}/></div>
   <div className="field"><label htmlFor="compression-risk">{op.riskPrompt}</label><textarea id="compression-risk" rows={4} maxLength={1000} value={risk} onChange={ev=>setRisk(ev.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!independentCompression(op,expanded,compact,risk)} onClick={()=>void saveOperation()}>Beide Satzfassungen speichern</button>
  </section>}
  {e&&!op&&<section className="panel polysemy-transfer"><h2>{previous?'Zieltexte überarbeiten':'Zwei Zieltexte verfassen'}</h2><p>{s.transfer}</p>
   {previous&&<><h3>Letzte Fassungen</h3><p className="written">{previous.text}</p><button className="button outline" onClick={()=>{const t=splitCompressionTransfer(previous.text);if(t){setFormal(t.formal);setPublicText(t.publicText)}}}>Letzte Fassungen übernehmen</button></>}
   <div className="field"><label htmlFor="compression-anchor">Quellenabsatz als Anker</label><select id="compression-anchor" value={anchor} onChange={ev=>setAnchor(ev.target.value)}><option value="">Quellenabsatz wählen</option>{s.paragraphs.map(p=><option value={p.id} key={p.id}>{p.id}</option>)}</select></div>
   <div className="field"><label htmlFor="compression-formal">Formal präzise Fassung</label><textarea id="compression-formal" rows={8} maxLength={1850} value={formal} onChange={ev=>setFormal(ev.target.value)}/></div>
   <div className="field"><label htmlFor="compression-public">Verständliche öffentliche Fassung</label><textarea id="compression-public" rows={8} maxLength={1750} value={publicText} onChange={ev=>setPublicText(ev.target.value)}/></div>
   <div className="field"><label htmlFor="compression-reason">Begründe, welche Bedingungen und Zuständigkeiten beide Fassungen bewahren</label><textarea id="compression-reason" rows={5} maxLength={1100} value={reason} onChange={ev=>setReason(ev.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!anchor||formal.trim().length<150||publicText.trim().length<140||reason.trim().length<60||formal.trim()===publicText.trim()||unchanged} onClick={()=>void saveTransfer()}>{previous?'Überarbeitung speichern':'Beide Zieltexte speichern'}</button>
   {e.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((rev,i,all)=><article className="polysemy-writing" key={rev.id}><h3>{i+1} · {rev.questionId==='TRANSFER'?'Eigene Zieltexte':'Überarbeitung'}</h3><p className="written">{rev.text}</p><p><strong>Quellenanker:</strong> {rev.paragraphId} · <strong>Begründung:</strong> {rev.reflection}</p>
    {i>0&&<details><summary>Änderungen gegenüber der vorherigen Fassung</summary><div className="written version-diff">{revisionDiff(all[i-1].text,rev.text).map((part,j)=><span key={j} className={'diff-'+part.kind}>{part.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button className="button outline" type="button" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
