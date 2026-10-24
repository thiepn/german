import {useEffect,useState} from 'react';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import type {ProductionEntry} from '../../domain/production/types';
import {mediationBriefs,mediationOriginal,addMediationRevision,isMediationEntry,nextMediationBrief,sourceForMediation,firstEvidence,mediationProgress,type MediationStage} from '../../domain/mediation/mediation';

export default function MediationStudio({onExit,onSource,initialSelection}:{onExit:()=>void;onSource:(id:string)=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(mediationBriefs.some(b=>b.id===initialSelection)?initialSelection!:mediationBriefs[0].id);
 const [audience,setAudience]=useState(''),[evidence,setEvidence]=useState(''),[draft,setDraft]=useState('');
 const [stage,setStage]=useState<MediationStage>('ADAPTATION'),[revision,setRevision]=useState(''),[revisionEvidence,setRevisionEvidence]=useState(''),[uncertainty,setUncertainty]=useState('');
 const [checks,setChecks]=useState<string[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const brief=mediationBriefs.find(b=>b.id===selected)!;
 const unit=sourceForMediation(brief);
 const saved=entries.find(e=>isMediationEntry(e)&&e.itemId===selected)??null;
 const first=saved?firstEvidence(saved):null;
 const target=brief.audiences.find(a=>a.id===(first?.audienceId??audience));
 const latest=saved?.revisions.filter(r=>r.questionId===stage).at(-1);
 const previous=saved?.revisions.filter(r=>r.questionId===stage).at(-2);
 const stats=mediationProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let alive=true;void loadProductionEntries().then(e=>{if(!alive)return;setEntries(e)}).catch(e=>{if(alive)setError(String(e))});return ()=>{alive=false}},[initialSelection]);
 function choose(id:string){setSelected(id);setAudience('');setEvidence('');setDraft('');setStage('ADAPTATION');setRevision('');setRevisionEvidence('');setUncertainty('');setChecks([]);setError('');}
 async function saveFirst(){
  if(!unit||saved||busy)return;
  setBusy(true);setError('');
  try{await saveProductionEntry(mediationOriginal(brief,audience,evidence,draft,Date.now()),0);await refresh();setDraft('')}
  catch(e){setError('Erstinterpretation nicht gespeichert: '+String(e))}
  finally{setBusy(false)}
 }
 async function saveRevision(){
  if(!saved||!unit||busy)return;
  setBusy(true);setError('');
  try{
   const latestStored=(await loadProductionEntries()).find(e=>e.id===saved.id);
   if(!latestStored||latestStored.revisions.length!==saved.revisions.length||latestStored.original!==saved.original||latestStored.decisionId!==saved.decisionId)throw Error('Ein anderer Tab hat die Fassung verändert. Bitte neu öffnen.');
   const next=addMediationRevision(saved,brief,stage,revision,revisionEvidence,uncertainty,crypto.randomUUID(),Date.now(),checks);
   await saveProductionEntry(next,saved.revisions.length);await refresh();
   setRevision('');setRevisionEvidence('');setUncertainty('');setChecks([]);
   if(stage==='ADAPTATION'&&!next.revisions.some(r=>r.questionId==='ARGUMENT'))setStage('ARGUMENT');
  }catch(e){setError('Überarbeitung nicht gespeichert: '+String(e))}
  finally{setBusy(false)}
 }
 const checkLabels=['Aussagen der Quelle zugeordnet','Beobachtung und Schlussfolgerung getrennt','Unsicherheit ausdrücklich genannt'];
 return <section className="mediation-studio">
  <h1 className="page-title">Sprachmittlung und Argumentation</h1>
  <div className="banner">DEMO_ONLY · {stats.started}/{stats.total} Fälle begonnen · {stats.adapted} adressatengerecht übertragen · {stats.argued} Argumentationen. Originale fiktive Lesetexte; unbewertete, redaktionell ungeprüfte Aufgaben.</div>
  <div className="field"><label htmlFor="mediation-case">Ausgangstext auswählen</label><select id="mediation-case" value={selected} onChange={e=>choose(e.target.value)}>{mediationBriefs.map(b=><option value={b.id} key={b.id}>{b.band} · {b.title}</option>)}</select></div>
  {nextMediationBrief(entries).id!==selected&&<button className="button outline" type="button" onClick={()=>choose(nextMediationBrief(entries).id)}>Nächsten Fall öffnen</button>}
  <article className="panel"><div className="kicker">{brief.band} · G13 · {unit?.id??brief.unitId} · v{brief.version}</div><h2>{brief.title}</h2>
   {unit?<><div className="mediation-source">{unit.paragraphs.map((p,i)=><p key={p.id} className="reading-paragraph"><strong className="reading-paragraph-id">Absatz {i+1} · {p.id}</strong>{p.text}</p>)}</div>
    <button className="button outline" type="button" onClick={()=>onSource(unit.id)}>Original-Lesestudie öffnen</button>
    <p className="small muted">Quelle: {unit.id} · {unit.rights.kind} · {unit.status}. Keine externe redaktionelle Prüfung.</p>
   </>:<p role="alert">Die ursprüngliche Textfassung ist nicht mehr verfügbar. Gespeicherte Antworten bleiben im Archiv.</p>}
  </article>
  {unit&&<article className="panel mediation-work">
   <h2>{saved?'Gesicherte Erstinterpretation':'1 · Quelle auslegen'}</h2>
   {!saved?<><p>{brief.task} Nenne ausdrücklich, was aus dem Text nicht folgt.</p>
    <div className="field"><label htmlFor="mediation-audience">Zielgruppe</label><select id="mediation-audience" value={audience} onChange={e=>setAudience(e.target.value)}><option value="">Zielgruppe wählen</option>{brief.audiences.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></div>
    {audience&&<p className="muted">{brief.audiences.find(a=>a.id===audience)?.purpose}</p>}
    <div className="field"><label htmlFor="mediation-first-evidence">Textbeleg für die Erstinterpretation</label><select id="mediation-first-evidence" value={evidence} onChange={e=>setEvidence(e.target.value)}><option value="">Absatz wählen</option>{unit.paragraphs.map((p,i)=><option key={p.id} value={p.id}>Absatz {i+1} · {p.id}</option>)}</select></div>
    <div className="field"><label htmlFor="mediation-first">Erste Deutung mit Einschränkung</label><textarea id="mediation-first" rows={5} maxLength={2800} value={draft} onChange={e=>setDraft(e.target.value)}/></div>
    <button className="button" type="button" disabled={busy||!audience||!evidence||!draft.trim()} onClick={()=>void saveFirst()}>Erstinterpretation speichern</button>
   </>:<><p className="written">{saved.original}</p>
    <p className="small muted">Zielgruppe: {target?.label??'Frühere Wahl'} · Textbeleg: {first?.paragraphId??'Nicht verfügbar'} · unveränderlich</p>
    <div className="field"><label htmlFor="mediation-stage">Aufgabe</label><select id="mediation-stage" value={stage} onChange={e=>{setStage(e.target.value as MediationStage);setRevision('');setRevisionEvidence('');setUncertainty('');setChecks([])}}><option value="ADAPTATION">2 · Für die Zielgruppe formulieren</option><option value="ARGUMENT">3 · Gegenargument abwägen</option></select></div>
    <p>{stage==='ADAPTATION'?brief.task:brief.argumentTask}</p>
    {stage==='ADAPTATION'&&<p className="muted">Adressat: {target?.label??'Frühere Zielgruppe'} · {target?.purpose??''}</p>}
    <div className="field"><label htmlFor="mediation-revision-evidence">Beleg für diese Fassung</label><select id="mediation-revision-evidence" value={revisionEvidence} onChange={e=>setRevisionEvidence(e.target.value)}><option value="">Absatz wählen</option>{unit.paragraphs.map((p,i)=><option key={p.id} value={p.id}>Absatz {i+1} · {p.id}</option>)}</select></div>
    <div className="field"><label htmlFor="mediation-revision">Deine {stage==='ADAPTATION'?'adressatengerechte Fassung':'abwägende Argumentation'}</label><textarea id="mediation-revision" rows={5} maxLength={2800} value={revision} onChange={e=>setRevision(e.target.value)}/></div>
    <div className="field"><label htmlFor="mediation-uncertainty">Welche Unsicherheit oder Grenze bleibt?</label><textarea id="mediation-uncertainty" rows={3} maxLength={1100} value={uncertainty} onChange={e=>setUncertainty(e.target.value)}/></div>
    <fieldset className="review-checklist"><legend>Eigene Quellenprüfung (Selbstauskunft)</legend>{checkLabels.map(label=><label key={label}><input type="checkbox" checked={checks.includes(label)} onChange={()=>setChecks(v=>v.includes(label)?v.filter(x=>x!==label):[...v,label])}/>{label}</label>)}</fieldset>
    <button className="button" type="button" disabled={busy||!revision.trim()||!revisionEvidence||!uncertainty.trim()} onClick={()=>void saveRevision()}>Fassung mit Beleg speichern</button>
    {saved.revisions.length>0&&<section className="mediation-history"><h3>Gesicherte Fassungen</h3>{saved.revisions.map((r,i)=><div key={r.id} className="listitem"><div className="kicker">{i+1} · {r.questionId==='ARGUMENT'?'Argumentation':'Zielgruppenfassung'}</div><p className="written">{r.text}</p><p className="small muted">Beleg: {r.paragraphId??'—'} · Grenze: {r.reflection}</p>{r.selfChecks?.length?<p className="small muted">Selbstprüfung: {r.selfChecks.join(' · ')}</p>:null}</div>)}</section>}
    {latest&&<details><summary>Letzte {stage==='ADAPTATION'?'Zielgruppenfassung':'Argumentation'} vergleichen</summary>
      <div className="written version-diff">{revisionDiff(previous?.text??saved.original,latest.text).map((part,i)=><span key={i} className={'diff-'+part.kind}>{part.text} </span>)}</div>
      <p className="small muted">Wortvergleich, keine sprachliche Qualitätsbewertung.</p></details>}
   </>}
  </article>}
  {error&&<p className="banner" role="alert">{error}</p>}
  <div className="buttonrow"><button className="button outline" type="button" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
