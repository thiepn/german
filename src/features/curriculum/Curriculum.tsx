import {domains} from '../../domain/content/registry';
import {availableModes,modes} from '../../domain/content/modes';
import type {Mode} from '../../domain/content/types';
export default function Curriculum({onStart,onReading,onPragmatics,onListening}:{onStart:(mode:Mode)=>void;onReading:()=>void;onPragmatics:()=>void;onListening:()=>void}){
 return <section><div className="eyebrow">Curriculum · 13 Bereiche</div><h1 className="page-title">Was möchtest du vertiefen?</h1><p className="lead">Sieben Übungsmodi, eine eigene unbewertete Hörschärfe sowie pragmatische Situationen und Lesestudien. Übungen sind ungeprüfte Entwürfe; fehlende Inhalte bleiben sichtbar.</p><div className="grid">{domains.map(([id,label])=>{
  const mode=availableModes.find(m=>modes[m].domain===id);
  return <article className="panel" key={id}><span className="kicker">{id}</span><h2>{label}</h2><p className="muted small">{mode?'Entwurfsübungen verfügbar':id==='G09'?'Lesestudien verfügbar':id==='G10'?'Hörschärfe mit eigener Audiodatei':'Noch keine objektiven Übungen'}</p>
  <div className="buttonrow">{mode&&<button className="button outline" onClick={()=>onStart(mode)}>Übung: {modes[mode].label}</button>}
  {id==='G08'&&<button className="button outline" onClick={onPragmatics}>Pragmatische Situationen</button>}
  {id==='G09'&&<button className="button outline" onClick={onReading}>Lesestudien öffnen</button>}{id==='G10'&&<button className="button outline" onClick={onListening}>Hörschärfe öffnen</button>}
  {!mode&&id!=='G08'&&id!=='G09'&&id!=='G10'&&<button className="button outline" disabled>In Vorbereitung</button>}</div></article>;
 })}</div></section>;
}
