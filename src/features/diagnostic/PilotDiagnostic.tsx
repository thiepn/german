import {useEffect,useState} from 'react';
import {pilotItems,pilotApprovals,practiceIds} from '../../domain/diagnostic/p1Items';
import {validatePilot,makePilot,answerPilot,pausePilot,resumePilot,finishPilot,pilotResults} from '../../domain/diagnostic/p1Pilot';
import type {DiagnosticSession} from '../../domain/diagnostic/engine';
import {loadDiagnosticSession,saveDiagnosticSession} from '../../persistence/schema';
export default function PilotDiagnostic(){
 const gate=validatePilot(pilotItems,pilotApprovals,practiceIds);
 const [s,setS]=useState<DiagnosticSession|null>(null);
 const [values,setValues]=useState<Record<string,string>>({});
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(gate.ready)void loadDiagnosticSession('P1-LOCAL').then(found=>{if(found?.form==='P1'&&found.formFingerprint===pilotItems.map(i=>i.id+'@'+i.version).join('|'))setS(found)}).catch(e=>setError(String(e)) )},[gate.ready]);
 async function store(next:DiagnosticSession){setBusy(true);setError('');try{await saveDiagnosticSession(next);setS(next);setValues({})}catch(e){setError('Diagnose konnte nicht gespeichert werden: '+String(e))}finally{setBusy(false)}}
 if(!gate.ready)return <article className="panel"><h2>P1 · Grammatikdiagnose</h2><p><strong>{pilotItems.length} von 50</strong> freigegebenen Aufgaben.</p><p>20 Genus · 16 Flexion · 14 Rektion. Erst nach unabhängiger Freigabe und Prüfung aller Antworten verfügbar. Keine C2-Einstufung.</p><p className="muted small">Status: Gesperrt — keine Demoaufgaben als Diagnostik.</p></article>;
 const item=s?.phase==='IN_PROGRESS'?pilotItems.find(i=>i.id===s.itemIds[s.responses.length]):null;
 const completed=s?.phase==='COMPLETE';
 return <section className="panel" aria-label="P1 Grammatikdiagnose">
  <h2>P1 · Grammatikdiagnose</h2>
  {!s&&<><p>50 unabhängig geprüfte Fragen · jederzeit pausierbar. Kein CEFR-Zertifikat.</p><button className="button" disabled={busy} onClick={()=>void store(makePilot(pilotItems,pilotApprovals,practiceIds,'P1-LOCAL',Date.now()))}>Diagnose starten</button></>}
  {s?.phase==='PAUSED'&&<><p>Gespeichert: {s.responses.length} / {s.itemIds.length} beantwortet.</p><button className="button" disabled={busy} onClick={()=>void store(resumePilot(s,Date.now()))}>Diagnose fortsetzen</button></>}
  {item&&<form onSubmit={e=>{e.preventDefault();if(!busy)void store((()=>{const next=answerPilot(s!,item,values,Date.now());return next.responses.length===next.itemIds.length?finishPilot(next,Date.now()):next})())}}>
   <p className="muted">Aufgabe {s!.responses.length+1} von 50 · {item.skillId.split('.')[0]}</p><p className="prompt">{item.prompt}</p>
   {item.slots.map(slot=><div className="field" key={slot.id}><label htmlFor={'diag-'+slot.id}>{slot.label}</label><input id={'diag-'+slot.id} required autoComplete="off" spellCheck={false} value={values[slot.id]??''} onChange={e=>setValues(x=>({...x,[slot.id]:e.target.value}))}/></div>)}
   <div className="buttonrow"><button className="button" type="submit" disabled={busy||item.slots.some(x=>!(values[x.id]??'').trim())}>Antwort speichern</button><button type="button" className="button outline" disabled={busy} onClick={()=>void store(pausePilot(s!,Date.now()))}>Pausieren</button></div>
   <p className="muted small">Keine Lösungen oder Punkte während der Diagnose.</p>
  </form>}
  {completed&&<><h3>Diagnose abgeschlossen</h3>{pilotResults(s!,pilotItems).map(r=><p key={r.domain}>{r.domain}: {r.complete?r.correct.toFixed(0)+' von '+r.required:'Unvollständig'} · Keine CEFR-Stufe</p>)}</>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
