import {useState} from 'react';
import type {AuthoredContext,ExhaustedContrastPlan} from '../../domain/errors/exhaustedContrast';
import {gradeAnswer} from '../../domain/grading/gradeAnswer';

const answer=(x:AuthoredContext)=>x.item.slots.map(s=>x.first.slots[s.id]?.trim()||'—').join(' · ');
const solutions=(x:AuthoredContext)=>x.item.variants.map(v=>x.item.slots.map(s=>v.slots[s.id]).join(' · ')).join(' / ');
const normalize=(s:string)=>s.trim().toLocaleLowerCase('de-DE').replace(/\s+/g,' ');
function OldContext({x,values,onChange}:{x:AuthoredContext;values:Record<string,string>;onChange:(id:string,value:string)=>void}){
 return <article className="panel">
  <h4>{x.item.id} · Version {x.item.version}</h4>
  <p>{x.item.prompt}</p>
  {x.item.slots.map(slot=><div className="field" key={slot.id}>
   <label htmlFor={'exhausted-'+x.item.id+'-'+slot.id}>Antwort zu {x.item.id} · {slot.label}</label>
   <input id={'exhausted-'+x.item.id+'-'+slot.id} value={values[slot.id]??''} autoComplete="off" spellCheck={false}
    maxLength={250} onChange={e=>onChange(slot.id,e.target.value)}/>
  </div>)}
 </article>;
}
function SourceCompare({x,values}:{x:AuthoredContext;values:Record<string,string>}){
 const matched=gradeAnswer(x.item,values).status==='CORRECT';
 return <article className="panel">
  <h4>{x.item.id} · v{x.item.version} · {matched?'Dein neuer Abruf stimmt mit dem Autorenentwurf überein':'Dein neuer Abruf weicht vom Autorenentwurf ab'}</h4>
  <p><strong>Gesehener Satz:</strong> {x.item.prompt}</p>
  <p><strong>Jetzt erneut eingesetzt:</strong> {x.item.slots.map(s=>values[s.id]||'—').join(' · ')}</p>
  <p><strong>Gespeicherter ursprünglicher Erstversuch:</strong> {answer(x)}</p>
  <p><strong>Autorenlösungen (DEMO_ONLY):</strong> {solutions(x)}</p>
  <p>{x.item.explanation}</p>
  <p><strong>Vom Autor genannte mögliche Verwechslung:</strong> {x.item.misconception}</p>
 </article>;
}
export default function ExhaustedContrast({plan,onDue,onSource,onClose}:{
 plan:ExhaustedContrastPlan;onDue:(id:string)=>void;onSource:(skillId:string)=>void;onClose:()=>void;
}){
 const [stage,setStage]=useState<'BLIND'|'COMPARE'|'FINISHED'>('BLIND');
 const [responses,setResponses]=useState<Record<string,Record<string,string>>>({});
 const [difference,setDifference]=useState(''),[repair,setRepair]=useState('');
 const [newExample,setNewExample]=useState(''),[explanation,setExplanation]=useState('');
 const contexts=[plan.anchor,plan.contrast];
 const hasFields=contexts.every(c=>c.item.slots.every(s=>(responses[c.item.id]?.[s.id]??'').trim()));
 const readyToReveal=hasFields&&difference.trim().length>=85;
 const sourcesText=contexts.flatMap(c=>[c.item.prompt,solutions(c)]);
 const novelExample=newExample.trim().length>=100&&sourcesText.every(s=>normalize(s)!==normalize(newExample));
 const canFinish=repair.trim().length>=140&&novelExample&&explanation.trim().length>=85&&
  normalize(repair)!==normalize(difference)&&normalize(newExample)!==normalize(repair);
 const onInput=(itemId:string,id:string,value:string)=>setResponses(prev=>({
  ...prev,[itemId]:{...prev[itemId],[id]:value}
 }));
 return <section role="region" aria-label={'Kontrastübung '+plan.skillId+' '+plan.topic} className="panel exhausted-contrast">
  <h3>Kontrastübung mit bekannten Aufgaben</h3>
  <p className="muted small">Zu {plan.mode} · {plan.skillId} · {plan.topic} wurden bereits alle {plan.contexts.length} aktuellen Autorenaufgaben versucht. Die zwei Beispiele unten haben nach den Entwurfsantworten tatsächlich unterschiedliche Lösungen. Das ist eine Wiederanwendung bekannter Quellen, **kein neuer unabhängiger Test**. Das gemeinsame Autorenthema ist keine geprüfte Fehlerdiagnose.</p>
  {stage==='BLIND'?<>
   <p>Rufe die beiden Formen erneut **ohne** alte Antworten und Autorenlösungen ab. Begründe anschließend die Unterschiede. Erst danach werden die gespeicherten Antworten offengelegt.</p>
   {contexts.map(x=><OldContext key={x.item.id} x={x} values={responses[x.item.id]??{}} onChange={(id,value)=>onInput(x.item.id,id,value)}/>)}
   <div className="field"><label htmlFor="exhausted-difference">Weshalb können diese beiden bekannten Kontexte unterschiedliche Formen verlangen? (mindestens 85 Zeichen)</label>
    <textarea id="exhausted-difference" value={difference} rows={5} maxLength={1750} onChange={e=>setDifference(e.target.value)}/></div>
   <button type="button" className="button" disabled={!readyToReveal} onClick={()=>setStage('COMPARE')}>Eigene Antworten mit den Quellen vergleichen</button>
  </>:<>
   <section className="stack" aria-label="Alte Originalkontexte und Entwurfslösungen">
    {contexts.map(x=><SourceCompare key={x.item.id} x={x} values={responses[x.item.id]??{}}/>)}
   </section>
   <p><strong>Deine ursprüngliche Erklärung:</strong> {difference}</p>
   <div className="field"><label htmlFor="exhausted-repair">Formuliere eine korrigierte Regel und begründe konkret, welche Merkmale sich zwischen beiden Beispielen unterscheiden (mindestens 140 Zeichen)</label>
    <textarea id="exhausted-repair" value={repair} rows={6} maxLength={2200} onChange={e=>{setRepair(e.target.value);setStage('COMPARE')}}/></div>
   <div className="field"><label htmlFor="exhausted-example">Erfinde nun einen eigenständigen dritten Beispielsatz, in dem die Unterscheidung bedeutsam wäre (mindestens 100 Zeichen)</label>
    <textarea id="exhausted-example" value={newExample} rows={5} maxLength={1600} onChange={e=>{setNewExample(e.target.value);setStage('COMPARE')}}/></div>
   <div className="field"><label htmlFor="exhausted-why">Welche Form würdest du im eigenen Satz verwenden, und warum? (mindestens 85 Zeichen)</label>
    <textarea id="exhausted-why" value={explanation} rows={5} maxLength={1600} onChange={e=>{setExplanation(e.target.value);setStage('COMPARE')}}/></div>
   {stage==='COMPARE'&&<button type="button" className="button" disabled={!canFinish} onClick={()=>setStage('FINISHED')}>Eigenes Gegenbeispiel und Regel festhalten</button>}
   {stage==='FINISHED'&&<div className="panel" role="status">
    <strong>Kontrast und eigenes Beispiel verfasst.</strong>
    <p>Nur die beiden bekannten Aufgaben konnten mit bestehenden Entwurfslösungen abgeglichen werden. Dein neues Beispiel und seine Regel wurden **nicht** sprachlich geprüft, benotet oder als Transfernachweis gespeichert.</p>
    {plan.dueItem?<button type="button" className="button" onClick={()=>onDue(plan.dueItem!.id)}>Tatsächlich fällige Wiederholung starten · {plan.dueItem.id}</button>:
     <><p>Für dieses Thema liegt kein fälliger, validierter Wiederholungsabruf vor. Die vorhandene Quellenwerkstatt des G-Bereichs ermöglicht andere selbstständige Textarbeit, ist aber **kein** weiterer Test dieser identischen Autorenthemen.</p>
      <button type="button" className="button" onClick={()=>onSource(plan.skillId)}>Verwandte Quellenarbeit im G-Bereich öffnen</button></>}
   </div>}
  </>}
  {plan.nextDueAt!==null&&!plan.dueItem&&<p className="muted small">Nächste gespeicherte Kartenfälligkeit zu diesem Thema: {new Date(plan.nextDueAt).toLocaleString('de-DE')}.</p>}
  <p className="muted small">Alle Fragen und Lösungen sind bestehende DEMO_ONLY-Autorenentwürfe. Neue Reflexionen und eigene Beispiele bleiben nur bis zum Verlassen der Ansicht erhalten. Keine neue Aufgabe, kein Ergebnis oder Fortschrittseintrag wird erfunden.</p>
  <button type="button" className="button outline" onClick={onClose}>Kontrastübung schließen</button>
 </section>;
}
