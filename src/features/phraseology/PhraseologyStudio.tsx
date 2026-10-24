import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {phraseologyStudies,isPhraseologyEntry,beginPhraseology,appendPhraseologyDecision,appendPhraseologyTransfer,phraseologyProgress,nextPhraseologyStudy,nextPhraseologyDecision,savedPhraseologyDecision,latestPhraseologyTransfer,independentPhraseologyText,type PhraseologyChoice} from '../../domain/phraseology/phraseology';

export default function PhraseologyStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(phraseologyStudies.some(s=>s.id===initialSelection)?initialSelection!:phraseologyStudies[0].id);
 const [choice,setChoice]=useState<PhraseologyChoice|''>(''),[rewrite,setRewrite]=useState(''),[boundary,setBoundary]=useState('');
 const [draft,setDraft]=useState(''),[draftWhy,setDraftWhy]=useState(''),[paragraph,setParagraph]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=phraseologyStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isPhraseologyEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const decision=nextPhraseologyDecision(study,entry),latest=entry?latestPhraseologyTransfer(entry):null,progress=phraseologyProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let live=true;void loadProductionEntries().then(records=>{if(live)setEntries(records)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 function select(id:string){setSelected(id);setChoice('');setRewrite('');setBoundary('');setDraft('');setDraftWhy('');setParagraph('');setError('')}
 const copied=Boolean(decision&&rewrite.trim()&&!independentPhraseologyText(decision,rewrite));
 async function saveDecision(){
  if(!decision||!choice||busy||!rewrite.trim()||!boundary.trim()||copied)return;
  setBusy(true);setError('');
  try{
   if(!entry)await saveProductionEntry(beginPhraseology(study,decision.id,choice,rewrite,boundary,Date.now()),0);
   else await saveProductionEntry(appendPhraseologyDecision(entry,study,decision.id,choice,rewrite,boundary,crypto.randomUUID(),Date.now()),entry.revisions.length);
   await refresh();setChoice('');setRewrite('');setBoundary('');
  }catch(e){setError('Deutung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveTransfer(){
  if(!entry||decision||busy)return;
  setBusy(true);setError('');
  try{
   const version=appendPhraseologyTransfer(entry,study,latest?'REWRITE':'TRANSFER',draft,draftWhy,paragraph,crypto.randomUUID(),Date.now());
   await saveProductionEntry(version,entry.revisions.length);
   await refresh();setDraft('');setDraftWhy('');setParagraph('');
  }catch(e){setError('Textfassung nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 const unchanged=Boolean(latest&&draft.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE')===latest.text.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE'));
 return <section className="phraseology-studio">
  <h1 className="page-title">Phraseologie im Zusammenhang</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellen begonnen · {progress.decisions} Deutungen · {progress.transferred} eigene Texte · {progress.rewritten} Revisionen. Keine automatische Bewertung.</p>
  <div className="field"><label htmlFor="phraseology-study">Textfall</label><select id="phraseology-study" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{phraseologyStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextPhraseologyStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextPhraseologyStudy(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel phraseology-source">
   <div className="kicker">{study.band} · G07 · {study.id} · v{study.version}</div>
   <h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map((p,i)=><p className="phraseology-paragraph" key={p.id}><strong>Absatz {i+1} · {p.id}</strong>{p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind} · {study.rights.source}</p>
  </article>
  {entry&&<section className="panel phraseology-history"><h2>Gespeicherte Bedeutungsanalysen</h2>
   {study.decisions.map((d,i)=>{
    const saved=savedPhraseologyDecision(entry,d);if(!saved)return null;
    return <article className="phraseology-analysis" key={d.id}>
     <h3>{i+1} · {d.focus} · {d.paragraphId}</h3>
     <div className="phraseology-before-after"><div><strong>Quellenaussage</strong><p>{d.quote}</p></div><div><strong>Bedeutungsänderung</strong><p>{d.alternate}</p></div></div>
     <p><strong>Deine Lesart:</strong> {d.options.find(o=>o.id===saved.choice)?.text}</p>
     <p><strong>Deine eigenständige Fassung:</strong> <span className="written">{saved.rewrite}</span></p>
     <p><strong>Aussagegrenze:</strong> {saved.limit}</p>
     <details><summary>Autorenanalyse und kontrastierte Aussage</summary>
      <p>{d.analysis}</p><p>{d.explanation}</p><p><strong>Weiterführung:</strong> {d.repairPrompt}</p>
      <p className="small muted">Originalentwurf ohne unabhängige fachliche Freigabe. Keine Bewertung deiner Antwort.</p>
     </details>
    </article>;
   })}
  </section>}
  {decision&&<section className="panel phraseology-task">
   <h2>Kontextvergleich {study.decisions.indexOf(decision)+1} / {study.decisions.length}</h2>
   <div className="phraseology-before-after"><div><strong>Textbeleg {decision.paragraphId}</strong><p>{decision.quote}</p></div><div><strong>Alternative</strong><p>{decision.alternate}</p></div></div>
   <p>{decision.question}</p>
   <div className="field"><label htmlFor="phraseology-choice">Bedeutung der Quellenaussage</label><select id="phraseology-choice" disabled={busy} value={choice} onChange={e=>setChoice(e.target.value as PhraseologyChoice|'')}><option value="">Lesart auswählen</option>{decision.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="phraseology-rewrite">Formuliere die Quellenaussage eigenständig und präzise um</label><textarea id="phraseology-rewrite" rows={5} maxLength={1800} value={rewrite} onChange={e=>setRewrite(e.target.value)}/></div>
   <div className="field"><label htmlFor="phraseology-boundary">Welche nicht belegte Zusage, Handlung oder Verantwortung würde die Alternative nahelegen?</label><textarea id="phraseology-boundary" rows={4} maxLength={850} value={boundary} onChange={e=>setBoundary(e.target.value)}/></div>
   {copied&&<p className="feedback" role="status">Die Formulierung ist unverändert oder zu kurz. Eigene Sätze sind erforderlich.</p>}
   <button type="button" className="button" disabled={busy||!choice||!independentPhraseologyText(decision,rewrite)||boundary.trim().length<20} onClick={()=>void saveDecision()}>Bedeutungsanalyse speichern</button>
  </section>}
  {entry&&!decision&&<section className="panel phraseology-transfer">
   <h2>{latest?'Eigenen Text überarbeiten':'Eigenständig formulieren'}</h2><p>{study.transfer}</p>
   {latest&&<><h3>Letzte Textfassung</h3><p className="written">{latest.text}</p><button type="button" className="button outline" onClick={()=>setDraft(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="phraseology-paragraph">Quellenabsatz als Ausgangspunkt</label><select id="phraseology-paragraph" value={paragraph} onChange={e=>setParagraph(e.target.value)}><option value="">Absatz wählen</option>{study.paragraphs.map((p,i)=><option key={p.id} value={p.id}>Absatz {i+1} · {p.id}</option>)}</select></div>
   <div className="field"><label htmlFor="phraseology-text">Deine eigenständige Sachstandsmitteilung</label><textarea id="phraseology-text" rows={8} maxLength={2900} value={draft} onChange={e=>setDraft(e.target.value)}/></div>
   <div className="field"><label htmlFor="phraseology-reason">Begründe die festen Wendungen, ihren Verbindlichkeitsgrad und mögliche Fehlinterpretationen</label><textarea id="phraseology-reason" rows={5} maxLength={1150} value={draftWhy} onChange={e=>setDraftWhy(e.target.value)}/></div>
   {unchanged&&<p className="feedback" role="status">Die Textfassung wurde nicht verändert.</p>}
   <button type="button" className="button" disabled={busy||draft.trim().length<100||draftWhy.trim().length<25||!paragraph||unchanged} onClick={()=>void saveTransfer()}>{latest?'Überarbeitung speichern':'Eigenen Text speichern'}</button>
   {entry.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((r,i,all)=>{
    const previous=i?all[i-1]:null;
    return <article className="phraseology-writing" key={r.id}>
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
