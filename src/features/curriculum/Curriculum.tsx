import {domains} from '../../domain/content/registry';
import {availableModes,modes} from '../../domain/content/modes';
import type {Mode} from '../../domain/content/types';
export default function Curriculum({onStart,onReading,onPragmatics,onListening,onMediation,onInteraction,onEditorial}:{onStart:(mode:Mode)=>void;onReading:()=>void;onPragmatics:()=>void;onListening:()=>void;onMediation:()=>void;onInteraction:()=>void;onEditorial:()=>void}){
 return <section><h1 className="page-title">Lernen</h1><div className="grid">{domains.map(([id,label])=>{
  const mode=availableModes.find(m=>modes[m].domain===id);
  return <article className="panel" key={id}><span className="kicker">{id}</span><h2>{label}</h2>
  <div className="buttonrow">{mode&&<button className="button outline" onClick={()=>onStart(mode)}>Übung: {modes[mode].label}</button>}
  {id==='G08'&&<button className="button outline" onClick={onPragmatics}>Pragmatische Situationen</button>}
  {id==='G09'&&<button className="button outline" onClick={onReading}>Lesestudien öffnen</button>}{id==='G10'&&<button className="button outline" onClick={onListening}>Hörschärfe öffnen</button>}{id==='G13'&&<button className="button outline" onClick={onMediation}>Sprachmittlung öffnen</button>}{id==='G12'&&<button className="button outline" onClick={onInteraction}>Gesprächsstrategien öffnen</button>}{id==='G11'&&<button className="button outline" onClick={onEditorial}>Textredaktion öffnen</button>}
  {!mode&&id!=='G08'&&id!=='G09'&&id!=='G10'&&id!=='G13'&&id!=='G12'&&id!=='G11'&&<button className="button outline" disabled>In Vorbereitung</button>}</div></article>;
 })}</div></section>;
}
