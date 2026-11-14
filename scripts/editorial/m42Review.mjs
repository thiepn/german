/**
 * M42 editorial review bundle. This is author-side defect triage, not
 * independent linguistic, copyright, rights or CEFR evidence.
 * Read-only; never imports v2 into runtime or edits a learner store.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateM38} from './m38Qualification.mjs';
import {inspectM39} from './m39Review.mjs';
import {qualifyM41} from '../content/m41Qualification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const assert=(x,m)=>{if(!x)throw Error('M42 EDITORIAL_HOLD: '+m)};
const clone=x=>JSON.parse(JSON.stringify(x));
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const expected={
 'SG-G06-001':['d2'],'SG-G06-003':['d2'],'SG-G06-004':['d2'],'SG-G06-005':['d2'],'SG-G06-006':['d1','d3'],
 'SG-G07-001':['d2'],'SG-G07-002':['d2'],'SG-G07-003':['d2'],'SG-G07-004':['d2'],'SG-G07-005':['d2'],'SG-G07-006':['d1','d3']
};
const scaleHints={
 G01:['Linguistic range','Grammatical accuracy','Reading for information and argument'],
 G02:['Grammatical accuracy','Reading for information and argument'],
 G03:['Grammatical accuracy','Reading for information and argument'],
 G04:['Coherence and cohesion','Reading for information and argument'],
 G05:['Grammatical accuracy','Propositional precision'],
 G06:['Vocabulary range','Vocabulary control','Reading for information and argument'],
 G07:['Vocabulary range','Vocabulary control','Sociolinguistic appropriateness'],
 G08:['Sociolinguistic appropriateness','Propositional precision'],
 G09:['Reading for information and argument','Identifying cues and inferring'],
 G10:['Overall listening comprehension'],
 G11:['Processing text','Written reports and essays','Coherence and cohesion'],
 G12:['Overall oral production','Overall oral interaction','Phonological control'],
 G13:['Processing text','Relaying specific information','Facilitating pluricultural space']
};
const get=(object,path)=>path.reduce((a,k)=>a?.[k],object);
export function validateM42({load=read}={}){
 const m38=validateM38({load}),m39=inspectM39({load}),m41=qualifyM41();
 assert(m38.corrections.length===4&&m38.sourceCases.length===26&&m38.releaseGate==='NO_GO','four M38 draft proposals or 26 review cases changed');
 assert(m39.rows.length===26&&m39.linguistic==='NOT_INDEPENDENTLY_REVIEWED','M39 risk and reviewer authority changed');
 assert(m41.sourceCount===38&&m41.sourceFiles===32&&m41.release==='NO_GO','38/32 direct import boundary drift');
 const packet=load('content/editorial/m42-versioned-drafts.json');
 assert(packet.schemaVersion===1&&packet.phase==='M42'&&packet.authoringOnly===true&&packet.editorialApproval===false&&packet.rightsApproval===false&&packet.releaseApproval===false&&packet.cefrCalibration===false&&packet.independentReviewer===null,'unearned editorial/rights/CEFR release authority');
 assert(packet.revisions?.length===11&&new Set(packet.revisions.map(x=>x.id)).size===11,'11 additional affected v1 studies expected');
 assert(JSON.stringify([...packet.excludedAlreadyStaged].sort())===JSON.stringify(['SG-G06-002:d1','SG-G06-002:d3'].sort()),'M38 overlapping proposed keys must not be restaged');
 let changes=0;
 const reviewCases=[];
 for(const p of packet.revisions){
  assert(expected[p.id]&&JSON.stringify(p.affectedDecisionIds)===JSON.stringify(expected[p.id]),'proposal ID or scope drift '+p.id);
  assert(p.source===(p.id.startsWith('SG-G06-')?'content/fixtures/g06-polysemy.demo.json':'content/fixtures/g07-phraseology.demo.json'),'source path mismatch '+p.id);
  assert(p.versionFrom===1&&p.versionTo===2&&p.reviewStatus==='NOT_REVIEWED'&&p.editorialApproval===false&&p.releaseApproval===false&&p.rightsStatus==='ORIGINAL_DRAFT_DEMO_ONLY'&&p.cefrStatus==='NOT_CALIBRATED','staged proposal claims human authorization '+p.id);
  const original=load(p.source).find(s=>s.id===p.id&&s.version===1);
  assert(original&&JSON.stringify(original)===JSON.stringify(p.legacyV1),'historical v1 changed or proposal preimage drift '+p.id);
  assert(!load(p.source).some(s=>s.id===p.id&&s.version===2),'v2 unexpectedly activated '+p.id);
  const v2=clone(original);v2.version=2;
  assert(p.operations.length===expected[p.id].length,'wrong number of changes '+p.id);
  for(const [j,decisionId] of expected[p.id].entries()){
   const i=original.decisions.findIndex(d=>d.id===decisionId),d=original.decisions[i],op=p.operations[j];
   assert(i>=0&&d.preferredId==='B'&&d.options?.length===2&&d.options[0].id==='A'&&d.options[1].id==='B','original preferred key or options drift '+p.id+':'+decisionId);
   assert(JSON.stringify(op.path)===JSON.stringify(['decisions',i,'preferredId'])&&op.from==='B'&&op.to==='A','unauthorized draft field change '+p.id+':'+decisionId);
   assert(original.paragraphs.find(x=>x.id===d.paragraphId)?.text.includes(d.quote)&&d.explanation.length>40,'literal source or rationale missing '+p.id+':'+decisionId);
   assert(get(v2,op.path)===op.from,'old value mismatch '+p.id+':'+decisionId);
   v2.decisions[i].preferredId='A';changes++;
   reviewCases.push({id:p.id+':'+decisionId,studyId:p.id,source:p.source,versionFrom:1,versionTo:2,
    sourceFingerprint:digest({id:original.id,version:original.version,paragraphs:original.paragraphs}),
    paragraph:original.paragraphs.find(x=>x.id===d.paragraphId).text,quote:d.quote,authorOptionA:d.options[0].text,authorOptionB:d.options[1].text,
    authorExplanation:d.explanation,originalKey:'B',proposedKey:'A',reviewerDecision:null,linguistic:'AUTHOR_SUSPECTED_INCONSISTENCY',rights:'NOT_VERIFIED'});
  }
  assert(JSON.stringify(v2)===JSON.stringify(p.draftV2),'proposed v2 changed outside exact allowed author key fields '+p.id);
  assert(p.draftV2.status==='DEMO_ONLY'&&p.draftV2.editorialApproval===false&&p.draftV2.reviewedBy===null&&p.draftV2.rights.kind==='ORIGINAL_DRAFT','unauthorized source editorial state '+p.id);
 }
 assert(changes===13&&reviewCases.length===13,'13 additional lexical key contradictions expected');
 const sample=m38.sourceCases.map(c=>{
  const r=m39.rows.find(x=>x.id===c.id);
  assert(r&&r.sourceVersion===c.version&&r.humanReviewer===null&&r.cefrCalibration==='NOT_CALIBRATED','case sample or human status mismatch '+c.id);
  return {...c,sourceFingerprint:r.sourceFingerprint,domainReview:r.domainReview,specialRisk:r.specialRisk??null,
   descriptorFamilies:scaleHints[c.domain],levelClaim:'AUTHOR_LABEL_ONLY',humanDecision:null,rights:'NOT_VERIFIED'};
 });
 const holds=[
  {id:'SG-G03A-002:a1',reason:'Quoted im Nebenraum naturally modifies überprüfte as a locative adverbial; the authored B explanation instead describes an earlier storage location. Independent German syntax review must adjudicate how to re-author the source, not just flip a key.'},
  {id:'SG-G07-003:d1',reason:'Alternative B is not a direct semantic equivalent but is not conclusively excluded by a preparatory context; require fair distractor/partial-credit decision and source-grounded rewrite.'},
  {id:'SG-G13D-001:d1',reason:'Four-week deadline is invented within a fictional file. Confirm that exercise and feedback do not present it as real legal guidance.'},
  {id:'G10',reason:'No rights-cleared original recording, transcription, native-speaker/linguistic assessment or externally validated performance evidence; no audio or proficiency claims.'}
 ];
 const inventory=m41.domains.map(d=>({domain:d.domain,directDemoImports:d.imports.length,
  paths:d.imports.map(x=>({file:x.file,fixture:x.fixture})),
  approvedOnlyPlan:'Keep source-versioned learner records; independently verify source and approved replacements, introduce explicitly isolated studio source modules, enforce static graph and artifact checks before considering activation',
  ready:false}));
 return {M42:'PASS_STRUCTURAL_ONLY',release:'NO_GO',alpha:'NO_GO',editorial:'NO_GO',caseCount:sample.length,newDrafts:11,newDefectCount:changes,
  oldDrafts:4,priorM38Keys:['SG-G06-002:d1','SG-G06-002:d3'],reviewCases,sample,holds,inventory,
  cefrOfficialUrl:'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors',
  cefrCompanionUrl:'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions'};
}
export function renderM42(r=validateM42()){
 const out=['# Sprachgefühl — M42 independently actionable editorial review dossier','',
 'STATUS: AUTHOR SIDE / NO_GO / NOT APPROVED. Exact SHA-256 fingerprints attest file-state identity ONLY, never originality or rights.',
 'All sources are fictional self-declared AI draft prose. No independent review of German, alternatives, spoken performance, rights or CEFR levels has occurred.',
 'Official CEFR framework (2020 Companion Volume): '+r.cefrCompanionUrl,
 'Official descriptor index: '+r.cefrOfficialUrl,
 'Descriptor families below are only REVIEW TARGETS: a single exercise or author-proposed C1/C2 band cannot calibrate or certify learners.',
 '', '## Existing 26-case private alpha dossier with complete original paragraphs'];
 for(const c of r.sample){
  out.push('','### '+c.id+' · '+c.domain+' · author-tagged '+c.authorBand+' · original v'+c.version,
   'Fixture '+c.source+' | SHA-256 '+c.sourceFingerprint,
   'Provenance claim (unverified): '+c.sourceRightsClaim,
   'Review domains: '+c.domainReview,
   'CEFR descriptor families for independent calibration: '+c.descriptorFamilies.join('; '),
   'Specific preidentified risk: '+(c.specialRisk??'None; this does not establish correctness.'),'');
  for(const p of c.paragraphs)out.push('**'+p.id+'** '+p.text,'');
  out.push('Quote: '+c.task.quote,'Prompt: '+(c.task.question??c.task.prompt??c.task.instruction??c.task.transfer??'Open response — no machine score'));
  if(c.task.options)for(const opt of c.task.options)out.push('Option '+opt.id+': '+opt.text);
  out.push('Original author preferred (NOT independently accepted): '+(c.task.preferredId??'UNASSESSED'),
   'All fair alternative readings and open responses: __________________',
   'Independent German grammar, discourse and semantic rationale with source paragraph anchors: __________________',
   'Verified source author/chain of custody/license or originality-search evidence: __________________',
   'CEFR Companion Volume exact descriptor/scale, independent C1/C2 sample responses, blind raters and adjudication: __________________',
   'Qualified independent reviewer identity, scope, signed decision and date: __________________','');
 }
 out.push('','## 13 additional reproducible author-key contradictions — 11 separate version-2 draft studies','',
  'Original v1 ID, answer, source and learner record remain unchanged. These proposed reversals require independent German review before any use.');
 for(const c of r.reviewCases){
  out.push('','### '+c.id+' v1 B → staged v2 A',
  'Source '+c.source+' | original source fingerprint '+c.sourceFingerprint,
  'Complete relevant paragraph: '+c.paragraph,
  'Literal excerpt: '+c.quote,
  'Original author-key B (suspected incorrect): '+c.authorOptionB,
  'Proposed author-key A (not approved): '+c.authorOptionA,
  'Original author explanation: '+c.authorExplanation,
  'Independent reviewer must evaluate the original context, all unlisted alternative interpretations and full-paragraph meaning.',
  'Independent confirmed key / accept-multiple / rewrite / withdraw: __________________',
  'Qualified independent reviewer, justification, dated signature: __________________','');
 }
 out.push('','## Additional high-risk holds requiring direct manual rewriting or adjudication');
 for(const h of r.holds)out.push('- '+h.id+': '+h.reason);
 out.push('','## G01–G13 approved-only migration plan — no approvals conferred','',
  'The following counts identify DIRECT demo imports only, not a fully proven transitive dependency graph or source rights clearance.');
 for(const group of r.inventory){
  out.push('','### '+group.domain+': '+group.directDemoImports+' direct imports; release NO_GO');
  for(const p of group.paths)out.push('- '+p.file+' → '+p.fixture);
 }
 out.push('','Each studio needs authentic independently approved, version-qualified source packages; no placeholder or demo alias may make it into the release dependency graph.',
 'After real approvals: qualify old and new item versions, migration-free archives and backups, each studio import graph, no demo bytes/artifact markers, review ledgers, CEFR evidence, G10 audio rights and physical-device/accessibility testing.',
 'A signed human decision must identify the immutable source fingerprint and item version; never carry a v1 approval over to v2.',
 'END OF UNAPPROVED AUTHOR-SIDE PACKET');return out.join('\n')+'\n';
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=validateM42();
 if(process.argv.includes('--markdown'))process.stdout.write(renderM42(r));
 else console.log(JSON.stringify({M42:r.M42,caseCount:r.caseCount,originalDrafts:r.oldDrafts,newDrafts:r.newDrafts,
  newDefects:r.newDefectCount,directDemoImports:r.inventory.reduce((n,x)=>n+x.directDemoImports,0),domains:r.inventory.length,
  release:r.release,editorial:r.editorial,alpha:r.alpha},null,2));
}
