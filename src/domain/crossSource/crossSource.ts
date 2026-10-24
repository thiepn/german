import authored from '../../../content/fixtures/g09-cross-source.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type CrossChoice='A'|'B';
export type CrossComparison={id:string;sourceA:string;sourceB:string;quoteA:string;quoteB:string;issue:string;question:string;options:{id:CrossChoice;text:string}[];preferredId:CrossChoice;model:string;transferCue:string};
export type CrossStudy={id:string;version:1;domain:'G09';band:'C1'|'C2';title:string;focus:string;sources:{id:'A'|'B';title:string;paragraphs:{id:string;text:string}[]}[];comparisons:CrossComparison[];transfer:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const crossStudies:CrossStudy[]=authored as CrossStudy[];
export const crossEntryId=(id:string)=>'cross-source:'+id;
export const isCrossEntry=(e:ProductionEntry)=>e.kind==='CROSS_SOURCE_STUDY'&&e.id===crossEntryId(e.itemId);
export function crossSource(e:ProductionEntry):CrossStudy|null{
 return isCrossEntry(e)?crossStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
}
export type CrossEvidence={comparisonId:string;sourceA:string;sourceB:string;choice:CrossChoice;readingA:string;readingB:string;boundary:string;initial:boolean};
const headingB='\n\nQuelle B:\n';
const headingLimit='\n\nNicht ableitbar:\n';
const norm=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const allowed=(c:CrossComparison,choice:string):choice is CrossChoice=>(choice==='A'||choice==='B')&&c.options.some(x=>x.id===choice);
const anchors=(c:CrossComparison)=>c.sourceA+'|'+c.sourceB;
function splitReadings(value:string):{readingA:string;readingB:string}|null{
 const marker=value.indexOf(headingB);
 if(marker<0||value.indexOf(headingB,marker+headingB.length)>=0)return null;
 const readingA=value.slice(0,marker).trim(),readingB=value.slice(marker+headingB.length).trim();
 return readingA&&readingB?{readingA,readingB}:null;
}
function serialize(a:string,b:string){return a.trim()+headingB+b.trim()}
function splitFirst(value:string):{readingA:string;readingB:string;boundary:string}|null{
 const at=value.indexOf(headingLimit);
 if(at<0)return null;
 const texts=splitReadings(value.slice(0,at)),boundary=value.slice(at+headingLimit.length).trim();
 return texts&&boundary?{...texts,boundary}:null;
}
export function independentCrossReading(c:CrossComparison,a:string,b:string,boundary:string):boolean{
 const disallowed=new Set([norm(c.quoteA),norm(c.quoteB),norm(c.options[0].text),norm(c.options[1].text)]);
 return valid(a,60,1000)&&valid(b,60,1000)&&valid(boundary,45,850)&&norm(a)!==norm(b)&&!disallowed.has(norm(a))&&!disallowed.has(norm(b))&&
 !norm(a).includes(norm(c.quoteA))&&!norm(b).includes(norm(c.quoteB));
}
export function firstCrossEvidence(e:ProductionEntry):CrossEvidence|null{
 const s=crossSource(e),c=s?.comparisons[0],parts=e.decisionId?.split('|'),t=splitFirst(e.original);
 if(!s||!c||!parts||parts.length!==4||parts[0]!==c.id||parts[2]!==c.sourceA||parts[3]!==c.sourceB||!allowed(c,parts[1])||!t||!independentCrossReading(c,t.readingA,t.readingB,t.boundary))return null;
 return {comparisonId:c.id,sourceA:c.sourceA,sourceB:c.sourceB,choice:parts[1],...t,initial:true};
}
export function savedCrossEvidence(e:ProductionEntry,c:CrossComparison):CrossEvidence|null{
 const s=crossSource(e),first=firstCrossEvidence(e);
 if(!s||!first||!s.comparisons.some(x=>x.id===c.id&&anchors(x)===anchors(c)))return null;
 if(c.id===s.comparisons[0].id)return first;
 const rev=e.revisions.find(x=>x.questionId==='COMPARISON:'+c.id),value=rev?splitReadings(rev.text):null,choice=rev?.selfChecks?.[0];
 if(!rev||rev.paragraphId!==anchors(c)||!value||!choice||!allowed(c,choice)||!independentCrossReading(c,value.readingA,value.readingB,rev.reflection))return null;
 return {comparisonId:c.id,sourceA:c.sourceA,sourceB:c.sourceB,choice,...value,boundary:rev.reflection,initial:false};
}
export function nextCrossComparison(s:CrossStudy,e:ProductionEntry|null):CrossComparison|null{
 if(!e)return s.comparisons[0]??null;
 if(crossSource(e)?.id!==s.id||!firstCrossEvidence(e))return null;
 return s.comparisons.find(c=>!savedCrossEvidence(e,c))??null;
}
export function beginCross(s:CrossStudy,id:string,choice:CrossChoice,a:string,b:string,boundary:string,at:number):ProductionEntry{
 const source=crossStudies.find(x=>x.id===s.id&&x.version===s.version),c=source?.comparisons[0];
 if(!c||c.id!==id||!allowed(c,choice)||!independentCrossReading(c,a,b,boundary)||!Number.isFinite(at))throw Error('Zwei eigenständige Quellenlesarten und eine belegte Grenze erforderlich.');
 const original=serialize(a,b)+headingLimit+boundary.trim();
 if(original.length>3000)throw Error('Quellenanalyse ist zu lang.');
 return {id:crossEntryId(s.id),kind:'CROSS_SOURCE_STUDY',sourceId:s.id,itemId:s.id,itemVersion:s.version,createdAt:at,decisionId:id+'|'+choice+'|'+anchors(c),original,revisions:[],evaluated:'UNASSESSED'};
}
export function appendCrossComparison(e:ProductionEntry,s:CrossStudy,id:string,choice:CrossChoice,a:string,b:string,boundary:string,revisionId:string,at:number):ProductionEntry{
 const source=crossSource(e),c=source?.comparisons.find(x=>x.id===id);
 if(!source||source.id!==s.id||!firstCrossEvidence(e)||!c||nextCrossComparison(s,e)?.id!==id||!allowed(c,choice)||!independentCrossReading(c,a,b,boundary)||!revisionId||!Number.isFinite(at))throw Error('Quellenvergleich fehlt oder folgt nicht der dokumentierten Reihenfolge.');
 const revision:ProductionRevision={id:revisionId,at,text:serialize(a,b),reflection:boundary.trim(),questionId:'COMPARISON:'+id,paragraphId:anchors(c),selfChecks:[choice],lens:'BEDEUTUNG'};
 return {...e,revisions:[...e.revisions,revision]};
}
export function latestCrossTransfer(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(r=>r.questionId==='TRANSFER'||r.questionId==='REWRITE')??null;
}
export function appendCrossTransfer(e:ProductionEntry,s:CrossStudy,stage:'TRANSFER'|'REWRITE',text:string,reason:string,comparisonId:string,id:string,at:number):ProductionEntry{
 const source=crossSource(e),c=source?.comparisons.find(x=>x.id===comparisonId),prior=latestCrossTransfer(e);
 if(!source||source.id!==s.id||!firstCrossEvidence(e)||nextCrossComparison(s,e)!==null||!c||!valid(text,200,2900)||!valid(reason,50,1100)||!id||!Number.isFinite(at)||
 (stage==='TRANSFER'&&prior!==null)||(stage==='REWRITE'&&prior===null)||!['TRANSFER','REWRITE'].includes(stage)||(prior&&norm(prior.text)===norm(text)))throw Error('Belegter Quellentransfer oder wirksame Überarbeitung fehlt.');
 const revision:ProductionRevision={id,at,text:text.trim(),reflection:reason.trim(),questionId:stage,paragraphId:anchors(c),selfChecks:['PAIR:'+comparisonId],lens:stage==='REWRITE'?'KOHÄRENZ':'BEDEUTUNG'};
 return {...e,revisions:[...e.revisions,revision]};
}
export function crossProgress(entries:readonly ProductionEntry[]){
 const rows=crossStudies.map(s=>({s,e:entries.find(e=>isCrossEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstCrossEvidence(x.e)).length,comparisons:rows.reduce((n,x)=>n+(x.e?x.s.comparisons.filter(c=>savedCrossEvidence(x.e!,c)).length:0),0),
 transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,
 revisions:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:crossStudies.length};
}
export function nextCrossStudy(entries:readonly ProductionEntry[]):CrossStudy{
 return crossStudies.find(s=>{const e=entries.find(x=>isCrossEntry(x)&&x.itemId===s.id);return e&&!e.revisions.some(r=>r.questionId==='TRANSFER')})??
 crossStudies.find(s=>!entries.some(e=>isCrossEntry(e)&&e.itemId===s.id))??crossStudies[0];
}
