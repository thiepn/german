import {useEffect,useMemo,useState} from 'react';
import {productionPrompts} from '../../domain/production/prompts';
import type {ProductionEntry,ProductionPrompt,RevisionLens} from '../../domain/production/types';
import {journey,nextWritingPrompt,revisionDiff,LENSES} from '../../domain/production/continuity';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
const lenses=Object.keys(LENSES) as RevisionLens[];
export default function ProductionStudio({onExit,initialSelection}:{onExit:()=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(productionPrompts.some(p=>p.id===initialSelection)?initialSelection!:productionPrompts[0].id);
 const [draft,setDraft]=useState('');
 const [revision,setRevision]=useState('');
 const [reflection,setReflection]=useState('');
 const [lens,setLens]=useState<RevisionLens>('BEDEUTUNG');
 const [checks,setChecks]=useState<string[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [showSample,setShowSample]=useState(false);
 const [showDiff,setShowDiff]=useState(false);
 const prompt=productionPrompts.find(p=>p.id===selected) as ProductionPrompt;
 const existing=entries.find(e=>e.itemId===selected);
 const states=useMemo(()=>journey(productionPrompts,entries),[entries]);
 const next=nextWritingPrompt(productionPrompts,entries);
 const completed=states.filter(s=>s.started).length;
 const revisions=states.reduce((n,s)=>n+s.revisions,0);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{void refresh().catch(e=>setError(String(e)))},[]);
 function changePrompt(id:string){setSelected(id);setShowSample(false);setShowDiff(false);setDraft('');setRevision('');setReflection('');setChecks([]);setError('')}
 async function saveFirst(){
  if(!draft.trim()||existing)return;
  setBusy(true);setError('');
  try{
   const at=Date.now();const entry:ProductionEntry={id:crypto.randomUUID(),itemId:prompt.id,itemVersion:prompt.version,createdAt:at,original:draft.trim(),revisions:[],evaluated:'UNASSESSED'};
   await saveProductionEntry(entry,0);await refresh();setShowSample(true);
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function saveImprovement(){
  if(!existing||!revision.trim())return;setBusy(true);setError('');
  try{
   const nextEntry:ProductionEntry={...existing,revisions:[...existing.revisions,{id:crypto.randomUUID(),at:Date.now(),text:revision.trim(),reflection:reflection.trim(),lens,selfChecks:[...checks]}]};
   await saveProductionEntry(nextEntry,existing.revisions.length);await refresh();setRevision('');setReflection('');setChecks([]);setShowSample(true);setShowDiff(true);
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 const latest=existing?.revisions.at(-1)?.text??existing?.original??'';
 const prior=existing?.revisions.length?existing.revisions.length===1?existing.original:existing.revisions.at(-2)!.text:existing?.original??'';
 const toggle=(value:string)=>setChecks(c=>c.includes(value)?c.filter(x=>x!==value):[...c,value]);
 return <section><div className="eyebrow">Satzlabor · Schreibwerkstatt</div><h1 className="page-title">Formulieren und überarbeiten</h1>
 <p className="lead">Über mehrere Sitzungen arbeiten: Erstfassung bewahren, selbst prüfen, gezielt überarbeiten und die Veränderungen nachvollziehen. Keine automatische Sprachbewertung oder CEFR-Einstufung.</p>
 <div className="banner">{productionPrompts.length} KI-erstellte DEMO_ONLY-Aufgaben. Beispiele und Kriterien sind redaktionell ungeprüft; eine Formulierung ist nicht die einzig richtige.</div>
 <div className="metrics"><div className="metric"><strong>{completed} / {productionPrompts.length}</strong><small>Begonnene Schreibaufgaben</small></div><div className="metric"><strong>{revisions}</strong><small>Gespeicherte Überarbeitungen</small></div><div className="metric"><strong>{states.filter(x=>x.started&&x.revisions===0).length}</strong><small>Erstfassungen ohne Überarbeitung</small></div></div>
 <div className="buttonrow"><button className="button outline" onClick={()=>next&&changePrompt(next)} disabled={!next}>Nächste Schreibaufgabe fortsetzen</button></div>
 <div className="field"><label htmlFor="productionPrompt">Eigene Schreibaufgaben</label><select id="productionPrompt" value={selected} onChange={e=>changePrompt(e.target.value)}>{states.map((s,i)=><option key={s.prompt.id} value={s.prompt.id}>{i+1}. {s.prompt.objective} · {s.started?s.revisions+' Überarbeitungen':'Neu'} · {s.prompt.band}</option>)}</select></div>
 <article className="exercise"><div className="tag">{prompt.band} · {prompt.objective}</div><p className="prompt">{prompt.source}</p><p>{prompt.instruction}</p>
 {!existing?<><div className="field"><label htmlFor="firstText">Deine erste Formulierung</label><textarea id="firstText" rows={5} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Formuliere einen vollständigen Satz oder eine kurze Passage …" maxLength={2500}/></div><p className="small muted">Nur ausdrücklich gespeicherte Texte bleiben nach einem Neuladen erhalten.</p><button className="button" disabled={busy||!draft.trim()} onClick={()=>void saveFirst()}>Erstfassung unveränderlich speichern</button></>:<>
 <div className="panel"><span className="kicker">Gespeicherte Erstfassung · ohne Punktzahl</span><p className="written">{existing.original}</p></div>
 <div className="buttonrow"><button className="button outline" onClick={()=>setShowSample(v=>!v)}>{showSample?'Beispiel ausblenden':'Beispiel und Kriterien zeigen'}</button><button className="button outline" disabled={!existing.revisions.length} onClick={()=>setShowDiff(v=>!v)}>{showDiff?'Vergleich ausblenden':'Letzte Änderungen vergleichen'}</button></div>
 {showSample&&<div className="feedback"><strong>Eine mögliche Formulierung (redaktionell unbestätigt)</strong><p className="written">{prompt.sample}</p><h3>Prüffragen</h3><ul>{prompt.noticing.map(s=><li key={s}>{s}</li>)}</ul></div>}
 {existing.revisions.map((r,i)=><div className="panel" key={r.id}><span className="kicker">Überarbeitung {i+1} · {r.lens?LENSES[r.lens].title:'Freie Überarbeitung'}</span><p className="written">{r.text}</p>{r.reflection&&<p className="muted">Reflexion: {r.reflection}</p>}{r.selfChecks?.length?<p className="small muted">Selbstprüfung: {r.selfChecks.join(' · ')}</p>:null}</div>)}
 {showDiff&&existing.revisions.length>0&&<section className="panel" aria-label="Versionsvergleich"><h3>Was hat sich verändert?</h3><p className="small muted">Wortbasierter Vergleich der letzten beiden Fassungen; keine sprachliche Qualitätsbewertung.</p><div className="written version-diff">{revisionDiff(prior,latest).map((part,i)=><span key={i} className={'diff-'+part.kind}>{part.text} </span>)}</div><p className="small muted">Durchgestrichen: entfernt · Unterstrichen: neu · Unmarkiert: unverändert.</p></section>}
 <div className="field"><label htmlFor="revisionLens">Fokus deiner nächsten Überarbeitung</label><select id="revisionLens" value={lens} onChange={e=>setLens(e.target.value as RevisionLens)}>{lenses.map(l=><option value={l} key={l}>{LENSES[l].title}</option>)}</select></div>
 <p className="muted">{LENSES[lens].question}</p>
 <fieldset className="review-checklist"><legend>Eigene Prüfung (keine automatische Bestätigung)</legend>{prompt.noticing.map(q=><label key={q}><input type="checkbox" checked={checks.includes(q)} onChange={()=>toggle(q)}/>{q}</label>)}</fieldset>
 <div className="field"><label htmlFor="revisionText">Deine Überarbeitung</label><textarea id="revisionText" rows={5} value={revision} onChange={e=>setRevision(e.target.value)} maxLength={2500}/></div>
 <div className="field"><label htmlFor="revisionReflection">Was hast du geändert? (optional)</label><textarea id="revisionReflection" rows={3} value={reflection} onChange={e=>setReflection(e.target.value)} maxLength={1000}/></div>
 <button className="button" disabled={busy||!revision.trim()} onClick={()=>void saveImprovement()}>Überarbeitung hinzufügen</button>
 </>}
 </article>{error&&<p role="alert" className="banner">{error}</p>}<button className="button text" onClick={onExit}>Zurück zur Übersicht</button></section>;
}
