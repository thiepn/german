import {useEffect,useState} from 'react';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import type {ProductionEntry} from '../../domain/production/types';
import {revisionDiff} from '../../domain/production/continuity';
import {editorialCases,editorialFirst,appendEditorialRevision,editorialSource,editorialProgress,isEditorialEntry,selectedIssue,nextEditorialCase,EDITORIAL_CHECKS,type EditorialStage} from '../../domain/editorial/editorial';

export default function EditorialStudio({onExit,initialSelection}:{onExit:()=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(editorialCases.some(c=>c.id===initialSelection)?initialSelection!:editorialCases[0].id);
 const [issue,setIssue]=useState(''),[diagnosis,setDiagnosis]=useState('');
 const [stage,setStage]=useState<EditorialStage>('REDRAFT'),[text,setText]=useState(''),[reason,setReason]=useState(''),[checks,setChecks]=useState<string[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const c=editorialCases.find(x=>x.id===selected)!;
 const entry=entries.find(e=>isEditorialEntry(e)&&e.itemId===c.id&&e.itemVersion===c.version)??null;
 const firstIssue=entry?selectedIssue(entry):null;
 const latest=entry?.revisions.at(-1)??null;
 const completedFirst=Boolean(entry?.revisions.some(r=>r.questionId==='REDRAFT'));
 const unchanged=Boolean(text.trim()&&(text.trim()===editorialSource(c).trim()||text.trim()===entry?.revisions.at(-1)?.text.trim()));
 const stats=editorialProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 function choose(id:string){setSelected(id);setIssue('');setDiagnosis('');setStage('REDRAFT');setText('');setReason('');setChecks([]);setError('')}
 async function saveFirst(){
  if(!issue||!diagnosis.trim()||busy||entry)return;
  setBusy(true);setError('');
  try{
   const selectedIssue=c.issues.find(x=>x.id===issue);
   if(!selectedIssue)throw Error('Belegstelle ist nicht gültig.');
   await saveProductionEntry(editorialFirst(c,issue,selectedIssue.paragraphId,diagnosis,Date.now()),0);
   await refresh();setDiagnosis('');
  }catch(e){setError('Erstbefund nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveVersion(){
  if(!entry||busy)return;
  setBusy(true);setError('');
  try{
   const next=appendEditorialRevision(entry,c,stage,text,reason,checks,crypto.randomUUID(),Date.now());
   await saveProductionEntry(next,entry.revisions.length);
   await refresh();setText('');setReason('');setChecks([]);
   if(stage==='REDRAFT')setStage('RECONSIDER');
  }catch(e){setError('Fassung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 function useSource(){setText(editorialSource(c))}
 function useLatest(){setText(latest?.text??editorialSource(c))}
 return <section className="editorial-studio">
  <h1 className="page-title">Textredaktion</h1>
  <div className="banner">DEMO_ONLY · {stats.started}/{stats.total} Fälle begonnen · {stats.rewritten} redigiert · {stats.reconsidered} erneut überarbeitet. Originale fiktive Texte; unbewertete Entwürfe.</div>
  <div className="field"><label htmlFor="editorial-case">Redaktionsfall</label><select id="editorial-case" disabled={busy} value={selected} onChange={e=>choose(e.target.value)}>{editorialCases.map(x=><option key={x.id} value={x.id}>{x.band} · {x.title}</option>)}</select></div>
  {nextEditorialCase(entries).id!==selected&&<button type="button" className="button outline" disabled={busy} onClick={()=>choose(nextEditorialCase(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel">
   <div className="kicker">{c.band} · G11 · {c.id} · v{c.version}</div>
   <h2>{c.title}</h2><p><strong>{c.genre}</strong> · {c.audience}</p>
   <p>{c.objective}</p>
   <div className="editorial-source" aria-label="Unveränderlicher Ausgangstext">
    {c.paragraphs.map((p,i)=><p key={p.id}><strong>Absatz {i+1} · {p.id}</strong>{p.text}</p>)}
   </div>
   <p className="small muted">Quelle: {c.rights.kind} · {c.status} · {c.rights.source}</p>
  </article>
  <article className="panel editorial-work">
   {!entry?<><h2>1 · Redaktionellen Befund festhalten</h2>
    <div className="field"><label htmlFor="editorial-issue">Zu prüfende Textstelle</label><select id="editorial-issue" value={issue} onChange={e=>setIssue(e.target.value)}><option value="">Problem wählen</option>{c.issues.map(x=><option key={x.id} value={x.id}>{x.paragraphId} · {x.label}</option>)}</select></div>
    {issue&&<p>{c.issues.find(x=>x.id===issue)?.question}</p>}
    <div className="field"><label htmlFor="editorial-diagnosis">Deine erste Diagnose mit Textbeleg</label><textarea id="editorial-diagnosis" rows={5} maxLength={2900} value={diagnosis} onChange={e=>setDiagnosis(e.target.value)}/></div>
    <button type="button" className="button" disabled={!issue||!diagnosis.trim()||busy} onClick={()=>void saveFirst()}>Erstbefund unveränderlich speichern</button>
   </>:<><h2>2 · Gesamten Text überarbeiten</h2>
    <p><strong>{firstIssue?.paragraphId??'Unbekannt'} · {firstIssue?.label??'Historischer Befund'}</strong></p>
    {firstIssue&&<p>{firstIssue.question}</p>}
    <p className="written">{entry.original}</p>
    <div className="field"><label htmlFor="editorial-stage">Fassungstyp</label><select id="editorial-stage" value={stage} onChange={e=>{setStage(e.target.value as EditorialStage);setText('');setReason('');setChecks([])}}><option value="REDRAFT">Text vollständig redigieren</option><option value="RECONSIDER" disabled={!completedFirst}>Fassung kritisch überarbeiten</option></select></div>
    <div className="buttonrow">
     <button type="button" className="button outline" onClick={useSource}>Ausgangstext in Entwurf übernehmen</button>
     {latest&&<button type="button" className="button outline" onClick={useLatest}>Letzte Fassung übernehmen</button>}
    </div>
    <div className="field"><label htmlFor="editorial-text">Deine vollständige Textfassung</label><textarea id="editorial-text" rows={10} maxLength={2900} value={text} onChange={e=>setText(e.target.value)}/></div>
    <div className="field"><label htmlFor="editorial-reason">Welche Bezüge, Aussagen oder Folgerungen hast du geändert?</label><textarea id="editorial-reason" rows={4} maxLength={1150} value={reason} onChange={e=>setReason(e.target.value)}/></div>
    <fieldset className="review-checklist"><legend>Eigene Redaktionsprüfung</legend>{EDITORIAL_CHECKS.map(label=><label key={label}><input type="checkbox" checked={checks.includes(label)} onChange={()=>setChecks(v=>v.includes(label)?v.filter(x=>x!==label):[...v,label])}/>{label}</label>)}</fieldset>
    {unchanged&&<p className="feedback" role="status">Die Textfassung ist unverändert. Passe den Text vor dem Speichern an.</p>}
    <button className="button" type="button" disabled={busy||unchanged||!text.trim()||!reason.trim()||(stage==='RECONSIDER'&&!completedFirst)} onClick={()=>void saveVersion()}>Textfassung mit Begründung speichern</button>
    {entry.revisions.length>0&&<section className="editorial-history"><h3>Gespeicherte Textfassungen</h3>
     {entry.revisions.map((r,i)=><article key={r.id}>
      <div className="kicker">{i+1} · {r.questionId==='RECONSIDER'?'Kritische Überarbeitung':'Redigierter Text'} · {r.paragraphId}</div>
      <p className="written">{r.text}</p><p><strong>Redaktionelle Begründung:</strong> {r.reflection}</p>
      {r.selfChecks?.length?<p className="small muted">Selbstprüfung: {r.selfChecks.join(' · ')}</p>:null}
      <details><summary>Änderungen gegenüber {i===0?'Ausgangstext':'vorheriger Fassung'}</summary>
       <div className="written version-diff">{revisionDiff(i===0?editorialSource(c):entry.revisions[i-1].text,r.text).map((part,j)=><span key={j} className={'diff-'+part.kind}>{part.text} </span>)}</div>
       <p className="small muted">Wortvergleich, keine automatische Qualitätsbewertung.</p>
      </details>
     </article>)}
    </section>}
   </>}
  </article>
  {error&&<p role="alert" className="feedback incorrect">{error}</p>}
  <div className="buttonrow"><button type="button" className="button outline" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
