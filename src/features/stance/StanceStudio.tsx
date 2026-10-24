import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {stanceStudies,isStanceEntry,beginStance,appendStanceDecision,appendStanceTransfer,stanceProgress,nextStanceStudy,nextStanceDecision,savedStanceDecision,latestStanceTransfer,independentStanceRewrite,type StanceChoice} from '../../domain/stance/stance';

export default function StanceStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(stanceStudies.some(s=>s.id===initialSelection)?initialSelection!:stanceStudies[0].id);
 const [choice,setChoice]=useState<StanceChoice|''>(''),[rewrite,setRewrite]=useState(''),[boundary,setBoundary]=useState('');
 const [draft,setDraft]=useState(''),[draftWhy,setDraftWhy]=useState(''),[paragraph,setParagraph]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=stanceStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isStanceEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const decision=nextStanceDecision(study,entry),latest=entry?latestStanceTransfer(entry):null,progress=stanceProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let live=true;void loadProductionEntries().then(records=>{if(live)setEntries(records)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setRewrite('');setBoundary('');setDraft('');setDraftWhy('');setParagraph('');setError('')}
 const copied=Boolean(decision&&rewrite.trim()&&!independentStanceRewrite(decision,rewrite));
 async function saveDecision(){
  if(!decision||!choice||busy||!rewrite.trim()||!boundary.trim()||copied)return;
  setBusy(true);setError('');
  try{
   if(!entry)await saveProductionEntry(beginStance(study,decision.id,choice,rewrite,boundary,Date.now()),0);
   else await saveProductionEntry(appendStanceDecision(entry,study,decision.id,choice,rewrite,boundary,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setChoice('');setRewrite('');setBoundary('');
  }catch(e){setError('Haltungsanalyse nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveTransfer(){
  if(!entry||decision||busy)return;
  setBusy(true);setError('');
  try{
   const version=appendStanceTransfer(entry,study,latest?'REWRITE':'TRANSFER',draft,draftWhy,paragraph,crypto.randomUUID(),Date.now());
   await saveProductionEntry(version,entry.revisions.length);
   await refresh();setDraft('');setDraftWhy('');setParagraph('');
  }catch(e){setError('Textfassung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 const unchanged=Boolean(latest&&draft.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE')===latest.text.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE'));
 return <section className="polysemy-studio">
  <h1 className="page-title">Haltung und Schlussfolgerung im Text</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellen begonnen · {progress.decisions} Positionierungen · {progress.transferred} eigene Texte · {progress.rewritten} Revisionen. Keine automatische Bewertung.</p>
  <div className="field"><label htmlFor="stance-study">Textfall</label><select id="stance-study" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{stanceStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextStanceStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextStanceStudy(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel polysemy-source">
   <div className="kicker">{study.band} · G08 · {study.id} · v{study.version}</div>
   <h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map((p,i)=><p className="polysemy-paragraph" key={p.id}><strong>Absatz {i+1} · {p.id}</strong>{p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind} · {study.rights.source}</p>
  </article>
  {entry&&<section className="panel polysemy-history"><h2>Gespeicherte Haltungsanalysen</h2>
   {study.decisions.map((d,i)=>{
    const saved=savedStanceDecision(entry,d);if(!saved)return null;
    return <article className="polysemy-analysis" key={d.id}>
     <h3>{i+1} · {d.move} · {d.paragraphId}</h3>
     <div className="polysemy-before-after"><div><strong>Originalaussage</strong><p>{d.quote}</p></div><div><strong>Überdehnung</strong><p>{d.alternate}</p></div></div>
     <p><strong>Deine Textdeutung:</strong> {d.options.find(o=>o.id===saved.choice)?.text}</p>
     <p><strong>Deine Rekonstruktion:</strong> <span className="written">{saved.rewrite}</span></p>
     <p><strong>Ausgeschlossene Folgerung:</strong> {saved.boundary}</p>
     <details><summary>Quellenbelege und Reichweite</summary>
      <p>{d.explanation}</p><p><strong>Weiterführung:</strong> {d.repairPrompt}</p>
      <p className="small muted">Originalentwurf ohne unabhängige fachliche Freigabe. Keine Bewertung deiner Antwort.</p>
     </details>
    </article>;
   })}
  </section>}
  {decision&&<section className="panel polysemy-task">
   <h2>Schlussfolgerung {study.decisions.indexOf(decision)+1} / {study.decisions.length}</h2>
   <div className="polysemy-before-after"><div><strong>Textbeleg {decision.paragraphId}</strong><p>{decision.quote}</p></div><div><strong>Alternative</strong><p>{decision.alternate}</p></div></div>
   <p>{decision.question}</p>
   <div className="field"><label htmlFor="stance-choice">Durch den Text gestützte Lesart</label><select id="stance-choice" disabled={busy} value={choice} onChange={e=>setChoice(e.target.value as StanceChoice|'')}><option value="">Lesart auswählen</option>{decision.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="stance-rewrite">Rekonstruiere Aussage und Einschränkung in eigenen Sätzen</label><textarea id="stance-rewrite" rows={5} maxLength={1800} value={rewrite} onChange={e=>setRewrite(e.target.value)}/></div>
   <div className="field"><label htmlFor="stance-boundary">Welche stärkere Schlussfolgerung ist nicht gedeckt, und warum?</label><textarea id="stance-boundary" rows={4} maxLength={850} value={boundary} onChange={e=>setBoundary(e.target.value)}/></div>
   {copied&&<p className="feedback" role="status">Die Formulierung ist unverändert oder zu kurz. Eigene Sätze sind erforderlich.</p>}
   <button type="button" className="button" disabled={busy||!choice||!independentStanceRewrite(decision,rewrite)||boundary.trim().length<20} onClick={()=>void saveDecision()}>Deutung und Rekonstruktion speichern</button>
  </section>}
  {entry&&!decision&&<section className="panel polysemy-transfer">
   <h2>{latest?'Eigenen Text überarbeiten':'Eigenständig formulieren'}</h2><p>{study.transfer}</p>
   {latest&&<><h3>Letzte Textfassung</h3><p className="written">{latest.text}</p><button type="button" className="button outline" onClick={()=>setDraft(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="stance-paragraph">Quellenabsatz als Ausgangspunkt</label><select id="stance-paragraph" value={paragraph} onChange={e=>setParagraph(e.target.value)}><option value="">Absatz wählen</option>{study.paragraphs.map((p,i)=><option key={p.id} value={p.id}>Absatz {i+1} · {p.id}</option>)}</select></div>
   <div className="field"><label htmlFor="stance-text">Deine Stellungnahme für die Zielgruppe</label><textarea id="stance-text" rows={8} maxLength={2900} value={draft} onChange={e=>setDraft(e.target.value)}/></div>
   <div className="field"><label htmlFor="stance-reason">Begründe Positionierung, Nachweisgrenzen und ausgeschlossene Folgerungen</label><textarea id="stance-reason" rows={5} maxLength={1150} value={draftWhy} onChange={e=>setDraftWhy(e.target.value)}/></div>
   {unchanged&&<p className="feedback" role="status">Die Textfassung wurde nicht verändert.</p>}
   <button type="button" className="button" disabled={busy||draft.trim().length<100||draftWhy.trim().length<25||!paragraph||unchanged} onClick={()=>void saveTransfer()}>{latest?'Überarbeitung speichern':'Eigenen Text speichern'}</button>
   {entry.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((r,i,all)=>{
    const previous=i?all[i-1]:null;
    return <article className="polysemy-writing" key={r.id}>
     <h3>{i+1} · {r.questionId==='TRANSFER'?'Erster eigener Text':'Überarbeitung'}</h3>
     <p className="written">{r.text}</p><p><strong>Quelle:</strong> {r.paragraphId} · <strong>Begründung:</strong> {r.reflection}</p>
     {previous&&<details><summary>Änderungen gegenüber der vorherigen Fassung</summary><div className="written version-diff">{revisionDiff(previous.text,r.text).map((part,j)=><span key={j} className={'diff-'+part.kind}>{part.text} </span>)}</div><p className="small muted">Wortvergleich, keine automatische sprachliche Bewertung.</p></details>}
    </article>;
   })}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button type="button" className="button outline" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
