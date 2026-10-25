import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {disclosureStudies,isDisclosureEntry,beginDisclosure,appendDisclosureDecision,appendAudience,disclosureProgress,nextDisclosureStudy,nextDisclosureDecision,savedDisclosureEvidence,latestAudience,independentDisclosure,hasRestricted,type DisclosureChoice} from '../../domain/disclosure/disclosure';
export default function DisclosureStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]),[selected,setSelected]=useState(disclosureStudies.some(s=>s.id===initialSelection)?initialSelection!:disclosureStudies[0].id);
 const [choice,setChoice]=useState<DisclosureChoice|''>(''),[rewrite,setRewrite]=useState(''),[action,setAction]=useState(''),[omission,setOmission]=useState('');
 const [publicText,setPublicText]=useState(''),[internalText,setInternalText]=useState(''),[publicWhy,setPublicWhy]=useState(''),[internalWhy,setInternalWhy]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=disclosureStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isDisclosureEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextDisclosureDecision(study,entry),progress=disclosureProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let active=true;void loadProductionEntries().then(v=>{if(active)setEntries(v)}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setRewrite('');setAction('');setOmission('');setPublicText('');setInternalText('');setPublicWhy('');setInternalWhy('');setError('')}
 async function saveEvidence(){
  if(!next||!choice||busy||!independentDisclosure(study,next,rewrite,action,omission))return;
  setBusy(true);setError('');
  try{
   if(!entry)await saveProductionEntry(beginDisclosure(study,next.id,choice,rewrite,action,omission,Date.now()),0);
   else await saveProductionEntry(appendDisclosureDecision(entry,study,next.id,choice,rewrite,action,omission,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setChoice('');setRewrite('');setAction('');setOmission('');
  }catch(e){setError('Übertragung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveAudience(audience:string,text:string,why:string){
  if(!entry||next||busy)return;setBusy(true);setError('');
  try{
   await saveProductionEntry(appendAudience(entry,study,audience,text,why,crypto.randomUUID(),Date.now()),entry.revisions.length);await refresh();
   if(audience==='PUBLIC'){setPublicText('');setPublicWhy('')}else{setInternalText('');setInternalWhy('')}
  }catch(e){setError('Adressatentext nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 return <section className="polysemy-studio disclosure-studio">
  <h1 className="page-title">Informationen gezielt vermitteln</h1>
  <p className="small muted">{progress.started}/{progress.total} Dokumente · {progress.decisions} Textstellen · {progress.audiences} adressierte Fassungen · {progress.revised} Überarbeitungen. Unbewertet.</p>
  <div className="field"><label htmlFor="disclosure-select">Fall</label><select id="disclosure-select" disabled={busy} value={selected} onChange={e=>select(e.target.value)}>{disclosureStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextDisclosureStudy(entries).id!==selected&&<button className="button outline" disabled={busy} type="button" onClick={()=>select(nextDisclosureStudy(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G13 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map(p=><p className="polysemy-paragraph" key={p.id}><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind} · ausschließlich fiktive Daten</p>
  </article>
  {entry&&<section className="panel polysemy-history"><h2>Gespeicherte Übertragungen</h2>{study.decisions.map((d,i)=>{
   const evidence=savedDisclosureEvidence(entry,d);if(!evidence)return null;
   return <article className="polysemy-analysis" key={d.id}><h3>{i+1} · {d.paragraphId}</h3><p><strong>Öffentlich geeignete Wiedergabe:</strong> <span className="written">{evidence.rewrite}</span></p><p><strong>Handlung:</strong> {evidence.action}</p><p><strong>Zurückgehalten:</strong> {evidence.omission}</p>
    <details><summary>Quellenabgleich</summary><p>„{d.quote}“</p><p>{d.action}</p><p>{d.boundary}</p><p><strong>Gewählte Lesart:</strong> {d.options.find(x=>x.id===evidence.choice)?.text}</p></details></article>;
  })}</section>}
  {next&&<section className="panel polysemy-task"><h2>Information {study.decisions.indexOf(next)+1} / {study.decisions.length}</h2><p><strong>Quellenbeleg · {next.paragraphId}:</strong> „{next.quote}“</p><p>{next.question}</p>
   <div className="field"><label htmlFor="disclosure-choice">Zulässige Vermittlung</label><select id="disclosure-choice" value={choice} disabled={busy} onChange={e=>setChoice(e.target.value as DisclosureChoice|'')}><option value="">Lesart wählen</option>{next.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="disclosure-rewrite">Formuliere den relevanten Befund ohne interne Einzelangaben</label><textarea id="disclosure-rewrite" rows={5} maxLength={1400} value={rewrite} onChange={e=>setRewrite(e.target.value)}/></div>
   <div className="field"><label htmlFor="disclosure-action">Welche Handlung, Zuständigkeit oder Bedingung müssen die Lesenden kennen?</label><textarea id="disclosure-action" rows={4} maxLength={1100} value={action} onChange={e=>setAction(e.target.value)}/></div>
   <div className="field"><label htmlFor="disclosure-omission">Welche Art nicht benötigter Einzelangabe bleibt zurückgehalten und warum?</label><textarea id="disclosure-omission" rows={4} maxLength={1050} value={omission} onChange={e=>setOmission(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!independentDisclosure(study,next,rewrite,action,omission)} onClick={()=>void saveEvidence()}>Übertragung speichern</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer"><h2>Für zwei Adressaten schreiben</h2><p>{study.brief}</p>{study.audiences.map((audience,i)=>{
   const previous=latestAudience(entry,audience.id),t=i===0?publicText:internalText,why=i===0?publicWhy:internalWhy,setT=i===0?setPublicText:setInternalText,setWhy=i===0?setPublicWhy:setInternalWhy;
   const same=!!previous&&t.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE')===previous.text.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
   return <article className="polysemy-writing" key={audience.id}><h3>{audience.label}</h3><p>{audience.purpose}</p>
    {previous&&<><p className="written">{previous.text}</p><button type="button" className="button outline" onClick={()=>setT(previous.text)}>Letzte Fassung übernehmen</button></>}
    <div className="field"><label htmlFor={'disclosure-text-'+audience.id}>Eigenständiger adressierter Zieltext</label><textarea id={'disclosure-text-'+audience.id} rows={8} maxLength={3700} value={t} onChange={e=>setT(e.target.value)}/></div>
    <div className="field"><label htmlFor={'disclosure-why-'+audience.id}>Begründe Auswahl, Vertraulichkeit und unveränderte Handlung</label><textarea id={'disclosure-why-'+audience.id} rows={4} maxLength={1200} value={why} onChange={e=>setWhy(e.target.value)}/></div>
    {hasRestricted(study,t+' '+why)&&<p role="status" className="feedback incorrect">Die Fassung enthält eine interne Beispielkennung.</p>}
    <button className="button" type="button" disabled={busy||t.trim().length<420||why.trim().length<75||same||hasRestricted(study,t+' '+why)} onClick={()=>void saveAudience(audience.id,t,why)}>{previous?'Überarbeitung speichern':'Fassung speichern'}</button>
    {entry.revisions.filter(rev=>rev.questionId==='AUDIENCE:'+audience.id||rev.questionId==='REWRITE:'+audience.id).map((rev,j,all)=><div className="polysemy-writing" key={rev.id}><h4>{j===0?'Originalfassung':'Überarbeitung '+j}</h4><p className="written">{rev.text}</p><p><strong>Begründung:</strong> {rev.reflection}</p>{j>0&&<details><summary>Änderungen anzeigen</summary><div className="written version-diff">{revisionDiff(all[j-1].text,rev.text).map((d,k)=><span key={k} className={'diff-'+d.kind}>{d.text} </span>)}</div></details>}</div>)}
   </article>;
  })}</section>}
  {error&&<p role="alert" className="feedback incorrect">{error}</p>}
  <div className="buttonrow"><button className="button outline" type="button" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
