import {useEffect,useState} from 'react';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import type {ProductionEntry} from '../../domain/production/types';
import {interactionScenarios,strategies,interactionFirst,interactionRevision,isInteractionEntry,openingChoice,nextInteractionTurn,primaryResponse,interactionProgress,type InteractionStrategy} from '../../domain/interaction/interaction';

export default function InteractionStudio({onExit,initialSelection}:{onExit:()=>void;initialSelection?:string}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(interactionScenarios.some(s=>s.id===initialSelection)?initialSelection!:interactionScenarios[0].id);
 const [register,setRegister]=useState(''),[strategy,setStrategy]=useState<InteractionStrategy>('ACKNOWLEDGE'),[reply,setReply]=useState(''),[rationale,setRationale]=useState('');
 const [alternativeTurn,setAlternativeTurn]=useState(''),[alternative,setAlternative]=useState(''),[alternativeWhy,setAlternativeWhy]=useState(''),[alternativeStrategy,setAlternativeStrategy]=useState<InteractionStrategy>('REFRAME');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const s=interactionScenarios.find(x=>x.id===selected)!;
 const record=entries.find(e=>isInteractionEntry(e)&&e.itemId===selected)??null;
 const next=nextInteractionTurn(s,record);
 const opening=record?openingChoice(record):null;
 const stats=interactionProgress(entries);
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let alive=true;void loadProductionEntries().then(all=>{if(alive)setEntries(all)}).catch(e=>{if(alive)setError(String(e))});return()=>{alive=false}},[]);
 function choose(id:string){setSelected(id);setRegister('');setStrategy('ACKNOWLEDGE');setReply('');setRationale('');setAlternativeTurn('');setAlternative('');setAlternativeWhy('');setAlternativeStrategy('REFRAME');setError('')}
 async function persist(){
  if(busy)return;setBusy(true);setError('');
  try{
   if(!record)await saveProductionEntry(interactionFirst(s,register,strategy,reply,Date.now()),0);
   else{
    if(!next||next.id==='t0')throw Error('Kein weiterer Gesprächszug verfügbar.');
    await saveProductionEntry(interactionRevision(record,s,'TURN',next.id,reply,strategy,rationale,crypto.randomUUID(),Date.now()),record.revisions.length);
   }
   await refresh();setReply('');setRationale('');setStrategy('ACKNOWLEDGE');
  }catch(e){setError('Gesprächszug nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 async function saveAlternative(){
  if(!record||!alternativeTurn||busy)return;setBusy(true);setError('');
  try{
   await saveProductionEntry(interactionRevision(record,s,'ALTERNATIVE',alternativeTurn,alternative,alternativeStrategy,alternativeWhy,crypto.randomUUID(),Date.now()),record.revisions.length);
   await refresh();setAlternative('');setAlternativeWhy('');setAlternativeTurn('');setAlternativeStrategy('REFRAME');
  }catch(e){setError('Alternative nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 const doneTurns=record?s.turns.filter(t=>primaryResponse(record,t.id)):[];
 const options=Object.entries(strategies) as [InteractionStrategy,string][];
 return <section className="interaction-studio">
  <h1 className="page-title">Gespräch und Argumentation</h1>
  <div className="banner">DEMO_ONLY · {stats.started}/{stats.total} Gespräche begonnen · {stats.completed} abgeschlossen · {stats.alternatives} Alternativen. Fiktive, fest vorgegebene Gesprächsbeiträge. Textübung ohne Sprachaufnahme oder Bewertung.</div>
  <div className="field"><label htmlFor="interaction-case">Gespräch auswählen</label><select id="interaction-case" value={selected} onChange={e=>choose(e.target.value)}>{interactionScenarios.map(x=><option value={x.id} key={x.id}>{x.band} · {x.title}</option>)}</select></div>
  <article className="panel"><div className="kicker">G12 · {s.band} · {s.id} · v{s.version}</div><h2>{s.title}</h2><p>{s.context}</p><p className="small muted">Fiktiver, fest geschriebener Dialog · {s.status}</p></article>
  <section className="panel interaction-transcript" aria-label="Gespeicherter Gesprächsverlauf"><h2>Gesprächsverlauf</h2>
   {s.turns.map((t,i)=>{
    const response=record?primaryResponse(record,t.id):null;
    const visible=i===0||s.turns.slice(0,i).every(x=>record&&primaryResponse(record,x.id));
    if(!visible)return null;
    return <div className="interaction-pair" key={t.id}>
     <div className="interaction-other"><strong>{t.speaker} · {i+1}</strong><p>{t.text}</p></div>
     {response&&<div className="interaction-self"><strong>Deine Antwort · {i+1}</strong><p className="written">{response}</p>
      {i===0&&opening&&<p className="small muted">{opening.register} · {strategies[opening.strategy]}</p>}
      {record?.revisions.filter(r=>r.questionId==='ALTERNATIVE:'+t.id).map((r,j)=><details key={r.id}><summary>Alternative {j+1}</summary><p className="written">{r.text}</p><p className="small muted">{r.selfChecks?.join(' · ')} · Begründung: {r.reflection}</p></details>)}
     </div>}
    </div>;
   })}
  </section>
  {next&&<section className="panel interaction-compose"><h2>{next.id==='t0'?'Erste Antwort':'Auf den Einwand antworten'} · {next.id.toUpperCase()}</h2>
   <p>{next.task}</p>
   {!record?<div className="field"><label htmlFor="interaction-register">Gesprächsregister</label><select id="interaction-register" value={register} onChange={e=>setRegister(e.target.value)}><option value="">Register wählen</option>{s.registers.map(r=><option value={r} key={r}>{r}</option>)}</select></div>:<p className="small muted">Festgelegtes Register: {opening?.register??'Nicht verfügbar'}</p>}
   <div className="field"><label htmlFor="interaction-strategy">Gesprächsstrategie</label><select id="interaction-strategy" value={strategy} onChange={e=>setStrategy(e.target.value as InteractionStrategy)}>{options.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div>
   <div className="field"><label htmlFor="interaction-reply">Deine Gesprächsantwort</label><textarea id="interaction-reply" rows={5} maxLength={2800} value={reply} onChange={e=>setReply(e.target.value)}/></div>
   {record&&<div className="field"><label htmlFor="interaction-reason">Begründung, Vorbehalt oder Konsequenz</label><textarea id="interaction-reason" rows={3} maxLength={1150} value={rationale} onChange={e=>setRationale(e.target.value)}/></div>}
   <button className="button" type="button" disabled={busy||!reply.trim()||(!record&&!register)||(!!record&&!rationale.trim())} onClick={()=>void persist()}>Antwort dauerhaft speichern</button>
  </section>}
  {record&&doneTurns.length>0&&<section className="panel interaction-alternatives"><h2>Anderen Gesprächsweg erproben</h2>
   <div className="field"><label htmlFor="interaction-alt-turn">Gesprächszug</label><select id="interaction-alt-turn" value={alternativeTurn} onChange={e=>setAlternativeTurn(e.target.value)}><option value="">Gesprächszug wählen</option>{doneTurns.map((t,i)=><option key={t.id} value={t.id}>{i+1} · {t.speaker}</option>)}</select></div>
   <div className="field"><label htmlFor="interaction-alt-strategy">Alternative Strategie</label><select id="interaction-alt-strategy" value={alternativeStrategy} onChange={e=>setAlternativeStrategy(e.target.value as InteractionStrategy)}>{options.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div>
   <div className="field"><label htmlFor="interaction-alt-reply">Alternative Antwort</label><textarea id="interaction-alt-reply" rows={4} maxLength={2800} value={alternative} onChange={e=>setAlternative(e.target.value)}/></div>
   <div className="field"><label htmlFor="interaction-alt-why">Warum ist diese Alternative sinnvoll? Welche Grenze bleibt?</label><textarea id="interaction-alt-why" rows={3} maxLength={1150} value={alternativeWhy} onChange={e=>setAlternativeWhy(e.target.value)}/></div>
   <button className="button outline" disabled={busy||!alternativeTurn||!alternative.trim()||!alternativeWhy.trim()} onClick={()=>void saveAlternative()}>Alternative speichern</button>
  </section>}
  {record&&!next&&<p className="feedback" role="status">Drei Gesprächszüge dokumentiert. Alternativen können ergänzt werden.</p>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button className="button outline" onClick={onExit}>Zurück zum Curriculum</button></div>
 </section>;
}
