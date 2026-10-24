import original from '../../../content/fixtures/g04-compression.demo.json';
import type {ProductionEntry,ProductionRevision} from '../production/types';

export type CompressionChoice='A'|'B';
export type CompressionOperation={id:string;paragraphId:string;family:string;quote:string;question:string;options:{id:CompressionChoice;text:string}[];preferredId:CompressionChoice;model:string;expandPrompt:string;compressPrompt:string;riskPrompt:string};
export type CompressionStudy={id:string;version:1;domain:'G04';band:'C1'|'C2';title:string;focus:string;audience:string;paragraphs:{id:string;text:string}[];operations:CompressionOperation[];transfer:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';author:string;reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const compressionStudies:CompressionStudy[]=original as CompressionStudy[];
export const compressionId=(id:string)=>'compression:'+id;
export const isCompressionEntry=(e:ProductionEntry):boolean=>e.kind==='COMPRESSION_STUDY'&&e.id===compressionId(e.itemId);
export const compressionSource=(e:ProductionEntry):CompressionStudy|null=>isCompressionEntry(e)?compressionStudies.find(s=>s.id===e.itemId&&s.id===e.sourceId&&s.version===e.itemVersion)??null:null;
const headingCompact='\n\nEigene Verdichtung:\n',headingRisk='\n\nErhaltene Bedeutung und Grenze:\n';
const headingPublic='\n\nVerständliche Mitteilung:\n';
const norm=(x:string)=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const valid=(x:string,min:number,max:number)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const allowed=(o:CompressionOperation,c:string):c is CompressionChoice=>(c==='A'||c==='B')&&o.options.some(x=>x.id===c);
const serialize=(expanded:string,compact:string)=>expanded.trim()+headingCompact+compact.trim();
const serializeFirst=(expanded:string,compact:string,risk:string)=>serialize(expanded,compact)+headingRisk+risk.trim();
function splitPair(text:string):{expanded:string;compact:string}|null{
 const i=text.indexOf(headingCompact);
 if(i<0||text.indexOf(headingCompact,i+headingCompact.length)>=0)return null;
 const expanded=text.slice(0,i).trim(),compact=text.slice(i+headingCompact.length).trim();
 return expanded&&compact?{expanded,compact}:null;
}
function splitFirst(text:string):{expanded:string;compact:string;risk:string}|null{
 const i=text.indexOf(headingRisk);if(i<0)return null;
 const pair=splitPair(text.slice(0,i)),risk=text.slice(i+headingRisk.length).trim();
 return pair&&risk?{...pair,risk}:null;
}
export function independentCompression(o:CompressionOperation,expanded:string,compact:string,risk:string):boolean{
 const forbidden=[o.quote,...o.options.map(x=>x.text)].map(norm);
 return valid(expanded,85,1350)&&valid(compact,65,950)&&valid(risk,40,1000)&&norm(expanded)!==norm(compact)&&
 !forbidden.includes(norm(expanded))&&!forbidden.includes(norm(compact))&&!norm(expanded).includes(norm(o.quote))&&!norm(compact).includes(norm(o.quote));
}
export type CompressionEvidence={operationId:string;paragraphId:string;choice:CompressionChoice;expanded:string;compact:string;risk:string;initial:boolean};
export function firstCompressionEvidence(e:ProductionEntry):CompressionEvidence|null{
 const s=compressionSource(e),o=s?.operations[0],parts=e.decisionId?.split('|'),read=splitFirst(e.original);
 if(!o||!parts||parts.length!==3||parts[0]!==o.id||parts[2]!==o.paragraphId||!allowed(o,parts[1])||!read||!independentCompression(o,read.expanded,read.compact,read.risk))return null;
 return {operationId:o.id,paragraphId:o.paragraphId,choice:parts[1],...read,initial:true};
}
export function savedCompressionEvidence(e:ProductionEntry,o:CompressionOperation):CompressionEvidence|null{
 const s=compressionSource(e),first=firstCompressionEvidence(e);
 if(!s||!first||!s.operations.some(x=>x.id===o.id&&x.paragraphId===o.paragraphId))return null;
 if(o.id===s.operations[0].id)return first;
 const rev=e.revisions.find(x=>x.questionId==='OPERATION:'+o.id),pair=rev?splitPair(rev.text):null,choice=rev?.selfChecks?.[0];
 if(!rev||!pair||rev.paragraphId!==o.paragraphId||!choice||!allowed(o,choice)||!independentCompression(o,pair.expanded,pair.compact,rev.reflection))return null;
 return {operationId:o.id,paragraphId:o.paragraphId,choice,...pair,risk:rev.reflection,initial:false};
}
export function nextCompressionOperation(s:CompressionStudy,e:ProductionEntry|null):CompressionOperation|null{
 if(!e)return s.operations[0]??null;
 if(compressionSource(e)?.id!==s.id||!firstCompressionEvidence(e))return null;
 return s.operations.find(x=>!savedCompressionEvidence(e,x))??null;
}
export function beginCompression(s:CompressionStudy,operationId:string,choice:CompressionChoice,expanded:string,compact:string,risk:string,at:number):ProductionEntry{
 const canonical=compressionStudies.find(x=>x.id===s.id&&x.version===s.version),o=canonical?.operations[0];
 if(!o||o.id!==operationId||!allowed(o,choice)||!independentCompression(o,expanded,compact,risk)||!Number.isFinite(at))throw Error('Explikation, Verdichtung und Bedeutungsgrenze unvollständig.');
 const originalText=serializeFirst(expanded,compact,risk);
 if(originalText.length>3500)throw Error('Erstfassung zu lang.');
 return {id:compressionId(s.id),itemId:s.id,itemVersion:s.version,kind:'COMPRESSION_STUDY',sourceId:s.id,decisionId:operationId+'|'+choice+'|'+o.paragraphId,createdAt:at,original:originalText,revisions:[],evaluated:'UNASSESSED'};
}
export function appendCompressionOperation(e:ProductionEntry,s:CompressionStudy,operationId:string,choice:CompressionChoice,expanded:string,compact:string,risk:string,id:string,at:number):ProductionEntry{
 const source=compressionSource(e),o=source?.operations.find(x=>x.id===operationId);
 if(!source||source.id!==s.id||!firstCompressionEvidence(e)||!o||nextCompressionOperation(s,e)?.id!==operationId||!allowed(o,choice)||!independentCompression(o,expanded,compact,risk)||!id||!Number.isFinite(at))throw Error('Neue unabhängige Satzfassung oder Belegfolge fehlt.');
 const rev:ProductionRevision={id,at,text:serialize(expanded,compact),reflection:risk.trim(),questionId:'OPERATION:'+o.id,paragraphId:o.paragraphId,lens:'SYNTAX',selfChecks:[choice]};
 return {...e,revisions:[...e.revisions,rev]};
}
export function latestCompressionTransfer(e:ProductionEntry):ProductionRevision|null{
 return [...e.revisions].reverse().find(x=>x.questionId==='TRANSFER'||x.questionId==='REWRITE')??null;
}
export function splitCompressionTransfer(text:string):{formal:string;publicText:string}|null{
 const i=text.indexOf(headingPublic);if(i<0)return null;
 const formal=text.slice(0,i).trim(),publicText=text.slice(i+headingPublic.length).trim();return formal&&publicText?{formal,publicText}:null;
}
export function appendCompressionTransfer(e:ProductionEntry,s:CompressionStudy,stage:'TRANSFER'|'REWRITE',formal:string,publicText:string,reason:string,paragraphId:string,id:string,at:number):ProductionEntry{
 const source=compressionSource(e),prior=latestCompressionTransfer(e),text=formal.trim()+headingPublic+publicText.trim();
 if(!source||source.id!==s.id||!firstCompressionEvidence(e)||nextCompressionOperation(s,e)!==null||!source.paragraphs.some(p=>p.id===paragraphId)||
 !valid(formal,150,1850)||!valid(publicText,140,1750)||!valid(reason,60,1100)||text.length>3900||!id||!Number.isFinite(at)||
 (stage==='TRANSFER'&&prior!==null)||(stage==='REWRITE'&&prior===null)||!['TRANSFER','REWRITE'].includes(stage)||
 norm(formal)===norm(publicText)||(prior&&norm(prior.text)===norm(text)))throw Error('Zwei eigenständige Zieltexte oder eine wirksame Revision fehlen.');
 const rev:ProductionRevision={id,at,text,reflection:reason.trim(),questionId:stage,paragraphId,lens:stage==='REWRITE'?'KOHÄRENZ':'SYNTAX',selfChecks:['FORMAL','PUBLIC']};
 return {...e,revisions:[...e.revisions,rev]};
}
export function compressionProgress(entries:readonly ProductionEntry[]){
 const rows=compressionStudies.map(s=>({s,e:entries.find(e=>isCompressionEntry(e)&&e.itemId===s.id&&e.sourceId===s.id&&e.itemVersion===s.version)}));
 return {started:rows.filter(x=>x.e&&firstCompressionEvidence(x.e)).length,operations:rows.reduce((n,x)=>n+(x.e?x.s.operations.filter(o=>savedCompressionEvidence(x.e!,o)).length:0),0),
 transferred:rows.filter(x=>x.e&&x.e.revisions.some(r=>r.questionId==='TRANSFER')).length,
 rewritten:rows.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId==='REWRITE').length??0),0),total:compressionStudies.length};
}
export function nextCompressionStudy(entries:readonly ProductionEntry[]):CompressionStudy{
 return compressionStudies.find(s=>entries.some(e=>isCompressionEntry(e)&&e.itemId===s.id&&!e.revisions.some(r=>r.questionId==='TRANSFER')))??compressionStudies.find(s=>!entries.some(e=>isCompressionEntry(e)&&e.itemId===s.id))??compressionStudies[0];
}
