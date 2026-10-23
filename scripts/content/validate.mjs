import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=(p)=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const demo=[...read('content/fixtures/core.demo.json'),...read('content/fixtures/syntax-collocations.demo.json'),...read('content/fixtures/collocation-contrasts.demo.json'),...read('content/fixtures/nuance-grounded.demo.json'),...read('content/fixtures/advanced-precision.demo.json'),...read('content/fixtures/semantic-register.demo.json')];
const production=[...read('content/fixtures/production.demo.json'),...read('content/fixtures/production-continuation.demo.json')];
const authority=read('content/editorial/lexical-anchors.json');
const approved=read('content/approved/approved.json');
const ledger=read('content/editorial/approval-ledger.json');
const manifest=read('content/manifest.json');
const modes=new Set(['M01','M02','M03','M04','M05','M06','M07']);const ids=new Set();const counts=Object.fromEntries([...modes].map(m=>[m,0]));
const approvalById=new Map(ledger.map(r=>[r.id+'@'+r.version,r]));
if(approvalById.size!==ledger.length)throw Error('Duplicate editorial approval records');
const normalize=s=>s.trim().normalize('NFC').toLocaleLowerCase('de-DE').replace(/\s+/g,' ');
for(const [item,source] of [...demo.map(i=>[i,'demo']),...approved.map(i=>[i,'approved'])]){
 if(typeof item.id!=='string'||!/^SG-M0[1-7]-\d{3}$/.test(item.id))throw Error('Unrecognized stable ID '+item.id);
 if(ids.has(item.id))throw Error('Duplicate ID across content packages '+item.id);ids.add(item.id);
 if(!Number.isInteger(item.version)||item.version<1)throw Error('Bad revision '+item.id);
 if(!modes.has(item.mode)||!item.id.includes(item.mode))throw Error('Mode mismatch '+item.id);
 if(typeof item.skillId!=='string'||!/^G\d{2}\./.test(item.skillId)||!['BRIDGE_C1','C1','C2'].includes(item.band))throw Error('Missing taxonomy '+item.id);
 for(const k of ['prompt','explanation','misconception','reviewPrompt','reviewAnswer','topic'])if(typeof item[k]!=='string'||!item[k].trim())throw Error('Missing '+k+' '+item.id);
 if(!item.rights?.source?.trim())throw Error('Missing source provenance '+item.id);
 if(!Array.isArray(item.slots)||!item.slots.length||new Set(item.slots.map(s=>s.id)).size!==item.slots.length)throw Error('Invalid slots '+item.id);
 if(!item.slots.every(s=>s.id&&s.label))throw Error('Missing slot label '+item.id);
 if(!Array.isArray(item.variants)||!item.variants.length)throw Error('Missing alternatives '+item.id);
 const expected=item.slots.map(s=>s.id).sort().join('|'),unique=new Set();
 for(const variant of item.variants){
  if(!variant.slots||Object.keys(variant.slots).sort().join('|')!==expected)throw Error('Joint alternative has incomplete or extra slots '+item.id);
  const values=item.slots.map(s=>variant.slots[s.id]);
  if(values.some(v=>typeof v!=='string'||!v.trim()))throw Error('Empty solution '+item.id);
  const normalized=values.map(normalize).join('|');if(unique.has(normalized))throw Error('Duplicate normalized variant '+item.id);unique.add(normalized);
 }
 const solution=item.slots.map(s=>item.variants[0].slots[s.id]).join(' · ');
 if(normalize(item.reviewAnswer)!==normalize(solution))throw Error('Review solution mismatch '+item.id);
 counts[item.mode]++;
 if(source==='demo'){
  if(item.status!=='DEMO_ONLY'||item.rights.kind!=='ORIGINAL_DRAFT'||item.editorial?.reviewedBy)throw Error('Demo illegally marked reviewed '+item.id);
 }else{
  if(item.status!=='REVIEWED'||item.rights.kind==='ORIGINAL_DRAFT'||!item.authorId)throw Error('Invalid approved item '+item.id);
  const review=approvalById.get(item.id+'@'+item.version);
  if(!review||review.authorId!==item.authorId||review.editorId===item.authorId||!review.editorId||!review.date||!review.sourceChecked||!review.languageChecked||!review.rightsChecked||!review.approvalReference)throw Error('Missing independent approval '+item.id);
  if(item.editorial?.reviewId!==review.approvalReference)throw Error('Editorial record mismatch '+item.id);
 }
}
for(const record of ledger)if(!approved.some(a=>a.id===record.id&&a.version===record.version))throw Error('Orphan approval '+record.id);
if(manifest.demoItemCount!==demo.length||manifest.publishedApprovedCount!==approved.length||manifest.releaseStatus!=='DEMO_ONLY')throw Error('Content manifest stale or false');
const anchors=new Map();
for(const a of authority.anchors){
 if(!/^[A-Z_]+$/.test(a.id)||anchors.has(a.id)||!/^https:\/\/www\.duden\.de\/rechtschreibung\/[A-Za-z_]+$/.test(a.url)||a.editorialApproved!==false||a.referenceKind!=='DICTIONARY_LEXICAL_FORM_ONLY')throw Error('Unapproved or malformed dictionary anchor '+a.id);
 anchors.set(a.id,a);
}
for(const i of demo.filter(x=>x.lexicalAuthority)){
 const a=anchors.get(i.lexicalAuthority.anchorId);
 if(!a||i.mode!=='M05'||i.status!=='DEMO_ONLY'||i.lexicalAuthority.editorialApproved!==false||i.lexicalAuthority.scope!=='LEXICAL_FORM_ONLY'||!i.contrast)throw Error('Invalid authority scope '+i.id);
}
const productionIds=new Set();
for(const p of production){
 if(!/^SG-P04-\d{3}$/.test(p.id)||productionIds.has(p.id)||p.status!=='DEMO_ONLY'||p.authorship!=='AI_DRAFT'||p.reviewedBy!==null||p.skillId!=='G04.SYNTAX'||p.version!==1)throw Error('Unqualified production prompt '+p.id);
 productionIds.add(p.id);
 if(!p.source?.trim()||!p.instruction?.trim()||!p.sample?.trim()||!Array.isArray(p.noticing)||p.noticing.length<3)throw Error('Incomplete production authoring '+p.id);
}
for(const item of demo)if(item.decision){
 if(!['M06','M07'].includes(item.mode)||item.decision.kind!=='AUTHOR_DRAFT_CHOICE'||!Array.isArray(item.decision.options)||item.decision.options.length!==3||new Set(item.decision.options).size!==3||!item.decision.rationale?.trim()||item.slots.length!==1||item.slots[0].id!=='choice'||!item.decision.options.includes(item.variants[0].slots.choice))throw Error('Invalid M06/M07 decision '+item.id);
}
for(const item of demo)if(item.contrast){
 if(item.mode!=='M05'||item.contrast.kind!=='AUTHOR_DRAFT_CHOICE'||!Array.isArray(item.contrast.options)||item.contrast.options.length<2||new Set(item.contrast.options).size!==item.contrast.options.length||!item.contrast.rationale?.trim()||!item.contrast.options.includes(item.variants[0].slots.collocation))throw Error('Invalid M05 contrast '+item.id);
}
if(manifest.productionPromptCount!==production.length)throw Error('Production manifest inaccurate');

