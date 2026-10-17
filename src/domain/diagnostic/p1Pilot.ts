import type {Exercise} from '../content/types';
import {gradeAnswer} from '../grading/gradeAnswer';
import {answerDiagnostic,createDiagnosticA,diagnosticEvidence,finishDiagnostic,pauseDiagnostic,resumeDiagnostic,type DiagnosticSession} from './engine';

export const P1_BLUEPRINT=[['G01','M01',20],['G02','M02',16],['G03','M03',14]] as const;
export const P1_TOTAL=50;
export type PilotItem=Exercise & {assessmentForm:'P1';reservedForDiagnostic:true};
export type Approval={id:string;version:number;authorId:string;editorId:string;date:string;sourceChecked:boolean;languageChecked:boolean;rightsChecked:boolean;approvalReference:string};
export function validatePilot(items:readonly PilotItem[],approvals:readonly Approval[],practiceIds:ReadonlySet<string>):{ready:boolean;issues:string[]}{
 const issues:string[]=[];
 if(items.length!==P1_TOTAL)issues.push('Exactly 50 holdout questions required');
 const ids=new Set<string>();
 const ledger=new Map(approvals.map(a=>[a.id+'@'+a.version,a]));
 for(const item of items){
  if(ids.has(item.id))issues.push('Duplicate item '+item.id);ids.add(item.id);
  if(practiceIds.has(item.id))issues.push('Leaked practice item '+item.id);
  if(!P1_BLUEPRINT.some(([d,m])=>item.skillId.startsWith(d+'.')&&item.mode===m))issues.push('Wrong domain/mode '+item.id);
  if(item.assessmentForm!=='P1'||item.reservedForDiagnostic!==true||item.status!=='REVIEWED'||item.rights.kind==='ORIGINAL_DRAFT')issues.push('Not reserved and reviewed '+item.id);
  const a=ledger.get(item.id+'@'+item.version);
  if(!a||!item.authorId||a.authorId!==item.authorId||!a.editorId||a.editorId===a.authorId||!a.date||!a.sourceChecked||!a.languageChecked||!a.rightsChecked||!a.approvalReference||item.editorial?.reviewId!==a.approvalReference)issues.push('Independent review missing '+item.id);
  if(!item.slots.length||!item.variants.length||item.slots.some(s=>!s.id))issues.push('Invalid grading rubric '+item.id);
 }
 for(const [d,m,n] of P1_BLUEPRINT)if(items.filter(i=>i.skillId.startsWith(d+'.')&&i.mode===m).length!==n)issues.push(d+' requires '+n+' approved items');
 if(approvals.length!==items.length||new Set(approvals.map(a=>a.id+'@'+a.version)).size!==approvals.length)issues.push('Ledger does not match holdout form');
 return {ready:issues.length===0,issues};
}
export function makePilot(items:readonly PilotItem[],approvals:readonly Approval[],practiceIds:ReadonlySet<string>,id:string,now:number):DiagnosticSession{
 const gate=validatePilot(items,approvals,practiceIds);
 if(!gate.ready)throw Error('P1 pilot not available: '+gate.issues[0]);
 if(!id)throw Error('Session ID required');
 return {id,form:'P1',formFingerprint:items.map(i=>i.id+'@'+i.version).join('|'),itemIds:items.map(i=>i.id),phase:'IN_PROGRESS',startedAt:now,updatedAt:now,responses:[]};
}
export function answerPilot(s:DiagnosticSession,item:PilotItem,slots:Record<string,string>,now:number){
 if(s.form!=='P1'||!s.itemIds.includes(item.id))throw Error('Wrong assessment item or form');
 const grade=gradeAnswer(item,slots);
 if(grade.status==='VOID')throw Error('Invalid item rubric');
 return answerDiagnostic(s,item.id,JSON.stringify(slots),now,grade.score);
}
export function pilotResults(s:DiagnosticSession,items:readonly PilotItem[]){
 if(s.form!=='P1'||s.phase!=='COMPLETE')throw Error('Assessment incomplete');
 return P1_BLUEPRINT.map(([domain,,required])=>{
  const ids=new Set(items.filter(x=>x.skillId.startsWith(domain+'.')).map(x=>x.id));
  const records=s.responses.filter(r=>ids.has(r.itemId)&&r.objectiveScore!==undefined);
  return {domain,answered:records.length,required,correct:records.reduce((v,r)=>v+(r.objectiveScore??0),0),complete:records.length===required,cefrLevel:null};
 });
}
export {pauseDiagnostic as pausePilot,resumeDiagnostic as resumePilot,finishDiagnostic as finishPilot};
