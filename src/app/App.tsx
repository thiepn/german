import {useEffect,useRef,useState} from 'react';
import {allItems,itemById,itemsForMode} from '../domain/content/registry';
import {availableModes,modes} from '../domain/content/modes';
import DiagnosticPanel from '../features/diagnostic/DiagnosticPanel';
import type {Attempt,Draft,Exercise,LearnerSettings,Mode,ReviewCard,ReviewEvent} from '../domain/content/types';
import {gradeAnswer,type GradeResult} from '../domain/grading/gradeAnswer';
import {chooseSession} from '../domain/recommendation/chooseSession';
import {newCard,nextReview} from '../domain/review/scheduler';
import {loadSnapshot,saveAttemptOnce,saveDraft,saveReview,saveSettings} from '../persistence/schema';
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
 const [showDiagnostic,setShowDiagnostic]=useState(false);
 const [mode,setMode]=useState<Mode>('M01');
 const [item,setItem]=useState<Exercise|null>(null);
 const [sessionId,setSessionId]=useState('');
 const [values,setValues]=useState<Record<string,string>>({});
 const [feedback,setFeedback]=useState<GradeResult|null>(null);
 const [reviewing,setReviewing]=useState(false);
 const [busy,setBusy]=useState(false);
 const [offline,setOffline]=useState<OfflineState>('UNINSTALLED');
 const busyRef=useRef(false);
 const refresh=async()=>{const s=await loadSnapshot();setAttempts(s.attempts);setCards(s.cards);setReviews(s.reviewEvents);setSettings(s.settings);};
 useEffect(()=>{let alive=true;loadSnapshot().then(s=>{if(!alive)return;setAttempts(s.attempts);setCards(s.cards);setReviews(s.reviewEvents);setSettings(s.settings);if(s.draft&&itemById.has(s.draft.itemId)){setSessionId(s.draft.sessionId);setMode(s.draft.mode);setItem(itemById.get(s.draft.itemId)!);setValues(s.draft.slots);setTab('Trainieren');}}).catch(e=>{if(alive)setError('Lokales Speichern ist nicht verfügbar: '+String(e))}).finally(()=>{if(alive)setLoading(false)});
 void offlineState().then(s=>{if(alive)setOffline(s)}).catch(()=>{});
 return ()=>{alive=false};},[]);
 const recommended=chooseSession(allItems,attempts,cards,Date.now(),1)[0];
 function selectTab(next:Tab){setShowData(false);setTab(next);setItem(null);setReviewPage(false);setShowDiagnostic(false);setFeedback(null);}
 function start(m:Mode,id?:string,asReview=false){
  const selected=id?itemById.get(id):chooseSession(itemsForMode(m),attempts,cards,Date.now(),1)[0];
  if(!selected)return;
  const sid=crypto.randomUUID();
  setMode(m);setItem(selected);setSessionId(sid);setValues({});setFeedback(null);setReviewing(asReview);setTab('Trainieren');setReviewPage(false);setShowDiagnostic(false);
  const draft:Draft={id:'active',itemId:selected.id,mode:m,sessionId:sid,slots:{},updatedAt:Date.now()};
  void saveDraft(draft).catch(e=>setError('Entwurf konnte nicht gespeichert werden: '+String(e)));
 }
 function onChange(next:Record<string,string>){setValues(next);if(item&&!feedback)void saveDraft({id:'active',itemId:item.id,mode,sessionId,slots:next,updatedAt:Date.now()}).catch(e=>setError(String(e)));}
 async function submit(){
  if(!item||busyRef.current||feedback)return;busyRef.current=true;setBusy(true);setError('');
  const result=gradeAnswer(item,values);const at=Date.now();
  const attempt:Attempt={id:sessionId+':'+item.id,itemId:item.id,itemVersion:item.version,mode:item.mode,skillId:item.skillId,at,slots:{...values},score:result.score,correct:result.status==='CORRECT',hinted:false,result:result.status,sessionId,variantIndex:result.variantIndex};
  try{
    const card=result.status==='CORRECT'||result.status==='VOID'?null:newCard(item.id,item.version,at);
    const added=await saveAttemptOnce(attempt,card);
    if(reviewing&&added){
      const old=cards.find(c=>c.id===item.id+':'+item.version);
      if(old){
        const grade=result.status==='CORRECT'?'Good':'Again';
        const next=nextReview(old,grade,at);
        await saveReview({id:sessionId+':review:'+old.id,cardId:old.id,itemId:item.id,grade,at,scheduledDueAt:next.dueAt,algorithmVersion:'sg-recall-0.1'},next);
      }
    }
    await refresh();setReviewing(false);setFeedback(result);
  }
  catch(e){setError('Versuch wurde nicht bestätigt und wird nicht als gespeichert gezählt: '+String(e))}
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
  <div className="status">Sprachgefühl SG-01 · {settings?.entryTrack??'Ohne Profil'} · Offline: {offline==='READY'?'App-Shell vorhanden':offline==='UNINSTALLED'?'noch nicht installiert':offline==='PARTIAL'?'unvollständig':'nicht verfügbar'}</div>
  <div className="banner">DEMO_ONLY · {allItems.length} nicht freigegebene Aufgaben · 0 von 350 P1-Aufgaben redaktionell genehmigt. Kein CEFR-Zertifikat.</div>
  {error&&<div className="banner" role="alert">{error}<div><button type="button" className="button text" onClick={()=>setError('')}>Hinweis schließen</button></div></div>}
  {showData?<DataManagement onExit={()=>setShowData(false)} onRestore={refresh}/>:<>
  {tab==='Heute'&&<Today attempts={attempts} cards={cards} recommended={recommended} onStart={()=>recommended&&start(recommended.mode,recommended.id)} onReview={()=>{setReviewPage(true);setTab('Trainieren')}} onOpenErrors={()=>selectTab('Fehler')} onDiagnostic={()=>{setShowDiagnostic(true);setTab('Lernen')}}/>}
  {tab==='Lernen'&&(showDiagnostic?<DiagnosticPanel onExit={()=>setShowDiagnostic(false)}/>:<Curriculum onStart={m=>start(m)}/>)}
  {tab==='Trainieren'&&(item?<PracticeRunner item={item} values={values} onChange={onChange} feedback={feedback} onSubmit={submit} submitting={busy} onNext={()=>start(mode)} onExit={()=>selectTab('Heute')} reviewing={reviewing} onReviewGrade={gradeReview}/>:reviewPage?<ReviewQueue cards={cards} byId={itemById} onStart={id=>{const i=itemById.get(id);if(i)start(i.mode,id,true)}}/>:<section><div className="eyebrow">Gezieltes Üben</div><h1 className="page-title">Trainieren</h1><p className="lead">Fünf Übungsformen nutzen denselben deterministischen Bewertungsmechanismus für ausdrücklich vorgegebene Zielantworten. Das hier verwendete Material ist noch nicht redaktionell freigegeben.</p><div className="grid">{availableModes.map(m=><article className="panel" key={m}><div className="kicker">{m}</div><h2>{labels[m]}</h2><p className="muted">{modes[m].description} · {itemsForMode(m).length} Demoaufgaben</p><button className="button" onClick={()=>start(m)}>Übung starten</button></article>)}</div><div className="buttonrow"><button className="button outline" onClick={()=>setReviewPage(true)}>Fällige Wiederholungen ({cards.filter(c=>c.dueAt<=Date.now()).length})</button></div></section>)}
  {tab==='Fehler'&&<ErrorArchive attempts={attempts} byId={itemById} onRetry={id=>{const i=itemById.get(id);if(i)start(i.mode,id)}}/>}
  {tab==='Fortschritt'&&<Progress attempts={attempts}/>}
  </>}
  {!showData&&<div className="buttonrow"><button className="button outline" type="button" onClick={()=>{setItem(null);setFeedback(null);setShowData(true)}}>Daten & Sicherung</button></div>}
  <footer className="small muted" style={{marginTop:60}}>Deine Daten bleiben im lokalen Browser-Speicher. Keine Anmeldung, kein Tracking und keine automatische Synchronisierung. Sichere deine Daten regelmäßig über »Daten & Sicherung«. Der Import ergänzt nur fehlende Datensätze.</footer>
 </MobileShell>;
}
