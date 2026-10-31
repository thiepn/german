import {domains} from '../../domain/content/registry';
import {availableModes,modes} from '../../domain/content/modes';
import type {Mode} from '../../domain/content/types';
import type {ProductionEntry} from '../../domain/production/types';
import type {ArchiveRow} from '../../domain/archive/archive';
import {linksForDomain,type LearningCallbacks} from '../../domain/journey/catalog';
import {recentWorkForDomain} from '../../domain/journey/continuation';
type CurriculumProps=LearningCallbacks & {onStart:(mode:Mode)=>void;productions:ProductionEntry[];onContinue:(row:ArchiveRow)=>void};
export default function Curriculum(props:CurriculumProps){
 return <section><h1 className="page-title">Lernen</h1><div className="grid">{domains.map(([id,label])=>{
  const mode=availableModes.find(m=>modes[m].domain===id);
  const links=linksForDomain(id);
  const recent=recentWorkForDomain(props.productions,id);
  return <article className="panel" key={id}><span className="kicker">{id}</span><h2>{label}</h2>
   <div className="buttonrow">{mode&&<button className="button outline" onClick={()=>props.onStart(mode)}>Übung: {modes[mode].label}</button>}
    {links.map(link=><button className="button outline" key={link.action} onClick={props[link.action]}>{link.curriculum}</button>)}
    {recent&&<button className="button outline" type="button" onClick={()=>props.onContinue(recent)}>Letzte Arbeit fortsetzen: {recent.title}</button>}
    {!mode&&links.length===0&&<p className="muted">Keine Übung verfügbar.</p>}
   </div></article>;
 })}</div></section>;
}
