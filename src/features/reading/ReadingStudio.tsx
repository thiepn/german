import {useEffect,useMemo,useState} from 'react';
import ReadingTransfer from './ReadingTransfer';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import type {ProductionEntry} from '../../domain/production/types';
import type {Mode} from '../../domain/content/types';
import {readingStudies,readingAnchors,readingProgress,studyId,isReadingEntry,nextUnanswered,transferTarget,type ReadingUnit} from '../../domain/reading/reading';
export default function ReadingStudio({onExit,onTransfer,onPragmatics,initialSelection}:{onExit:()=>void;onTransfer:(mode:Mode,id:string)=>void;onPragmatics:()=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(readingStudies.some(u=>u.id===initialSelection)?initialSelection!:readingStudies[0].id);
 const [first,setFirst]=useState('');
 const [answer,setAnswer]=useState('');
 const [evidence,setEvidence]=useState('');
 const [chosen,setChosen]=useState('q1');
 const [revealed,setRevealed]=useState<string[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const unit=readingStudies.find(u=>u.id===selected)!;
 const entry=entries.find(e=>isReadingEntry(e)&&e.itemId===selected)??null;
 const question=unit.questions.find(q=>q.id===chosen)!;
 const recorded=entry?.revisions.find(r=>r.questionId===question.id);
 const progress=useMemo(()=>readingProgress(readingStudies,entries),[entries]);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{void refresh().catch(e=>setError(String(e)))},[]);
 function chooseUnit(id:string){
  const u=readingStudies.find(x=>x.id===id)!;
  setSelected(id);setFirst('');setAnswer('');setEvidence('');setChosen(u.questions[0].id);setRevealed([]);setError('');
 }
 async function saveNote(){
  if(!first.trim()||entry||busy)return;
  setBusy(true);setError('');
  try{
   const note:ProductionEntry={id:studyId(unit.id),itemId:unit.id,itemVersion:unit.version,kind:'READING_STUDY',createdAt:Date.now(),original:first.trim(),revisions:[],evaluated:'UNASSESSED'};
   await saveProductionEntry(note,0);await refresh();
  }catch(e){setError('Leseprotokoll nicht gespeichert: '+String(e))}finally{setBusy(false)}
 }
 async function saveQuestion(){
  if(!entry||recorded||!answer.trim()||!evidence||busy)return;
  setBusy(true);setError('');
  try{
   const next:ProductionEntry={...entry,revisions:[...entry.revisions,{id:crypto.randomUUID(),at:Date.now(),text:answer.trim(),reflection:'Evidenz aus Absatz '+evidence,questionId:question.id,paragraphId:evidence}]};
   await saveProductionEntry(next,entry.revisions.length);await refresh();setAnswer('');setEvidence('');
   setRevealed(prev=>[...prev,question.id]);
   // Stay on the saved answer so learners can inspect their evidence before proceeding.
  }catch(e){setError('Antwort nicht gespeichert: '+String(e))}finally{setBusy(false)}
 }
 const anchorList=unit.anchorIds.map(id=>readingAnchors.find(a=>a.id===id)).filter((x):x is (typeof readingAnchors)[number]=>!!x);
 const complete=entry&&unit.questions.every(q=>entry.revisions.some(r=>r.questionId===q.id));
 return <section><h1 className="page-title">Argumente genau lesen</h1>
 
 <div className="banner">DEMO_ONLY · {readingStudies.length} ungeprüfte, fiktive Lesestudien · {progress.answered}/{progress.totalQuestions} Antworten dokumentiert. Fachquellen bestätigen nicht die Übungstexte.</div>
 <div className="field"><label htmlFor="reading-unit">Lesestudie wählen</label><select id="reading-unit" value={selected} onChange={e=>chooseUnit(e.target.value)}>{readingStudies.map(u=><option value={u.id} key={u.id}>{u.title} · {u.band}</option>)}</select></div>
 <article className="panel"><div className="kicker">{unit.band} · {unit.register}</div><h2>{unit.title}</h2><p className="muted">{unit.focus}</p>
 {unit.paragraphs.map((p,i)=><p className="reading-paragraph" key={p.id}><span className="reading-paragraph-id">Absatz {i+1}</span>{p.text}</p>)}
 <div className="small muted"><strong>Grammatische Nachschlagequellen:</strong> {anchorList.map((a,i)=><span key={a.id}>{i?', ':''}<a href={a.url} target="_blank" rel="noopener noreferrer">{a.subject}</a></span>)}. </div></article>
 {!entry?<section className="panel"><h2>Erster Leseeindruck</h2><p>Welche Hauptaussage und welche wichtige Einschränkung erkennst du? Bewahre deine eigene erste Lesart auf.</p>
 <div className="field"><label htmlFor="reading-first">Deine erste Deutung</label><textarea id="reading-first" rows={4} value={first} onChange={e=>setFirst(e.target.value)} maxLength={2500}/></div>
 <button className="button" disabled={busy||!first.trim()} onClick={()=>void saveNote()}>Ersten Leseeindruck speichern</button>
 </section>:<>
 <section className="panel"><h2>Dein ursprünglicher Leseeindruck</h2><p className="written">{entry.original}</p></section>
 <section className="panel"><h2>Belege und Deutung</h2><div className="field"><label htmlFor="reading-question">Frage auswählen</label><select id="reading-question" value={chosen} onChange={e=>{setChosen(e.target.value);setAnswer('');setEvidence('')}}>{unit.questions.map((q,i)=><option key={q.id} value={q.id}>{i+1}. {entry.revisions.some(r=>r.questionId===q.id)?'Dokumentiert':'Offen'} · {q.focus}</option>)}</select></div>
 <p className="prompt">{question.prompt}</p>
 {recorded?<><p><strong>Deine gespeicherte Antwort:</strong></p><p className="written">{recorded.text}</p><p className="small muted">Dein Beleg: {recorded.paragraphId}</p>{nextUnanswered(unit,entry)&&<button className="button outline" type="button" onClick={()=>{const next=nextUnanswered(unit,entry);if(next){setChosen(next.id);setRevealed([]);setAnswer('');setEvidence('')}}}>Nächste offene Frage</button>}</>:<>
 <div className="field"><label htmlFor="reading-evidence">Welcher Absatz stützt deine Antwort?</label><select id="reading-evidence" value={evidence} onChange={e=>setEvidence(e.target.value)}><option value="">Textbeleg auswählen</option>{unit.paragraphs.map((p,i)=><option key={p.id} value={p.id}>Absatz {i+1}</option>)}</select></div>
 <div className="field"><label htmlFor="reading-answer">Deine begründete Antwort</label><textarea id="reading-answer" value={answer} onChange={e=>setAnswer(e.target.value)} rows={4} maxLength={2500}/></div>
 <button className="button" disabled={busy||!answer.trim()||!evidence} onClick={()=>void saveQuestion()}>Antwort und Beleg dokumentieren</button></>}
 <div className="buttonrow"><button className="button outline" disabled={!recorded} onClick={()=>setRevealed(v=>v.includes(question.id)?v.filter(x=>x!==question.id):[...v,question.id])}>{revealed.includes(question.id)?'Vergleich ausblenden':'Musterdeutung vergleichen'}</button></div>
 {recorded&&revealed.includes(question.id)&&<div className="feedback"><strong>Eine mögliche Deutung — nicht unabhängig geprüft</strong><p>{question.model}</p></div>}
 </section>
 {complete&&<ReadingTransfer key={unit.id} unitId={unit.id} entries={entries} onSaved={refresh}/>}
 <section className="panel"><h2>In einer anderen Übungsform anwenden</h2><p>{unit.transfer.why}</p><button className="button outline" onClick={()=>{try{const t=transferTarget(unit);onTransfer(t.mode,t.id)}catch(e){setError(String(e))}}}>Zum passenden Sprachtraining wechseln</button><button className="button outline" onClick={onPragmatics}>Anschließend G08 Situationsangemessenheit üben</button></section>
 </>}
 {error&&<p role="alert" className="banner">{error}</p>}<button className="button text" onClick={onExit}>Zurück zum Curriculum</button></section>;
}
