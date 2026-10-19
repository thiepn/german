import {useState} from 'react';
import {buildPortableBackup,inspectPortableBackup,backupCounts,type BackupRecords} from '../../persistence/portableBackup';
import {readAllRecords,mergeBackupRecords} from '../../persistence/schema';
import {listeningEvidence} from '../../domain/listening/listening';
export default function DataManagement({onExit,onRestore,onListening}:{onExit:()=>void;onRestore:()=>Promise<void>;onListening:()=>void}){
 const [candidate,setCandidate]=useState<BackupRecords|null>(null);
 const [details,setDetails]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [listeningRecovered,setListeningRecovered]=useState(false);
 async function exportBackup(){
  if(busy)return;
  setBusy(true);setError('');setDetails('');
  try{
   const original=await readAllRecords();
   const listening=listeningEvidence(original.productionEntries);
   const text=await buildPortableBackup(original);
   const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download='sprachgefuehl-backup-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setDetails('Sicherung erstellt. '+listening.sessions+' Hörsitzungen und '+listening.notes+' Hörbelege enthalten; Audio-Dateien fehlen absichtlich. Bewahre die Datei sicher auf.');
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
   const listening=listeningEvidence(result.records.productionEntries);
   setDetails('Integrität bestätigt · '+result.createdAt+' · '+n.attempts+' Versuche · '+n.reviewEvents+' Wiederholungen · '+n.diagnosticSessions+' Diagnosesitzungen · '+n.productionEntries+' Schreibfassungen · '+listening.sessions+' Hörsitzungen mit '+listening.notes+' Hörbelegen. Audio ist nicht enthalten. Noch nichts importiert.');
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function restore(){
  if(!candidate||busy)return;
  setBusy(true);setError('');
  try{
   const listening=listeningEvidence(candidate.productionEntries);
   const result=await mergeBackupRecords(candidate);
   setCandidate(null);await onRestore();setListeningRecovered(listening.sessions>0);
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
  {listeningRecovered&&<div className="panel"><h2>Hörschärfe fortsetzen</h2><p className="small muted">Importierte Hörnotizen sind wieder verfügbar. Bitte Originalaudio lokal erneut auswählen und die Prüfsumme überprüfen; ältere Sitzungen ohne Prüfsumme verlangen eine bewusste Bestätigung.</p><button className="button outline" type="button" onClick={onListening}>Hörsitzungen öffnen</button></div>}
  {error&&<p className="feedback incorrect" role="alert">{error}</p>}
  <div className="buttonrow"><button type="button" className="button outline" onClick={onExit} disabled={busy}>Zurück zur Übersicht</button></div>
 </section>
}
