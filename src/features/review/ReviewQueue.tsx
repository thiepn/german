import type {ReviewCard,Exercise} from '../../domain/content/types';
export default function ReviewQueue({cards,byId,onStart}:{cards:ReviewCard[];byId:Map<string,Exercise>;onStart:(id:string)=>void}){
 const due=cards.filter(c=>c.dueAt<=Date.now()).sort((a,b)=>a.dueAt-b.dueAt);
 return <section><div className="eyebrow">Abrufen statt nachlesen</div><h1 className="page-title">Wiederholen</h1><p className="lead">{due.length} Karten sind heute fällig. Die Terminierung ist eine frühe deterministische Version und noch nicht als vollständiges FSRS-System qualifiziert.</p>{due.length===0?<div className="panel">Für heute steht keine Wiederholung an.</div>:due.map(c=><article className="listitem" key={c.id}><strong>{byId.get(c.itemId)?.skillId}</strong><p>{byId.get(c.itemId)?.prompt??'Lerninhalt nicht mehr verfügbar'}</p><button className="button outline" onClick={()=>onStart(c.itemId)} disabled={!byId.has(c.itemId)}>Antwort abrufen</button></article>)}</section>;
}
