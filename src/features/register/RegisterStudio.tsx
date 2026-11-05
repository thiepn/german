import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {revisionDiff} from '../../domain/production/continuity';
import {registerStudies,isRegisterEntry,registerProgress,beginRegister,appendRegister,firstRegister,registerStage,independentRegister} from '../../domain/register/register';
export default function RegisterStudio({initialSelection,onExit}:{initialSelection?:string;onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]),[selected,setSelected]=useState(registerStudies.some(s=>s.id===initialSelection)?initialSelection!:registerStudies[0].id);
 const [draft,setDraft]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const study=registerStudies.find(s=>s.id===selected)!;
 const entry=entries.find(e=>isRegisterEntry(e)&&e.itemId===study.id&&e.itemVersion===study.version)??null;
 const first=entry?firstRegister(entry):null,stage=entry?registerStage(entry):'FIRST',progress=registerProgress(entries);
 const revisions=entry?.revisions.filter(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??[];
 const last=revisions[revisions.length-1];
 useEffect(()=>{let live=true;void loadProductionEntries().then(rows=>{if(live)setEntries(rows)}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[]);
 function select(id:string){setSelected(id);setDraft('');setReason('');setError('')}
 async function save(){
  if(busy||!independentRegister(study,draft,reason))return;
  setBusy(true);setError('');
  try{
   const next=!entry?beginRegister(study,draft,reason,Date.now()):appendRegister(entry,study,stage==='FIRST'?'TRANSFER':stage,draft,reason,crypto.randomUUID(),Date.now());
   await saveProductionEntry(next,entry?.revisions.length??0);
   setEntries(await loadProductionEntries());setDraft('');setReason('');
  }catch(e){setError('Nicht gespeichert: '+String(e));await loadProductionEntries().then(setEntries).catch(()=>{})}finally{setBusy(false)}
 }
 const previous=stage==='TRANSFER'?first?.text:last?.text;
 const unchanged=!!previous&&previous.trim().replace(/\s+/g,' ')===draft.trim().replace(/\s+/g,' ');
 return <section className="polysemy-studio"><h1 className="page-title">Verantwortung und Register · G08</h1>
  <p className="small muted">{progress.started}/{progress.total} begonnen · {progress.transferred} Adressatenwechsel · {progress.revised} Revisionen. Unbewertet · DEMO_ONLY.</p>
  <div className="field"><label htmlFor="register-select">Quelldokument</label><select id="register-select" value={selected} disabled={busy} onChange={e=>select(e.target.value)}>{registerStudies.map(s=><option key={s.id} value={s.id}>{s.band} · {s.title}</option>)}</select></div>
  <article className="panel polysemy-source"><h2>{study.title}</h2><p>{study.focus}</p>{study.paragraphs.map(p=><p key={p.id}><strong>{p.id}</strong> {p.text}</p>)}<p className="small muted">{study.status} · {study.rights.kind}</p></article>
  <section className="panel"><h2>Quellenanker und eigene Entscheidung</h2><blockquote>„{study.anchor.quote}“</blockquote><p>{stage==='FIRST'?study.task:stage==='TRANSFER'?study.transfer:study.revision}</p>
   {first&&<details><summary>Unveränderliche erste Fassung</summary><p className="written">{first.text}</p><p>{first.reason}</p></details>}
   {last&&<><h3>Letzte Fassung</h3><p className="written">{last.text}</p><button className="button outline" type="button" disabled={busy} onClick={()=>setDraft(last.text)}>Als Ausgangspunkt übernehmen</button></>}
   <div className="field"><label htmlFor="register-draft">Eigenständiger mehrabsätziger Text (mindestens 360 Zeichen)</label><textarea id="register-draft" rows={12} maxLength={3500} value={draft} onChange={e=>setDraft(e.target.value)}/></div>
   <div className="field"><label htmlFor="register-reason">Begründe deine Register- und Verantwortungsentscheidungen anhand des Quellenankers (mindestens 110 Zeichen)</label><textarea id="register-reason" rows={6} maxLength={1300} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   {unchanged&&<p role="status">Unveränderte Fassung: keine Revision.</p>}
   <button className="button" type="button" disabled={busy||unchanged||!independentRegister(study,draft,reason)} onClick={()=>void save()}>{stage==='FIRST'?'Erstfassung sichern':stage==='TRANSFER'?'Adressatenwechsel sichern':'Revision sichern'}</button>
  </section>
  {revisions.map((r,i)=><article className="panel" key={r.id}><h3>{r.questionId==='TRANSFER'?'Adressatenwechsel':'Revision'} · {i+1}</h3><p className="written">{r.text}</p><p>{r.reflection}</p>{i>0&&<details><summary>Änderungen vergleichen</summary><div className="written version-diff">{revisionDiff(revisions[i-1].text,r.text).map((p,j)=><span key={j} className={'diff-'+p.kind}>{p.text} </span>)}</div></details>}</article>)}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}<button className="button outline" type="button" onClick={onExit}>Zurück zum Curriculum</button>
 </section>;
}
