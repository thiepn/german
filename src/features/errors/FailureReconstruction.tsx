import {useState} from 'react';
import type {FailedDelayedCase,VerifiableStep} from '../../domain/errors/delayedFailure';

const normalize=(s:string)=>s.trim().toLocaleLowerCase('de-DE').replace(/\s+/g,' ');
const ownWords=(a:string,b:string)=>new Set((normalize(a).match(/[\p{L}\p{N}]+/gu)??[])
 .filter(x=>!(normalize(b).match(/[\p{L}\p{N}]+/gu)??[]).includes(x))).size>=5;
function preservedAnswer(step:VerifiableStep){
 return step.item.slots.map(s=>step.attempt.slots[s.id]?.trim()||'—').join(' · ');
}
function authoredSolutions(step:VerifiableStep){
 return step.item.variants.map(v=>step.item.slots.map(s=>v.slots[s.id]).join(' · ')).join(' / ');
}
function Compare({step,label}:{step:VerifiableStep;label:string}){
 return <article className="panel">
  <h4>{label} · {step.item.id} v{step.item.version}</h4>
  <p><strong>Ausgangsfrage:</strong> {step.item.prompt}</p>
  <p><strong>Gespeicherter Erstversuch:</strong> {preservedAnswer(step)}</p>
  <p><strong>Autorenentwurf zur Antwort:</strong> {authoredSolutions(step)}</p>
  <p>{step.item.explanation}</p>
  <p><strong>Im Entwurf benannte Verwechslungsgefahr:</strong> {step.item.misconception}</p>
 </article>;
}
/** An embedded local-only learning activity; never writes fictional attempts or grades. */
export default function FailureReconstruction({caseData,hasDue,onPractice,onClose}:{
 caseData:FailedDelayedCase;hasDue:boolean;
 onPractice:(kind:'DUE'|'FRESH')=>void;onClose:()=>void;
}){
 const [phase,setPhase]=useState<'RECALL'|'COMPARE'|'READY'>('RECALL');
 const [rule,setRule]=useState(''),[difference,setDifference]=useState(''),[repaired,setRepaired]=useState('');
 const canCompare=rule.trim().length>=85&&difference.trim().length>=60&&normalize(rule)!==normalize(difference);
 const canFinish=repaired.trim().length>=130&&ownWords(repaired,rule)&&ownWords(repaired,difference);
 return <section className="panel error-reconstruction" role="region" aria-label={'Fehlerrekonstruktion '+caseData.delayedFailure.item.id}>
  <h3>Fehler rekonstruieren · verzögerter neuer Kontext</h3>
  <p className="muted small">Beobachtete Reihenfolge: früherer unsicherer Erstversuch → anderer Kontext beim ersten Mal richtig → mindestens 24 Stunden später weiterer neuer Kontext beim ersten Mal unsicher. Wir können daraus keine identische Fehlerursache oder Sprachkompetenzstufe ableiten.</p>
  <p><strong>Spätere Aufgabe:</strong> {caseData.delayedFailure.item.prompt}</p>
  <p><strong>Deine gespeicherte Erstantwort:</strong> {preservedAnswer(caseData.delayedFailure)}</p>
  {phase==='RECALL'?<>
   <p>Rekonstruiere zunächst aus eigener Überlegung die Regel und ihren Geltungsbereich. Vergleiche noch nicht die drei früheren Musterlösungen unten.</p>
   <div className="field"><label htmlFor="reconstruction-rule">Welche Regel oder Unterscheidung hätte die Antwort bestimmen müssen? (mindestens 85 Zeichen)</label>
    <textarea id="reconstruction-rule" value={rule} rows={5} maxLength={1700} onChange={e=>setRule(e.target.value)}/></div>
   <div className="field"><label htmlFor="reconstruction-contrast">Worin könnte sich dieser Fall vom zuvor richtig gelösten unterscheiden? (mindestens 60 Zeichen)</label>
    <textarea id="reconstruction-contrast" value={difference} rows={4} maxLength={1000} onChange={e=>setDifference(e.target.value)}/></div>
   <button type="button" className="button" disabled={!canCompare} onClick={()=>setPhase('COMPARE')}>Erstantworten und Regeln vergleichen</button>
  </>:<>
   <section className="stack" aria-label="Quellengetreue Vergleichsaufgaben">
    <Compare step={caseData.earlierError} label="1 · Erster unsicherer Kontext"/>
    <Compare step={caseData.firstTransfer} label="2 · Neuer Kontext mit richtiger Erstantwort"/>
    <Compare step={caseData.delayedFailure} label="3 · Verzögert erneut unsicher"/>
   </section>
   <article className="panel"><h4>Deine erste Rekonstruktion</h4><p>{rule}</p><p>{difference}</p></article>
   <div className="field"><label htmlFor="reconstruction-repair">Korrigiere deine Regel und begründe den Unterschied an den konkreten Formulierungen (mindestens 130 Zeichen)</label>
    <textarea id="reconstruction-repair" value={repaired} rows={6} maxLength={2100} onChange={e=>{setRepaired(e.target.value);setPhase('COMPARE')}}/></div>
   {phase==='COMPARE'&&<button type="button" className="button" disabled={!canFinish} onClick={()=>setPhase('READY')}>Korrektur selbst abgleichen und nächsten Schritt wählen</button>}
   {phase==='READY'&&<div role="status" className="panel"><strong>Eigenständige Korrekturerklärung formuliert.</strong><p>Sie wurde weder automatisch auf sprachliche Richtigkeit geprüft noch als Erfolg gespeichert. Nur eine tatsächlich beantwortete Folgeaufgabe liefert neue objektive Übungsdaten.</p></div>}
   {phase==='READY'&&hasDue&&<><p>Die unsichere Aufgabe hat bereits eine fällige Wiederholungskarte. Zunächst den echten Abruf bearbeiten; die ursprüngliche Erstantwort bleibt erhalten.</p>
    <button type="button" className="button" onClick={()=>onPractice('DUE')}>Fällige Aufgabe abrufen</button></>}
   {phase==='READY'&&!hasDue&&caseData.nextItem&&<><p>Nächster unbenutzter Kontext mit exakt demselben Übungsmodus, Skill und Autorenthema: {caseData.nextItem.id} v{caseData.nextItem.version}. Die Aufgabe wird erst durch deine Antwort als Versuch gespeichert.</p>
    <button type="button" className="button" onClick={()=>onPractice('FRESH')}>Neuen unabhängigen Kontext öffnen</button></>}
   {phase==='READY'&&!hasDue&&!caseData.nextItem&&<p>Zu genau diesem Übungsthema ist kein weiterer unbenutzter aktueller Kontext vorhanden. Es wird kein Ersatz als identischer Transfer ausgegeben.</p>}
  </>}
  <p className="muted small">Die freie Rekonstruktion bleibt nur in dieser Ansicht. Beim Verlassen oder Neuladen wird sie nicht gespeichert. Der historische Fehler, die Quellenfassungen und die regulären Übungsdaten bleiben unverändert. Alle Musterlösungen sind DEMO_ONLY-Autorenentwürfe.</p>
  <button type="button" className="button outline" onClick={onClose}>Rekonstruktion schließen</button>
 </section>;
}
