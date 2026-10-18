import {domains,availableDomains} from '../../domain/content/registry';
import {availableModes,modes} from '../../domain/content/modes';
import type {Mode} from '../../domain/content/types';
export default function Curriculum({onStart,onReading}:{onStart:(mode:Mode)=>void;onReading:()=>void}){
 return <section><div className="eyebrow">Curriculum · alle Bereiche offen</div><h1 className="page-title">Was möchtest du vertiefen?</h1><p className="lead">13 Domänen von Grammatik über Nuancen bis zur Mediation. G01–G04 und G07 enthalten begrenztes Übungsmaterial. G09 bietet vier unbewertete Lesestudien. Alle anderen Bereiche sind geplant.</p><div className="grid">{domains.map(([id,label])=><article className="panel" key={id}><span className="kicker">{id}</span><h2>{label}</h2><p className="muted small">{id==='G09'?'Lesestudien verfügbar':availableDomains.has(id)?'Entwurfsübungen verfügbar':'Inhalt noch nicht implementiert'}</p><button className="button outline" disabled={!availableDomains.has(id)&&id!=='G09'} onClick={()=>id==='G09'?onReading():onStart(availableModes.find(m=>modes[m].domain===id) ?? 'M01')}>{id==='G09'?'Lesestudien öffnen':'Üben'}</button></article>)}</div></section>;
}
