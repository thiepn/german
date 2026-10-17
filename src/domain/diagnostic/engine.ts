import type {EditorialStatus} from '../content/types';
export const DIAGNOSTIC_A_BLUEPRINT = [
 ['G01',7],['G02',7],['G03',7],['G04',8],['G05',5],['G06',6],['G07',6],['G08',5],['G09',6],['G10',5],['G11',4],['G12',3],['G13',3]
] as const;
export type DiagnosticModality='objective'|'reading'|'listening'|'writing'|'speaking'|'mediation';
export type DiagnosticItem={id:string;version:number;section:string;form:'A';modality:DiagnosticModality;status:EditorialStatus;reviewId:string|null;approvedBy:string|null;approvedAt:string|null;authorId:string;rightsCleared:boolean;media?:{audioId:string;rightsCleared:boolean}|null;};
export type DiagnosticResponse={itemId:string;at:number;answer:string;objectiveScore?:number;manualReview?:'PENDING'|'APPROVED'|'REJECTED'};
export type DiagnosticSession={id:string;form:'A';formFingerprint:string;itemIds:string[];phase:'IN_PROGRESS'|'PAUSED'|'AWAITING_ASSESSMENT'|'COMPLETE';startedAt:number;updatedAt:number;responses:DiagnosticResponse[];};
const sections=new Map<string,number>(DIAGNOSTIC_A_BLUEPRINT as readonly (readonly [string,number])[]);
export const DIAGNOSTIC_A_TOTAL=[...sections.values()].reduce((a,b)=>a+b,0);
export function validateDiagnosticA(items:readonly DiagnosticItem[]):{ready:boolean;issues:string[]}{
 const issues:string[]=[];
 if(items.length!==DIAGNOSTIC_A_TOTAL)issues.push('Form A requires exactly '+DIAGNOSTIC_A_TOTAL+' approved items.');
 const ids=new Set<string>();
 for(const item of items){
  if(ids.has(item.id))issues.push('Duplicate diagnostic item '+item.id);
  ids.add(item.id);
  if(item.form!=='A'||!sections.has(item.section))issues.push('Invalid form/section '+item.id);
  if(!item.version||item.status!=='REVIEWED'||!item.reviewId||!item.approvedBy||item.approvedBy===item.authorId||!item.approvedAt||!item.rightsCleared)issues.push('Unapproved diagnostic item '+item.id);
  if(item.modality==='listening'&&(!item.media?.audioId||!item.media.rightsCleared))issues.push('Missing rights-cleared audio '+item.id);
 }
 for(const [section,n] of sections)if(items.filter(i=>i.section===section).length!==n)issues.push(section+' requires '+n+' items.');
 return {ready:issues.length===0,issues};
}
export function createDiagnosticA(items:readonly DiagnosticItem[],id:string,now:number):DiagnosticSession{
 const gate=validateDiagnosticA(items);
 if(!gate.ready)throw Error('Diagnostic A not available: '+gate.issues.slice(0,4).join('; '));
 if(!id)throw Error('Session ID required');
 const itemIds=items.map(i=>i.id);
 return {id,form:'A',formFingerprint:items.map(i=>i.id+'@'+i.version).join('|'),itemIds,phase:'IN_PROGRESS',startedAt:now,updatedAt:now,responses:[]};
}
export function answerDiagnostic(session:DiagnosticSession,itemId:string,answer:string,now:number,objectiveScore?:number):DiagnosticSession{
 if(session.phase!=='IN_PROGRESS'||!session.itemIds.includes(itemId))throw Error('Invalid diagnostic state/item');
 if(session.responses.some(r=>r.itemId===itemId))throw Error('Already answered');
 if(!answer.trim())throw Error('Empty answer');
 if(objectiveScore!=null&&(!Number.isFinite(objectiveScore)||objectiveScore<0||objectiveScore>1))throw Error('Invalid objective score');
 return {...session,updatedAt:now,responses:[...session.responses,{itemId,at:now,answer, ...(objectiveScore===undefined?{manualReview:'PENDING' as const}:{objectiveScore})}]};
}
export function pauseDiagnostic(s:DiagnosticSession,now:number):DiagnosticSession{
 if(s.phase!=='IN_PROGRESS')throw Error('Cannot pause diagnostic');
 return {...s,phase:'PAUSED',updatedAt:now};
}
export function resumeDiagnostic(s:DiagnosticSession,now:number):DiagnosticSession{
 if(s.phase!=='PAUSED')throw Error('Cannot resume diagnostic');
 return {...s,phase:'IN_PROGRESS',updatedAt:now};
}
export function finishDiagnostic(s:DiagnosticSession,now:number):DiagnosticSession{
 if(s.phase!=='IN_PROGRESS'||s.responses.length!==s.itemIds.length)throw Error('Incomplete diagnostic');
 const needsHuman=s.responses.some(r=>r.manualReview==='PENDING');
 return {...s,phase:needsHuman?'AWAITING_ASSESSMENT':'COMPLETE',updatedAt:now};
}
export function diagnosticEvidence(s:DiagnosticSession){
 const automatic=s.responses.filter(r=>r.objectiveScore!==undefined);
 return {answered:s.responses.length,total:s.itemIds.length,autoGraded:automatic.length,requiresHuman:s.responses.filter(r=>r.manualReview==='PENDING').length,objectiveCorrectMean:automatic.length?automatic.reduce((a,b)=>a+(b.objectiveScore??0),0)/automatic.length:null,cefrLevel:null};
}
