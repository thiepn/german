import {useEffect,useState} from 'react';
import type {ProductionEntry} from '../../domain/production/types';
import {loadProductionEntries,saveProductionEntry} from '../../persistence/schema';
import {delayedWritingSummary,saveColdRecall,saveSourceRepair} from '../../domain/journey/delayedWriting';

export default function DelayedWritingReview({onExit}:{onExit:()=>void}){
 const [entries,setEntries]=useState<ProductionEntry[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [text,setText]=useState(''),[reason,setReason]=useState(''),[anchor,setAnchor]=useState('');
 const now=Date.now(),summary=delayedWritingSummary(now,entries),selected=summary.selected;
 const refresh=async()=>setEntries(await loadProductionEntries());
 useEffect(()=>{let active=true;void loadProductionEntries().then(e=>{if(active)setEntries(e)}).catch(e=>{if(active)setError(String(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 async function save(stage:'RECALL'|'REPAIR'){
  if(!selected||busy)return;setBusy(true);setError('');
  try{
   // Never use a stale React closure or overwrite a competing tab.
   const fresh=(await loadProductionEntries()).find(e=>e.id===selected.row.entry.id);
   if(!fresh)throw Error('Quellarbeit nicht mehr vorhanden.');
   const next=stage==='RECALL'?saveColdRecall(fresh,selected,text,reason,crypto.randomUUID(),Date.now()):
    saveSourceRepair(fresh,selected,text,reason,anchor,crypto.randomUUID(),Date.now());
   await saveProductionEntry(next,fresh.revisions.length);
   await refresh();setText('');setReason('');setAnchor('');
  }catch(e){setError('Abruf nicht gespeichert: '+String(e));await refresh().catch(()=>{})}
  finally{setBusy(false)}
 }
 const canRecall=!!selected&&!selected.pendingRepair&&text.trim().length>=150&&text.length<=2600&&reason.trim().length>=60&&reason.length<=850;
 const canRepair=!!selected&&selected.pendingRepair&&text.trim().length>=170&&text.length<=2600&&reason.trim().length>=90&&reason.length<=1000&&!!anchor;
 return <section className="delayed-writing">
  <h1 className="page-title">Späterer Abruf und Quellenkorrektur</h1>
  <p className="lead">Erst frei aus dem Gedächtnis rekonstruieren, dann mit dem ursprünglichen eigenen Text und der Quellenstelle vergleichen. Ohne automatische Bewertung.</p>
  <p className="muted small">Erledigte Abruf-Korrektur-Paare: {summary.finished} · offener Quellenabgleich: {summary.pending} · fällige weitere Abrufe: {summary.due}. Feste Übungsabstände: 1, 7 und 21 Tage nach der letzten einschlägigen Arbeit; keine wissenschaftlich kalibrierte Gedächtnisprognose.</p>
  {loading?<p role="status">Gespeicherte Texte laden …</p>:!selected?<section className="panel" aria-label="Kein fälliger Textabruf"><h2>Kein Textabruf fällig</h2>
   <p>{summary.upcomingAt?'Nächster geplanter Abruf: '+new Date(summary.upcomingAt).toLocaleString('de-DE')+'.':'Schreibe zuerst einen eigenen Transfertext in einer der vorhandenen Quellenstudien. Der erste Abruf ist frühestens 24 Stunden später möglich.'}</p>
   <p className="muted small">Die Aufgaben bleiben im Curriculum verfügbar. Frühere Quellenversionen werden nicht durch aktuelle Entwürfe ersetzt.</p>
  </section>:<section className="panel" aria-label="Fälliger Textabruf">
   <p className="kicker">{selected.row.scope} · {selected.row.entry.itemId} · v{selected.row.entry.itemVersion} · Abruf {selected.round} / 3</p>
   <h2>{selected.source.title}</h2>
   {!selected.pendingRepair?<><p>**Ohne** deine frühere Formulierung oder das Quelldokument einzusehen: Rekonstruiere die wichtigste Aussage, ihren Geltungsbereich und eine plausible Fehlinterpretation in einem zusammenhängenden Text.</p>
     <p className="muted small">Die vorherige Fassung und die Quellabsätze bleiben bis zum Speichern ausgeblendet. Dies ist eine Selbstübung, keine benotete Prüfung.</p>
     <div className="field"><label htmlFor="delayed-text">Erinnerte Darstellung in eigenen Worten (mindestens 150 Zeichen)</label><textarea id="delayed-text" value={text} rows={9} maxLength={2600} onChange={e=>setText(e.target.value)}/></div>
     <div className="field"><label htmlFor="delayed-reason">Was ist unsicher oder könnte falsch erinnert sein? (mindestens 60 Zeichen)</label><textarea id="delayed-reason" value={reason} rows={4} maxLength={850} onChange={e=>setReason(e.target.value)}/></div>
     <button type="button" className="button" disabled={busy||!canRecall} onClick={()=>void save('RECALL')}>Ungestützten Abruf speichern</button>
    </>:<><p>Deine frühere Formulierung und die Ausgangsquelle sind jetzt sichtbar. Vergleiche sie mit der gespeicherten Erinnerung und korrigiere mindestens eine konkrete Auslassung, Behauptung oder unklare Abgrenzung. Begründe anhand eines Quellabsatzes.</p>
     <article className="panel"><h3>Ungestützter Abruf · unveränderlich</h3><p className="written">{selected.recall?.text}</p><p><strong>Offene Unsicherheit:</strong> {selected.recall?.reflection}</p></article>
     <article className="panel"><h3>Gespeicherte frühere Fassung</h3><p className="written">{selected.baseline.text}</p></article>
     <article className="panel"><h3>Ausgangsquelle · {selected.row.entry.itemId} v{selected.row.entry.itemVersion}</h3>{selected.source.paragraphs.map(p=><p key={p.id}><strong>{p.id}:</strong> {p.text}</p>)}</article>
     <div className="field"><label htmlFor="delayed-paragraph">Quellenabsatz für die konkrete Korrektur</label><select id="delayed-paragraph" value={anchor} onChange={e=>setAnchor(e.target.value)}><option value="">Absatz auswählen</option>{selected.source.paragraphs.map(p=><option key={p.id} value={p.id}>{p.id}</option>)}</select></div>
     <div className="field"><label htmlFor="delayed-text">Eigenständige korrigierte Darstellung (mindestens 170 Zeichen)</label><textarea id="delayed-text" value={text} rows={10} maxLength={2600} onChange={e=>setText(e.target.value)}/></div>
     <div className="field"><label htmlFor="delayed-reason">Welche Erinnerung war falsch oder unvollständig, und was belegt der gewählte Absatz? (mindestens 90 Zeichen)</label><textarea id="delayed-reason" value={reason} rows={5} maxLength={1000} onChange={e=>setReason(e.target.value)}/></div>
     <button type="button" className="button" disabled={busy||!canRepair} onClick={()=>void save('REPAIR')}>Quellengebundene Korrektur speichern</button>
    </>}
  </section>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <button className="button outline" type="button" onClick={onExit}>Zurück zu Heute</button>
 </section>;
}
