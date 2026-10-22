import type {ProductionEntry,ProductionRevision,RevisionLens} from '../production/types';
import {productionPrompts} from '../production/prompts';
import {pragmaticScenarios} from '../pragmatics/pragmatics';
import {readingStudies} from '../reading/reading';
import {readingTransferBriefs} from '../reading/transfer';
import {isListeningEntry} from '../listening/listening';
import {isMediationEntry,mediationBriefs} from '../mediation/mediation';
import {isInteractionEntry,interactionScenarios} from '../interaction/interaction';
import {isEditorialEntry,editorialCases} from '../editorial/editorial';

export type ArchiveKind='M04'|'G08'|'G09_READING'|'G09_TRANSFER'|'G10_LISTENING'|'G13_MEDIATION'|'G12_INTERACTION'|'G11_EDITORIAL';
export type ArchiveFilter=ArchiveKind|'ALL';
export type ArchiveActivity='ALL'|'FIRST_ONLY'|'REVISED';
export type ArchivePeriod='ALL'|'7D'|'30D';
export type ArchiveRow={entry:ProductionEntry;kind:ArchiveKind;title:string;context:string;scope:string;lastAt:number;revisions:number;description:string;};
export type ArchiveQuery={kind:ArchiveFilter;activity:ArchiveActivity;period:ArchivePeriod;search:string;now:number};
const lookup=(id:string, list:readonly {id:string;title?:string;objective?:string}[])=>list.find(x=>x.id===id);
export function archiveKind(entry:ProductionEntry):ArchiveKind{
 if(isEditorialEntry(entry))return 'G11_EDITORIAL';
 if(isInteractionEntry(entry))return 'G12_INTERACTION';
 if(isMediationEntry(entry))return 'G13_MEDIATION';
 if(isListeningEntry(entry))return 'G10_LISTENING';
 if(entry.kind==='PRAGMATIC_STUDY')return 'G08';
 if(entry.kind==='READING_STUDY')return 'G09_READING';
 if(entry.kind==='READING_TRANSFER')return 'G09_TRANSFER';
 return 'M04';
}
export function archiveRow(entry:ProductionEntry):ArchiveRow{
 const kind=archiveKind(entry);
 const title=kind==='G11_EDITORIAL'?editorialCases.find(c=>c.id===entry.itemId)?.title:kind==='G12_INTERACTION'?interactionScenarios.find(s=>s.id===entry.itemId)?.title:kind==='G13_MEDIATION'?mediationBriefs.find(b=>b.id===entry.itemId)?.title:kind==='G10_LISTENING'?'Hörschärfe · Eigene Hörnotiz':kind==='M04'?productionPrompts.find(p=>p.id===entry.itemId)?.objective:
 kind==='G08'?lookup(entry.itemId,pragmaticScenarios)?.title:
 kind==='G09_READING'?lookup(entry.itemId,readingStudies)?.title:
 readingTransferBriefs.find(b=>b.unitId===entry.sourceId)?.title;
 const description=kind==='G11_EDITORIAL'?'Textredaktion · G11':kind==='G12_INTERACTION'?'Gespräch und Argumentation · G12':kind==='G13_MEDIATION'?'Sprachmittlung · G13':kind==='G10_LISTENING'?'Hörschärfe · G10':kind==='M04'?'Satzlabor · freie Formulierung':kind==='G08'?'Wirkung und Pragmatik':
 kind==='G09_READING'?'Lesestudie · Textbelege':'Lesen → Schreiben · Zielgruppenbrief';
 const context=kind==='G11_EDITORIAL'?editorialCases.find(c=>c.id===entry.itemId)?.objective:kind==='G12_INTERACTION'?interactionScenarios.find(s=>s.id===entry.itemId)?.context:kind==='G13_MEDIATION'?mediationBriefs.find(b=>b.id===entry.itemId)?.task:kind==='G10_LISTENING'?'Lernereigene Audiodatei (nicht gespeichert)':kind==='M04'?productionPrompts.find(p=>p.id===entry.itemId)?.instruction:
 kind==='G08'?pragmaticScenarios.find(s=>s.id===entry.itemId)?.task:
 kind==='G09_READING'?readingStudies.find(s=>s.id===entry.itemId)?.focus:
 readingTransferBriefs.find(b=>b.unitId===entry.sourceId)?.instruction;
 const lastAt=Math.max(entry.createdAt,...entry.revisions.map(r=>r.at).filter(n=>Number.isFinite(n)));
 return {entry,kind,title:title??'Historischer Entwurf ('+entry.itemId+')',context:context??'Originalinhalt inzwischen nicht mehr im Entwurfskatalog.',description,scope:kind==='G11_EDITORIAL'?'G11':kind==='G12_INTERACTION'?'G12':kind==='G13_MEDIATION'?'G13':kind==='G10_LISTENING'?'G10':kind==='M04'?'G04':kind==='G08'?'G08':'G09',lastAt,revisions:entry.revisions.length};
}
export function archiveRows(entries:readonly ProductionEntry[], query:ArchiveQuery):ArchiveRow[]{
 const term=query.search.trim().toLocaleLowerCase('de-DE');
 const periodMs=query.period==='7D'?7*86400000:query.period==='30D'?30*86400000:null;
 return entries.map(archiveRow).filter(row=>{
  if(query.kind!=='ALL'&&row.kind!==query.kind)return false;
  if(query.activity==='FIRST_ONLY'&&row.revisions>0)return false;
  if(query.activity==='REVISED'&&row.revisions===0)return false;
  if(periodMs!==null&&(!Number.isFinite(row.lastAt)||row.lastAt<query.now-periodMs||row.lastAt>query.now))return false;
  if(!term)return true;
  const texts=[row.title,row.context,row.description,row.entry.itemId,row.entry.sourceId??'',row.entry.decisionId??'',row.entry.original,...row.entry.revisions.flatMap(r=>[r.text,r.reflection,r.lens??'',r.paragraphId??'',r.questionId??'',...(r.selfChecks??[])])];
  return texts.join(' ').toLocaleLowerCase('de-DE').includes(term);
 }).sort((a,b)=>b.lastAt-a.lastAt||a.entry.id.localeCompare(b.entry.id));
}
export type Insight={firstDrafts:number;revisedEntries:number;revisionEvents:number;days:number;lastAt:number|null;lenses:Record<string,number>;selfChecks:number;reflections:number;questionAnswers:number};
export function archiveInsight(rows:readonly ArchiveRow[]):Insight{
 const revisionEvents=rows.flatMap(row=>row.entry.revisions);
 const days=new Set(rows.flatMap(row=>[row.entry.createdAt,...row.entry.revisions.map(r=>r.at)]).filter(Number.isFinite).map(t=>new Date(t).toISOString().slice(0,10)));
 const lenses:Record<string,number>={};
 for(const r of revisionEvents)if(r.lens)lenses[r.lens]=(lenses[r.lens]??0)+1;
 return {firstDrafts:rows.length,revisedEntries:rows.filter(r=>r.revisions>0).length,revisionEvents:revisionEvents.length,days:days.size,
 lastAt:rows.length?Math.max(...rows.map(r=>r.lastAt)):null,lenses,selfChecks:revisionEvents.reduce((n,r)=>n+(r.selfChecks?.length??0),0),
 reflections:revisionEvents.filter(r=>r.reflection.trim().length>0).length,questionAnswers:revisionEvents.filter(r=>!!r.questionId).length};
}
/** Read-only: No grading, automatic insight quality, mastery or predicted CEFR. */
export function versionPair(entry:ProductionEntry, index:number):{previous:string;current:string;revision:ProductionRevision}|null{
 const revision=entry.revisions[index];if(!revision)return null;
 return {previous:index===0?entry.original:entry.revisions[index-1].text,current:revision.text,revision};
}
