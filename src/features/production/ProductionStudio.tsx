import {useEffect,useState} from 'react';
import {productionPrompts} from '../../domain/production/prompts';
import type {ProductionEntry,ProductionPrompt} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
export default function ProductionStudio({onExit}:{onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(productionPrompts[0].id);
 const [draft,setDraft]=useState('');
 const [revision,setRevision]=useState('');
 const [reflection,setReflection]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [showSample,setShowSample]=useState(false);
 const prompt=productionPrompts.find(p=>p.id===selected) as ProductionPrompt;
 const existing=entries.find(e=>e.itemId===selected);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{void refresh().catch(e=>setError(String(e)))},[]);
 function changePrompt(id:string){setSelected(id);setShowSample(false);setDraft('');setRevision('');setReflection('');setError('')}
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
   const next:ProductionEntry={...existing,revisions:[...existing.revisions,{id:crypto.randomUUID(),at:Date.now(),text:revision.trim(),reflection:reflection.trim()}]};
   await saveProductionEntry(next,existing.revisions.length);await refresh();setRevision('');setReflection('');setShowSample(true);
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 return <section><div className="eyebrow">Satzlabor · Schreibwerkstatt</div><h1 className="page-title">Formulieren und überarbeiten</h1><p className="lead">Schreibe zunächst selbst. Vergleiche danach dein Ergebnis mit einem unverbindlichen Formulierungsbeispiel und halte deine Änderungen fest. Keine automatische Bewertung oder C2-Einstufung.</p><div className="banner">12 KI-erstellte DEMO_ONLY-Schreibimpulse. Beispielantworten sind nicht unabhängig geprüft und keine ausschließlich richtigen Lösungen.</div>
 <div className="field"><label htmlFor="productionPrompt">Schreibimpuls</label><select id="productionPrompt" value={selected} onChange={e=>changePrompt(e.target.value)}>{productionPrompts.map((p,i)=><option key={p.id} value={p.id}>{i+1}. {p.objective} · {p.band}</option>)}</select></div>
 <article className="exercise"><div className="tag">{prompt.band} · {prompt.objective}</div><p className="prompt">{prompt.source}</p><p>{prompt.instruction}</p>
 {!existing?<><div className="field"><label htmlFor="firstText">Deine erste Formulierung</label><textarea id="firstText" rows={5} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Formuliere einen vollständigen Satz oder eine kurze Passage …" maxLength={2500}/></div><button className="button" disabled={busy||!draft.trim()} onClick={()=>void saveFirst()}>Erstfassung unveränderlich speichern</button></>:<>
 <div className="panel"><span className="kicker">Gespeicherte Erstfassung · ohne Punktzahl</span><p className="written">{existing.original}</p></div>
 <div className="buttonrow"><button className="button outline" onClick={()=>setShowSample(v=>!v)}>{showSample?'Beispiel ausblenden':'Beispiel und Kriterien zeigen'}</button></div>
 {showSample&&<div className="feedback"><strong>Eine mögliche Formulierung (nicht abschließend geprüft)</strong><p className="written">{prompt.sample}</p><h3>Prüffragen für den Vergleich</h3><ul>{prompt.noticing.map(s=><li key={s}>{s}</li>)}</ul></div>}
 {existing.revisions.map((r,i)=><div className="panel" key={r.id}><span className="kicker">Überarbeitung {i+1}</span><p className="written">{r.text}</p>{r.reflection&&<p className="muted">Reflexion: {r.reflection}</p>}</div>)}
 <div className="field"><label htmlFor="revisionText">Deine Überarbeitung</label><textarea id="revisionText" rows={5} value={revision} onChange={e=>setRevision(e.target.value)} maxLength={2500}/></div>
 <div className="field"><label htmlFor="revisionReflection">Was hast du geändert? (optional)</label><textarea id="revisionReflection" rows={3} value={reflection} onChange={e=>setReflection(e.target.value)} maxLength={1000}/></div>
 <button className="button" disabled={busy||!revision.trim()} onClick={()=>void saveImprovement()}>Überarbeitung hinzufügen</button>
 </>}
 </article>{error&&<p role="alert" className="banner">{error}</p>}<button className="button text" onClick={onExit}>Zurück zur Übersicht</button></section>;
}
