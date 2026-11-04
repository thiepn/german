/** M41 review/rights/CEFR and approved-only source qualification. Read only. */
import {auditSourceBoundary} from './releaseBoundary.mjs';
import {inspectM39} from '../editorial/m39Review.mjs';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const assert=(b,msg)=>{if(!b)throw Error('M41 HOLD: '+msg)};
const sourceGroup={
 reference:'G01',deixis:'G01',caseTracing:'G02',relative:'G02',
 valency:'G03',attachment:'G03',
 focus:'G04',compression:'G04',relation:'G04',scope:'G04',
 modality:'G05',polysemy:'G06',definition:'G06',phraseology:'G07',
 stance:'G08',register:'G08',pragmatics:'G08',
 chronology:'G09',reading:'G09',crossSource:'G09',numeracy:'G09',
 listening:'G10',attribution:'G11',argument:'G11',editorial:'G11',
 oral:'G12',interaction:'G12',repair:'G12',mediation:'G13',disclosure:'G13'
};
export function qualifyM41({boundary=auditSourceBoundary(),review=inspectM39(),manifest=read('content/manifest.json'),approved=read('content/approved/approved.json'),ledger=read('content/editorial/approval-ledger.json'),proposals=read('content/editorial/m38-versioned-drafts.json')}={}){
 assert(boundary.channel==='DEMO_ONLY'&&boundary.releaseQualified===false,'unexpected approved content channel');
 assert(boundary.demoImportCount>=38&&boundary.files>=32,'baseline direct DEMO_ONLY source audit reduced without qualification');
 assert(review.caseCount===26&&review.corrections.length===4&&review.privateAlpha==='NO_GO','historical review count/status changed');
 assert(manifest.releaseStatus==='DEMO_ONLY'&&approved.length===0&&ledger.length===0,'approval/manifest must not advance from an author-only audit');
 assert(proposals.revisions.length===4&&proposals.revisions.every(r=>r.draftV2.version===2&&r.draftV2.status==='DEMO_ONLY'),'unapproved v2 staging has changed');
 const groups=new Map();
 for(const ref of boundary.refs){
  const module=ref.file.match(/^domain\/([^/]+)\//)?.[1];
  const group=sourceGroup[module]??(ref.file.startsWith('domain/content/')?'M01–M07':'UNMAPPED_HOLD');
  if(!groups.has(group))groups.set(group,[]);
  groups.get(group).push({...ref,group});
 }
 // A domain with zero direct imports is NOT a rights-cleared release domain.
 for(let i=1;i<=13;i++){const key='G'+String(i).padStart(2,'0');if(!groups.has(key))groups.set(key,[])}
 const rows=[...groups].sort((a,b)=>a[0].localeCompare(b[0])).map(([domain,imports])=>({
  domain,imports,qualifiedSourceVersionCount:0,rightsApproved:false,independentEditorialApproved:false,
  cefrPerformanceQualified:false,releaseDecision:'NO_GO'
 }));
 assert(rows.reduce((n,r)=>n+r.imports.length,0)===boundary.demoImportCount,'some direct demo references escaped report');
 const planned=proposals.revisions.map(p=>({
  sourceId:p.id,originalVersion:p.versionFrom,stagedVersion:p.versionTo,
  exactSourceAndVersionRequired:true,rights:p.draftV2.rights?.kind??null,
  approval:'NOT_GRANTED',activation:'FORBIDDEN',reviewerIdentity:null,
  independentLanguageReview:null,alternatives:'NOT_INDEPENDENTLY_ADJUDICATED',
  originalProvenance:'AUTHOR_ASSERTION_ONLY',cefr:'AUTHOR_LABEL_NOT_CALIBRATED'
 }));
 return {M41:'PASS_STATIC_INVENTORY_ONLY',sourceCount:boundary.demoImportCount,sourceFiles:boundary.files,domains:rows,
  originalCaseCount:review.caseCount,stagedRevisions:planned,release:'NO_GO',privateAlpha:'NO_GO',
  requiredEvidence:['Independently verified source ownership/license for each exact version and all excerpts',
    'Qualified independent language reviewer signs exact source version and every accepted/alternative answer',
    'Council of Europe CEFR descriptor mapping with learner task response and blinded human ratings; author C1/C2 label is not evidence',
    'G10 audio rights-cleared usable asset and verified assessment boundaries',
    'Explicit release-approved source graph for every shipped G01–G13 studio, not just the objective-loader alias',
    'Cross-version read-only archive resolution, backup CAS and runtime rollback with actual old/new builds']};
}
export function renderM41(r=qualifyM41()){
 const lines=['# M41 release-source and reviewer qualification — NO SIGNOFF','',
  'Generated from direct static imports; no permission, rights, expert review or CEFR qualification is implied.',
  'Release and private alpha: NO_GO. Approval ledger unchanged. Every item below is unapproved.',
  ''];
 for(const group of r.domains){
  lines.push('## '+group.domain+' — '+group.imports.length+' direct demo imports','');
  for(const ref of group.imports)lines.push('- '+ref.file+' → '+ref.fixture);
  lines.push('','Exact revised sources, approved-only alternatives and actual reviewer authority: NOT PROVIDED','');
 }
 lines.push('## Four unapproved version 2 proposals');
 for(const p of r.stagedRevisions)lines.push('- '+p.sourceId+' v'+p.originalVersion+' → v'+p.stagedVersion+' | options NOT adjudicated | provenance NOT verified | CEFR NOT calibrated');
 lines.push('','## Independent reviewer evidence required','');
 for(const s of r.requiredEvidence)lines.push('- '+s);
 lines.push('','Do not sign on behalf of a human reviewer. No automatic CEFR claims, rights clearance, release approval or migration.');return lines.join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=qualifyM41();
 if(process.argv.includes('--markdown'))console.log(renderM41(r));
 else console.log(JSON.stringify({M41:r.M41,sourceCount:r.sourceCount,sourceFiles:r.sourceFiles,
 domains:r.domains.map(x=>({domain:x.domain,count:x.imports.length})),release:r.release,privateAlpha:r.privateAlpha},null,2));
}
