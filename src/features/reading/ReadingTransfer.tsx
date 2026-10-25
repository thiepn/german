import {useState} from 'react';
import {readingTransferFor,readingTransferId} from '../../domain/reading/transfer';
import type {ProductionEntry} from '../../domain/production/types';
import {saveProductionEntry} from '../../persistence/schema';
export default function ReadingTransfer({unitId,entries,onSaved}:{unitId:string;entries:ProductionEntry[];onSaved:()=>Promise<void>}){
 const brief=readingTransferFor(unitId);
 const existing=entries.find(e=>e.kind==='READING_TRANSFER'&&e.sourceId===unitId&&e.id===readingTransferId(unitId));
 const [first,setFirst]=useState('');
 const [newDraft,setNewDraft]=useState('');
 const [reflection,setReflection]=useState('');
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 if(!brief)return null;
 async function save(isRevision:boolean){
  if(!brief)throw Error('Transferaufgabe nicht verfügbar.');
  const text=(isRevision?newDraft:first).trim();if(!text||busy)return;
  setBusy(true);setError('');
  try{
   if(isRevision){
    if(!existing)throw Error('Kein erster Entwurf vorhanden.');
    await saveProductionEntry({...existing,revisions:[...existing.revisions,{id:crypto.randomUUID(),at:Date.now(),text,reflection:reflection.trim(),lens:'REGISTER'}]},existing.revisions.length);
    setNewDraft('');setReflection('');
   }else{
    if(existing)return;
    await saveProductionEntry({id:readingTransferId(unitId),kind:'READING_TRANSFER',sourceId:unitId,itemId:brief.id,itemVersion:brief.version,createdAt:Date.now(),original:text,revisions:[],evaluated:'UNASSESSED'},0);
    setFirst('');
   }
   await onSaved();setOpen(true);
  }catch(e){setError('Texttransfer nicht gespeichert: '+String(e))}finally{setBusy(false)}
 }
 return <section className="panel"><h2>{brief.title}</h2><p><strong>Zielgruppe:</strong> {brief.audience}. <strong>Register:</strong> {brief.register.replaceAll('_',' ').toLowerCase()}.</p><p>{brief.instruction}</p>
 {!existing?<><div className="field"><label htmlFor="transfer-first">Dein erster adressatengerechter Text</label><textarea id="transfer-first" rows={6} value={first} onChange={e=>setFirst(e.target.value)} maxLength={2500}/></div>
 <button className="button" onClick={()=>void save(false)} disabled={!first.trim()||busy}>Erstfassung des Texttransfers speichern</button></>:<>
 <p><strong>Unveränderliche Erstfassung</strong></p><p className="written">{existing.original}</p>
 <div className="buttonrow"><button className="button outline" onClick={()=>setOpen(x=>!x)}>{open?'Prüfkriterien ausblenden':'Eigene Prüfkriterien anzeigen'}</button></div>
 {open&&<ul>{brief.checks.map(check=><li key={check}>{check}</li>)}</ul>}
 {existing.revisions.map((r,i)=><div key={r.id} className="reading-transfer-history"><strong>Übertragung {i+1}</strong><p className="written">{r.text}</p>{r.reflection&&<p className="muted">{r.reflection}</p>}</div>)}
 <div className="field"><label htmlFor="transfer-revision">Überarbeite für die Zielgruppe</label><textarea id="transfer-revision" rows={5} value={newDraft} onChange={e=>setNewDraft(e.target.value)} maxLength={2500}/></div>
 <div className="field"><label htmlFor="transfer-reflection">Welche Aussage oder Formulierung hast du verbessert? (optional)</label><textarea id="transfer-reflection" rows={3} value={reflection} onChange={e=>setReflection(e.target.value)} maxLength={1000}/></div>
 <button className="button" onClick={()=>void save(true)} disabled={!newDraft.trim()||busy}>Neue Fassung ergänzen</button>
 </>}
 {error&&<p role="alert" className="banner">{error}</p>}</section>;
}