const readingSources=manifest.readingSources??[];
if(readingSources.length!==1||readingSources[0]!=='content/fixtures/reading-studies.demo.json')throw Error('Unexpected reading authoring scope');
const reading=readingSources.flatMap(read);
const readingRefs=read(manifest.readingGrammarAnchors);
const grammaticalRefs=new Map();
for(const ref of readingRefs.anchors){
 if(grammaticalRefs.has(ref.id)||!/^https:\/\/grammis\.ids-mannheim\.de\/(fragen|systematische-grammatik)\/\d+$/.test(ref.url)||ref.editorialApproved!==false||ref.licenseToRepublishSourceText!==false||ref.kind!=='LINGUISTIC_GRAMMAR_BACKGROUND')throw Error('Invalid reading grammar reference');
 grammaticalRefs.set(ref.id,ref);
}
const readingIds=new Set();
let questionCount=0;
for(const u of reading){
 if(readingIds.has(u.id)||!/^SG-R09-\d{3}$/.test(u.id)||u.version!==1||u.status!=='DEMO_ONLY'||u.domain!=='G09'||u.editorial?.approved!==false||u.editorial?.reviewedBy!==null||u.referenceScope!=='LINGUISTIC_BACKGROUND_ONLY'||u.rights?.kind!=='ORIGINAL_DRAFT')throw Error('Unqualified reading unit '+u.id);
 readingIds.add(u.id);
 if(!u.title?.trim()||!u.focus?.trim()||!u.register?.trim()||!['C1','C2'].includes(u.band)||!Array.isArray(u.paragraphs)||u.paragraphs.length<3||!Array.isArray(u.questions)||u.questions.length!==3)throw Error('Incomplete reading unit '+u.id);
 const paragraphs=new Set(u.paragraphs.map(p=>p.id));
 if(paragraphs.size!==u.paragraphs.length||u.paragraphs.some(p=>!p.text||p.text.length<170))throw Error('Missing reading text '+u.id);
 if(!Array.isArray(u.anchorIds)||u.anchorIds.length===0||u.anchorIds.some(k=>!grammaticalRefs.has(k)))throw Error('Missing grammar reference '+u.id);
 const questions=new Set();
 for(const q of u.questions){
  questionCount++;
  if(questions.has(q.id)||!/^q[1-9]$/.test(q.id)||!q.prompt?.trim()||!q.model?.trim()||!q.focus?.trim()||!Array.isArray(q.paragraphIds)||!q.paragraphIds.length||q.paragraphIds.some(id=>!paragraphs.has(id)))throw Error('Malformed reading question '+u.id+' '+q.id);
  questions.add(q.id);
 }
 if(!/^SG-M0[1-5]-\d{3}$/.test(u.transfer?.itemId)||!['M01','M02','M03','M04','M05'].includes(u.transfer.mode)||!u.transfer.why?.trim())throw Error('Invalid transfer target '+u.id);
}
if(reading.length!==manifest.readingUnitCount||questionCount!==manifest.readingQuestionCount)throw Error('Reading manifest count mismatch');


