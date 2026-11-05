/**
 * M38 private-alpha dossier: structure and recorded draft revisions only.
 * No human reviewer assertions, no writes, no runtime registration.
 */
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const assert=(v,m)=>{if(!v)throw Error('M38 FAIL_CLOSED: '+m)};
const choiceKeys=['anchors','decisions','attachments','relations','contrasts','claims','turns'];
const expectedRevisions=['SG-G02R-002','SG-G06-002','SG-M05-036','SG-M05-037'];
const expectedFixes={'SG-G02R-002':['anchors.0.model'],'SG-G06-002':['decisions.0.preferredId','decisions.2.preferredId'],
 'SG-M05-036':['prompt','reviewPrompt','explanation','contrast.rationale'],
 'SG-M05-037':['prompt','reviewPrompt','explanation','contrast.rationale']};
const copy=x=>JSON.parse(JSON.stringify(x));
const norm=x=>String(x).trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const at=(obj,path)=>path.reduce((v,k)=>v?.[k],obj);
const replace=(obj,path,value)=>{let v=obj;for(const k of path.slice(0,-1))v=v[k];v[path.at(-1)]=value;};
function sourceCase(candidate,load){
 const list=load(candidate.source);
 const s=list.find(x=>x.id===candidate.studyId&&x.version===candidate.version);
 assert(s,'candidate ID or historical source version missing: '+candidate.id);
 const key=choiceKeys.find(k=>Array.isArray(s[k])&&s[k].some(x=>x.id===candidate.anchorId));
 assert(key,'candidate task missing '+candidate.id);
 const task=s[key].find(x=>x.id===candidate.anchorId);
 const paragraph=s.paragraphs.find(x=>x.id===task.paragraphId);
 assert(paragraph&&paragraph.text.includes(task.quote),'source quote/paragraph drift '+candidate.id);
 return {case:s,task,paragraph,kind:key};
}
export function validateM38({load=read}={}){
 const manifest=load('content/manifest.json');
 const approved=load('content/approved/approved.json'),holdout=load('content/assessment/p1.approved.json'),ledger=load('content/editorial/approval-ledger.json');
 assert(manifest.releaseStatus==='DEMO_ONLY'&&manifest.v1FeatureBoundary==='FROZEN_AFTER_M35_DRAFT_NOT_RELEASE_APPROVED','release/feature gate changed');
 assert(manifest.publishedApprovedCount===0&&manifest.lessonApprovalCount===0&&approved.length===0&&ledger.length===0&&holdout.length===0,'human approval/assessment authority changed');
 const sample=load('content/editorial/m37-alpha-candidates.json');
 assert(sample.totalCandidates===26&&sample.candidates.length===26&&sample.editorialAuthority==='NONE'&&sample.candidateApproval==='NOT_REVIEWED','M37 sample or editorial authority drift');
 const ids=new Set(),full=[];
 for(const c of sample.candidates){
  assert(!ids.has(c.id),'duplicate candidate '+c.id);ids.add(c.id);
  assert(c.reviewStatus==='NOT_REVIEWED'&&c.rightsStatus==='ORIGINAL_DRAFT_DEMO_ONLY','unearned human qualification '+c.id);
  const {case:s,task,paragraph,kind}=sourceCase(c,load);
  assert(s.status==='DEMO_ONLY'&&s.rights.kind==='ORIGINAL_DRAFT'&&s.reviewedBy===null&&s.editorialApproval===false,'unapproved source overwritten '+c.id);
  assert(task.quote&&s.paragraphs.reduce((n,p)=>n+p.text.split(task.quote).length-1,0)===1,'quote must occur once '+c.id);
  if(kind!=='turns'){
   assert(Array.isArray(task.options)&&task.options.length>=2&&task.options.some(o=>o.id===task.preferredId),'options/preferred missing '+c.id);
   assert(new Set(task.options.map(o=>norm(o.text))).size===task.options.length,'duplicate options '+c.id);
  }
  full.push({id:c.id,version:c.version,domain:c.domain,authorBand:c.band,source:c.source,title:s.title,
   sourceRightsClaim:s.rights.source,sourceReview:'UNVERIFIED',paragraphs:copy(s.paragraphs),task:copy(task),kind,
   linguistic:'NOT_REVIEWED',alternatives:'NOT_INDEPENDENTLY_CHECKED',originality:'UNVERIFIED',cefr:'NOT_CALIBRATED'});
 }
 assert(full.length===26&&full.some(x=>x.id==='SG-G02R-002:r1')&&full.some(x=>x.id==='SG-G06-002:d1'),'risky sample members silently removed');
 const box=load('content/editorial/m38-versioned-drafts.json');
 assert(box.schemaVersion===1&&box.phase==='M38'&&box.authoringOnly===true&&box.editorialApproval===false&&box.releaseApproval===false,'staged corrective pack claims approval');
 assert(box.revisions?.length===4,'four immutable-source version proposals expected');
 assert(JSON.stringify(box.revisions.map(r=>r.id).sort())===JSON.stringify([...expectedRevisions].sort()),'unexpected version proposals');
 for(const r of box.revisions){
  assert(r.versionFrom===1&&r.versionTo===2&&r.reviewStatus==='NOT_REVIEWED'&&r.rightsStatus==='ORIGINAL_DRAFT_DEMO_ONLY','unearned version promotion '+r.id);
  const legacy=load(r.source).find(s=>s.id===r.id&&s.version===1);
  assert(legacy&&JSON.stringify(legacy)===JSON.stringify(r.legacyV1),'historical v1 changed or proposal baseline drift '+r.id);
  assert(!load(r.source).some(s=>s.id===r.id&&s.version===2),'version two unexpectedly activated in current runtime '+r.id);
  const independentlyUnapproved=r.id.startsWith('SG-M05-') ? !r.draftV2.editorial?.reviewedBy && !r.draftV2.editorial?.approved && !r.draftV2.editorial?.reviewId : r.draftV2.editorialApproval===false&&r.draftV2.reviewedBy===null;
  assert(r.draftV2.id===r.id&&r.draftV2.version===2&&r.draftV2.status==='DEMO_ONLY'&&independentlyUnapproved&&r.draftV2.rights.kind==='ORIGINAL_DRAFT','draft v2 claims unearned approval '+r.id);
  const paths=r.operations.map(op=>op.path.join('.'));
  assert(JSON.stringify([...paths].sort())===JSON.stringify([...expectedFixes[r.id]].sort()),'unreviewed changed-field scope '+r.id);
  const expected=copy(legacy);expected.version=2;
  for(const op of r.operations){
   assert(typeof op.from==='string'&&typeof op.to==='string'&&op.from!==op.to,'empty/invalid correction '+r.id);
   assert(at(expected,op.path)===op.from,'old source expectation drift '+r.id+':'+op.path.join('.'));
   replace(expected,op.path,op.to);
  }
  assert(JSON.stringify(expected)===JSON.stringify(r.draftV2),'unauthorized source/answer/distractor change in v2 '+r.id);
  assert(r.draftV2.rights.source===legacy.rights.source,'source rights assertions changed '+r.id);
 }
 const g02=box.revisions.find(x=>x.id==='SG-G02R-002').draftV2;
 assert(g02.anchors[0].model.includes('die Finanzierung das Subjekt')&&!g02.anchors[0].model.includes('das substantivierte Finanzierung'),'grammar defect not corrected in proposed version');
 const g06=box.revisions.find(x=>x.id==='SG-G06-002').draftV2;
 assert(g06.decisions[0].preferredId==='A'&&g06.decisions[2].preferredId==='A','semantic answer reversals uncorrected');
 for(const id of ['SG-M05-036','SG-M05-037']){
  const v2=box.revisions.find(x=>x.id===id).draftV2;
  assert(v2.prompt===v2.reviewPrompt&&v2.variants[0].slots.collocation===(id==='SG-M05-036'?'prüfen':'aufzeigen'),'prompt/answer mismatch '+id);
 }
 return {structuralGate:'PASS',editorialGate:'NO_GO',privateAlphaGate:'NO_GO',releaseGate:'NO_GO',
  sourceCases:full,corrections:box.revisions,counts:{candidateCases:26,versionedDrafts:4,approvedItems:0,approvedLessons:0,approvedHoldouts:0,approvedDiagnosticA:0},
  openDefects:['SG-G02R-002:r1 (v1)','SG-G06-002:d1 (v1)','SG-G06-002:d3 (v1)','SG-M05-036 (v1)','SG-M05-037 (v1)']};
}
function clean(x){return String(x??'').replace(/\r/g,'');}
export function renderM38ReviewPacket(result=validateM38()){
 const out=['# Sprachgefühl M38 — independent human editorial review packet','',
  'Status: UNREVIEWED / NO_GO. A generated dossier is not a signature, rights proof or German/CEFR validation.',
  'All 26 items are sampled DEMO_ONLY v1 sources. Proposed version-two corrections are staged outside the runtime.',
  'Reviewer identity, independence, signed verdict and rights evidence must be supplied by real authorized humans.',''];
 for(const c of result.sourceCases){
  out.push('## '+c.id+' — '+c.domain+' / author-proposed '+c.authorBand+' / v'+c.version,'',
   'Source: '+c.source,'Source title: '+clean(c.title),'Source rights CLAIM ONLY: '+clean(c.sourceRightsClaim),'');
  for(const p of c.paragraphs)out.push('### Source '+p.id,'',clean(p.text),'');
  out.push('### Task '+c.task.id+' ('+c.kind+')','',
   'Verbatim quote: '+clean(c.task.quote),'Question: '+clean(c.task.question??c.task.prompt??c.task.instruction??'UNASSESSED ORAL TASK'),
   'Stored author-preferred ID (NOT verified): '+clean(c.task.preferredId??'NONE — ungraded'),'');
  if(c.task.options)for(const o of c.task.options)out.push('Option '+o.id+': '+clean(o.text));
  for(const k of ['phenomenon','family','lemma','speaker','goal','anchor','limit','transfer','alternate','model','trap','explanation','repairPrompt','action','boundary','clarified'])if(c.task[k])out.push('Draft '+k+': '+clean(c.task[k]));
  out.push('','### Reviewer fields — intentionally blank','',
   '- Reviewer identity / organization: __________________',
   '- Independent of source author? Evidence: __________________',
   '- Full source, quote, referents and chronology reviewed: __________________',
   '- Grammatically/idiomatically correct? Gender, case, valency, register: __________________',
   '- All plausible answers and counter-readings (including those not listed): __________________',
   '- Fair and unambiguous marking, or UNASSESSED for speaking/writing: __________________',
   '- Rights, provenance and originality evidence: __________________',
   '- CEFR calibration basis and actual learner evidence: __________________',
   '- Decision (APPROVE / REVISE / REJECT) and scope: __________________',
   '- Signed, dated external reviewer authority: __________________','');
 }
 out.push('## Staged version-two correction proposals (NOT active, NOT approved)','');
 for(const r of result.corrections){
  out.push('### '+r.id+' — v1 historical to v2 proposed','',r.rationale,'','Source: '+r.source,'');
  for(const op of r.operations)out.push('- '+op.path.join('.')+': OLD='+clean(op.from)+' | PROPOSED='+clean(op.to));
  out.push('','Reviewer decision / alternative answers / evidence / signature: __________________','');
 }
 out.push('## Release/production holds','',
  '- 0 authenticated editorial approvals; 0 approved training, holdout and diagnostic items; 0 approved lessons.',
  '- G10 lacks rights-cleared bundled audio; no audio-based CEFR claim.',
  '- Active runtime still imports DEMO_ONLY fixtures directly; dist/data/approved.v1.json is not consumed.',
  '- Preserve source IDs, item version 1, learner attempts, eight IndexedDB stores, production CAS, backup v3 and original text versions.',
  '- Integrate v2 into runtime only after independent review and version-aware learner/archive regression; never swap a v1 source silently.',
  '- This packet does not authorize a merge, deployment or publication.');
 return out.join('\n')+'\n';
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=validateM38();
 if(process.argv.includes('--markdown'))process.stdout.write(renderM38ReviewPacket(r));
 else console.log(JSON.stringify({M38:'PASS_STRUCTURAL_ONLY',editorial:r.editorialGate,alpha:r.privateAlphaGate,release:r.releaseGate,counts:r.counts,openDefects:r.openDefects},null,2));
}
