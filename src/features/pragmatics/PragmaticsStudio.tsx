import {useEffect,useState} from 'react';
import {pragmaticScenarios,pragmaticId,isPragmaticEntry,pragmaticProgress,pragmaticNext,pragmaticReferences} from '../../domain/pragmatics/pragmatics';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import type {ProductionEntry} from '../../domain/production/types';
export default function PragmaticsStudio({onExit,initialSelection}:{onExit:()=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(pragmaticScenarios.some(s=>s.id===initialSelection)?initialSelection!:pragmaticScenarios[0].id);
 const [decision,setDecision]=useState('');
 const [reason,setReason]=useState('');
 const [revision,setRevision]=useState('');
 const [reflection,setReflection]=useState('');
 const [revealed,setRevealed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const scenario=pragmaticScenarios.find(s=>s.id===selected)!;
 const record=entries.find(e=>isPragmaticEntry(e)&&e.itemId===selected);
 const stats=pragmaticProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{void refresh().catch(e=>setError(String(e)))},[]);
 function select(id:string){setSelected(id);setDecision('');setReason('');setRevision('');setReflection('');setRevealed(false);setError('')}
 async function saveChoice(){
  if(record||!decision||!reason.trim()||busy)return;
  setBusy(true);setError('');
  try{
   await saveProductionEntry({id:pragmaticId(scenario.id),kind:'PRAGMATIC_STUDY',itemId:scenario.id,itemVersion:scenario.version,createdAt:Date.now(),decisionId:decision,original:reason.trim(),revisions:[],evaluated:'UNASSESSED'},0);
   await refresh();setRevealed(true);
  }catch(e){setError('Entscheidung nicht gespeichert: '+String(e))}finally{setBusy(false)}
 }
 async function revise(){
  if(!record||!revision.trim()||busy)return;
  setBusy(true);setError('');
  try{
   await saveProductionEntry({...record,revisions:[...record.revisions,{id:crypto.randomUUID(),at:Date.now(),text:revision.trim(),reflection:reflection.trim(),lens:'REGISTER'}]},record.revisions.length);
   await refresh();setRevision('');setReflection('');setRevealed(true);
  }catch(e){setError('Überarbeitung nicht gespeichert: '+String(e))}finally{setBusy(false)}
 }
 const source=pragmaticReferences.find(a=>a.id===scenario.cefrReference);
 return <section><div className="eyebrow">G08 · Stil und Pragmatik</div><h1 className="page-title">Wirkung statt nur Richtigkeit</h1>
 <p className="lead">Wie wirkt eine Äußerung auf das Gegenüber? Entscheide nach Kontext, begründe deine Wahl und entwickle eine eigene Formulierung. Ohne automatische Bewertung.</p>
 <div className="banner">DEMO_ONLY · {stats.started}/{stats.total} Entscheidungen dokumentiert, {stats.rewritten} Fälle mit Überarbeitung. Alle Beispiele und Präferenzen sind unbegutachtete Entwürfe, keine allein gültigen Antworten.</div>
 <div className="buttonrow"><button className="button outline" disabled={!pragmaticNext(entries)} onClick={()=>{const next=pragmaticNext(entries);if(next)select(next)}}>Nächsten Fall fortsetzen</button></div>
 <div className="field"><label htmlFor="pragmatic-select">Kommunikative Situation</label><select id="pragmatic-select" value={selected} onChange={e=>select(e.target.value)}>{pragmaticScenarios.map((s,i)=><option value={s.id} key={s.id}>{i+1}. {s.title} · {s.band} · {entries.some(e=>isPragmaticEntry(e)&&e.itemId===s.id)?'Gespeichert':'Neu'}</option>)}</select></div>
 <article className="panel"><span className="kicker">{scenario.band} · Situationsangemessenheit</span><h2>{scenario.title}</h2><p className="prompt">{scenario.context}</p><p>{scenario.task}</p>
 {!record?<><fieldset className="pragmatic-options"><legend>Welche Formulierung passt in dieser Situation am ehesten?</legend>{scenario.options.map(o=><label key={o.id} className={decision===o.id?'selected':''}><input type="radio" name="pragmatic-choice" checked={decision===o.id} onChange={()=>setDecision(o.id)}/><span>{o.text}</span></label>)}</fieldset>
 <div className="field"><label htmlFor="pragmatic-reason">Warum wählst du diese Formulierung?</label><textarea id="pragmatic-reason" rows={4} value={reason} onChange={e=>setReason(e.target.value)} maxLength={2500}/></div><button className="button" disabled={!decision||!reason.trim()||busy} onClick={()=>void saveChoice()}>Wahl und Begründung speichern</button></>:<>
 <section className="panel"><h3>Deine ursprüngliche Entscheidung</h3><p className="written">{scenario.options.find(x=>x.id===record.decisionId)?.text??'Früher gespeicherte Wahl nicht mehr im aktuellen Entwurf vorhanden'}</p><p className="written">{record.original}</p><p className="small muted">Unveränderlich gespeichert, ohne Punktzahl.</p></section>
 <button className="button outline" onClick={()=>setRevealed(x=>!x)}>{revealed?'Wirkungsvergleich ausblenden':'Wirkungsvergleich zeigen'}</button>
 {revealed&&<section className="panel"><h3>Mögliche Wirkungen — redaktionell ungeprüft</h3>{scenario.options.map(o=><div key={o.id} className="pragmatic-effect"><p><strong>{o.text}</strong></p><p>{o.effect}</p>{scenario.preferredIds.includes(o.id)&&<p className="small muted">Im derzeitigen Demo-Kontext bevorzugt; andere Lösungen können begründbar sein.</p>}</div>)}
 {source&&<p className="small muted">Kompetenzrahmen: <a href={source.url} target="_blank" rel="noopener noreferrer">GER-Begleitband: pragmatische und soziolinguistische Angemessenheit</a> (keine externe Bewertung oder Zertifizierung).</p>}</section>}
 {record.revisions.map((r,i)=><section key={r.id} className="panel"><span className="kicker">Eigene Neuformulierung {i+1}</span><p className="written">{r.text}</p>{r.reflection&&<p className="muted">{r.reflection}</p>}</section>)}
 <h3>In eigenen Worten</h3><p>{scenario.rewrite}</p><div className="field"><label htmlFor="pragmatic-rewrite">Deine Formulierung</label><textarea id="pragmatic-rewrite" rows={4} value={revision} onChange={e=>setRevision(e.target.value)} maxLength={2500}/></div>
 <div className="field"><label htmlFor="pragmatic-reflection">Was verändert sich in Wirkung und Verbindlichkeit? (optional)</label><textarea id="pragmatic-reflection" rows={3} value={reflection} onChange={e=>setReflection(e.target.value)} maxLength={1000}/></div>
 <button className="button" disabled={!revision.trim()||busy} onClick={()=>void revise()}>Eigene Formulierung ergänzen</button>
 </>}
 </article>{error&&<p role="alert" className="banner">{error}</p>}<button className="button text" onClick={onExit}>Zurück zum Curriculum</button></section>;
}
