/**
 * Compile-time content channel gate. This does NOT confer editorial approval.
 * A release must qualify every learner-facing studio, not just M01–M07 exercises.
 */
export type ContentChannel='DEMO_ONLY'|'APPROVED_ONLY';
type Manifest={releaseStatus?:unknown;publishedApprovedCount?:unknown;reviewedTargetP1?:unknown;lessonApprovalCount?:unknown;releaseStudiosQualified?:unknown;v1FeatureBoundary?:unknown};
type ExerciseRecord={id?:unknown;version?:unknown;status?:unknown;authorId?:unknown};
type ApprovalRecord={id?:unknown;version?:unknown;authorId?:unknown;editorId?:unknown;sourceChecked?:unknown;languageChecked?:unknown;rightsChecked?:unknown;approvalReference?:unknown};
const assert=(ok:unknown,detail:string)=>{if(!ok)throw Error('CONTENT_CHANNEL_BLOCKED: '+detail)};
export function resolveContentChannel(channel:string,manifest:Manifest,approved:ExerciseRecord[],ledger:ApprovalRecord[]):ContentChannel{
 assert(channel==='DEMO_ONLY'||channel==='APPROVED_ONLY','unknown content channel');
 if(channel==='DEMO_ONLY'){
  assert(manifest.releaseStatus==='DEMO_ONLY','cannot compile an unqualified demo against another release manifest');
  return 'DEMO_ONLY';
 }
 assert(manifest.releaseStatus==='RELEASE_CANDIDATE','signed release manifest is absent');
 assert(manifest.v1FeatureBoundary==='FROZEN_AFTER_M35_DRAFT_NOT_RELEASE_APPROVED','release contract changed; review must requalify boundaries');
 assert(manifest.releaseStudiosQualified===true,'G01–G13 nonobjective studios are not independently qualified for publishing');
 const target=manifest.reviewedTargetP1;
 assert(Number.isInteger(target)&&Number(target)>=350,'reviewed exercise target cannot be reduced');
 assert(Array.isArray(approved)&&approved.length>=Number(target)&&manifest.publishedApprovedCount===approved.length,'approved exercise count or manifest mismatch');
 assert(Number(manifest.lessonApprovalCount)>=10,'independently approved lessons missing');
 assert(Array.isArray(ledger)&&ledger.length===approved.length,'approval ledger mismatch');
 const keys=new Set<string>();
 for(const exercise of approved){
  const key=String(exercise.id)+'@'+String(exercise.version);
  assert(exercise.status==='REVIEWED'&&typeof exercise.authorId==='string'&&exercise.authorId.length>0&&!keys.has(key),'duplicate or unreviewed content '+key);
  keys.add(key);
  const match=ledger.filter(r=>r.id===exercise.id&&r.version===exercise.version);
  assert(match.length===1&&match[0].authorId===exercise.authorId&&typeof match[0].editorId==='string'&&match[0].editorId!==exercise.authorId&&
   match[0].sourceChecked===true&&match[0].languageChecked===true&&match[0].rightsChecked===true&&typeof match[0].approvalReference==='string'&&!!match[0].approvalReference,
   'missing independent item-version approval '+key);
 }
 return 'APPROVED_ONLY';
}
