import raw from '../../../content/fixtures/g11-attribution.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type AttributionChoice='A'|'B';
export type AttributionAnchor={id:string;paragraphId:string;speaker:string;quote:string;question:string;options:{id:AttributionChoice;text:string}[];preferredId:AttributionChoice;model:string};
export type AttributionStudy={id:string;version:1;domain:'G11';band:'C1'|'C2';title:string;genre:string;focus:string;brief:string;paragraphs:{id:string;text:string}[];anchors:AttributionAnchor[];status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const attributionStudies:AttributionStudy[]=raw as AttributionStudy[];
export const attributionId=(id:string)=>'attribution:'+id;
export const isAttributionEntry=(e:ProductionEntry)=>e.kind==='ATTRIBUTION_STUDY'&&e.id===attributionId(e.itemId);
export const attributionSource=(e:ProductionEntry):AttributionStudy|null=>isAttributionEntry(e)?attributionStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const MARK_QUOTE='\n\nEigene Zitateinbettung:\n',MARK_LIMIT='\n\nGrenze des Belegs:\n';
const normalize=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const choiceValid=(a:AttributionAnchor,c:string):c is AttributionChoice=>(c==='A'||c==='B')&&a.options.some(o=>o.id===c);
function unpackPair(value:string):{paraphrase:string;embedded:string}|null{
 const i=value.indexOf(MARK_QUOTE);if(i<1||value.indexOf(MARK_QUOTE,i+MARK_QUOTE.length)>=0)return null;
 const paraphrase=value.slice(0,i).trim(),embedded=value.slice(i+MARK_QUOTE.length).trim();
 return paraphrase&&embedded?{paraphrase,embedded}:null;
}
function unpackFirst(value:string):{paraphrase:string;embedded:string;limit:string}|null{
 const i=value.indexOf(MARK_LIMIT);if(i<1)return null;
 const pair=unpackPair(value.slice(0,i)),limit=value.slice(i+MARK_LIMIT.length).trim();
 return pair&&limit?{...pair,limit}:null;
}
const join=(paraphrase:string,embedded:string)=>paraphrase.trim()+MARK_QUOTE+embedded.trim();
export function independentAttribution(a:AttributionAnchor,paraphrase:string,embedded:string,limit:string):boolean{
 const quote='„'+a.quote+'“';
 return valid(paraphrase,75,1250)&&valid(embedded,80,1550)&&valid(limit,50,950)&&
 !normalize(paraphrase).includes(normalize(a.quote))&&normalize(paraphrase)!==normalize(a.options[0].text)&&normalize(paraphrase)!==normalize(a.options[1].text)&&
 embedded.includes(quote)&&embedded.split(quote).length===2&&embedded.length>quote.length+30&&
 normalize(paraphrase)!==normalize(embedded)&&!normalize(embedded).includes(normalize(a.paragraphId+' '+a.quote));
}
export type AttributionEvidence={anchorId:string;paragraphId:string;choice:AttributionChoice;paraphrase:string;embedded:string;limit:string;initial:boolean};
export function firstAttributionEvidence(e:ProductionEntry):AttributionEvidence|null{
 const source=attributionSource(e),a=source?.anchors[0],parts=e.decisionId?.split('|'),unpacked=unpackFirst(e.original);
 if(!a||!parts||parts.length!==3||parts[0]!==a.id||parts[2]!==a.paragraphId||!choiceValid(a,parts[1])||!unpacked||!independentAttribution(a,unpacked.paraphrase,unpacked.embedded,unpacked.limit))return null;
 return {anchorId:a.id,paragraphId:a.paragraphId,choice:parts[1],...unpacked,initial:true};
}
export function savedAttributionEvidence(e:ProductionEntry,a:AttributionAnchor):AttributionEvidence|null{
 const source=attributionSource(e),first=firstAttributionEvidence(e);
 if(!source||!first||!source.anchors.some(x=>x.id===a.id&&x.paragraphId===a.paragraphId))return null;
 if(a.id===source.anchors[0].id)return first;
 const rev=e.revisions.find(x=>x.questionId==='ANCHOR:'+a.id),pair=rev?unpackPair(rev.text):null,choice=rev?.selfChecks?.[0];
 if(!rev||!pair||rev.paragraphId!==a.paragraphId||!choice||!choiceValid(a,choice)||!independentAttribution(a,pair.paraphrase,pair.embedded,rev.reflection))return null;
 return {anchorId:a.id,paragraphId:a.paragraphId,choice,...pair,limit:rev.reflection,initial:false};
}
export function nextAttributionAnchor(s:AttributionStudy,e:ProductionEntry|null):AttributionAnchor|null{
 if(!e)return s.anchors[0]??null;
 if(attributionSource(e)?.id!==s.id||!firstAttributionEvidence(e))return null;
 return s.anchors.find(a=>!savedAttributionEvidence(e,a))??null;
}
export function beginAttribution(s:AttributionStudy,id:string,choice:AttributionChoice,paraphrase:string,embedded:string,limit:string,at:number):ProductionEntry{
 const study=attributionStudies.find(x=>x.id===s.id&&x.version===s.version),a=study?.anchors[0];
 if(!a||a.id!==id||!choiceValid(a,choice)||!independentAttribution(a,paraphrase,embedded,limit)||!Number.isFinite(at))throw Error('Quellenbezogene Paraphrase, exaktes Zitat und Beleggrenze erforderlich.');
 const original=join(paraphrase,embedded)+MARK_LIMIT+limit.trim();
 if(original.length>3500)throw Error('Erstfassung zu lang.');
 return {id:attributionId(s.id),kind:'ATTRIBUTION_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:a.id+'|'+choice+'|'+a.paragraphId,createdAt:at,original,revisions:[],evaluated:'UNASSESSED'};
}
export function appendAttributionAnchor(e:ProductionEntry,s:AttributionStudy,id:string,choice:AttributionChoice,paraphrase:string,embedded:string,limit:string,revisionId:string,at:number):ProductionEntry{
 const source=attributionSource(e),a=source?.anchors.find(x=>x.id===id);
 if(!source||source.id!==s.id||!firstAttributionEvidence(e)||!a||nextAttributionAnchor(s,e)?.id!==id||!choiceValid(a,choice)||!independentAttribution(a,paraphrase,embedded,limit)||!revisionId||!Number.isFinite(at))throw Error('Wörtliches Belegzitat oder eigene Wiedergabe fehlt.');
 const revision:ProductionRevision={id:revisionId,at,text:join(paraphrase,embedded),reflection:limit.trim(),questionId:'ANCHOR:'+id,paragraphId:a.paragraphId,lens:'BEDEUTUNG',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function latestAttributionText(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendAttributionText(e:ProductionEntry,s:AttributionStudy,stage:'TRANSFER'|'REWRITE',text:string,reflection:string,anchorId:string,revisionId:string,at:number):ProductionEntry{
 const source=attributionSource(e),anchor=source?.anchors.find(a=>a.id===anchorId),latest=latestAttributionText(e);
 const containsQuote=source?.anchors.some(a=>text.includes('„'+a.quote+'“'))??false;
 if(!source||source.id!==s.id||!firstAttributionEvidence(e)||nextAttributionAnchor(s,e)!==null||!anchor||!containsQuote||!valid(text,350,3500)||!valid(reflection,60,1150)||!revisionId||!Number.isFinite(at)||
 !['TRANSFER','REWRITE'].includes(stage)||(stage==='TRANSFER'&&latest!==null)||(stage==='REWRITE'&&latest===null)||
 (latest&&normalize(latest.text)===normalize(text)))throw Error('Eigenständiger belegter Zieltext oder substanzielle Überarbeitung fehlt.');
 const revision:ProductionRevision={id:revisionId,at,text:text.trim(),reflection:reflection.trim(),questionId:stage,paragraphId:anchor.paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'BEDEUTUNG',selfChecks:['ATTRIBUTION:'+anchorId]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function attributionProgress(entries:readonly ProductionEntry[]){
 const own=attributionStudies.map(s=>({s,e:entries.find(e=>isAttributionEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:own.filter(x=>x.e&&firstAttributionEvidence(x.e)).length,anchors:own.reduce((n,x)=>n+(x.e?x.s.anchors.filter(a=>savedAttributionEvidence(x.e!,a)).length:0),0),
 transferred:own.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,
 revised:own.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:attributionStudies.length};
}
export function nextAttributionStudy(entries:readonly ProductionEntry[]):AttributionStudy{
 return attributionStudies.find(s=>entries.some(e=>isAttributionEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))??attributionStudies.find(s=>!entries.some(e=>isAttributionEntry(e)&&e.itemId===s.id))??attributionStudies[0];
}
