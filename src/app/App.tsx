import {useEffect,useRef,useState} from 'react';
import {allItems,itemById,itemsForMode} from '../domain/content/registry';
import {availableModes,modes} from '../domain/content/modes';
import DiagnosticPanel from '../features/diagnostic/DiagnosticPanel';
import type {Attempt,Draft,Exercise,LearnerSettings,Mode,ReviewCard,ReviewEvent} from '../domain/content/types';
import {gradeAnswer,type GradeResult} from '../domain/grading/gradeAnswer';
import {chooseSession} from '../domain/recommendation/chooseSession';
import {planMission,missionStep,type Mission} from '../domain/mission/mission';
import {newCard,nextReview,RECALL_VERSION,dueReviewCards} from '../domain/review/scheduler';
import {reviewTransferChoice} from '../domain/review/transfer';
import {loadSnapshot,saveAttemptOnce,saveReviewedAttemptOnce,saveDraft,saveReview,saveSettings,loadLatestMission,startOrResumeMission,pauseMissionIfCurrent,completeMissionStep} from '../persistence/schema';
import {offlineState,type OfflineState} from '../offline/packageManager';
import {MobileShell,type Tab} from './layouts/MobileShell';
import Onboarding from '../features/onboarding/Onboarding';
import Today from '../features/today/Today';
import Curriculum from '../features/curriculum/Curriculum';
import PracticeRunner from '../features/practice/PracticeRunner';
import ErrorArchive from '../features/errors/ErrorArchive';
import ReviewQueue from '../features/review/ReviewQueue';
import Progress from '../features/progress/Progress';
import DataManagement from '../features/data/DataManagement';
import ProductionStudio from '../features/production/ProductionStudio';
import ReadingStudio from '../features/reading/ReadingStudio';
import PragmaticsStudio from '../features/pragmatics/PragmaticsStudio';
import ListeningStudio from '../features/listening/ListeningStudio';
import MediationStudio from '../features/mediation/MediationStudio';
import InteractionStudio from '../features/interaction/InteractionStudio';
import EditorialStudio from '../features/editorial/EditorialStudio';
import WritingArchive from '../features/archive/WritingArchive';
import type {ArchiveKind} from '../domain/archive/archive';
import {loadProductionEntries} from '../persistence/schema';
import type {ProductionEntry} from '../domain/production/types';

