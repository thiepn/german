import type {Attempt,ReviewCard,ReviewEvent,Exercise} from '../../domain/content/types';
import {dueReviewCards,recallEvidence} from '../../domain/review/scheduler';
export default function ReviewQueue({cards,events,attempts,byId,onStart}:{cards:ReviewCard[];events:ReviewEvent[];attempts:Attempt[];byId:Map<string,Exercise>;onStart:(id:string)=>void}){
 const now=Date.now();const due=dueReviewCards(cards,now);
 const available=due.filter(c=>{const item=byId.get(c.itemId);return item&&item.version===c.itemVersion&&item.status!=='WITHDRAWN'});
 const blocked=due.length-available.length;const evidence=recallEvidence(attempts,events);
 const planned=cards.filter(c=>c.dueAt>now).sort((a,b)=>a.dueAt-b.dueAt);
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
  {planned.length>0&&<details><summary>Später fällig ({planned.length})</summary><p className="muted small">Nächste Erinnerung: {new Date(planned[0].dueAt).toLocaleDateString('de-DE')}. Die Aufgaben sind nicht vorzeitig als erfolgreich bewertet.</p></details>}
 </section>;
}
