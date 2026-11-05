import raw from '../../../content/fixtures/g12-oral-rehearsal.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type OralMode='MIC'|'TEXT';
export type OralTurn={id:string;paragraphId:string;speaker:string;quote:string;goal:string;anchor:string;limit:string;transfer:string};
export type OralStudy={id:string;version:1;domain:'G12';band:'C1'|'C2';title:string;focus:string;audience:string;brief:string;
 paragraphs:{id:string;text:string}[];turns:OralTurn[];
 status:'DEMO_ONLY';authorship:'AI_DRAFT';reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export type OralEvidence={turnId:string;paragraphId:string;mode:OralMode;preparation:string;selfReview:string;sourceReason:string;boundary:string;initial:boolean};
export const oralStudies:OralStudy[]=raw as OralStudy[];
export const oralId=(id:string)=>'oral-rehearsal:'+id;
export function isOralEntry(e:ProductionEntry):boolean{return e.kind==='ORAL_STUDY'&&e.id===oralId(e.itemId)}
export function oralSource(e:ProductionEntry):OralStudy|null{
 return isOralEntry(e)?oralStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
}
const MARK_REVIEW='\n\nEigenprüfung der mündlichen Antwort:\n';
const MARK_SOURCE='\n\nQuellenbeleg:\n';
const MARK_LIMIT='\n\nAussagegrenze:\n';
const markers=[MARK_REVIEW,MARK_SOURCE,MARK_LIMIT];
const norm=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(s:string,min:number,max:number)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
export const isOralMode=(m:string):m is OralMode=>m==='MIC'||m==='TEXT';
function encode(preparation:string,selfReview:string,sourceReason:string,boundary:string):string{
 return preparation.trim()+MARK_REVIEW+selfReview.trim()+MARK_SOURCE+sourceReason.trim()+MARK_LIMIT+boundary.trim();
}
function decode(value:string):Pick<OralEvidence,'preparation'|'selfReview'|'sourceReason'|'boundary'>|null{
 const a=value.indexOf(MARK_REVIEW),b=value.indexOf(MARK_SOURCE),c=value.indexOf(MARK_LIMIT);
 if(a<=0||b<=a||c<=b||value.indexOf(MARK_REVIEW,a+1)!==-1||value.indexOf(MARK_SOURCE,b+1)!==-1||value.indexOf(MARK_LIMIT,c+1)!==-1)return null;
 const preparation=value.slice(0,a).trim(),selfReview=value.slice(a+MARK_REVIEW.length,b).trim(),sourceReason=value.slice(b+MARK_SOURCE.length,c).trim(),boundary=value.slice(c+MARK_LIMIT.length).trim();
 return preparation&&selfReview&&sourceReason&&boundary?{preparation,selfReview,sourceReason,boundary}:null;
}
export function independentOral(t:OralTurn,preparation:string,selfReview:string,sourceReason:string,boundary:string):boolean{
 const parts=[preparation,selfReview,sourceReason,boundary];
 if(!valid(preparation,100,1800)||!valid(selfReview,110,1550)||!valid(sourceReason,110,1650)||!valid(boundary,90,1400))return false;
 if(parts.some(s=>markers.some(m=>s.includes(m))))return false;
 const normalized=parts.map(norm);
 if(new Set(normalized).size!==4||normalized.some(s=>s.includes(norm(t.quote))))return false;
 return normalized.every(s=>s!==norm(t.goal)&&s!==norm(t.anchor)&&s!==norm(t.limit));
}
export function beginOral(s:OralStudy,turnId:string,mode:OralMode,preparation:string,selfReview:string,sourceReason:string,boundary:string,at:number):ProductionEntry{
 const source=oralStudies.find(x=>x.id===s.id&&x.version===s.version),t=source?.turns[0];
 if(!t||t.id!==turnId||!isOralMode(mode)||!independentOral(t,preparation,selfReview,sourceReason,boundary)||!Number.isFinite(at))
 throw Error('Erste quellengebundene Sprechprobe, Eigenprüfung und Begründung fehlen.');
 return {id:oralId(s.id),kind:'ORAL_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:t.id+'|'+mode+'|'+t.paragraphId,
 createdAt:at,original:encode(preparation,selfReview,sourceReason,boundary),revisions:[],evaluated:'UNASSESSED'};
}
export function firstOral(e:ProductionEntry):OralEvidence|null{
 const s=oralSource(e),t=s?.turns[0],key=e.decisionId?.split('|'),fields=decode(e.original);
 if(!t||!key||key.length!==3||key[0]!==t.id||key[2]!==t.paragraphId||!isOralMode(key[1])||!fields||
 !independentOral(t,fields.preparation,fields.selfReview,fields.sourceReason,fields.boundary))return null;
 return {turnId:t.id,paragraphId:t.paragraphId,mode:key[1],...fields,initial:true};
}
export function savedOral(e:ProductionEntry,t:OralTurn):OralEvidence|null{
 const s=oralSource(e),first=firstOral(e);
 if(!s||!first||!s.turns.some(v=>v.id===t.id&&v.paragraphId===t.paragraphId))return null;
 if(t.id===s.turns[0].id)return first;
 const rev=e.revisions.find(r=>r.questionId==='ORAL:'+t.id),fields=rev?decode(rev.text):null,mode=rev?.selfChecks?.[0];
 if(!rev||!fields||rev.paragraphId!==t.paragraphId||!mode||!isOralMode(mode)||
 !independentOral(t,fields.preparation,fields.selfReview,fields.sourceReason,fields.boundary))return null;
 return {turnId:t.id,paragraphId:t.paragraphId,mode,...fields,initial:false};
}
export function nextOral(s:OralStudy,e:ProductionEntry|null):OralTurn|null{
 if(!e)return s.turns[0]??null;
 if(oralSource(e)?.id!==s.id||!firstOral(e))return null;
 return s.turns.find(t=>!savedOral(e,t))??null;
}
export function appendOral(e:ProductionEntry,s:OralStudy,turnId:string,mode:OralMode,preparation:string,selfReview:string,sourceReason:string,boundary:string,id:string,at:number):ProductionEntry{
 const t=oralSource(e)?.turns.find(t=>t.id===turnId);
 if(!t||!firstOral(e)||oralSource(e)?.id!==s.id||nextOral(s,e)?.id!==turnId||!isOralMode(mode)||
 !independentOral(t,preparation,selfReview,sourceReason,boundary)||!id||e.revisions.some(r=>r.id===id)||!Number.isFinite(at))
 throw Error('Mündliche Analyse nicht quellengebunden oder außerhalb der Reihenfolge.');
 const r:ProductionRevision={id,at,text:encode(preparation,selfReview,sourceReason,boundary),reflection:'Sprechsituation: '+t.speaker,
 questionId:'ORAL:'+t.id,paragraphId:t.paragraphId,lens:'KOHÄRENZ',selfChecks:[mode]};
 return {...e,revisions:[...e.revisions,r]};
}
export const latestOralDocument=(e:ProductionEntry):ProductionRevision|null=>
 [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
const wordSet=(x:string)=>new Set(norm(x).match(/[\p{L}]{3,}/gu)??[]);
export function substantialOralRevision(previous:string,next:string):boolean{
 if(norm(previous)===norm(next))return false;
 const a=wordSet(previous),b=wordSet(next);
 return [...a].filter(w=>!b.has(w)).length+[...b].filter(w=>!a.has(w)).length>=8;
}
export function appendOralDocument(e:ProductionEntry,s:OralStudy,stage:'TRANSFER'|'REWRITE',text:string,reason:string,anchor:string,id:string,at:number):ProductionEntry{
 const source=oralSource(e),previous=latestOralDocument(e),t=source?.turns.find(t=>t.id===anchor);
 if(!source||source.id!==s.id||!firstOral(e)||nextOral(s,e)!==null||!t||
 !valid(text,560,4000)||text.trim().split(/\n\s*\n/).filter(Boolean).length<2||!valid(reason,110,1500)||
 !id||e.revisions.some(r=>r.id===id)||!Number.isFinite(at)||
 (stage==='TRANSFER'&&previous!==null)||(stage==='REWRITE'&&(!previous||!substantialOralRevision(previous.text,text))))
 throw Error('Vollständiger eigener Transfer oder substanzielle Überarbeitung fehlt.');
 const revision:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId:t.paragraphId,
 lens:stage==='REWRITE'?'REGISTER':'KOHÄRENZ',selfChecks:['ORAL:'+t.id]};
 return {...e,revisions:[...e.revisions,revision]};
}
export function oralProgress(entries:readonly ProductionEntry[]){
 const items=oralStudies.map(s=>({s,e:entries.find(e=>isOralEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:items.filter(x=>x.e&&firstOral(x.e)).length,
  analyses:items.reduce((n,x)=>n+(x.e?x.s.turns.filter(t=>savedOral(x.e!,t)).length:0),0),
  withMic:items.reduce((n,x)=>n+(x.e?x.s.turns.filter(t=>savedOral(x.e!,t)?.mode==='MIC').length:0),0),
  transferred:items.filter(x=>x.e?.revisions.some(r=>r.questionId==='TRANSFER')).length,
  revised:items.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:oralStudies.length};
}
export function nextOralStudy(entries:readonly ProductionEntry[]):OralStudy{
 return oralStudies.find(s=>entries.some(e=>isOralEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))||
 oralStudies.find(s=>!entries.some(e=>isOralEntry(e)&&e.itemId===s.id))||oralStudies[0];
}
