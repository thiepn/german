import type {Attempt,ReviewCard,ReviewEvent,Exercise} from '../../domain/content/types';
import {dueReviewCards,recallEvidence} from '../../domain/review/scheduler';
import {reviewTransferChoice,reviewTransferEvidence} from '../../domain/review/transfer';
export default function ReviewQueue({cards,events,attempts,byId,onStart,onTransfer}:{cards:ReviewCard[];events:ReviewEvent[];attempts:Attempt[];byId:Map<string,Exercise>;onStart:(id:string)=>void;onTransfer:(event:ReviewEvent,id:string)=>void}){
 const now=Date.now();const due=dueReviewCards(cards,now);
 const available=due.filter(c=>{const item=byId.get(c.itemId);return item&&item.version===c.itemVersion&&item.status!=='WITHDRAWN'});
 const blocked=due.length-available.length;const evidence=recallEvidence(attempts,events);
 const planned=cards.filter(c=>c.dueAt>now).sort((a,b)=>a.dueAt-b.dueAt);
 const content=[...byId.values()];const transfer=reviewTransferEvidence(events,content,attempts);
 const recent=[...events].sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id)).slice(0,8);
 return <section><div className="eyebrow">Abrufen statt nachlesen</div><h1 className="page-title">Wiederholen</h1>
  <p className="lead">Heute fällig: {available.length} abrufbare Karten. Die Abstände berücksichtigen Schwierigkeit und den tatsächlichen Zeitabstand zur letzten Wiederholung. Das ist noch kein validiertes FSRS-Modell.</p>
  <div className="panel"><h2>Verzögerter Abruf · beobachtete Evidenz</h2>
   <p>{evidence.delayed} Wiederholungen mindestens einen Tag nach einem früheren Versuch · {evidence.correct} davon beim ersten Abruf korrekt.</p>
   <p className="muted small">{evidence.minimumReached?`In dieser begrenzten Stichprobe: ${Math.round(evidence.correct/evidence.delayed*100)} % korrekt. Keine CEFR-Einstufung oder zukünftige Behaltensprognose.`:'Für eine vergleichende Quote fehlen noch mehrere unterschiedliche Aufgaben und Übungstage.'}</p>
  </div>
  {blocked>0&&<p role="status" className="muted small">{blocked} fällige Karten gehören zu einer entfernten, überarbeiteten oder zurückgezogenen Aufgabe. Sie bleiben in der Lernhistorie, sind aber nicht automatisch neu bewertbar.</p>}
  {!available.length&&<div className="panel">Für heute steht keine freigegebene Wiederholung an. {planned.length} weitere Karten sind für später vorgesehen.</div>}
  {available.map(c=><article className="listitem" key={c.id}>
   <div className="kicker">{byId.get(c.itemId)?.skillId}</div><p>{byId.get(c.itemId)?.prompt}</p>
   <p className="muted small">{c.lapses>0?`${c.lapses} bisherige Rückfälle · `:''}Fällig seit {new Date(c.dueAt).toLocaleDateString('de-DE')}. Originale Antworten und frühere Algorithmen bleiben erhalten.</p>
   <button className="button outline" onClick={()=>onStart(c.itemId)}>Antwort abrufen</button>
  </article>)}
  {recent.length>0&&<section className="panel" style={{marginTop:22}} aria-labelledby="reviewTransferHeading">
   <h2 id="reviewTransferHeading">Nach der Wiederholung anwenden</h2>
   <p className="muted small">{transfer.finished} dokumentierte neue Anwendungen; {transfer.correct} beim ersten Versuch korrekt. Keine zusätzliche Bewertung der ursprünglichen Wiederholung.</p>
   {recent.map(event=>{
    const choice=reviewTransferChoice(event,content,attempts);
    const source=byId.get(event.itemId);
    return <article className="listitem" key={event.id}>
     <div className="kicker">{source?.skillId??event.itemId} · {new Date(event.at).toLocaleDateString('de-DE')}</div>
     <strong>{source?.topic??'Ältere Aufgabe'}</strong>
     <p className="muted small">{choice.status==='DONE'?'Eine neue Anwendung wurde mit Originalantwort dokumentiert.':choice.status==='AVAILABLE'?'Eine neue noch unbeantwortete Aufgabe desselben Kompetenzbereichs ist verfügbar.':choice.status==='OLD_SOURCE'?'Die Aufgabenfassung hat sich geändert oder wurde zurückgezogen.':choice.status==='NO_NEW_CONTEXT'?'Kein neuer, passender Kontext vorhanden.':'Originalversuch nicht verfügbar.'}</p>
     {choice.status==='AVAILABLE'&&<button type="button" className="button outline" onClick={()=>onTransfer(event,choice.itemId)}>In neuem Kontext anwenden</button>}
    </article>;
   })}
  </section>}
  {planned.length>0&&<details><summary>Später fällig ({planned.length})</summary><p className="muted small">Nächste Erinnerung: {new Date(planned[0].dueAt).toLocaleDateString('de-DE')}. Die Aufgaben sind nicht vorzeitig als erfolgreich bewertet.</p></details>}
 </section>;
}
