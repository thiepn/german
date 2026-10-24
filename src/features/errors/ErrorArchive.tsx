import {useState} from 'react';
import type {Attempt,Exercise} from '../../domain/content/types';
import {buildErrorClusters,type ErrorClusterStatus} from '../../domain/errors/errorProjection';
import {availableModes,modes} from '../../domain/content/modes';

const statusLabel:Record<ErrorClusterStatus,string>={
 OFFEN:'Noch offen',ERNEUT_UNSICHER:'Weiter beobachten',WIEDER_ANGEWENDET:'Erneut angewendet'
};
export default function ErrorArchive({attempts,byId,onRetry}:{attempts:Attempt[];byId:Map<string,Exercise>;onRetry:(id:string)=>void}){
 const [mode,setMode]=useState('all'),[filter,setFilter]=useState('all'),[expanded,setExpanded]=useState<string|null>(null);
 const all=buildErrorClusters(attempts,byId);
 const visible=all.filter(x=>(mode==='all'||x.mode===mode)&&(filter==='all'||filter===x.status));
 return <section className="error-archive">
  <h1 className="page-title">Fehlerarchiv</h1>
  
  <div className="error-summary" role="status">{all.length} Themen mit unsicheren Erstversuchen · {all.filter(x=>x.freshContextId).length} mit neuen Übungskontexten</div>
  <div className="error-filters">
   <div className="field"><label htmlFor="errorMode">Übungsmodus</label><select id="errorMode" value={mode} onChange={e=>setMode(e.target.value)}><option value="all">Alle Modi</option>{availableModes.map(m=><option key={m} value={m}>{modes[m].label}</option>)}</select></div>
   <div className="field"><label htmlFor="errorStatus">Verlauf</label><select id="errorStatus" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Alle Verläufe</option><option value="OFFEN">Noch offen</option><option value="ERNEUT_UNSICHER">Weiter beobachten</option><option value="WIEDER_ANGEWENDET">In neuen Aufgaben angewendet</option></select></div>
  </div>
  {!visible.length&&<div className="panel" role="status">{all.length?'Keine Themen passen zu diesen Filtern.':'Noch keine unsicheren Erstversuche vorhanden.'}</div>}
  <div className="stack">
   {visible.map(cluster=>{
    const open=expanded===cluster.key;
    return <article className="panel error-cluster" key={cluster.key}>
     <div className="kicker">{cluster.skillId} · {modes[cluster.mode].label}</div>
     <h2>{cluster.topic}</h2>
     <p className="muted small">{cluster.failures.length} unsichere Erstversuche in {cluster.distinctFailureItems} Aufgaben · zuletzt {new Date(cluster.lastFailureAt).toLocaleDateString('de-DE')}</p>
     <p className="small"><strong>Verlauf:</strong> {statusLabel[cluster.status]}. {cluster.laterCorrect.length} spätere korrekte Antworten in anderen Aufgaben.</p>
     <div className="buttonrow">
      {cluster.freshContextId&&<button type="button" className="button" onClick={()=>onRetry(cluster.freshContextId!)}>Neuen Kontext üben</button>}
      {cluster.repeatItemId&&<button type="button" className="button outline" onClick={()=>onRetry(cluster.repeatItemId!)}>Originalaufgabe erneut üben</button>}
      <button type="button" className="button outline" aria-expanded={open} onClick={()=>setExpanded(open?null:cluster.key)}>{open?'Details schließen':'Originalantworten & Regeln'}</button>
     </div>
     {!cluster.freshContextId&&<p className="small muted">{cluster.sourceCurrent?'Kein unversuchter Kontext zu genau diesem Thema vorhanden.':'Frühere Aufgabenfassung: ohne unveränderte Regelversion kein neuer Kontext verfügbar.'}</p>}
     {open&&<div className="error-history"><h3>Unveränderte erste Antworten</h3>{cluster.failures.map(a=>{
      const item=byId.get(a.itemId),matching=item&&item.version===a.itemVersion;
      return <div className="listitem" key={a.id}>
       <div className="status">{new Date(a.at).toLocaleString('de-DE')} · {a.itemId} · v{a.itemVersion}</div>
       <p>{matching?item.prompt:'Aufgabe aus früherer oder nicht verfügbarer Version'}</p>
       <p><strong>Deine Antwort:</strong> {matching?item.slots.map(s=>a.slots[s.id]||'—').join(' · '):Object.values(a.slots).join(' · ')||'—'}</p>
       {matching&&<details><summary>Historische Musterlösung und Erklärung ansehen</summary><p><strong>Autorenentwurf:</strong> {item.variants.map(v=>item.slots.map(s=>v.slots[s.id]).join(' · ')).join(' / ')}</p><p>{item.explanation}</p></details>}
      </div>;
     })}</div>}
    </article>;
   })}
  </div>
 </section>;
}
