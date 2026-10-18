import type {Attempt,Exercise,ReviewCard,LearnerSettings} from '../../domain/content/types';
import {modes} from '../../domain/content/modes';
import type {Mission} from '../../domain/mission/mission';
export default function Today({attempts,cards,recommended,onStart,onReview,onOpenErrors,onDiagnostic,onProduction,onData,onReading,onPragmatics,mission,dailyMinutes}:{attempts:Attempt[];cards:ReviewCard[];recommended:Exercise|undefined;mission:Mission|null;dailyMinutes:LearnerSettings['dailyMinutes'];onStart:()=>void;onReview:()=>void;onOpenErrors:()=>void;onDiagnostic:()=>void;onProduction:()=>void;onData:()=>void;onReading:()=>void;onPragmatics:()=>void}){
 const due=cards.filter(c=>c.dueAt<=Date.now()).length;
 const recent=attempts.filter(a=>new Date(a.at).toDateString()===new Date().toDateString());
 const weak=attempts.filter(a=>a.result==='INCORRECT'||a.result==='PARTIAL').length;
 const focus=recommended?.topic??'Noch keine Empfehlung';
 const visibleMission=mission&&(mission.phase!=='COMPLETE'||new Date(mission.createdAt).toDateString()===new Date().toDateString())?mission:null;
 const doneToday=visibleMission?.phase==='COMPLETE';
 const missionAttempts=visibleMission?attempts.filter(a=>a.sessionId===visibleMission.id):[];
 const firstCorrect=missionAttempts.filter(a=>a.result==='CORRECT').length;
 const sessionProgress=visibleMission?.index??0;
 const sessionTotal=visibleMission?.steps.length??0;
 return <section>
  <header className="today-hero"><div className="eyebrow">Heute · Dein Lernplan</div><h1 className="page-title">Heute zählt Präzision.</h1><p className="lead">Ein konzentrierter Schritt zu besserem Deutsch.</p></header>
  <section className="panel today-mission" aria-labelledby="todayMissionTitle">
   <div className="today-mission-header"><div className="kicker" id="todayMissionTitle">DEINE HEUTIGE MISSION</div><div className="today-mission-time">{visibleMission?visibleMission.minutes+' Min. · '+sessionProgress+'/'+sessionTotal+' Aufgaben':dailyMinutes+' Min. · Ziel'}</div></div>
   {visibleMission&&<div className="mission-completion" role="status">
     <strong>{doneToday?'Mission abgeschlossen':visibleMission.phase==='PAUSED'?'Mission pausiert':'Mission läuft'}</strong>
     <progress aria-label="Fortschritt dieser Mission" value={sessionProgress} max={sessionTotal}/>
     <span className="muted small">{doneToday?`${firstCorrect} von ${sessionTotal} Erstversuchen korrekt · DEMO_ONLY`:`${sessionTotal-sessionProgress} Aufgaben verbleiben. Die ursprünglichen Antworten bleiben gespeichert.`}</span>
   </div>}
   <div className="mission-step"><span className="mission-symbol" aria-hidden="true">↻</span><span className="mission-text"><strong>Wiederholen</strong><small>Fällige Muster festigen · {due} Wiederholungen</small></span><span className="mission-duration">Priorität</span></div>
   <div className="mission-step"><span className="mission-symbol" aria-hidden="true">◎</span><span className="mission-text"><strong>Schwachstellen</strong><small>Unsichere Formen gezielt trainieren</small></span><span className="mission-duration">Gezielt</span></div>
   <div className="mission-step"><span className="mission-symbol" aria-hidden="true">◇</span><span className="mission-text"><strong>Neue Muster</strong><small>Wortschatz, Grammatik und Nuancen</small></span><span className="mission-duration">Neues</span></div>
   <div className="mission-step"><span className="mission-symbol" aria-hidden="true">✎</span><span className="mission-text"><strong>Anwenden</strong><small>Wissen in einem neuen Kontext nutzen</small></span><span className="mission-duration">Transfer</span></div>
   <button type="button" className="button" disabled={!recommended&&!visibleMission} onClick={onStart}>{doneToday?'Weitere Mission starten':visibleMission?'Mission fortsetzen':'Jetzt trainieren'}</button>
   <p className="muted small">{visibleMission?'Fixierte Aufgabenfolge und gespeicherte Erstversuche.':'Die Anzahl der Aufgaben richtet sich nach deiner eingestellten Lernzeit.'} Minuten sind eine Präferenz, keine gemessene Bearbeitungszeit.</p>
  </section>
  <details className="today-explain"><summary>Warum diese Übungen?</summary><p>{due>0?`${due} Wiederholungen sind fällig. `:''}{weak>0?`${weak} bisherige Antworten waren unsicher. `:''}Aktueller Vorschlag: {recommended?modes[recommended.mode].label+' · '+focus:'Noch keine geeignete Aufgabe verfügbar.'} Diese Angaben stammen aus deiner lokalen Übungshistorie.</p></details>
  <section className="today-focus" aria-labelledby="focusHeading"><h2 id="focusHeading">Heute im Fokus</h2>
   <button type="button" className="today-action" disabled={!recommended} onClick={onStart}><span><strong>{focus}</strong><small>{recommended?modes[recommended.mode].label+' · vorgeschlagene Übung':'Keine freigegebenen Trainingsdaten verfügbar'}</small></span><span aria-hidden="true">→</span></button>
   <button type="button" className="today-action" disabled={!due} onClick={onReview}><span><strong>Fällige Wiederholungen</strong><small>{due} Karten aus deinem Fehlerverlauf</small></span><span aria-hidden="true">→</span></button>
   <button type="button" className="today-action" onClick={onOpenErrors}><span><strong>Fehler verstehen</strong><small>{weak} bisherige unsichere Antworten · Originalversuche bleiben erhalten</small></span><span aria-hidden="true">→</span></button>
  </section>
  <div className="today-secondary"><button className="button outline" onClick={onDiagnostic}>Diagnostik A · Status ansehen</button><button className="button outline" onClick={onProduction}>Schreibwerkstatt öffnen</button><button className="button outline" onClick={onReading}>Lesestudien öffnen</button><button className="button outline" onClick={onPragmatics}>Pragmatische Situationen</button><button className="button outline" onClick={onData}>Backup und Wiederherstellung</button><span className="muted small">{recent.length} Aufgaben heute · Kein CEFR-Zertifikat</span></div>
 </section>;
}