const pragmatic=read(manifest.pragmaticAuthoringSource);
const refs=read(manifest.pragmaticReferenceSource);
if(pragmatic.length!==manifest.pragmaticScenarioCount||!Array.isArray(refs.anchors))throw Error('Pragmatics manifest mismatch');
const sourceRefs=new Map(refs.anchors.map(r=>[r.id,r]));
if(sourceRefs.size!==refs.anchors.length||!sourceRefs.has('CEFR_SOCIOPRAGMATIC_2020'))throw Error('Invalid pragmatics references');
for(const ref of refs.anchors)if(ref.editorialApproved!==false||!/^https:\/\/(www\.coe\.int|grammis\.ids-mannheim\.de)\//.test(ref.url))throw Error('Unapproved authority or malformed reference');
const pragmaticIds=new Set();
for(const p of pragmatic){
 if(!/^SG-G08-\d{3}$/.test(p.id)||pragmaticIds.has(p.id)||p.version!==1||p.domain!=='G08'||!['C1','C2'].includes(p.band)||p.status!=='DEMO_ONLY'||p.authorship!=='AI_DRAFT'||p.reviewedBy!==null||p.editorialApproval!==false||p.rights?.kind!=='ORIGINAL_DRAFT'||!sourceRefs.has(p.cefrReference))throw Error('Invalid pragmatic decision '+p.id);
 pragmaticIds.add(p.id);
 if(!p.title?.trim()||!p.context?.trim()||!p.task?.trim()||!p.rewrite?.trim()||p.context.length<30||!Array.isArray(p.options)||p.options.length!==3)throw Error('Incomplete pragmatics '+p.id);
 const optionIds=new Set(p.options.map(o=>o.id));
 if(optionIds.size!==3||p.options.some(o=>!o.text?.trim()||!o.effect?.trim())||!Array.isArray(p.preferredIds)||!p.preferredIds.length||p.preferredIds.some(id=>!optionIds.has(id)))throw Error('Invalid pragmatic nuance options '+p.id);
}
const transfers=read(manifest.readingTransferAuthoringSource);
if(transfers.length!==manifest.readingTransferCount)throw Error('Transfer manifest mismatch');
const seenTransfer=new Set();
for(const x of transfers){
 if(!/^SG-T09-\d{3}$/.test(x.id)||seenTransfer.has(x.id)||!readingIds.has(x.unitId)||x.version!==1||x.status!=='DEMO_ONLY'||x.reviewedBy!==null||x.editorialApproval!==false||x.authorship!=='AI_DRAFT'||x.rights?.kind!=='ORIGINAL_DRAFT'||!x.title?.trim()||!x.instruction?.trim()||!x.audience?.trim()||!x.register?.trim()||!Array.isArray(x.checks)||x.checks.length<3||x.checks.some(c=>!c.trim()))throw Error('Invalid G09 transfer '+x.id);
 seenTransfer.add(x.id);
}
if(seenTransfer.size!==readingIds.size)throw Error('Missing transfer brief for a reading study');

const m12=read(manifest.modalityDraftSource);
if(manifest.modalityDraftCount!==6||m12.length!==manifest.modalityDraftCount)throw Error('G05 modality draft count mismatch');
const g05Ids=new Set(),g05Families=new Set();
for(const s of m12){
 if(!/^SG-G05-\d{3}$/.test(s.id)||g05Ids.has(s.id)||s.version!==1||s.domain!=='G05'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.editorialApproval!==false||s.reviewedBy!==null||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G05 study '+s.id);
 g05Ids.add(s.id);
 if(!s.title?.trim()||!s.focus?.trim()||!s.transfer?.trim()||s.paragraphs?.length!==3||s.contrasts?.length!==3)throw Error('Incomplete G05 source study '+s.id);
 const paragraphIds=new Set(s.paragraphs.map(p=>p.id));
 if(paragraphIds.size!==3||s.paragraphs.some(p=>!p.text?.trim()||p.text.length<100))throw Error('Missing G05 source text '+s.id);
 const contrastIds=new Set();
 for(const x of s.contrasts){
  if(contrastIds.has(x.id)||!/^c[1-3]$/.test(x.id)||!paragraphIds.has(x.paragraphId)||!s.paragraphs.find(p=>p.id===x.paragraphId)?.text.includes(x.quote)||!x.prompt?.trim()||!x.model?.trim()||!x.reason?.trim()||x.options?.length!==2||x.options[0].id!=='A'||x.options[1].id!=='B'||!['A','B'].includes(x.preferredId)||x.options.some(o=>!o.text?.trim()))throw Error('Invalid G05 source contrast '+s.id+':'+x.id);
  contrastIds.add(x.id);g05Families.add(x.family);
 }
}
if(g05Families.size<8)throw Error('Insufficient M12 tense, mood and voice contrasts');

const m13=read(manifest.caseTracingDraftSource);
if(manifest.caseTracingDraftCount!==6||m13.length!==manifest.caseTracingDraftCount)throw Error('G02 case-tracing source count mismatch');
const g02Ids=new Set(),g02Families=new Set(),g02Roles=new Set(['NOMINATIV','AKKUSATIV','DATIV','GENITIV']);
for(const s of m13){
 if(!/^SG-G02-\d{3}$/.test(s.id)||g02Ids.has(s.id)||s.version!==1||s.domain!=='G02'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G02 text case '+s.id);
 g02Ids.add(s.id);
 if(!s.title?.trim()||!s.context?.trim()||!s.transfer?.trim()||s.paragraphs?.length!==3||s.repairs?.length!==3)throw Error('Incomplete G02 case '+s.id);
 const paragraphs=new Set(s.paragraphs.map(p=>p.id));
 if(paragraphs.size!==3||s.paragraphs.some(p=>!p.text?.trim()||p.text.length<110))throw Error('Missing G02 source paragraph '+s.id);
 const repairIds=new Set();
 for(const t of s.repairs){
  if(repairIds.has(t.id)||!/^r[1-3]$/.test(t.id)||!paragraphs.has(t.paragraphId)||!s.paragraphs.find(p=>p.id===t.paragraphId)?.text.includes(t.quote)||!g02Roles.has(t.role)||!t.governor?.trim()||!t.solution?.trim()||!t.explanation?.trim()||!t.transferHint?.trim()||t.quote===t.solution||t.explanation.length<70)throw Error('Invalid G02 governed repair '+s.id+':'+t.id);
  repairIds.add(t.id);g02Families.add(t.family);
 }
}
if(g02Families.size<8)throw Error('Insufficient G02 noun-phrase inflection coverage');

const m14=read(manifest.valencyDraftSource);
if(manifest.valencyDraftCount!==6||m14.length!==manifest.valencyDraftCount)throw Error('G03 valency study count mismatch');
const g03Ids=new Set(),g03Families=new Set();let g03Contrasts=0;
for(const s of m14){
 if(!/^SG-G03-\d{3}$/.test(s.id)||g03Ids.has(s.id)||s.version!==1||s.domain!=='G03'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.editorialApproval!==false||s.reviewedBy!==null||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G03 source '+s.id);
 g03Ids.add(s.id);
 if(!s.title?.trim()||!s.focus?.trim()||!s.transfer?.trim()||s.paragraphs?.length!==3||s.frames?.length!==3)throw Error('Incomplete G03 source '+s.id);
 const pids=new Set(s.paragraphs.map(p=>p.id));
 if(pids.size!==3||s.paragraphs.some(p=>!p.text||p.text.length<130))throw Error('Missing G03 source paragraph '+s.id);
 const fids=new Set();
 for(const f of s.frames){
  if(fids.has(f.id)||!/^f[1-3]$/.test(f.id)||!pids.has(f.paragraphId)||!s.paragraphs.find(p=>p.id===f.paragraphId)?.text.includes(f.quote)||!f.governor?.trim()||!f.alternate?.trim()||!f.question?.trim()||!f.model?.trim()||!f.explanation?.trim()||f.explanation.length<80||!f.repairPrompt?.trim()||f.options?.length!==2||f.options[0].id!=='A'||f.options[1].id!=='B'||f.options.some(o=>!o.text?.trim())||!['A','B'].includes(f.preferredId)||f.options.find(o=>o.id===f.preferredId).text===f.options.find(o=>o.id!=='A'&&o.id!=='B')?.text)throw Error('Invalid G03 valency contrast '+s.id+':'+f.id);
  fids.add(f.id);g03Families.add(f.family);g03Contrasts++;
 }
}
if(g03Families.size<15||g03Contrasts!==18)throw Error('Insufficient G03 frame-shift breadth');

const result={valid:true,demo:demo.length,readingUnits:reading.length,readingQuestions:questionCount,pragmaticScenarios:pragmatic.length,readingTransfers:transfers.length,modalityDrafts:m12.length,caseTracingDrafts:m13.length,valencyDrafts:m14.length,productionPrompts:production.length,reviewed:approved.length,counts,diagnosticApproved:0,targetP1:350,releaseReady:approved.length>=350};
console.log(JSON.stringify(result,null,2));
if(process.argv.includes('--release')&&!result.releaseReady){console.error('RELEASE_BLOCKED: fewer than 350 independently approved exercises.');process.exitCode=1}
