import raw from '../../../content/fixtures/interaction-scenarios.demo.json';
import type {ProductionEntry} from '../production/types';

export type InteractionStrategy='ACKNOWLEDGE'|'CHALLENGE'|'REFRAME'|'NEGOTIATE';
export const strategies:Record<InteractionStrategy,string>={
 ACKNOWLEDGE:'Zugestehen und eingrenzen',CHALLENGE:'Sachlich widersprechen',REFRAME:'Perspektive verändern',NEGOTIATE:'Konkreten Kompromiss anbieten'
};
export type InteractionTurn={id:string;speaker:string;text:string;task:string};
export type InteractionScenario={id:string;version:1;domain:'G12';band:'C1'|'C2';title:string;role:string;context:string;registers:string[];turns:InteractionTurn[];status:'DEMO_ONLY';author:string;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const interactionScenarios=raw as InteractionScenario[];
export const interactionId=(id:string)=>'interaction:'+id;
export const isInteractionEntry=(e:ProductionEntry):boolean=>e.kind==='INTERACTION_STUDY'&&e.id===interactionId(e.itemId);
export function interactionSource(e:ProductionEntry):InteractionScenario|null{
 if(!isInteractionEntry(e))return null;
 return interactionScenarios.find(s=>s.id===e.itemId&&s.version===e.itemVersion)??null;
}
export function openingChoice(e:ProductionEntry):{register:string;strategy:InteractionStrategy}|null{
 if(!isInteractionEntry(e)||!e.decisionId)return null;
 const [register,strategy,...extra]=e.decisionId.split('|');
 if(extra.length||!register||!Object.prototype.hasOwnProperty.call(strategies,strategy))return null;
 return {register,strategy:strategy as InteractionStrategy};
}
function validStrategy(v:string):v is InteractionStrategy{return Object.prototype.hasOwnProperty.call(strategies,v)}
export function interactionFirst(s:InteractionScenario,register:string,strategy:InteractionStrategy,reply:string,at:number):ProductionEntry{
 if(!interactionScenarios.some(x=>x.id===s.id&&x.version===s.version)||!s.registers.includes(register)||!validStrategy(strategy)||!reply.trim()||reply.length>2800||!Number.isFinite(at))throw Error('Erster Gesprächszug ist unvollständig.');
 return {id:interactionId(s.id),kind:'INTERACTION_STUDY',itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:register+'|'+strategy,createdAt:at,original:reply.trim(),revisions:[],evaluated:'UNASSESSED'};
}
export function primaryResponse(e:ProductionEntry,turnId:string):string|null{
 if(!isInteractionEntry(e))return null;
 if(turnId==='t0')return e.original;
 return e.revisions.find(r=>r.questionId==='TURN:'+turnId)?.text??null;
}
export function nextInteractionTurn(s:InteractionScenario,e:ProductionEntry|null):InteractionTurn|null{
 if(!e)return s.turns[0]??null;
 return s.turns.find(t=>!primaryResponse(e,t.id))??null;
}
export function interactionRevision(e:ProductionEntry,s:InteractionScenario,kind:'TURN'|'ALTERNATIVE',turnId:string,reply:string,strategy:InteractionStrategy,why:string,id:string,at:number):ProductionEntry{
 const turn=s.turns.find(t=>t.id===turnId);
 const opening=openingChoice(e);
 if(!turn||!interactionSource(e)||e.itemId!==s.id||e.itemVersion!==s.version||e.sourceId!==s.id||
 !opening||!s.registers.includes(opening.register)||!validStrategy(strategy)||!reply.trim()||reply.length>2800||
 !why.trim()||why.length>1150||!id||!Number.isFinite(at))throw Error('Gesprächsantwort oder Begründung unvollständig.');
 if(kind==='TURN'){
  if(turnId==='t0'||primaryResponse(e,turnId)||nextInteractionTurn(s,e)?.id!==turnId)throw Error('Gesprächszüge müssen in der vorgegebenen Reihenfolge gespeichert werden.');
 }else if(!primaryResponse(e,turnId))throw Error('Eine Alternative braucht einen bereits gespeicherten Gesprächszug.');
 return {...e,revisions:[...e.revisions,{id,at,text:reply.trim(),reflection:why.trim(),questionId:kind+':'+turnId,lens:kind==='ALTERNATIVE'?'REGISTER':'KOHÄRENZ',selfChecks:[strategies[strategy]]}]};
}
export function interactionProgress(entries:readonly ProductionEntry[]){
 const records=entries.filter(isInteractionEntry);
 const current=interactionScenarios.map(s=>({s,e:records.find(e=>e.itemId===s.id&&e.itemVersion===s.version)}));
 return {started:current.filter(x=>!!x.e).length,completed:current.filter(x=>x.e&&!nextInteractionTurn(x.s,x.e)).length,
 turns:current.reduce((n,x)=>n+(x.e?1+x.e.revisions.filter(r=>r.questionId?.startsWith('TURN:')).length:0),0),
 alternatives:current.reduce((n,x)=>n+(x.e?.revisions.filter(r=>r.questionId?.startsWith('ALTERNATIVE:')).length??0),0),total:interactionScenarios.length};
}
