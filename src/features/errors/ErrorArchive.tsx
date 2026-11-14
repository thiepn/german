import {useState} from 'react';
import type {Attempt,Exercise} from '../../domain/content/types';
import {buildErrorClusters,independentTransferState,type ErrorClusterStatus} from '../../domain/errors/errorProjection';
import {availableModes,modes} from '../../domain/content/modes';
import type {ReviewCard} from '../../domain/content/types';
import {failedDelayedCases} from '../../domain/errors/delayedFailure';
import FailureReconstruction from './FailureReconstruction';
import {exhaustedContrastPlans} from '../../domain/errors/exhaustedContrast';
import ExhaustedContrast from './ExhaustedContrast';

const statusLabel:Record<ErrorClusterStatus,string>={
 OFFEN:'Noch offen',ERNEUT_UNSICHER:'Weiter beobachten',WIEDER_ANGEWENDET:'Erneut angewendet'
};
export default function ErrorArchive({attempts,byId,cards,onRetry,onRecoveryPractice,onExhaustedDue,onExhaustedSource,preferredFailedAttemptId}:{
 attempts:Attempt[];byId:Map<string,Exercise>;cards:ReviewCard[];
 onRetry:(id:string)=>void;onRecoveryPractice:(failedAttemptId:string,kind:'DUE'|'FRESH')=>void;
 onExhaustedDue:(key:string,id:string)=>void;onExhaustedSource:(skillId:string)=>void;
 preferredFailedAttemptId?:string|null;
}){
 const [mode,setMode]=useState('all'),[filter,setFilter]=useState('all'),[expanded,setExpanded]=useState<string|null>(null);
 const all=buildErrorClusters(attempts,byId);
 const cases=failedDelayedCases(Date.now(),attempts,[...byId.values()]);
 const exhausted=exhaustedContrastPlans(Date.now(),attempts,[...byId.values()],cards);
 const [openExhausted,setOpenExhausted]=useState<string|null>(null);
 const [openedCase,setOpenedCase]=useState<string|null>(()=>cases.find(c=>c.delayedFailure.attempt.id===preferredFailedAttemptId)?.key??null);
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
    const transfer=independentTransferState(cluster,Date.now());
    const caseData=cases.find(c=>c.key===cluster.key)??null;
    const isCaseOpen=caseData!==null&&openedCase===cluster.key;
    const existingContrast=exhausted.find(p=>p.key===cluster.key)??null;
    const isContrastOpen=existingContrast!==null&&openExhausted===cluster.key;
    const hasDue=!!caseData&&cards.some(c=>c.itemId===caseData.delayedFailure.item.id&&c.itemVersion===caseData.delayedFailure.item.version&&c.dueAt<=Date.now());
    return <article className="panel error-cluster" key={cluster.key}>
     <div className="kicker">{cluster.skillId} · {modes[cluster.mode].label}</div>
     <h2>{cluster.topic}</h2>
     <p className="muted small">{cluster.failures.length} unsichere Erstversuche in {cluster.distinctFailureItems} Aufgaben · zuletzt {new Date(cluster.lastFailureAt).toLocaleDateString('de-DE')}</p>
     <p className="small"><strong>Verlauf:</strong> {statusLabel[cluster.status]}. {cluster.laterCorrect.length} spätere korrekte unabhängige Erstantworten in anderen Aufgaben; {transfer.spacedCorrect} davon im Abstand von mindestens 24 Stunden dokumentiert.</p>
     {transfer.phase==='WAITING'&&<p className="small muted">Ein anderer Kontext wurde bereits ungestützt richtig beantwortet. Den nächsten neuen Kontext frühestens ab {new Date(transfer.nextEligibleAt!).toLocaleString('de-DE')} versuchen. Fällige Wiederholungskarten sind davon unabhängig.</p>}
     {transfer.phase==='OBSERVED'&&<p className="small muted">Mindestens zwei neue Kontexte mit richtigen Erstversuchen im zeitlichen Abstand dokumentiert – keine Garantie für nachhaltige Beherrschung.</p>}
     <div className="buttonrow">
      {existingContrast&&<button type="button" className="button" aria-expanded={isContrastOpen} onClick={()=>{setExpanded(null);setOpenedCase(null);setOpenExhausted(isContrastOpen?null:cluster.key)}}>{isContrastOpen?'Kontrastübung verbergen':'Bekannte Aufgaben kontrastieren'}</button>}
      {caseData&&<button type="button" className="button" aria-expanded={isCaseOpen} onClick={()=>{setExpanded(null);setOpenedCase(isCaseOpen?null:cluster.key)}}>{isCaseOpen?'Rekonstruktion verbergen':'Verzögerten Fehler rekonstruieren'}</button>}
      {cluster.freshContextId&&<button type="button" className="button" disabled={transfer.phase==='WAITING'} onClick={()=>onRetry(cluster.freshContextId!)}>Neuen Kontext üben</button>}
      {cluster.repeatItemId&&<button type="button" className="button outline" onClick={()=>onRetry(cluster.repeatItemId!)}>Originalaufgabe erneut üben</button>}
      <button type="button" className="button outline" aria-expanded={open} onClick={()=>setExpanded(open?null:cluster.key)}>{open?'Details schließen':'Originalantworten & Regeln'}</button>
     </div>
     {existingContrast&&isContrastOpen&&<ExhaustedContrast key={existingContrast.key} plan={existingContrast}
       onDue={id=>onExhaustedDue(existingContrast.key,id)} onSource={onExhaustedSource} onClose={()=>setOpenExhausted(null)}/>}
     {caseData&&isCaseOpen&&<FailureReconstruction key={caseData.delayedFailure.attempt.id} caseData={caseData}
       hasDue={hasDue} onPractice={kind=>onRecoveryPractice(caseData.delayedFailure.attempt.id,kind)} onClose={()=>setOpenedCase(null)}/>}
     {!cluster.freshContextId&&<p className="small muted">{cluster.sourceCurrent?'Kein unversuchter Kontext zu genau diesem Thema vorhanden. '+(existingContrast?'Die bekannten Aufgaben können ohne neue Transferbehauptung verglichen werden.':'Ohne passende validierte Antwortkontraste keine neue unabhängige Aufgabenprüfung.'):'Frühere Aufgabenfassung: ohne unveränderte Regelversion kein neuer Kontext verfügbar.'}</p>}
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
