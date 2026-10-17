import {useState} from 'react';
import {buildPortableBackup,inspectPortableBackup,backupCounts,type BackupRecords} from '../../persistence/portableBackup';
import {readAllRecords,mergeBackupRecords} from '../../persistence/schema';
export default function DataManagement({onExit,onRestore}:{onExit:()=>void;onRestore:()=>Promise<void>}){
 const [candidate,setCandidate]=useState<BackupRecords|null>(null);
 const [details,setDetails]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 async function exportBackup(){
  if(busy)return;
  setBusy(true);setError('');setDetails('');
  try{
   const text=await buildPortableBackup(await readAllRecords());
   const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download='sprachgefuehl-backup-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setDetails('Sicherung erstellt. Bewahre die Datei an einem sicheren Ort auf. Es wurde nichts gelöscht.');
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function chooseFile(file:File|undefined){
  setCandidate(null);setError('');setDetails('');
  if(!file)return;
  if(file.size>32*1024*1024){setError('Datei zu groß.');return;}
  setBusy(true);
  try{
   const result=await inspectPortableBackup(await file.text());
   setCandidate(result.records);
   const n=backupCounts(result.records);
   setDetails('Integrität bestätigt · '+result.createdAt+' · '+n.attempts+' Versuche · '+n.reviewEvents+' Wiederholungen · '+n.diagnosticSessions+' Diagnosesitzungen · '+n.productionEntries+' Schreibfassungen. Noch nichts importiert.');
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function restore(){
  if(!candidate||busy)return;
  setBusy(true);setError('');
  try{
   const result=await mergeBackupRecords(candidate);
   setCandidate(null);await onRestore();
   setDetails('Import abgeschlossen: '+result.inserted+' fehlende Datensätze ergänzt, '+result.skipped+' vorhandene unverändert belassen. Kein vorhandener Eintrag wurde überschrieben.');
  }catch(e){setError('Import abgebrochen, vorhandene Daten blieben erhalten: '+String(e))}finally{setBusy(false)}
 }
 return <section>
  <div className="eyebrow">Lokal · Privat · Ohne Konto</div>
  <h1 className="page-title">Daten & Sicherung</h1>
  <p className="lead">Deine Lernhistorie liegt in diesem Browser. Eine Datei ermöglicht dir, Versuche, Wiederholungen, Entwürfe, Schreibfassungen und Diagnosesitzungen selbst zu sichern.</p>
  <div className="stack">
   <article className="panel"><h2>Sicherung exportieren</h2><p className="muted">Die Datei enthält deine originalen Antworten und kann persönliche Angaben enthalten. Keine automatische Cloud-Übertragung.</p><button type="button" className="button" onClick={()=>void exportBackup()} disabled={busy}>JSON-Sicherung herunterladen</button></article>
   <article className="panel"><h2>Daten ergänzen</h2><p>Nur fehlende Datensätze werden importiert. Unterschiedliche vorhandene Versuche, Wiederholungen oder Diagnosen mit derselben ID sperren den gesamten Import. Einstellungen und der aktuelle Entwurf bleiben bei Konflikten unverändert.</p>
    <div className="field"><label htmlFor="backupFile">Eigene Sprachgefühl-Sicherung auswählen</label><input id="backupFile" type="file" accept="application/json,.json" disabled={busy} onChange={e=>void chooseFile(e.target.files?.[0])}/></div>
    {candidate&&<div className="buttonrow"><button type="button" className="button" disabled={busy} onClick={()=>void restore()}>Geprüfte Daten ergänzen</button><button type="button" className="button outline" onClick={()=>{setCandidate(null);setDetails('Import abgebrochen.')}}>Abbrechen</button></div>}
   </article>
  </div>
  {details&&<p className="feedback" role="status">{details}</p>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button type="button" className="button outline" onClick={onExit} disabled={busy}>Zurück zur Übersicht</button></div>
 </section>
}
