import {useMemo,useState} from 'react';
import {archiveRows,archiveInsight,versionPair,type ArchiveFilter,type ArchiveActivity,type ArchivePeriod,type ArchiveKind} from '../../domain/archive/archive';
import {revisionDiff,LENSES} from '../../domain/production/continuity';
import type {ProductionEntry} from '../../domain/production/types';
const kinds:{value:ArchiveFilter;label:string}[]=[{value:'ALL',label:'Alle Textarten'},{value:'M04',label:'Satzlabor · G04'},{value:'G08',label:'Pragmatik · G08'},{value:'G09_READING',label:'Lesebelege · G09'},{value:'G09_TRANSFER',label:'Texttransfer · G09'},{value:'G10_LISTENING',label:'Hörschärfe · G10'}];
const formatDate=(at:number)=>Number.isFinite(at)?new Date(at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'Unbekannt';
export default function WritingArchive({entries,onOpen,onExit}:{entries:ProductionEntry[];onOpen:(kind:ArchiveKind,entry:ProductionEntry)=>void;onExit:()=>void}){
 const [kind,setKind]=useState<ArchiveFilter>('ALL');
 const [activity,setActivity]=useState<ArchiveActivity>('ALL');
 const [period,setPeriod]=useState<ArchivePeriod>('ALL');
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<string|null>(null);
 const [compare,setCompare]=useState<number|null>(null);
 const now=Date.now();
 const rows=useMemo(()=>archiveRows(entries,{kind,activity,period,search,now}),[entries,kind,activity,period,search,now]);
 const insight=useMemo(()=>archiveInsight(rows),[rows]);
 const active=rows.find(row=>row.entry.id===selected)??null;
 const diff=active&&compare!==null?versionPair(active.entry,compare):null;
 const changedFilter=()=>{setSelected(null);setCompare(null)};
 const lensTitle=(lens:string)=>lens in LENSES?LENSES[lens as keyof typeof LENSES].title:lens;
 return <section className="writing-archive"><div className="eyebrow">Dein Textarchiv · lokal und privat</div><h1 className="page-title">Schreibspuren</h1>
 <p className="lead">Eigene Aussagen, begründete Entscheidungen und Überarbeitungen wiederfinden. Die Auswertung beschreibt nur gespeicherte Handlungen, nicht die sprachliche Qualität oder ein GER-Niveau.</p>
 <div className="banner">Alle Texte bleiben DEMO_ONLY-Lernmaterial zugeordnet. Deine Formulierungen werden hier weder benotet noch automatisch korrigiert. Keine Cloud-Suche oder externe Auswertung.</div>
 <div className="archive-filters">
 <div className="field"><label htmlFor="archive-search">In eigenen Texten suchen</label><input id="archive-search" type="search" placeholder="Begriff, Thema, Satz oder Reflexion" value={search} onChange={e=>{setSearch(e.target.value);changedFilter()}}/></div>
 <div className="field"><label htmlFor="archive-kind">Textart</label><select id="archive-kind" value={kind} onChange={e=>{setKind(e.target.value as ArchiveFilter);changedFilter()}}>{kinds.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
 <div className="field"><label htmlFor="archive-activity">Überarbeitungen</label><select id="archive-activity" value={activity} onChange={e=>{setActivity(e.target.value as ArchiveActivity);changedFilter()}}><option value="ALL">Alle Fassungen</option><option value="FIRST_ONLY">Nur Erstfassung</option><option value="REVISED">Mindestens eine Überarbeitung</option></select></div>
 <div className="field"><label htmlFor="archive-period">Letzte Aktivität</label><select id="archive-period" value={period} onChange={e=>{setPeriod(e.target.value as ArchivePeriod);changedFilter()}}><option value="ALL">Jeder Zeitpunkt</option><option value="7D">Letzte 7 Tage</option><option value="30D">Letzte 30 Tage</option></select></div></div>
 <p className="small muted" aria-live="polite">{rows.length} passende Originaldatensätze. Gespeicherte Fassungen bleiben im Original erhalten, auch wenn sie hier ausgefiltert sind.</p>
 <div className="metrics"><div className="metric"><strong>{insight.firstDrafts}</strong><small>Dokumentierte Ersttexte</small></div><div className="metric"><strong>{insight.revisedEntries}</strong><small>Einträge mit Folgefassung</small></div><div className="metric"><strong>{insight.revisionEvents}</strong><small>Ergänzte Fassungen / Antworten</small></div><div className="metric"><strong>{insight.days}</strong><small>Aktive Kalendertage</small></div></div>
 <div className="panel"><h2>Beobachtbare Arbeitsweise</h2><p>{insight.reflections} gespeicherte Reflexionen · {insight.selfChecks} markierte Selbstprüfpunkte · {insight.questionAnswers} dokumentierte Leseantworten.</p>
 <p className="small muted">{Object.entries(insight.lenses).length?Object.entries(insight.lenses).map(([lens,count])=>lensTitle(lens)+': '+count).join(' · '):'Noch kein expliziter Überarbeitungsfokus dokumentiert.'} Diese Zählungen belegen keine grammatische Verbesserung.</p></div>
 <div className="archive-layout"><div className="panel archive-index"><h2>Eigene Arbeiten</h2>{rows.length?rows.map(row=><button type="button" className={'archive-entry'+(active?.entry.id===row.entry.id?' is-selected':'')} aria-pressed={active?.entry.id===row.entry.id} key={row.entry.id} onClick={()=>{setSelected(row.entry.id);setCompare(null)}}><strong>{row.title}</strong><span className="small muted">{row.description} · {formatDate(row.lastAt)}</span><span className="small">{row.revisions?row.revisions+' weitere gespeicherte Fassungen':'Nur ursprüngliche Fassung'}</span></button>):<p className="muted">Keine passenden Einträge. Du kannst Suche oder Filter zurücksetzen.</p>}</div>
 <div className="panel archive-detail">{active?<><div className="kicker">{active.description}</div><h2>{active.title}</h2><p className="small muted">Aufgabe: {active.context}</p><p className="small muted">Original-ID: {active.entry.id} · Version: {active.entry.itemVersion} · Erste Speicherung: {formatDate(active.entry.createdAt)} · Letzte Aktivität: {formatDate(active.lastAt)}</p>
 <h3>Unveränderliche Erstfassung</h3><p className="written archive-written">{active.entry.original}</p>
 {active.entry.revisions.map((r,i)=><section className="archive-revision" key={r.id}><div className="kicker">{r.questionId?(active.kind==='G10_LISTENING'?'Hörbeleg ':'Leseantwort ')+r.questionId:'Weitere Fassung '+(i+1)} · {formatDate(r.at)}</div><p className="written">{r.text}</p>{r.paragraphId&&<p className="small muted">Dokumentierter Textbeleg: {r.paragraphId}</p>}{r.lens&&<p className="small muted">Selbst gewählter Fokus: {lensTitle(r.lens)}</p>}{r.selfChecks?.length?<ul className="small">{r.selfChecks.map((x,j)=><li key={j}>{x} — vom Lernenden markiert</li>)}</ul>:null}{r.reflection&&<p className="small">Eigene Reflexion: {r.reflection}</p>}<button className="button outline" type="button" aria-pressed={compare===i} onClick={()=>setCompare(compare===i?null:i)}>Mit vorheriger Fassung vergleichen</button></section>)}
 {diff&&<section className="archive-comparison" aria-label="Historischer Versionsvergleich"><h3>Gegenüberstellung · kein Qualitätsurteil</h3><div className="archive-columns"><div><strong>Vorher</strong><p className="written">{diff.previous}</p></div><div><strong>Danach</strong><p className="written">{diff.current}</p></div></div><div className="written version-diff">{revisionDiff(diff.previous,diff.current).map((part,i)=><span key={i} className={'diff-'+part.kind}>{part.text} </span>)}</div><p className="small muted">Unterstrichen: ergänzt · Durchgestrichen: entfernt. Das Verfahren beurteilt weder Stil noch Grammatik.</p></section>}
 <div className="buttonrow"><button className="button" type="button" onClick={()=>onOpen(active.kind,active.entry)}>Originalen Lernbereich öffnen</button></div>
 </>:<><h2>Textverlauf auswählen</h2><p className="muted">Wähle links einen Eintrag, um alle gespeicherten Formulierungen, Belege und Überarbeitungen zu lesen.</p></>}</div></div>
 <div className="buttonrow"><button className="button outline" onClick={onExit}>Zurück zum Fortschritt</button></div></section>;
}
