import type {Attempt,Exercise,ReviewCard} from '../../domain/content/types';
import {modes} from '../../domain/content/modes';
export default function Today({attempts,cards,recommended,onStart,onReview,onOpenErrors,onDiagnostic,onProduction,onData}:{attempts:Attempt[];cards:ReviewCard[];recommended:Exercise|undefined;onStart:()=>void;onReview:()=>void;onOpenErrors:()=>void;onDiagnostic:()=>void;onProduction:()=>void;onData:()=>void}){
 const due=cards.filter(c=>c.dueAt<=Date.now()).length;
 const recent=attempts.filter(a=>new Date(a.at).toDateString()===new Date().toDateString());
 const weak=attempts.filter(a=>a.result==='INCORRECT'||a.result==='PARTIAL').length;
 const focus=recommended?.topic??'Noch keine Empfehlung';
 return <section>
  <header className="today-hero"><div className="eyebrow">Heute · Dein Lernplan</div><h1 className="page-title">Heute zählt Präzision.</h1><p className="lead">Ein konzentrierter Schritt zu besserem Deutsch.</p></header>
  <section className="panel today-mission" aria-labelledby="todayMissionTitle">
   <div className="today-mission-header"><div className="kicker" id="todayMissionTitle">DEINE HEUTIGE MISSION</div><div className="today-mission-time">30 Min. · Vorschlag</div></div>
   <div className="mission-step"><span className="mission-symbol" aria-hidden="true">↻</span><span className="mission-text"><strong>Wiederholen</strong><small>Fällige Muster festigen · {due} Wiederholungen</small></span><span className="mission-duration">10 Min.</span></div>
   <div className="mission-step"><span className="mission-symbol" aria-hidden="true">◎</span><span className="mission-text"><strong>Schwachstellen</strong><small>Unsichere Formen gezielt trainieren</small></span><span className="mission-duration">10 Min.</span></div>
   <div className="mission-step"><span className="mission-symbol" aria-hidden="true">◇</span><span className="mission-text"><strong>Neue Muster</strong><small>Wortschatz, Grammatik und Nuancen</small></span><span className="mission-duration">6 Min.</span></div>
   <div className="mission-step"><span className="mission-symbol" aria-hidden="true">✎</span><span className="mission-text"><strong>Anwenden</strong><small>Wissen in einem neuen Kontext nutzen</small></span><span className="mission-duration">4 Min.</span></div>
   <button type="button" className="button" disabled={!recommended} onClick={onStart}>Jetzt trainieren</button>
   <p className="muted small">Aktuell startet eine einzelne adaptive Übung. Der vollständige 30-Minuten-Missionsablauf ist noch nicht implementiert.</p>
  </section>
  <details className="today-explain"><summary>Warum diese Übungen?</summary><p>{due>0?`${due} Wiederholungen sind fällig. `:''}{weak>0?`${weak} bisherige Antworten waren unsicher. `:''}Aktueller Vorschlag: {recommended?modes[recommended.mode].label+' · '+focus:'Noch keine geeignete Aufgabe verfügbar.'} Diese Angaben stammen aus deiner lokalen Übungshistorie.</p></details>
  <section className="today-focus" aria-labelledby="focusHeading"><h2 id="focusHeading">Heute im Fokus</h2>
   <button type="button" className="today-action" disabled={!recommended} onClick={onStart}><span><strong>{focus}</strong><small>{recommended?modes[recommended.mode].label+' · vorgeschlagene Übung':'Keine freigegebenen Trainingsdaten verfügbar'}</small></span><span aria-hidden="true">→</span></button>
   <button type="button" className="today-action" disabled={!due} onClick={onReview}><span><strong>Fällige Wiederholungen</strong><small>{due} Karten aus deinem Fehlerverlauf</small></span><span aria-hidden="true">→</span></button>
   <button type="button" className="today-action" onClick={onOpenErrors}><span><strong>Fehler verstehen</strong><small>{weak} bisherige unsichere Antworten · Originalversuche bleiben erhalten</small></span><span aria-hidden="true">→</span></button>
  </section>
  <div className="today-secondary"><button className="button outline" onClick={onDiagnostic}>Diagnostik A · Status ansehen</button><button className="button outline" onClick={onProduction}>Schreibwerkstatt öffnen</button><button className="button outline" onClick={onData}>Backup und Wiederherstellung</button><span className="muted small">{recent.length} Aufgaben heute · Kein CEFR-Zertifikat</span></div>
 </section>;
}
