
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateM38} from './m38Qualification.mjs';
import {validateM42} from './m42Review.mjs';
import {qualifyM41} from '../content/m41Qualification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const assert=(v,m)=>{if(!v)throw Error('M43 REVIEW_HOLD: '+m)};
const copy=x=>JSON.parse(JSON.stringify(x));
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const targets=[['attachments',0,'question'],['attachments',0,'options',1,'text'],['attachments',0,'model'],['attachments',0,'trap']];
const at=(x,arr)=>arr.reduce((a,k)=>a?.[k],x);
const set=(x,arr,v)=>{let a=x;for(const k of arr.slice(0,-1))a=a[k];a[arr.at(-1)]=v;};
export function validateM43({load=read}={}){
 const m38=validateM38({load}),m42=validateM42({load}),m41=qualifyM41();
 assert(m38.corrections.length===4&&m38.sourceCases.length===26&&m38.releaseGate==='NO_GO','M38 source/authority drift');
 assert(m42.newDrafts===11&&m42.newDefectCount===13&&m42.caseCount===26&&m42.release==='NO_GO','M42 source/authority drift');
 assert(m41.sourceCount===38&&m41.sourceFiles===32&&m41.release==='NO_GO','approved-only source holds changed');
 const p=load('content/editorial/m43-versioned-drafts.json');
 assert(p.schemaVersion===1&&p.phase==='M43'&&p.authoringOnly===true&&p.independentApproval===false&&p.rightsApproval===false&&p.releaseApproval===false&&p.cefrCalibration===false&&p.reviewer===null,'false independent signoff');
 assert(p.cases?.length===1,'exactly one additional version-two draft expected');
 const c=p.cases[0],source=load(c.source),v1=source.find(s=>s.id===c.id&&s.version===1);
 assert(c.id==='SG-G03A-002'&&c.source==='content/fixtures/g03-attachment.demo.json'&&c.versionFrom===1&&c.versionTo===2,'new source identity drift');
 assert(v1&&JSON.stringify(v1)===JSON.stringify(c.legacyV1)&&!source.some(s=>s.id===c.id&&s.version===2),'historical v1 source or activation drift');
 assert(v1.status==='DEMO_ONLY'&&v1.editorialApproval===false&&v1.reviewedBy===null&&v1.rights?.kind==='ORIGINAL_DRAFT','v1 source authority drift');
 assert(c.operations?.length===4&&c.draftDecision==='NOT_REVIEWED'&&c.independentGrammar==='NOT_REVIEWED'&&c.alternativeAnswers==='NOT_ADJUDICATED'&&c.rights==='NOT_VERIFIED'&&c.cefr==='NOT_CALIBRATED','false reviewer authority');
 const want=copy(v1);want.version=2;
 for(let i=0;i<4;i++){const o=c.operations[i],path=targets[i];assert(JSON.stringify(o.path)===JSON.stringify(path)&&typeof o.from==='string'&&typeof o.to==='string'&&o.from!==o.to&&at(want,path)===o.from,'unapproved patch scope or preimage '+i);set(want,path,o.to);}
 assert(JSON.stringify(want)===JSON.stringify(c.draftV2)&&c.draftV2.status==='DEMO_ONLY'&&c.draftV2.editorialApproval===false&&c.draftV2.reviewedBy===null,'draft v2 unexpected difference');
 assert(c.draftV2.attachments[0].quote===v1.attachments[0].quote&&c.draftV2.attachments[0].preferredId===v1.attachments[0].preferredId,'historical quote or preferred id altered');
 assert(c.draftV2.attachments[0].model.includes('adverbial')&&c.draftV2.attachments[0].model.includes('attributiv')&&c.draftV2.attachments[0].model.includes('zentralen Labor'),'competing parses omitted');
 const sampled=m38.sourceCases.map(x=>{
  const prior=m42.sample.find(y=>y.id===x.id);
  assert(prior&&prior.source===x.source&&prior.version===x.version,'sample member drift '+x.id);
  return {id:x.id,source:x.source,version:x.version,domain:x.domain,authorBand:x.authorBand,
   taskSha256:sha({id:x.id,paragraphs:x.paragraphs,task:x.task}),reviewRisk:prior.specialRisk??'Full source and all alternatives need independent adjudication',decision:null};
 });
 assert(sampled.length===26&&new Set(sampled.map(x=>x.id)).size===26,'26-case coverage');
 const groups=m41.domains.map(g=>({group:g.domain,imports:g.imports.length,independentlyApproved:false}));
 assert(groups.length===15&&groups.reduce((n,x)=>n+x.imports,0)===38,'source groups or inventory changed');
 const m42box=load('content/editorial/m42-versioned-drafts.json');
 assert(m42box.revisions.some(r=>r.id==='SG-G07-003'&&r.draftV2.version===2),'G07 d1 review must not create competing v2');
 return {status:'PASS_AUTHOR_STRUCTURAL_ONLY',release:'NO_GO',alpha:'NO_GO',rights:'NOT_VERIFIED',cefr:'NOT_CALIBRATED',
  sample:sampled,priorM38:m38.corrections.length,priorM42:m42.reviewCases.length,newDraft:c.id,
  newSourceSha256:sha({source:c.source,legacy:c.legacyV1,draft:c.draftV2}),groups,
  priorities:[
   {id:'SG-G03A-002:a1',finding:'The bare im Nebenraum phrase permits adverbial versus NP-attributive readings; wider passage supports prior storage and subsequent laboratory checking.',question:'Evaluate both parse trees, revised four-field inactive v2 and open-response marking.',reference:'https://grammis.ids-mannheim.de/sgt/2262'},
   {id:'SG-G07-003:d1',finding:'Alternative B (ongoing preparation) can also be true under the documented committee process; it is not a reliably false distractor.',question:'Decide whether accept, rewrite or withdraw. M42 already stages G07-003 v2, so do not create a competing v2.',reference:'https://www.duden.de/rechtschreibung/Beschluss'},
   {id:'SG-G02R-002:r1',finding:'v1 incorrectly describes feminine Finanzierung as das substantivierte Finanzierung.',question:'Check M38 proposed grammar correction against complete antecedent and relative-case analysis.',reference:'https://grammis.ids-mannheim.de/systematische-grammatik/1643'},
   {id:'SG-G06-002 and M42 G06/G07 keys',finding:'Original preferred IDs contradict their source paragraphs and author explanation in 15 total key cases.',question:'Check every context and plausible answer, not merely reversal to A.',reference:'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors'}
  ],
  m38Queue:m38.corrections.map(x=>({id:x.id,source:x.source,ops:x.operations.map(o=>o.path.join('.'))})),
  m42Queue:m42.reviewCases.map(x=>({id:x.id,source:x.source})),
  requirements:['Qualified independent reviewer identity, credentials, conflict of interest and dated signature bound to original source/version fingerprint',
   'All three source paragraphs read with every alternative, unlisted plausible readings and explainable correct/partial-credit marking',
   'External grammar/lexicography citations checked by humans against the EXACT task and answer',
   'Rights reviewer verifies ownership, originality, licenses and excerpt/audio chain of custody for exact source version',
   'CEFR official descriptor and actual independent blind-rated learner evidence, not an author-assigned C1/C2 label',
   'Approved-only per-studio source graph for G01–G13 and cross-cutting groups; do not remove safety gate, relabel demos or approve by metadata']};
}
export function renderM43(r=validateM43()){
 const out=['# M43 — compact independent German and rights reviewer packet','',
  'STATUS: AUTHOR REVIEW ONLY; NOT independent approval, CEFR calibration, legal rights clearance or a release authorization.',
  'Full source paragraphs and alternatives are available in npm run audit:m38 and npm run audit:m42; this is a concise handoff.',
  'Human reviewer/qualifications: __________  Source rights reviewer: __________  Independence/conflict statement: __________','',
  '## Priority linguistic adjudications'];
 for(const p of r.priorities)out.push('','### '+p.id,'Source-grounded concern: '+p.finding,'External reviewer task: '+p.question,'Grammar/dictionary reference: '+p.reference,
  'Independent source-anchored conclusion and ALL plausible answers: __________','Review decision on exact source/version, signature, dated: __________');
 out.push('','## 26 independently unapproved sampled cases: exact ID and fingerprint');
 for(const s of r.sample)out.push('- '+s.id+' | '+s.domain+' | '+s.authorBand+' | v'+s.version+' | '+s.source+' | SHA256 '+s.taskSha256+' | '+s.reviewRisk);
 out.push('','## Existing M38 (4 studies) and M42 (13 disputed keys) retained unmodified');
 for(const x of r.m38Queue)out.push('- M38 '+x.id+' | '+x.source+' | '+x.ops.join(', '));
 for(const x of r.m42Queue)out.push('- M42 '+x.id+' | '+x.source);
 out.push('','M43: '+r.newDraft+' author-only version 1 → 2, four strictly bounded explanation/question/option changes. Original source/draft SHA256 '+r.newSourceSha256+'.');
 out.push('','## Approved-only content source inventory remains blocked');
 for(const x of r.groups)out.push('- '+x.group+': '+x.imports+' direct demo imports, NOT independent rights-approved');
 out.push('','Required evidence / handoff checklist:');
 for(const x of r.requirements)out.push('- '+x);
 out.push('','Official CEFR: https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors','All editorial/rights/CEFR/alpha/release gates remain NO_GO. No author-generated signature or automatic approval.');
 return out.join('\n')+'\n';
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=validateM43();
 if(process.argv.includes('--markdown'))process.stdout.write(renderM43(r));
 else console.log(JSON.stringify({M43:r.status,caseCount:r.sample.length,M38:r.priorM38,M42:r.priorM42,newDraft:r.newDraft,groups:r.groups.length,imports:r.groups.reduce((n,g)=>n+g.imports,0),release:r.release,alpha:r.alpha},null,2));
}