const labels:Record<Mode,string>=Object.fromEntries(availableModes.map(m=>[m,modes[m].label])) as Record<Mode,string>;
export default function App(){
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [settings,setSettings]=useState<LearnerSettings|null>(null);
 const [attempts,setAttempts]=useState<Attempt[]>([]);
 const [cards,setCards]=useState<ReviewCard[]>([]);
 const [reviews,setReviews]=useState<ReviewEvent[]>([]);
 const [tab,setTab]=useState<Tab>('Heute');
 const [reviewPage,setReviewPage]=useState(false);
 const [showData,setShowData]=useState(false);
 const [showProduction,setShowProduction]=useState(false);
 const [showReading,setShowReading]=useState(false);
 const [showPragmatics,setShowPragmatics]=useState(false);
 const [showListening,setShowListening]=useState(false);
 const [showMediation,setShowMediation]=useState(false);
 const [showInteraction,setShowInteraction]=useState(false);
 const [showEditorial,setShowEditorial]=useState(false);
 const [showArchive,setShowArchive]=useState(false);
 const [archiveSource,setArchiveSource]=useState<string|null>(null);
 const [productions,setProductions]=useState<ProductionEntry[]>([]);
 const [showDiagnostic,setShowDiagnostic]=useState(false);
 const [mode,setMode]=useState<Mode>('M01');
 const [item,setItem]=useState<Exercise|null>(null);
 const [sessionId,setSessionId]=useState('');
 const [values,setValues]=useState<Record<string,string>>({});
 const [feedback,setFeedback]=useState<GradeResult|null>(null);
 const [reviewing,setReviewing]=useState(false);
 const [busy,setBusy]=useState(false);
 const [offline,setOffline]=useState<OfflineState>('UNINSTALLED');
 const [mission,setMission]=useState<Mission|null>(null);
 const busyRef=useRef(false);
 const refresh=async()=>{const [s,p,m]=await Promise.all([loadSnapshot(),loadProductionEntries(),loadLatestMission()]);setMission(m);setAttempts(s.attempts);setCards(s.cards);setReviews(s.reviewEvents);setSettings(s.settings);setProductions(p);};
 useEffect(()=>{let alive=true;loadSnapshot().then(s=>{if(!alive)return;setAttempts(s.attempts);setCards(s.cards);setReviews(s.reviewEvents);setSettings(s.settings);if(s.draft&&itemById.has(s.draft.itemId)){setSessionId(s.draft.sessionId);setMode(s.draft.mode);setItem(itemById.get(s.draft.itemId)!);setValues(s.draft.slots);setTab('Trainieren');}}).catch(e=>{if(alive)setError('Lokales Speichern ist nicht verfügbar: '+String(e))}).finally(()=>{if(alive)setLoading(false)});
 void loadProductionEntries().then(p=>{if(alive)setProductions(p)}).catch(e=>{if(alive)setError(String(e))});
 void loadLatestMission().then(async m=>{
  if(!alive)return;setMission(m);
  if(m&&m.phase==='IN_PROGRESS'){
   const active=missionStep(m),target=active&&itemById.get(active.itemId);
   if(!target||target.version!==active?.itemVersion)return;
   const saved=await loadSnapshot();
   if(!alive)return;
   const prior=saved.attempts.find(a=>a.sessionId===m.id&&a.itemId===target.id);
   if(prior){
    setSessionId(m.id);setItem(target);setMode(target.mode);setValues(prior.slots);
    setFeedback(gradeAnswer(target,prior.slots));setReviewing(false);setTab('Trainieren');
   }else if(!saved.draft||saved.draft.sessionId===m.id){
    setSessionId(m.id);setItem(target);setMode(target.mode);
    setValues(saved.draft?.itemId===target.id?saved.draft.slots:{});
    setReviewing(active.kind==='REVIEW');setTab('Trainieren');
   }
  }
 }).catch(e=>{if(alive)setError('Mission konnte nicht geladen werden: '+String(e))});
 void offlineState().then(s=>{if(alive)setOffline(s)}).catch(()=>{});
 return ()=>{alive=false};},[]);
 const recommended=chooseSession(allItems,attempts,cards,Date.now(),1)[0];
 function selectTab(next:Tab){setShowEditorial(false);setShowInteraction(false);setShowMediation(false);setShowListening(false);setShowArchive(false);setArchiveSource(null);setShowPragmatics(false);setShowReading(false);setShowProduction(false);setShowData(false);setTab(next);setItem(null);setReviewPage(false);setShowDiagnostic(false);setFeedback(null);}
 function openArchived(kind:ArchiveKind,record:ProductionEntry){
  setShowArchive(false);setArchiveSource(kind==='G10_LISTENING'?record.id:kind==='G09_TRANSFER'?record.sourceId??null:record.itemId);
  setItem(null);setFeedback(null);setShowData(false);
  setShowProduction(kind==='M04');setShowPragmatics(kind==='G08');setShowReading(kind==='G09_READING'||kind==='G09_TRANSFER');setShowListening(kind==='G10_LISTENING');setShowMediation(kind==='G13_MEDIATION');setShowInteraction(kind==='G12_INTERACTION');setShowEditorial(kind==='G11_EDITORIAL');
  setTab(kind==='M04'?'Trainieren':'Lernen');
 }
 function start(m:Mode,id?:string,asReview=false,sessionOverride?:string){
  const selected=id?itemById.get(id):chooseSession(itemsForMode(m),attempts,cards,Date.now(),1)[0];
  if(!selected)return;
  const sid=sessionOverride??crypto.randomUUID();
  setMode(m);setItem(selected);setSessionId(sid);setValues({});setFeedback(null);setReviewing(asReview);setTab('Trainieren');setReviewPage(false);setShowDiagnostic(false);setShowProduction(false);setShowReading(false);setShowPragmatics(false);setShowListening(false);setShowMediation(false);setShowInteraction(false);setShowEditorial(false);
  const draft:Draft={id:'active',itemId:selected.id,mode:m,sessionId:sid,slots:{},updatedAt:Date.now()};
  void saveDraft(draft).catch(e=>setError('Entwurf konnte nicht gespeichert werden: '+String(e)));
 }
 async function beginReviewTransfer(event:ReviewEvent,targetId:string){
  setError('');
  try{
   // Re-evaluate using fresh persisted state: the review and first attempt must exist.
   const snapshot=await loadSnapshot();
   const choice=reviewTransferChoice(event,allItems,snapshot.attempts);
   const genuine=snapshot.reviewEvents.some(e=>e.id===event.id&&e.cardId===event.cardId&&e.at===event.at);
   if(!genuine||choice.status!=='AVAILABLE'||choice.itemId!==targetId)throw Error('Wiederholung oder neuer Kontext nicht mehr verfügbar.');
   const target=itemById.get(targetId);
   if(!target||target.status==='WITHDRAWN')throw Error('Zielaufgabe nicht mehr verfügbar.');
   start(target.mode,target.id,false,choice.reviewSession);
  }catch(e){setError('Anwendung nicht gestartet: '+String(e));await refresh().catch(()=>{})}
 }
 async function beginMission(){
  setError('');
  try{
   const proposed=planMission(crypto.randomUUID(),allItems,attempts,cards,settings?.dailyMinutes??30,Date.now());
   const current=await startOrResumeMission(proposed,Date.now());
   const step=missionStep(current);
   if(!step)throw Error('Die Mission ist bereits abgeschlossen.');
   const target=itemById.get(step.itemId);
   if(!target||target.version!==step.itemVersion)throw Error('Eine gespeicherte Aufgabe hat sich geändert. Keine Daten wurden verworfen.');
   setMission(current);
   const previous=attempts.find(a=>a.sessionId===current.id&&a.itemId===target.id);
   const saved=await loadSnapshot();
   const answer=previous?.slots??(saved.draft?.sessionId===current.id&&saved.draft.itemId===target.id?saved.draft.slots:{});
   setSessionId(current.id);setMode(target.mode);setItem(target);setValues(answer);
   setFeedback(previous?gradeAnswer(target,previous.slots):null);setReviewing(step.kind==='REVIEW'&&!previous);
   setReviewPage(false);setShowDiagnostic(false);setShowProduction(false);setTab('Trainieren');
  }catch(e){setError('Mission nicht gestartet: '+String(e));setMission(await loadLatestMission().catch(()=>null))}
 }
 async function nextQuestion(){
  if(!item)return;
  if(mission&&sessionId===mission.id&&missionStep(mission)?.itemId===item.id){
   try{
    const next=await completeMissionStep(mission,Date.now());setMission(next);
    if(next.phase==='COMPLETE'){setItem(null);setFeedback(null);setTab('Heute');return;}
    const step=missionStep(next)!;
    const target=itemById.get(step.itemId);
    if(!target||target.version!==step.itemVersion)throw Error('Aufgabe fehlt oder wurde verändert');
    setItem(target);setMode(target.mode);setValues({});setFeedback(null);setReviewing(step.kind==='REVIEW');
    await saveDraft({id:'active',itemId:target.id,mode:target.mode,sessionId:next.id,slots:{},updatedAt:Date.now()},next);
   }catch(e){setError('Mission konnte nicht fortgesetzt werden: '+String(e));setMission(await loadLatestMission())}
   return;
  }
  start(mode);
 }
 async function exitQuestion(){
  if(mission&&mission.phase==='IN_PROGRESS'&&sessionId===mission.id){
   try{const paused=await pauseMissionIfCurrent(mission,Date.now());setMission(paused)}
   catch(e){setError('Mission konnte nicht pausiert werden: '+String(e));setMission(await loadLatestMission());return}
  }
  selectTab('Heute');
 }
 function onChange(next:Record<string,string>){setValues(next);if(item&&!feedback)void saveDraft({id:'active',itemId:item.id,mode,sessionId,slots:next,updatedAt:Date.now()},mission?.id===sessionId?mission:undefined).catch(e=>setError(String(e)));}
 async function submit(){
  if(!item||busyRef.current||feedback)return;busyRef.current=true;setBusy(true);setError('');
  const result=gradeAnswer(item,values);const at=Date.now();
  const attempt:Attempt={id:sessionId+':'+item.id,itemId:item.id,itemVersion:item.version,mode:item.mode,skillId:item.skillId,at,slots:{...values},score:result.score,correct:result.status==='CORRECT',hinted:false,result:result.status,sessionId,variantIndex:result.variantIndex};
  try{
    const expected=mission&&mission.id===sessionId?mission:undefined;
    const old=reviewing?cards.find(c=>c.id===item.id+':'+item.version):undefined;
    if(reviewing&&!old)throw Error('Wiederholungskarte ist nicht mehr verfügbar. Bitte aktualisiere die Warteschlange.');
    if(reviewing&&old&&old.dueAt>at)throw Error('Diese Wiederholung ist noch nicht fällig. Es wurde nichts gespeichert.');
    if(reviewing&&old&&result.status==='VOID')throw Error('Zurückgezogene Aufgabe: Es wird keine Wiederholung bewertet.');
    if(reviewing&&old){
      const grade=result.status==='CORRECT'?'Good':result.status==='PARTIAL'?'Hard':'Again';
      const next=nextReview(old,grade,at);
      const event:ReviewEvent={id:sessionId+':review:'+old.id,cardId:old.id,itemId:item.id,
       grade,at,scheduledDueAt:next.dueAt,algorithmVersion:RECALL_VERSION};
      await saveReviewedAttemptOnce(attempt,event,next,old,expected);
    }else{
      const card=result.status==='CORRECT'||result.status==='VOID'?null:newCard(item.id,item.version,at);
      const saved=await saveAttemptOnce(attempt,card,expected);
      if(!saved)throw Error('Ein Erstversuch für diese Sitzung ist bereits gespeichert. Bitte neu laden.');
    }
    await refresh();setReviewing(false);setFeedback(result);
  }
  catch(e){setError('Versuch wurde nicht bestätigt und wird nicht als gespeichert gezählt: '+String(e));setMission(await loadLatestMission().catch(()=>null))}
  finally{busyRef.current=false;setBusy(false);}
 }
 async function gradeReview(grade:ReviewEvent['grade']){
  if(!reviewing||!feedback||!item||busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
  try{
   const old=cards.find(c=>c.id===item.id+':'+item.version);
   if(!old)throw Error('Wiederholungskarte ist nicht verfügbar.');
   const at=Date.now();const next=nextReview(old,grade,at);
   const event:ReviewEvent={id:sessionId+':review:'+old.id,cardId:old.id,itemId:item.id,grade,at,scheduledDueAt:next.dueAt,algorithmVersion:'sg-recall-0.1'};
   await saveReview(event,next);await refresh();setReviewing(false);
  }catch(e){setError(String(e))}finally{busyRef.current=false;setBusy(false)}
 }
 if(loading)return <main className="main"><p aria-live="polite">Lade deine lokalen Lerndaten …</p></main>;
 if(!settings&&!error)return <main className="main"><Onboarding onDone={async s=>{await saveSettings(s);setSettings(s)}}/></main>;
 const nav=(t:Tab)=>selectTab(t);
 return <MobileShell active={tab} onSelect={nav}>
  <div className="status">Offline: {offline==='READY'?'verfügbar':offline==='UNINSTALLED'?'noch nicht installiert':offline==='PARTIAL'?'unvollständig':'nicht verfügbar'}</div>
  {(tab==='Heute'||tab==='Trainieren')&&<div className="banner">DEMO_ONLY · {allItems.length} Entwurfsaufgaben · 0/350 unabhängig freigegeben. Keine CEFR-Einstufung.</div>}
  {error&&<div className="banner" role="alert">{error}<div><button type="button" className="button text" onClick={()=>setError('')}>Hinweis schließen</button></div></div>}
  {showData?<DataManagement onExit={()=>setShowData(false)} onRestore={refresh} onListening={()=>{setShowData(false);setShowListening(true);setArchiveSource(null);setTab('Lernen')}}/>:<>
  {tab==='Heute'&&<Today attempts={attempts} cards={cards} recommended={recommended} mission={mission} dailyMinutes={settings?.dailyMinutes??30} onStart={()=>void beginMission()} onReview={()=>{setReviewPage(true);setTab('Trainieren')}} onOpenErrors={()=>selectTab('Fehler')} onDiagnostic={()=>{setShowDiagnostic(true);setTab('Lernen')}} onProduction={()=>{setShowProduction(true);setTab('Trainieren')}} onData={()=>setShowData(true)} onReading={()=>{setShowReading(true);setTab('Lernen')}} onPragmatics={()=>{setShowPragmatics(true);setShowReading(false);setTab('Lernen')}} onListening={()=>{setShowListening(true);setTab('Lernen')}} onMediation={()=>{setShowMediation(true);setTab('Lernen')}} onInteraction={()=>{setShowInteraction(true);setTab('Lernen')}} onEditorial={()=>{setShowEditorial(true);setTab('Lernen')}}/>}
  {tab==='Lernen'&&(showDiagnostic?<DiagnosticPanel onExit={()=>setShowDiagnostic(false)}/>:showEditorial?<EditorialStudio initialSelection={archiveSource??undefined} onExit={()=>{void refresh().catch(e=>setError(String(e)));setShowEditorial(false);setArchiveSource(null)}}/>:showInteraction?<InteractionStudio initialSelection={archiveSource??undefined} onExit={()=>{void refresh().catch(e=>setError(String(e)));setShowInteraction(false);setArchiveSource(null)}}/>:showMediation?<MediationStudio initialSelection={archiveSource??undefined} onExit={()=>{void refresh().catch(e=>setError(String(e)));setShowMediation(false);setArchiveSource(null)}} onSource={id=>{setShowMediation(false);setArchiveSource(id);setShowReading(true)}}/>:showListening?<ListeningStudio onBackup={()=>{setShowListening(false);setShowData(true)}} initialSelection={archiveSource??undefined} onExit={()=>{void refresh().catch(e=>setError(String(e)));setShowListening(false);setArchiveSource(null)}}/>:showPragmatics?<PragmaticsStudio initialSelection={archiveSource??undefined} onExit={()=>{void refresh().catch(e=>setError(String(e)));setShowPragmatics(false);setArchiveSource(null)}}/>:showReading?<ReadingStudio initialSelection={archiveSource??undefined} onExit={()=>{void refresh().catch(e=>setError(String(e)));setShowReading(false);setArchiveSource(null)}} onTransfer={(m,id)=>start(m,id)} onPragmatics={()=>{setShowReading(false);setShowPragmatics(true)}}/>:<Curriculum onStart={m=>start(m)} onReading={()=>setShowReading(true)} onPragmatics={()=>setShowPragmatics(true)} onListening={()=>setShowListening(true)} onMediation={()=>setShowMediation(true)} onInteraction={()=>setShowInteraction(true)} onEditorial={()=>setShowEditorial(true)}/>)}
  {tab==='Trainieren'&&(showProduction?<ProductionStudio initialSelection={archiveSource??undefined} onExit={()=>{void refresh().catch(e=>setError(String(e)));setShowProduction(false);setArchiveSource(null)}}/>:item?<>{mission&&sessionId===mission.id&&<div className="status" aria-live="polite">Tagesmission · Aufgabe {mission.index+1} / {mission.steps.length} · {missionStep(mission)?.kind}</div>}<PracticeRunner item={item} values={values} onChange={onChange} feedback={feedback} onSubmit={submit} submitting={busy} onNext={()=>void nextQuestion()} onExit={()=>void exitQuestion()} reviewing={reviewing} onReviewGrade={gradeReview}/>{feedback&&sessionId&&!sessionId.startsWith('review-transfer:')&&!(mission&&sessionId===mission.id)&&(()=>{
 const event=reviews.find(e=>e.id===sessionId+':review:'+item.id+':'+item.version);
 if(!event)return null;
 const choice=reviewTransferChoice(event,allItems,attempts);
 return choice.status==='AVAILABLE'?<div className="panel" role="region" aria-label="Wiederholung anwenden">
  <h2>Jetzt in neuem Kontext anwenden</h2>
  
  <button type="button" className="button" onClick={()=>void beginReviewTransfer(event,choice.itemId)}>Neuen Kontext öffnen</button>
 </div>:null;
})()}</>:reviewPage?<ReviewQueue cards={cards} events={reviews} attempts={attempts} byId={itemById} onTransfer={(event,id)=>void beginReviewTransfer(event,id)} onStart={id=>{const i=itemById.get(id);if(i)start(i.mode,id,true)}}/>:<section><h1 className="page-title">Trainieren</h1><div className="grid">{availableModes.map(m=><article className="panel" key={m}><div className="kicker">{m}</div><h2>{labels[m]}</h2><p className="muted">{itemsForMode(m).length} Aufgaben</p><button className="button" onClick={()=>start(m)}>Übung starten</button></article>)}</div><div className="buttonrow"><button className="button outline" onClick={()=>setReviewPage(true)}>Fällige Wiederholungen ({dueReviewCards(cards,Date.now()).length})</button></div><div className="grid" style={{marginTop:18}}><article className="panel"><h2>Satzlabor · Schreibwerkstatt</h2><button className="button outline" onClick={()=>setShowProduction(true)}>Schreibwerkstatt öffnen</button></article><article className="panel"><h2>Kontrastduell</h2><button className="button outline" onClick={()=>{const first=itemsForMode('M05').find(i=>i.contrast);if(first)start('M05',first.id)}}>Kontrast üben</button></article><article className="panel"><h2>Wörterbuchgestützte Nuancen</h2><button className="button outline" onClick={()=>{const first=itemsForMode('M05').find(i=>!!i.lexicalAuthority);if(first)start('M05',first.id)}}>Beleggestützte Wendungen üben</button></article></div></section>)}
  {tab==='Fehler'&&<ErrorArchive attempts={attempts} byId={itemById} onRetry={id=>{const i=itemById.get(id);if(i)start(i.mode,id)}}/>}
  {tab==='Fortschritt'&&(showArchive?<WritingArchive entries={productions} onOpen={openArchived} onExit={()=>setShowArchive(false)}/>:<Progress attempts={attempts} cards={cards} reviews={reviews} productions={productions} onData={()=>setShowData(true)} onArchive={()=>{void refresh().catch(e=>setError(String(e)));setShowArchive(true)}} onMediation={()=>{setShowArchive(false);setShowMediation(true);setTab('Lernen')}} onInteraction={()=>{setShowArchive(false);setShowInteraction(true);setTab('Lernen')}} onEditorial={()=>{setShowArchive(false);setShowEditorial(true);setTab('Lernen')}}/>)}
  </>}
  {!showData&&<div className="buttonrow"><button className="button outline" type="button" onClick={()=>{setItem(null);setFeedback(null);setShowProduction(false);setShowData(true)}}>Daten & Sicherung</button></div>}
  
 </MobileShell>;
}
