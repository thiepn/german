import {domains,availableDomains} from '../../domain/content/registry';
import {availableModes,modes} from '../../domain/content/modes';
import type {Mode} from '../../domain/content/types';
export default function Curriculum({onStart}:{onStart:(mode:Mode)=>void}){
 return <section><div className="eyebrow">Curriculum · alle Bereiche offen</div><h1 className="page-title">Was möchtest du vertiefen?</h1><p className="lead">13 Domänen von Grammatik über Nuancen bis zur Mediation. G01, G02, G03, G04 und G07 enthalten derzeit SG-01-Demomaterial; alle anderen Bereiche sind geplant.</p><div className="grid">{domains.map(([id,label])=><article className="panel" key={id}><span className="kicker">{id}</span><h2>{label}</h2><p className="muted small">{availableDomains.has(id)?'Entwurfsübungen verfügbar':'Inhalt noch nicht implementiert'}</p><button className="button outline" disabled={!availableDomains.has(id)} onClick={()=>onStart(availableModes.find(m=>modes[m].domain===id) ?? 'M01')}>Üben</button></article>)}</div></section>;
}
