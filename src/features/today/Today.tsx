import type {Attempt,Exercise,ReviewCard,LearnerSettings} from '../../domain/content/types';
import {modes} from '../../domain/content/modes';
import type {Mission} from '../../domain/mission/mission';
import type {ProductionEntry} from '../../domain/production/types';
import type {ArchiveRow} from '../../domain/archive/archive';
import {STUDIO_LINKS,type LearningCallbacks} from '../../domain/journey/catalog';
import {recentWork} from '../../domain/journey/continuation';
type TodayProps=LearningCallbacks & {attempts:Attempt[];cards:ReviewCard[];recommended:Exercise|undefined;mission:Mission|null;dailyMinutes:LearnerSettings['dailyMinutes'];productions:ProductionEntry[];onStart:()=>void;onReview:()=>void;onOpenErrors:()=>void;onDiagnostic:()=>void;onProduction:()=>void;onData:()=>void;onContinue:(row:ArchiveRow)=>void;onCurriculum:()=>void;onArchive:()=>void};
export default function Today(props:TodayProps){
 const {attempts,cards,recommended,mission,dailyMinutes,productions,onStart,onReview,onOpenErrors,onDiagnostic,onProduction,onData,onContinue,onCurriculum,onArchive}=props;
 const due=cards.filter(c=>c.dueAt<=Date.now()).length;
 const weak=attempts.filter(a=>a.result==='INCORRECT'||a.result==='PARTIAL').length;
 const focus=recommended?.topic??'Noch keine Empfehlung';
 const visibleMission=mission&&(mission.phase!=='COMPLETE'||new Date(mission.createdAt).toDateString()===new Date().toDateString())?mission:null;
 const doneToday=visibleMission?.phase==='COMPLETE';
 const missionAttempts=visibleMission?attempts.filter(a=>a.sessionId===visibleMission.id):[];
 const firstCorrect=missionAttempts.filter(a=>a.result==='CORRECT').length;
 const sessionProgress=visibleMission?.index??0;
 const sessionTotal=visibleMission?.steps.length??0;
 const recent=recentWork(productions,3);
 return <section>
  <header className="today-hero"><h1 className="page-title">Heute</h1></header>
  <section className="panel today-mission" aria-labelledby="todayMissionTitle">
   <div className="today-mission-header"><h2 id="todayMissionTitle">Tagesmission</h2><div className="today-mission-time">{visibleMission?visibleMission.minutes+' Min. · '+sessionProgress+'/'+sessionTotal+' Aufgaben':dailyMinutes+' Min. · Ziel'}</div></div>
   {visibleMission&&<div className="mission-completion" role="status">
     <strong>{doneToday?'Mission abgeschlossen':visibleMission.phase==='PAUSED'?'Mission pausiert':'Mission läuft'}</strong>
     <progress aria-label="Fortschritt dieser Mission" value={sessionProgress} max={sessionTotal}/>
     <span className="muted small">{doneToday?`${firstCorrect} von ${sessionTotal} Erstversuchen korrekt · DEMO_ONLY`:`${sessionTotal-sessionProgress} Aufgaben verbleiben.`}</span>
   </div>}
   <button type="button" className="button" disabled={!recommended&&!visibleMission} onClick={onStart}>{doneToday?'Weitere Mission starten':visibleMission?'Mission fortsetzen':'Jetzt trainieren'}</button>
  </section>
  <details className="today-explain"><summary>Warum diese Übungen?</summary><p>{due>0?`${due} Wiederholungen sind fällig. `:''}{weak>0?`${weak} bisherige Antworten waren unsicher. `:''}{recommended?modes[recommended.mode].label+' · '+focus:'Noch keine geeignete Aufgabe verfügbar.'}</p></details>
  <section className="today-focus" aria-labelledby="focusHeading"><h2 id="focusHeading">Heute im Fokus</h2>
   <button type="button" className="today-action" disabled={!recommended} onClick={onStart}><span><strong>{focus}</strong><small>{recommended?modes[recommended.mode].label:'Keine Aufgabe verfügbar'}</small></span><span aria-hidden="true">→</span></button>
   <button type="button" className="today-action" disabled={!due} onClick={onReview}><span><strong>Fällige Wiederholungen</strong><small>{due} fällig</small></span><span aria-hidden="true">→</span></button>
   <button type="button" className="today-action" onClick={onOpenErrors}><span><strong>Fehler verstehen</strong><small>{weak} unsichere Antworten</small></span><span aria-hidden="true">→</span></button>
  </section>
  {recent.length>0&&<section className="panel today-continuation" aria-labelledby="todayContinueTitle"><h2 id="todayContinueTitle">Zuletzt bearbeitet</h2><div className="today-focus">{recent.map(row=><button type="button" className="today-action" key={row.entry.id} aria-label={'Fortsetzen: '+row.title} onClick={()=>onContinue(row)}><span><strong>{row.title}</strong><small>{row.description} · {row.revisions?row.revisions+' weitere Fassungen':'Erstfassung'}</small></span><span aria-hidden="true">→</span></button>)}</div><button className="button outline" type="button" onClick={onArchive}>Alle Schreibspuren öffnen</button></section>}
  <div className="today-secondary"><button className="button outline" onClick={onDiagnostic}>Diagnostik A · Status ansehen</button><button className="button outline" onClick={onProduction}>Schreibwerkstatt öffnen</button>{STUDIO_LINKS.map(link=><button className="button outline" key={link.action} onClick={props[link.action]}>{link.today}</button>)}<button className="button outline" onClick={onCurriculum}>Alle Lernbereiche öffnen</button><button className="button outline" onClick={onData}>Backup und Wiederherstellung</button></div>
 </section>;
}
