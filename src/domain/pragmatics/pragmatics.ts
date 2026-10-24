import raw from '../../../content/fixtures/pragmatics.demo.json';
import anchors from '../../../content/editorial/pragmatics-anchors.json';
import type {ProductionEntry} from '../production/types';
export type PragmaticScenario={id:string;version:1;domain:'G08';title:string;band:'C1'|'C2';context:string;task:string;options:{id:string;text:string;effect:string}[];preferredIds:string[];rewrite:string;status:'DEMO_ONLY';authorship:'AI_DRAFT';reviewedBy:null;rights:{kind:'ORIGINAL_DRAFT';source:string};cefrReference:string;editorialApproval:false;};
export const pragmaticScenarios=raw as PragmaticScenario[];
export const pragmaticReferences=anchors.anchors;
export const pragmaticId=(id:string)=>'pragmatic:'+id;
export const isPragmaticEntry=(e:ProductionEntry)=>e.kind==='PRAGMATIC_STUDY'&&e.id===pragmaticId(e.itemId);
export function pragmaticProgress(entries:readonly ProductionEntry[]){
 const saved=entries.filter(isPragmaticEntry);
 return {started:pragmaticScenarios.filter(s=>saved.some(e=>e.itemId===s.id)).length,rewritten:saved.filter(e=>e.revisions.length>0).length,total:pragmaticScenarios.length};
}
export function pragmaticNext(entries:readonly ProductionEntry[]):string|null{
 const saved=entries.filter(isPragmaticEntry);
 return pragmaticScenarios.find(s=>saved.some(e=>e.itemId===s.id&&!e.revisions.length))?.id??pragmaticScenarios.find(s=>!saved.some(e=>e.itemId===s.id))?.id??null;
}
