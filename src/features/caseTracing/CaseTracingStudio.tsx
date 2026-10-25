import {useEffect,useState} from 'react';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import type {ProductionEntry} from '../../domain/production/types';
import {revisionDiff} from '../../domain/production/continuity';
import {caseStudies,caseRoles,caseStudyFirst,appendCaseRepair,appendCaseTransfer,caseStudyProgress,nextCaseStudy,isCaseStudyEntry,nextCaseRepair,recordedCaseRepair,latestCaseTransfer,type CaseRole} from '../../domain/caseTracing/caseTracing';

export default function CaseTracingStudio({onExit,initialSelection}:{onExit:()=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(caseStudies.some(c=>c.id===initialSelection)?initialSelection!:caseStudies[0].id);
 const [role,setRole]=useState<CaseRole|' '>(' '),[repair,setRepair]=useState(''),[why,setWhy]=useState('');
 const [production,setProduction]=useState(''),[productionWhy,setProductionWhy]=useState(''),[paragraph,setParagraph]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=caseStudies.find(c=>c.id===selected)!;
 const record=entries.find(e=>isCaseStudyEntry(e)&&e.itemId===selected&&e.itemVersion===study.version)??null;
 const next=nextCaseRepair(study,record);
 const latest=record?latestCaseTransfer(record):null;
 const stats=caseStudyProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 function choose(id:string){setSelected(id);setRole(' ');setRepair('');setWhy('');setProduction('');setProductionWhy('');setParagraph('');setError('')}
 async function saveRepair(){
  if(!next||role===' '||!repair.trim()||!why.trim()||busy)return;
  setBusy(true);setError('');
  try{
   if(!record)await saveProductionEntry(caseStudyFirst(study,next.id,role,repair,why,Date.now()),0);
   else await saveProductionEntry(appendCaseRepair(record,study,next.id,role,repair,why,crypto.randomUUID(),Date.now()),record.revisions.length);
   await refresh();setRole(' ');setRepair('');setWhy('');
  }catch(e){setError('Kasusreparatur nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveTransfer(){
  if(!record||next||busy)return;
  setBusy(true);setError('');
  try{
   const revised=appendCaseTransfer(record,study,latest?'REWRITE':'TRANSFER',production,productionWhy,paragraph,crypto.randomUUID(),Date.now());
   await saveProductionEntry(revised,record.revisions.length);
   await refresh();setProduction('');setProductionWhy('');setParagraph('');
  }catch(e){setError('Eigener Text nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 return <section className="case-tracing-studio">
  <h1 className="page-title">Kasus und Nominalgruppen</h1>
  <div className="banner">DEMO_ONLY · {stats.started}/{stats.total} Fälle begonnen · {stats.repairs} Flexionsreparaturen · {stats.transferred} eigene Übertragungen · {stats.rewritten} Überarbeitungen. Unbewertete Entwürfe.</div>
  <div className="field"><label htmlFor="case-study-selection">Textfall auswählen</label><select id="case-study-selection" disabled={busy} value={selected} onChange={e=>choose(e.target.value)}>{caseStudies.map(c=><option key={c.id} value={c.id}>{c.band} · {c.title}</option>)}</select></div>
  {nextCaseStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>choose(nextCaseStudy(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel case-tracing-source">
   <div className="kicker">{study.band} · M13 · G02 · {study.id} · v{study.version}</div>
   <h2>{study.title}</h2><p>{study.context}</p>
   <p className="small muted">Unredigierter fiktiver Übungsauszug mit absichtlich fehlerhaften Nominalgruppen.</p>
   {study.paragraphs.map((p,i)=><p className="case-tracing-paragraph" key={p.id}><strong>Absatz {i+1} · {p.id}</strong>{p.text}</p>)}
   <p className="small muted">Quelle: {study.rights.kind} · {study.status} · {study.rights.source}</p>
  </article>
  {record&&<section className="panel case-tracing-history"><h2>Gespeicherte Kasusanalysen</h2>
   {study.repairs.map((task,i)=>{
    const saved=recordedCaseRepair(record,task);
    if(!saved)return null;
    return <article className="case-tracing-analysis" key={task.id}>
     <h3>{i+1} · {task.paragraphId} · {task.family.replaceAll('_',' ')}</h3>
     <p><strong>Fehlerhafte Form:</strong> {task.quote}</p>
     <p><strong>Deine Kasuswahl:</strong> {saved.role}</p>
     <p><strong>Deine Reparatur:</strong> <span className="written">{saved.text}</span></p>
     <p><strong>Deine Begründung:</strong> {saved.reason}</p>
     <details><summary>Autorenlösung und grammatische Erklärung</summary>
      <p><strong>Form:</strong> {task.solution}</p><p><strong>Kasusauslöser:</strong> {task.governor}</p><p>{task.explanation}</p><p><strong>Anwendung:</strong> {task.transferHint}</p>
      <p className="small muted">Autorenentwurf, nicht unabhängig geprüft und keine automatische Bewertung deiner Formulierung.</p>
     </details>
    </article>;
   })}
  </section>}
  {next&&<section className="panel case-tracing-work">
   <h2>Flexionsreparatur {study.repairs.indexOf(next)+1} / {study.repairs.length}</h2>
   <p><strong>Textbeleg {next.paragraphId}:</strong> {next.quote}</p>
   <p>Ermittle, welcher Ausdruck die Form regiert. Ersetze die fehlerhafte Nominalgruppe durch eine grammatisch begründete Form.</p>
   <div className="field"><label htmlFor="case-tracing-role">Kasus der Nominalgruppe</label><select id="case-tracing-role" value={role} onChange={e=>setRole(e.target.value as CaseRole|' ')}><option value=" ">Kasus wählen</option>{caseRoles.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
   <div className="field"><label htmlFor="case-tracing-repair">Deine korrigierte Nominalgruppe</label><textarea id="case-tracing-repair" rows={3} maxLength={2200} value={repair} onChange={e=>setRepair(e.target.value)}/></div>
   <div className="field"><label htmlFor="case-tracing-why">Begründung: Kasusauslöser, Genus, Numerus und Flexion</label><textarea id="case-tracing-why" rows={4} maxLength={650} value={why} onChange={e=>setWhy(e.target.value)}/></div>
   {repair.trim()===next.quote.trim()&&<p className="feedback" role="status">Die fehlerhafte Form ist unverändert. Passe sie vor dem Speichern an.</p>}
   <button className="button" type="button" disabled={busy||role===' '||!repair.trim()||!why.trim()||repair.trim()===next.quote.trim()} onClick={()=>void saveRepair()}>Analyse unveränderlich speichern</button>
  </section>}
  {record&&!next&&<section className="panel case-tracing-transfer">
   <h2>{latest?'Eigene Formulierung überarbeiten':'Eigenständig formulieren'}</h2><p>{study.transfer}</p>
   {latest&&<><h3>Letzte Textfassung</h3><p className="written">{latest.text}</p><button type="button" className="button outline" onClick={()=>setProduction(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="case-tracing-paragraph">Quellenabsatz als Ausgangspunkt</label><select id="case-tracing-paragraph" value={paragraph} onChange={e=>setParagraph(e.target.value)}><option value="">Absatz wählen</option>{study.paragraphs.map((p,i)=><option key={p.id} value={p.id}>Absatz {i+1} · {p.id}</option>)}</select></div>
   <div className="field"><label htmlFor="case-tracing-output">Deine eigenständigen Sätze</label><textarea id="case-tracing-output" rows={7} maxLength={2900} value={production} onChange={e=>setProduction(e.target.value)}/></div>
   <div className="field"><label htmlFor="case-tracing-output-why">Begründe die Kasusformen und ihre Auslöser</label><textarea id="case-tracing-output-why" rows={4} maxLength={1150} value={productionWhy} onChange={e=>setProductionWhy(e.target.value)}/></div>
   {production.trim()===latest?.text.trim()&&<p className="feedback" role="status">Die Textfassung ist unverändert. Passe sie vor dem Speichern an.</p>}
   <button className="button" type="button" disabled={busy||production.trim().length<35||!paragraph||!productionWhy.trim()||production.trim()===latest?.text.trim()} onClick={()=>void saveTransfer()}>{latest?'Überarbeitung speichern':'Eigene Sätze speichern'}</button>
   {record.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE').map((rev,i,all)=>{
    const prior=i===0?null:all[i-1];
    return <article className="case-tracing-writing" key={rev.id}>
     <h3>{i+1} · {rev.questionId==='TRANSFER'?'Erste eigene Übertragung':'Überarbeitung'}</h3><p className="written">{rev.text}</p>
     <p><strong>Beleg:</strong> {rev.paragraphId} · <strong>Kasusbegründung:</strong> {rev.reflection}</p>
     {prior&&<details><summary>Änderungen zur vorherigen Textfassung</summary><div className="written version-diff">{revisionDiff(prior.text,rev.text).map((part,j)=><span key={j} className={'diff-'+part.kind}>{part.text} </span>)}</div><p className="small muted">Wortvergleich, kein Qualitätsurteil.</p></details>}
    </article>;
   })}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button className="button outline" type="button" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
