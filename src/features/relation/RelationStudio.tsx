import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {relationStudies,isRelationEntry,beginRelation,appendRelation,appendRelationMemo,relationProgress,nextRelationStudy,nextRelation,savedRelation,latestRelationMemo,independentRelation,substantialRelationRevision,type RelationChoice} from '../../domain/relation/relation';

export default function RelationStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [selected,setSelected]=useState(relationStudies.some(s=>s.id===initialSelection)?initialSelection!:relationStudies[0].id);
 const [choice,setChoice]=useState<RelationChoice|''>(''),[rewrite,setRewrite]=useState(''),[alternative,setAlternative]=useState(''),[context,setContext]=useState(''),[boundary,setBoundary]=useState('');
 const [memo,setMemo]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=relationStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isRelationEntry(e)&&e.itemId===study.id&&e.sourceId===study.id&&e.itemVersion===study.version)??null;
 const next=nextRelation(study,entry),latest=entry?latestRelationMemo(entry):null,progress=relationProgress(entries);
 const dirty=[choice,rewrite,alternative,context,boundary,memo,reason].some(x=>x.trim().length>0);
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 const refresh=async()=>setEntries(await loadProductionEntries());
 function clear(){setChoice('');setRewrite('');setAlternative('');setContext('');setBoundary('');setMemo('');setReason('');setAnchor('');setError('')}
 function select(id:string){if(dirty&&!window.confirm('Ungespeicherte Texte für dieses Dokument verwerfen?'))return;setSelected(id);clear()}
 function exit(){if(dirty&&!window.confirm('Ungespeicherte Texte verwerfen?'))return;onExit()}
 async function saveEvidence(){
  if(!next||!choice||busy||!independentRelation(next,rewrite,alternative,context,boundary))return;
  setBusy(true);setError('');
  try{
   const result=!entry?beginRelation(study,next.id,choice,rewrite,alternative,context,boundary,Date.now()):appendRelation(entry,study,next.id,choice,rewrite,alternative,context,boundary,crypto.randomUUID(),Date.now());
   await saveProductionEntry(result,entry?.revisions.length??0);await refresh();clear();
  }catch(e){setError('Relationsbeleg nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 async function saveMemo(){
  if(!entry||next||busy)return;setBusy(true);setError('');
  try{
   const result=appendRelationMemo(entry,study,latest?'REWRITE':'TRANSFER',memo,reason,anchor,crypto.randomUUID(),Date.now());
   await saveProductionEntry(result,entry.revisions.length);await refresh();clear();
  }catch(e){setError('Vermerk nicht gespeichert: '+String(e));await refresh().catch(()=>{})}finally{setBusy(false)}
 }
 const ready=memo.trim().length>=560&&memo.trim().split(/\n\s*\n/).filter(Boolean).length>=2&&reason.trim().length>=110&&!!anchor&&(!latest||substantialRelationRevision(latest.text,memo));
 const memos=entry?.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??[];
 return <section className="polysemy-studio relation-studio">
  <h1 className="page-title">Konnektoren und Relationslogik</h1>
  <p className="small muted">{progress.started}/{progress.total} Quellen begonnen · {progress.analyses} Relationsanalysen · {progress.transferred} Vermerke · {progress.revised} Revisionen. Ohne automatische Bewertung.</p>
  <div className="field"><label htmlFor="relation-select">Quelldokument</label><select id="relation-select" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{relationStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  {nextRelationStudy(entries).id!==selected&&<button className="button outline" type="button" disabled={busy} onClick={()=>select(nextRelationStudy(entries).id)}>Nächstes Dokument öffnen</button>}
  <article className="panel polysemy-source"><div className="kicker">{study.band} · G04 · {study.id} · v{study.version}</div><h2>{study.title}</h2><p>{study.focus}</p>
   {study.paragraphs.map(p=><p key={p.id} className="polysemy-paragraph"><strong>{p.id}</strong> {p.text}</p>)}
   <p className="small muted">{study.status} · {study.rights.kind} · redaktionell ungeprüft</p>
  </article>
  {entry&&<section className="panel"><h2>Gespeicherte Relationsbelege</h2>{study.relations.map((point,i)=>{const saved=savedRelation(entry,point);if(!saved)return null;
   return <article key={point.id} className="polysemy-analysis"><h3>{i+1} · {point.relation} · {point.paragraphId}</h3>
    <p><strong>Eigene Relationsdeutung:</strong> <span className="written">{saved.rewrite}</span></p><p><strong>Falsche Relationsdeutung:</strong> <span className="written">{saved.alternative}</span></p>
    <p><strong>Kontextbeleg:</strong> <span className="written">{saved.context}</span></p><p><strong>Nicht belegt:</strong> <span className="written">{saved.boundary}</span></p>
    <details><summary>Quelle und ungeprüfte Musterdeutung</summary><p>„{point.quote}“</p><p>{point.model}</p><p>Fallstrick: {point.trap}</p><p>Gewählte Lesart: {point.options.find(o=>o.id===saved.choice)?.text}</p></details>
   </article>})}</section>}
  {next&&<section className="panel polysemy-task"><h2>Relationsbeleg {study.relations.indexOf(next)+1} / {study.relations.length}</h2><p><strong>{next.relation} · {next.paragraphId}:</strong> „{next.quote}“</p><p>{next.question}</p>
   <div className="field"><label htmlFor="relation-choice">Welche Relation stützt der vollständige Text?</label><select id="relation-choice" value={choice} disabled={busy} onChange={e=>setChoice(e.target.value as RelationChoice|'')}><option value="">Relation wählen</option>{next.options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></div>
   <div className="field"><label htmlFor="relation-rewrite">Formuliere die Relation eigenständig und mit erhaltener logischer Richtung</label><textarea id="relation-rewrite" rows={5} maxLength={1450} value={rewrite} onChange={e=>setRewrite(e.target.value)}/></div>
   <div className="field"><label htmlFor="relation-alternative">Formuliere eine naheliegende, aber hier falsche Relationsdeutung</label><textarea id="relation-alternative" rows={5} maxLength={1450} value={alternative} onChange={e=>setAlternative(e.target.value)}/></div>
   <div className="field"><label htmlFor="relation-context">Belege deine Entscheidung mit einer weiteren konkreten Quelleninformation</label><textarea id="relation-context" rows={5} maxLength={1650} value={context} onChange={e=>setContext(e.target.value)}/></div>
   <div className="field"><label htmlFor="relation-boundary">Welche zusätzliche Behauptung ist durch die Quelle nicht gedeckt?</label><textarea id="relation-boundary" rows={5} maxLength={1400} value={boundary} onChange={e=>setBoundary(e.target.value)}/></div>
   <button className="button" type="button" disabled={busy||!choice||!independentRelation(next,rewrite,alternative,context,boundary)} onClick={()=>void saveEvidence()}>Relationsbeleg speichern</button>
  </section>}
  {entry&&!next&&<section className="panel polysemy-transfer"><h2>{latest?'Adressatengerechte Revision':'Eigenständigen Relationsvermerk schreiben'}</h2><p>{study.brief}</p>
   {latest&&<><h3>Letzte Fassung</h3><p className="written">{latest.text}</p><button className="button outline" type="button" disabled={busy} onClick={()=>setMemo(latest.text)}>Letzte Fassung übernehmen</button></>}
   <div className="field"><label htmlFor="relation-anchor">Quellenanker für die Begründung</label><select id="relation-anchor" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="">Quellenbeleg wählen</option>{study.relations.map(p=><option key={p.id} value={p.id}>{p.relation} · {p.paragraphId}</option>)}</select></div>
   <div className="field"><label htmlFor="relation-memo">Eigenständiger mehrabsätziger Text zu allen drei Konnektorbeziehungen</label><textarea id="relation-memo" rows={12} maxLength={3900} value={memo} onChange={e=>setMemo(e.target.value)}/></div>
   <div className="field"><label htmlFor="relation-reason">Begründe die Relation und mindestens eine wesentliche Adressatenkorrektur</label><textarea id="relation-reason" rows={6} maxLength={1500} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {latest&&memo.trim()&&!substantialRelationRevision(latest.text,memo)&&<p role="status">Eine substanzielle Überarbeitung ist erforderlich.</p>}
   <button className="button" type="button" disabled={busy||!ready} onClick={()=>void saveMemo()}>{latest?'Überarbeitung speichern':'Relationsvermerk speichern'}</button>
   {memos.map((rev,i)=><article className="polysemy-writing" key={rev.id}><h3>{i+1} · {rev.questionId==='TRANSFER'?'Erster Vermerk':'Überarbeitete Fassung'}</h3><p className="written">{rev.text}</p><p><strong>Quellenanker:</strong> {rev.paragraphId} · <strong>Begründung:</strong> {rev.reflection}</p>
    {i>0&&<details><summary>Versionsvergleich</summary><div className="written version-diff">{revisionDiff(memos[i-1].text,rev.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</div></details>}
   </article>)}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}<div className="buttonrow"><button className="button outline" type="button" onClick={exit}>Zurück zum Curriculum</button></div>
 </section>;
}
