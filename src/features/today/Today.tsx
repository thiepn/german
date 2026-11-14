import type {Attempt,Exercise,ReviewCard,LearnerSettings} from '../../domain/content/types';
import {modes} from '../../domain/content/modes';
import type {Mission} from '../../domain/mission/mission';
import type {ProductionEntry} from '../../domain/production/types';
import type {ArchiveRow} from '../../domain/archive/archive';
import {STUDIO_LINKS,type LearningCallbacks} from '../../domain/journey/catalog';
import {recentWork} from '../../domain/journey/continuation';
import type {DailyLearningCycle} from '../../domain/journey/dailyCycle';
import type {DelayedSummary} from '../../domain/journey/delayedWriting';
import type {LearningLinks,FocusChoice} from '../../domain/journey/evidenceLinks';
type TodayProps=LearningCallbacks & {cycle:DailyLearningCycle;links:LearningLinks;focusChoice:FocusChoice;delayed:DelayedSummary;delayedBlocked:boolean;onDelayedWriting:()=>void;attempts:Attempt[];cards:ReviewCard[];recommended:Exercise|undefined;mission:Mission|null;dailyMinutes:LearnerSettings['dailyMinutes'];productions:ProductionEntry[];onStart:()=>void;onRecommendedExercise:()=>void;onReview:()=>void;onOpenErrors:()=>void;onDiagnostic:()=>void;onProduction:()=>void;onData:()=>void;onContinue:(row:ArchiveRow)=>void;onCurriculum:()=>void;onProgress:()=>void;onArchive:()=>void};
export default function Today(props:TodayProps){
 const {cycle,links,focusChoice,delayed,delayedBlocked,onDelayedWriting,attempts,cards,recommended,mission,dailyMinutes,productions,onStart,onRecommendedExercise,onReview,onOpenErrors,onDiagnostic,onProduction,onData,onContinue,onCurriculum,onProgress,onArchive}=props;
 const due=cards.filter(c=>c.dueAt<=Date.now()).length;
 const weak=links.firstAttemptsWithErrors;
 const focus=recommended?.topic??'Noch keine Empfehlung';
 const visibleMission=mission&&(mission.phase!=='COMPLETE'||new Date(mission.createdAt).toDateString()===new Date().toDateString())?mission:null;
 const doneToday=visibleMission?.phase==='COMPLETE';
 const focusBlocked=!!visibleMission&&!doneToday;
 const missionAttempts=visibleMission?attempts.filter(a=>a.sessionId===visibleMission.id):[];
 const firstCorrect=missionAttempts.filter(a=>a.result==='CORRECT').length;
 const sessionProgress=visibleMission?.index??0;
 const sessionTotal=visibleMission?.steps.length??0;
 const recent=recentWork(productions,3);
 const missionActive=!!mission&&mission.phase!=='COMPLETE';
 const openSource=()=>{if(missionActive)return;if(cycle.source.row)onContinue(cycle.source.row);else props[cycle.source.track.action]()};
 return <section>
  <header className="today-hero"><h1 className="page-title">Heute</h1></header>
  <section className="panel today-mission" aria-labelledby="todayMissionTitle">
   <div className="today-mission-header"><h2 id="todayMissionTitle">Tagesmission</h2><div className="today-mission-time">{visibleMission?visibleMission.minutes+' Min. · '+sessionProgress+'/'+sessionTotal+' Aufgaben':dailyMinutes+' Min. · Ziel'}</div></div>
   {visibleMission&&<div className="mission-completion" role="status">
     <strong>{doneToday?'Mission abgeschlossen':visibleMission.phase==='PAUSED'?'Mission pausiert':'Mission läuft'}</strong>
     <progress aria-label="Fortschritt dieser Mission" value={sessionProgress} max={sessionTotal}/>
     <span className="muted small">{doneToday?`${firstCorrect} von ${sessionTotal} Antworten korrekt · DEMO_ONLY`:`${sessionTotal-sessionProgress} Aufgaben verbleiben.`}</span>
   </div>}
   <button type="button" className="button" disabled={!recommended&&!visibleMission} onClick={onStart}>{doneToday?'Weitere Mission starten':visibleMission?'Mission fortsetzen':'Jetzt trainieren'}</button>
  </section>
  <details className="today-explain"><summary>Warum diese Übungen?</summary><p>{due>0?`${due} Wiederholungen sind fällig. `:''}{weak>0?`${weak} bisherige Antworten waren unsicher. `:''}{recommended?modes[recommended.mode].label+' · '+focus:'Noch keine geeignete Aufgabe verfügbar.'} {focusChoice.reason==='FRESH_CONTEXT'?'Neuer, bislang nicht versuchter Kontext zu '+focusChoice.topic?.topic+' nach '+focusChoice.topic?.distinctFailureItems+' betroffenen Aufgaben.':focusChoice.reason==='DUE_REVIEW'?'Eine tatsächlich fällige Kartenwiederholung hat Vorrang.':'Noch keine spezifische Fehlerverknüpfung für eine Empfehlung.'}</p></details>
  <section className="today-focus" aria-labelledby="focusHeading"><h2 id="focusHeading">Heute im Fokus</h2>
   <button type="button" className="today-action" disabled={!recommended||focusBlocked} onClick={onRecommendedExercise}><span><strong>{focus}</strong><small>{recommended?modes[recommended.mode].label+(focusChoice.reason==='FRESH_CONTEXT'?' · neuer Fehlerkontext':focusChoice.reason==='DUE_REVIEW'?' · fällige Wiederholung':' · gezielt üben'):'Keine Aufgabe verfügbar'}</small></span><span aria-hidden="true">→</span></button>
   {focusBlocked&&<p className="muted small">Während einer offenen Tagesmission zuerst die Mission fortsetzen oder abschließen. So bleibt die laufende Aufgabe erhalten.</p>}
   <button type="button" className="today-action" disabled={!due} onClick={onReview}><span><strong>Fällige Wiederholungen</strong><small>{due} fällig</small></span><span aria-hidden="true">→</span></button>
   <button type="button" className="today-action" onClick={onOpenErrors}><span><strong>Fehler verstehen</strong><small>{weak} unsichere Antworten</small></span><span aria-hidden="true">→</span></button>
  </section>
  <section className="panel daily-cycle" aria-labelledby="dailyCycleTitle">
   <h2 id="dailyCycleTitle">C1–C2-Lernweg</h2>
   {links.recurringTopics>0&&<p className="muted small">{links.recurringTopics} mehrfach unsichere Übungsthemen (mindestens zwei Aufgaben). Die Quellenempfehlung kann den gleichen G-Bereich vertiefen, bewertet aber keine individuellen Schreibfehler.</p>}
   {links.waitingTopics.length>0&&<p className="muted small">Für {links.waitingTopics.length} Themen ist bereits ein anderer Kontext beim ersten Versuch richtig bearbeitet. Ein weiterer neuer Kontext wird frühestens 24 Stunden später empfohlen ({new Date(Math.min(...links.waitingTopics.map(t=>t.nextEligibleAt))).toLocaleString('de-DE')}). Bis dahin sind andere Themen und echte fällige Wiederholungen verfügbar.</p>}
   <p className="muted small">{cycle.completed} von {cycle.total} Schritten mit gespeicherter Lernhandlung. Quelle und Text können über mehrere Tage entstehen; nur die Übung zählt ausdrücklich für heute. Keine Sprachnote.</p>
   <ol className="stack">
    <li><strong>Präzision und Abruf</strong><p className="muted small">{cycle.objectiveToday?cycle.objectiveToday+' Übungsversuche heute dokumentiert'+(cycle.retrievalToday?' · '+cycle.retrievalToday+' verzögerte Abrufe':''):'Heute noch keine Übung dokumentiert.'} {cycle.unresolvedErrors?'Offene Korrekturen: '+cycle.unresolvedErrors+'.':''}</p><div className="buttonrow"><button className="button outline" type="button" onClick={missionActive||!cycle.due?onStart:onReview}>{missionActive?'Offene Übungsfolge weiterführen':cycle.due?'Fälliges abrufen':'Präzision trainieren'}</button>{cycle.unresolvedErrors>0&&<button className="button outline" type="button" onClick={onOpenErrors}>Fehler gezielt klären</button>}</div></li>
    <li><strong>Quellenanalyse · {cycle.source.track.domain}</strong><p className="muted small">{cycle.source.title} · {cycle.source.link?'Wiederholt unsichere objektive Aufgaben zu '+cycle.source.link.topic+' ('+cycle.source.link.distinctFailureItems+' unterschiedliche Aufgaben) · Quellenarbeit im selben G-Bereich, keine identische Fehlerdiagnose · ':''}{cycle.source.row?'Erster Quellenbeleg gespeichert'+(cycle.source.workedToday?' · heute bearbeitet':' · früher begonnen'):'Noch kein Quellenbeleg gespeichert'}.</p><button className="button outline" type="button" disabled={missionActive} onClick={openSource}>Quelle analysieren oder fortsetzen</button></li>
    <li><strong>Eigenständiger Transfertext</strong><p className="muted small">{cycle.source.transferred?'Eigener Text gespeichert.':'Nach den Quellenbelegen einen vollständigen eigenen Text verfassen. Die Quellstudie führt durch die erforderlichen Analysen.'}</p><button className="button outline" type="button" disabled={missionActive||!cycle.source.row} onClick={openSource}>Eigenen Text verfassen oder öffnen</button></li>
    <li><strong>Quellengebunden überarbeiten</strong><p className="muted small">{cycle.source.rewritten?'Eine nachfolgende Textüberarbeitung gespeichert.':'Ausgehend vom eigenen Text eine begründete inhaltliche oder sprachliche Revision verfassen.'}</p><button className="button outline" type="button" disabled={missionActive||!cycle.source.transferred} onClick={openSource}>Text überarbeiten oder erneut prüfen</button></li>
   </ol>
   {missionActive&&<p className="muted small">Eine Tagesmission ist noch offen. Zuerst fortsetzen oder abschließen, damit ihre gespeicherte Aufgabe nicht verdrängt wird.</p>}
   <div className="buttonrow"><button className="button text" type="button" onClick={onProgress}>Lernhandlungen in Fortschritt ansehen</button><button className="button text" type="button" onClick={onCurriculum}>Anderen Lernbereich wählen</button></div>
   <p className="muted small">G10 bleibt eine freiwillige Übung mit eigener Audiodatei. Kein vorgeblicher Hörtest und keine automatische C1/C2-Einstufung.</p>
  </section>
  <section className="panel delayed-summary" aria-label="Späterer Textabruf">
   <h2>Späterer Textabruf</h2>
   <p className="muted small">{delayed.finished} abgeschlossen · {delayed.pending} Quellenabgleiche offen · {delayed.due} weitere Abrufe fällig. Wiederholte Textarbeit nach 1, 7 und 21 Tagen, ohne automatische Benotung.</p>
   {delayed.selected?<><p><strong>{delayed.selected.source.title}</strong> · {delayed.selected.row.scope} · {delayed.selected.pendingRepair?'Quellenabgleich ausstehend':'Abruf ohne Vorlage fällig'}</p>
    <button type="button" className="button" disabled={delayedBlocked} onClick={onDelayedWriting}>{delayed.selected.pendingRepair?'Gespeicherten Abruf korrigieren':'Jetzt ungestützt abrufen'}</button></>:<p className="muted small">Noch kein späterer Textabruf fällig. {delayed.upcomingAt?'Nächster Zeitpunkt: '+new Date(delayed.upcomingAt).toLocaleDateString('de-DE')+'.':'Zunächst einen eigenen vollständigen Transfertext schreiben.'}</p>}
   {delayedBlocked&&<p className="muted small">Zuerst die offene Tagesmission fortsetzen oder abschließen.</p>}
  </section>
  {recent.length>0&&<section className="panel today-continuation" aria-labelledby="todayContinueTitle"><h2 id="todayContinueTitle">Zuletzt bearbeitet</h2><div className="today-focus">{recent.map(row=><button type="button" className="today-action" key={row.entry.id} aria-label={'Fortsetzen: '+row.title} onClick={()=>onContinue(row)}><span><strong>{row.title}</strong><small>{row.description} · {row.revisions?row.revisions+' weitere Fassungen':'Erstfassung'}</small></span><span aria-hidden="true">→</span></button>)}</div><button className="button outline" type="button" onClick={onArchive}>Alle Schreibspuren öffnen</button></section>}
  <div className="today-secondary"><button className="button outline" onClick={onDiagnostic}>Diagnostik A · Status ansehen</button><button className="button outline" onClick={onProduction}>Schreibwerkstatt öffnen</button>{STUDIO_LINKS.map(link=><button className="button outline" key={link.action} onClick={props[link.action]}>{link.today}</button>)}<button className="button outline" onClick={onCurriculum}>Alle Lernbereiche öffnen</button><button className="button outline" onClick={onData}>Backup und Wiederherstellung</button></div>
 </section>;
}
