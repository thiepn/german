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
  if(fids.has(f.id)||!/^f[1-3]$/.test(f.id)||!pids.has(f.paragraphId)||!s.paragraphs.find(p=>p.id===f.paragraphId)?.text.includes(f.quote)||!f.governor?.trim()||!f.alternate?.trim()||!f.question?.trim()||!f.model?.trim()||!f.explanation?.trim()||f.explanation.length<80||!f.repairPrompt?.trim()||f.options?.length!==2||f.options[0].id!=='A'||f.options[1].id!=='B'||f.options.some(o=>!o.text?.trim())||!['A','B'].includes(f.preferredId)||f.options[0].text===f.options[1].text)throw Error('Invalid G03 valency contrast '+s.id+':'+f.id);
  fids.add(f.id);g03Families.add(f.family);g03Contrasts++;
 }
}
if(g03Families.size<15||g03Contrasts!==18)throw Error('Insufficient G03 frame-shift breadth');

const m15=read(manifest.focusDraftSource);
if(manifest.focusDraftCount!==6||m15.length!==manifest.focusDraftCount)throw Error('G04 discourse-focus source count mismatch');
const g04Ids=new Set(),g04Families=new Set();let g04Contrasts=0,g04PreferredB=0;
for(const s of m15){
 if(!/^SG-G04-\d{3}$/.test(s.id)||g04Ids.has(s.id)||s.version!==1||s.domain!=='G04'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.editorialApproval!==false||s.reviewedBy!==null||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G04 focus study '+s.id);
 g04Ids.add(s.id);
 if(!s.title?.trim()||!s.focus?.trim()||!s.transfer?.trim()||s.paragraphs?.length!==3||s.contrasts?.length!==3)throw Error('Incomplete G04 focus study '+s.id);
 const pids=new Set(s.paragraphs.map(p=>p.id));
 if(pids.size!==3||s.paragraphs.some(p=>!p.text||p.text.length<150))throw Error('Missing G04 original paragraphs '+s.id);
 const cids=new Set();
 for(const c of s.contrasts){
  if(cids.has(c.id)||!/^c[1-3]$/.test(c.id)||!pids.has(c.paragraphId)||!s.paragraphs.find(p=>p.id===c.paragraphId)?.text.includes(c.quote)||c.quote.length<35||!c.question?.trim()||!c.model?.trim()||!c.explanation?.trim()||c.explanation.length<100||!c.repairPrompt?.trim()||c.options?.length!==2||c.options[0].id!=='A'||c.options[1].id!=='B'||c.options.some(o=>!o.text?.trim())||!['A','B'].includes(c.preferredId)||c.options[0].text===c.options[1].text)throw Error('Invalid G04 discourse contrast '+s.id+':'+c.id);
  cids.add(c.id);g04Families.add(c.family);g04Contrasts++;if(c.preferredId==='B')g04PreferredB++;
 }
}
if(g04Families.size<15||g04Contrasts!==18||g04PreferredB<5)throw Error('Insufficient G04 discourse contrast coverage');

const m16=read(manifest.referenceDraftSource);
if(manifest.referenceDraftCount!==6||m16.length!==manifest.referenceDraftCount)throw Error('G01 reference case count mismatch');
const g01Ids=new Set(),g01Families=new Set();let g01Decisions=0,g01PreferredB=0;
for(const s of m16){
 if(!/^SG-G01-\d{3}$/.test(s.id)||g01Ids.has(s.id)||s.version!==1||s.domain!=='G01'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.editorialApproval!==false||s.reviewedBy!==null||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G01 reference study '+s.id);
 g01Ids.add(s.id);
 if(!s.title?.trim()||!s.focus?.trim()||!s.transfer?.trim()||s.paragraphs?.length!==3||s.decisions?.length!==3)throw Error('Incomplete G01 reference study '+s.id);
 const pids=new Set(s.paragraphs.map(p=>p.id));
 if(pids.size!==3||s.paragraphs.some(p=>!p.text||p.text.length<180))throw Error('Missing original G01 prose '+s.id);
 const dids=new Set();
 for(const d of s.decisions){
  if(dids.has(d.id)||!/^d[1-3]$/.test(d.id)||!pids.has(d.paragraphId)||!s.paragraphs.find(p=>p.id===d.paragraphId)?.text.includes(d.quote)||d.quote.length<35||!d.alternate?.trim()||d.quote===d.alternate||!d.topic?.trim()||!d.question?.trim()||!d.model?.trim()||!d.explanation?.trim()||d.explanation.length<110||!d.repairPrompt?.trim()||d.options?.length!==2||d.options[0].id!=='A'||d.options[1].id!=='B'||d.options.some(o=>!o.text?.trim())||!['A','B'].includes(d.preferredId)||d.options[0].text===d.options[1].text)throw Error('Invalid G01 reference decision '+s.id+':'+d.id);
  dids.add(d.id);g01Families.add(d.family);g01Decisions++;if(d.preferredId==='B')g01PreferredB++;
 }
}
if(g01Families.size<15||g01Decisions!==18||g01PreferredB<5)throw Error('Insufficient reference and determination coverage');

const m17=read(manifest.phraseologyDraftSource);
if(manifest.phraseologyDraftCount!==6||m17.length!==manifest.phraseologyDraftCount)throw Error('G07 phraseology case count mismatch');
const g07Ids=new Set(),g07Families=new Set();let g07Decisions=0,g07PreferredB=0;
for(const s of m17){
 if(!/^SG-G07-\d{3}$/.test(s.id)||g07Ids.has(s.id)||s.version!==1||s.domain!=='G07'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.editorialApproval!==false||s.reviewedBy!==null||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G07 phraseology study '+s.id);
 g07Ids.add(s.id);
 if(!s.title?.trim()||!s.focus?.trim()||!s.transfer?.trim()||s.paragraphs?.length!==3||s.decisions?.length!==3)throw Error('Incomplete G07 phraseology study '+s.id);
 const pids=new Set(s.paragraphs.map(p=>p.id));
 if(pids.size!==3||s.paragraphs.some(p=>!p.text||p.text.length<180))throw Error('Missing original G07 prose '+s.id);
 const dids=new Set();
 for(const d of s.decisions){
  if(dids.has(d.id)||!/^d[1-3]$/.test(d.id)||!pids.has(d.paragraphId)||!s.paragraphs.find(p=>p.id===d.paragraphId)?.text.includes(d.quote)||d.quote.length<30||!d.alternate?.trim()||d.quote===d.alternate||!d.focus?.trim()||!d.question?.trim()||!d.analysis?.trim()||!d.explanation?.trim()||d.explanation.length<125||!d.repairPrompt?.trim()||d.options?.length!==2||d.options[0].id!=='A'||d.options[1].id!=='B'||d.options.some(o=>!o.text?.trim())||!['A','B'].includes(d.preferredId)||d.options[0].text===d.options[1].text)throw Error('Invalid G07 phraseology contrast '+s.id+':'+d.id);
  dids.add(d.id);g07Families.add(d.family);g07Decisions++;if(d.preferredId==='B')g07PreferredB++;
 }
}
if(g07Families.size<15||g07Decisions!==18||g07PreferredB<5)throw Error('Insufficient G07 phraseology contrast coverage');

const m18=read(manifest.polysemyDraftSource);
if(manifest.polysemyDraftCount!==6||m18.length!==manifest.polysemyDraftCount)throw Error('G06 polysemy source count mismatch');
const g06Ids=new Set(),g06Families=new Set();let g06Decisions=0,g06PreferredB=0;
for(const s of m18){
 if(!/^SG-G06-\d{3}$/.test(s.id)||g06Ids.has(s.id)||s.version!==1||s.domain!=='G06'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.editorialApproval!==false||s.reviewedBy!==null||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G06 polysemy study '+s.id);
 g06Ids.add(s.id);
 if(!s.title?.trim()||!s.focus?.trim()||!s.transfer?.trim()||s.paragraphs?.length!==3||s.decisions?.length!==3)throw Error('Incomplete G06 polysemy source '+s.id);
 const paragraphIds=new Set(s.paragraphs.map(p=>p.id));
 if(paragraphIds.size!==3||s.paragraphs.some(p=>!p.text||p.text.length<250))throw Error('Missing source paragraphs '+s.id);
 const decisions=new Set();
 for(const d of s.decisions){
  if(decisions.has(d.id)||!/^d[1-3]$/.test(d.id)||!paragraphIds.has(d.paragraphId)||!s.paragraphs.find(p=>p.id===d.paragraphId)?.text.includes(d.quote)||d.quote.length<35||!d.lemma?.trim()||!d.alternate?.trim()||d.quote===d.alternate||!d.question?.trim()||!d.explanation?.trim()||d.explanation.length<125||!d.repairPrompt?.trim()||d.options?.length!==2||d.options[0].id!=='A'||d.options[1].id!=='B'||d.options.some(o=>!o.text?.trim())||!['A','B'].includes(d.preferredId)||d.options[0].text===d.options[1].text)throw Error('Invalid G06 lexical sense '+s.id+':'+d.id);
  decisions.add(d.id);g06Families.add(d.family);g06Decisions++;if(d.preferredId==='B')g06PreferredB++;
 }
}
if(g06Families.size!==18||g06Decisions!==18||g06PreferredB<5)throw Error('Insufficient distinct context polysemy coverage');


const m19=read(manifest.stanceDraftSource);
if(manifest.stanceDraftCount!==6||m19.length!==6)throw Error('G08 stance case count mismatch');
const stanceIds=new Set(),moves=new Set();let stanceDecisions=0,stancePreferredB=0;
for(const s of m19){
 if(!/^SG-G08S-\d{3}$/.test(s.id)||stanceIds.has(s.id)||s.version!==1||s.domain!=='G08'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.editorialApproval!==false||s.reviewedBy!==null||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G08 discourse dossier '+s.id);
 stanceIds.add(s.id);
 if(!s.title?.trim()||!s.focus?.trim()||!s.transfer?.trim()||s.paragraphs?.length!==3||s.decisions?.length!==3)throw Error('Incomplete G08 discourse dossier '+s.id);
 const paragraphIds=new Set(s.paragraphs.map(p=>p.id)),did=new Set();
 if(paragraphIds.size!==3||s.paragraphs.some(p=>p.text.length<300))throw Error('Missing original G08 source paragraphs '+s.id);
 for(const d of s.decisions){
  if(did.has(d.id)||!/^d[1-3]$/.test(d.id)||!paragraphIds.has(d.paragraphId)||!s.paragraphs.find(p=>p.id===d.paragraphId)?.text.includes(d.quote)||d.quote.length<35||!d.move?.trim()||!d.family?.trim()||moves.has(d.move)||!d.alternate?.trim()||d.quote===d.alternate||!d.question?.trim()||!d.explanation||d.explanation.length<125||!d.repairPrompt?.trim()||d.options?.length!==2||d.options[0].id!=='A'||d.options[1].id!=='B'||d.options.some(o=>!o.text?.trim())||!['A','B'].includes(d.preferredId)||d.options[0].text===d.options[1].text)throw Error('Invalid G08 discourse contrast '+s.id+':'+d.id);
  did.add(d.id);moves.add(d.move);stanceDecisions++;if(d.preferredId==='B')stancePreferredB++;
 }
}
if(stanceIds.size!==6||moves.size!==18||stanceDecisions!==18||stancePreferredB<5)throw Error('Insufficient G08 stance source diversity');


const m20=read(manifest.crossSourceDraftSource);
if(manifest.crossSourceDraftCount!==4||m20.length!==4)throw Error('M20 cross-source case count mismatch');
const crossIds=new Set(),crossIssues=new Set(),crossBands=new Set();let crossPairs=0,preferredB=0;
for(const s of m20){
 if(!/^SG-G09X-\d{3}$/.test(s.id)||crossIds.has(s.id)||s.version!==1||s.domain!=='G09'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G09 cross-source study '+s.id);
 crossIds.add(s.id);crossBands.add(s.band);
 if(!s.title?.trim()||!s.focus?.trim()||!s.transfer?.trim()||s.sources?.length!==2||s.sources[0].id!=='A'||s.sources[1].id!=='B'||s.comparisons?.length!==3)throw Error('Incomplete G09 source dossier '+s.id);
 for(const [index,source] of s.sources.entries()){
  if(!source.title?.trim()||source.paragraphs?.length!==3||new Set(source.paragraphs.map(p=>p.id)).size!==3)throw Error('Invalid paired G09 source '+s.id);
  for(const [j,p] of source.paragraphs.entries())if(p.id!==(index===0?'A':'B')+(j+1)||typeof p.text!=='string'||p.text.length<320)throw Error('Missing G09 original paragraph '+s.id+':'+p.id);
 }
 const ids=new Set();
 for(const [j,comparison] of s.comparisons.entries()){
  const a=s.sources[0].paragraphs[j],b=s.sources[1].paragraphs[j];
  if(comparison.id!=='c'+(j+1)||ids.has(comparison.id)||comparison.sourceA!==a.id||comparison.sourceB!==b.id||
   !a.text.includes(comparison.quoteA)||!b.text.includes(comparison.quoteB)||comparison.quoteA.length<65||comparison.quoteB.length<65||
   !comparison.issue?.trim()||crossIssues.has(s.id+':'+comparison.issue)||!comparison.question?.trim()||comparison.model?.length<100||!comparison.transferCue?.trim()||
   comparison.options?.length!==2||comparison.options[0].id!=='A'||comparison.options[1].id!=='B'||!comparison.options.every(o=>o.text?.length>=65)||
   comparison.options[0].text===comparison.options[1].text||!['A','B'].includes(comparison.preferredId))throw Error('Ungrounded G09 paired comparison '+s.id+':'+comparison.id);
  ids.add(comparison.id);crossIssues.add(s.id+':'+comparison.issue);crossPairs++;if(comparison.preferredId==='B')preferredB++;
 }
}
if(crossIds.size!==4||crossPairs!==12||preferredB<4||crossBands.size!==2)throw Error('Insufficient G09 cross-source variation');


const m21=read(manifest.compressionDraftSource);
if(manifest.compressionDraftCount!==4||m21.length!==4)throw Error('M21 G04 compression dossier count mismatch');
const compressionIds=new Set(),families=new Set(),bands=new Set();let compressionOps=0,compressionPreferredB=0;
for(const s of m21){
 if(!/^SG-G04C-\d{3}$/.test(s.id)||compressionIds.has(s.id)||s.version!==1||s.domain!=='G04'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G04 compression dossier '+s.id);
 compressionIds.add(s.id);bands.add(s.band);
 if(!s.title?.trim()||!s.focus?.trim()||!s.audience?.trim()||!s.transfer?.trim()||s.paragraphs?.length!==3||s.operations?.length!==3)throw Error('Incomplete G04 compression case '+s.id);
 const ids=new Set();
 for(const [i,p] of s.paragraphs.entries()){
  if(p.id!=='p'+(i+1)||!p.text||p.text.length<340||ids.has(p.id))throw Error('Invalid G04 paragraph '+s.id+':'+p.id);
  ids.add(p.id);
 }
 for(const [i,o] of s.operations.entries()){
  if(o.id!=='o'+(i+1)||o.paragraphId!==s.paragraphs[i].id||!s.paragraphs[i].text.includes(o.quote)||o.quote.length<90||
   !['NOMINALISIERUNG','PARTIZIPIALATTRIBUT','BEDINGUNGSGEFÜGE','KONDITIONALER RAHMEN'].includes(o.family)||!o.question?.trim()||
   !o.expandPrompt?.trim()||!o.compressPrompt?.trim()||!o.riskPrompt?.trim()||o.model?.length<145||
   o.options?.length!==2||o.options[0].id!=='A'||o.options[1].id!=='B'||o.options[0].text===o.options[1].text||
   o.options.some(v=>v.text.length<75)||!['A','B'].includes(o.preferredId))throw Error('Ungrounded G04 compression operation '+s.id+':'+o.id);
  families.add(o.family);compressionOps++;if(o.preferredId==='B')compressionPreferredB++;
 }
}
if(compressionIds.size!==4||bands.size!==2||families.size<3||compressionOps!==12||compressionPreferredB<4)throw Error('Insufficient G04 compression variation');


const m22=read(manifest.attributionDraftSource);
if(manifest.attributionDraftCount!==4||m22.length!==4)throw Error('M22 G11 attribution dossier count mismatch');
const attributionIds=new Set(),speakers=new Set(),attributionBands=new Set();let attributionQuotes=0,attributionPreferredB=0;
for(const s of m22){
 if(!/^SG-G11Q-\d{3}$/.test(s.id)||attributionIds.has(s.id)||s.version!==1||s.domain!=='G11'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G11 quotation dossier '+s.id);
 attributionIds.add(s.id);attributionBands.add(s.band);
 if(!s.title?.trim()||!s.genre?.trim()||!s.focus?.trim()||s.brief?.length<80||s.paragraphs?.length!==3||s.anchors?.length!==3)throw Error('Incomplete G11 quotation study '+s.id);
 const ids=new Set();
 for(const [i,p] of s.paragraphs.entries()){
  if(p.id!=='p'+(i+1)||ids.has(p.id)||typeof p.text!=='string'||p.text.length<400)throw Error('Invalid G11 source paragraph '+s.id+':'+p.id);
  ids.add(p.id);
 }
 for(const [i,a] of s.anchors.entries()){
  const para=s.paragraphs[i],quoted='„'+a.quote+'“';
  if(a.id!=='q'+(i+1)||a.paragraphId!==para.id||a.quote?.length<45||a.quote.length>135||!para.text.includes(quoted)||para.text.split(quoted).length!==2||!a.speaker?.trim()||!a.question?.trim()||a.model?.length<95||
   a.options?.length!==2||a.options[0].id!=='A'||a.options[1].id!=='B'||a.options[0].text===a.options[1].text||
   a.options.some(x=>x.text?.length<85)||!['A','B'].includes(a.preferredId))throw Error('Unlicensed or ungrounded G11 quote '+s.id+':'+a.id);
  speakers.add(a.speaker);attributionQuotes++;if(a.preferredId==='B')attributionPreferredB++;
 }
}
if(attributionIds.size!==4||attributionBands.size!==2||speakers.size<10||attributionQuotes!==12||attributionPreferredB<4)throw Error('Insufficient G11 attribution variety');


const m23=read(manifest.repairDraftSource);
if(manifest.repairDraftCount!==4||m23.length!==4)throw Error('M23 G12 repair dossier count mismatch');
const repairIds=new Set(),repairSpeakers=new Set(),repairBands=new Set();let repairAnchors=0,repairPreferredB=0;
for(const s of m23){
 if(!/^SG-G12R-\d{3}$/.test(s.id)||repairIds.has(s.id)||s.version!==1||s.domain!=='G12'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G12 repair dossier '+s.id);
 repairIds.add(s.id);repairBands.add(s.band);
 if(!s.title?.trim()||!s.focus?.trim()||s.brief?.length<100||s.paragraphs?.length!==3||s.repairs?.length!==3)throw Error('Incomplete G12 repair case '+s.id);
 for(const [i,p] of s.paragraphs.entries()){
  if(p.id!=='p'+(i+1)||typeof p.text!=='string'||p.text.length<420)throw Error('Invalid G12 repair source '+s.id+':'+p.id);
 }
 for(const [i,t] of s.repairs.entries()){
  const source=s.paragraphs[i],quoted='„'+t.quote+'“';
  if(t.id!=='r'+(i+1)||t.paragraphId!==source.id||t.quote?.length<22||t.quote.length>100||!source.text.includes(quoted)||source.text.split(quoted).length!==2||
   !t.speaker?.trim()||!t.question?.trim()||t.clarified?.length<90||t.model?.length<95||
   t.options?.length!==2||t.options[0].id!=='A'||t.options[1].id!=='B'||t.options[0].text===t.options[1].text||
   t.options.some(o=>o.text?.length<75)||!['A','B'].includes(t.preferredId))throw Error('Ungrounded G12 repair turn '+s.id+':'+t.id);
  repairSpeakers.add(t.speaker);repairAnchors++;if(t.preferredId==='B')repairPreferredB++;
 }
}
if(repairIds.size!==4||repairBands.size!==2||repairSpeakers.size<10||repairAnchors!==12||repairPreferredB<4)throw Error('Insufficient G12 repair variation');


const m24=read(manifest.argumentDraftSource);
if(manifest.argumentDraftCount!==4||m24.length!==4)throw Error('M24 G11 argument dossier count mismatch');
const argumentIds=new Set(),argumentBands=new Set(),argumentFocuses=new Set();let argumentNodes=0,argumentPreferredB=0;
for(const s of m24){
 if(!/^SG-G11A-\d{3}$/.test(s.id)||argumentIds.has(s.id)||s.version!==1||s.domain!=='G11'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G11 argument dossier '+s.id);
 argumentIds.add(s.id);argumentBands.add(s.band);argumentFocuses.add(s.focus);
 if(!s.title?.trim()||s.focus?.length<25||s.brief?.length<110||s.paragraphs?.length!==3||s.arguments?.length!==3)throw Error('Incomplete G11 argument case '+s.id);
 for(const [i,p] of s.paragraphs.entries()){if(p.id!=='p'+(i+1)||p.text?.length<500)throw Error('G11 argument source context incomplete '+s.id+':'+p.id);}
 for(const [i,a] of s.arguments.entries()){
  const p=s.paragraphs[i],quoted='„'+a.quote+'“';
  if(a.id!=='a'+(i+1)||a.paragraphId!==p.id||a.quote?.length<45||a.quote.length>135||!p.text.includes(quoted)||p.text.split(quoted).length!==2||
   !a.question?.trim()||a.model?.length<95||a.counter?.length<95||a.options?.length!==2||a.options[0].id!=='A'||a.options[1].id!=='B'||a.options[0].text===a.options[1].text||
   a.options.some(o=>o.text?.length<90)||!['A','B'].includes(a.preferredId))throw Error('Ungrounded G11 argument '+s.id+':'+a.id);
  argumentNodes++;if(a.preferredId==='B')argumentPreferredB++;
 }
}
if(argumentIds.size!==4||argumentBands.size!==2||argumentFocuses.size!==4||argumentNodes!==12||argumentPreferredB<4)throw Error('Insufficient G11 argument variety');


const m25=read(manifest.numericDraftSource);
if(manifest.numericDraftCount!==4||m25.length!==4)throw Error('M25 numerical precision dossier count mismatch');
const numericalIds=new Set(),numericalBands=new Set(),numericalFocuses=new Set();let numericalClaims=0,numericalPreferredB=0;
for(const s of m25){
 if(!/^SG-G09N-\d{3}$/.test(s.id)||numericalIds.has(s.id)||s.version!==1||s.domain!=='G09'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified numerical precision dossier '+s.id);
 numericalIds.add(s.id);numericalBands.add(s.band);numericalFocuses.add(s.focus);
 if(!s.title?.trim()||s.focus?.length<25||s.brief?.length<110||s.paragraphs?.length!==3||s.claims?.length!==3)throw Error('Incomplete numerical precision study '+s.id);
 for(const [i,p] of s.paragraphs.entries())if(p.id!=='p'+(i+1)||p.text?.length<500)throw Error('Incomplete numeric source paragraph '+s.id+':'+p.id);
 for(const [i,n] of s.claims.entries()){
  const p=s.paragraphs[i],quoted='„'+n.quote+'“';
  if(n.id!=='n'+(i+1)||n.paragraphId!==p.id||n.quote?.length<25||n.quote.length>140||!p.text.includes(quoted)||p.text.split(quoted).length!==2||
  !n.question?.trim()||n.model?.length<90||n.trap?.length<75||n.options?.length!==2||n.options[0].id!=='A'||n.options[1].id!=='B'||n.options[0].text===n.options[1].text||
  n.options.some(o=>o.text?.length<90)||!['A','B'].includes(n.preferredId))throw Error('Numerical statement not anchored '+s.id+':'+n.id);
  numericalClaims++;if(n.preferredId==='B')numericalPreferredB++;
 }
}
if(numericalIds.size!==4||numericalBands.size!==2||numericalFocuses.size!==4||numericalClaims!==12||numericalPreferredB<4)throw Error('Insufficient G09 numerical claim variation');


const m26=read(manifest.disclosureDraftSource);
if(manifest.disclosureDraftCount!==4||m26.length!==4)throw Error('M26 disclosure count mismatch');
const disclosureIds=new Set(),disclosureBands=new Set(),disclosureRestricted=new Set();let disclosureAnchors=0,disclosureB=0;
for(const s of m26){
 if(!/^SG-G13D-\d{3}$/.test(s.id)||disclosureIds.has(s.id)||s.version!==1||s.domain!=='G13'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G13 source '+s.id);
 disclosureIds.add(s.id);disclosureBands.add(s.band);
 if(s.focus?.length<35||s.brief?.length<100||s.paragraphs?.length!==3||s.decisions?.length!==3||s.audiences?.length!==2||s.audiences[0].id!=='PUBLIC'||s.audiences[1].id!=='INTERNAL')throw Error('Incomplete G13 source '+s.id);
 for(const [i,p] of s.paragraphs.entries())if(p.id!=='p'+(i+1)||p.text?.length<500)throw Error('Incomplete G13 paragraph '+s.id+':'+p.id);
 for(const [i,d] of s.decisions.entries()){
  const p=s.paragraphs[i],quoted='„'+d.quote+'“';
  if(d.id!=='d'+(i+1)||d.paragraphId!==p.id||d.quote?.length<35||d.quote.length>140||!p.text.includes(quoted)||p.text.split(quoted).length!==2||
   !/^[A-Z]{2}-\d{4}$/.test(d.restricted)||!p.text.includes(d.restricted)||disclosureRestricted.has(d.restricted)||
   d.action?.length<85||d.boundary?.length<70||d.options?.length!==2||d.options[0].id!=='A'||d.options[1].id!=='B'||d.options[0].text===d.options[1].text||
   d.options.some(o=>o.text?.length<85)||!['A','B'].includes(d.preferredId)||!d.options.find(o=>o.id!==d.preferredId)?.text.includes(d.restricted))throw Error('Unanchored G13 disclosure '+s.id+':'+d.id);
  disclosureRestricted.add(d.restricted);disclosureAnchors++;if(d.preferredId==='B')disclosureB++;
 }
}
if(disclosureIds.size!==4||disclosureBands.size!==2||disclosureRestricted.size!==12||disclosureAnchors!==12||disclosureB<4)throw Error('Insufficient G13 disclosure coverage');


const m27=read(manifest.chronologyDraftSource);
if(manifest.chronologyDraftCount!==4||m27.length!==4)throw Error('M27 chronology source count mismatch');
const chronologyIds=new Set(),chronologyBands=new Set(),chronologyTopics=new Set();let chronologyAnchors=0,chronologyPreferredB=0;
for(const s of m27){
 if(!/^SG-G09T-\d{3}$/.test(s.id)||chronologyIds.has(s.id)||s.version!==1||s.domain!=='G09'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified M27 chronology source '+s.id);
 chronologyIds.add(s.id);chronologyBands.add(s.band);chronologyTopics.add(s.focus);
 if(s.focus?.length<35||s.brief?.length<110||s.paragraphs?.length!==3||s.claims?.length!==3)throw Error('Incomplete chronology dossier '+s.id);
 for(const [i,p] of s.paragraphs.entries())if(p.id!=='p'+(i+1)||p.text?.length<600)throw Error('Truncated chronology source '+s.id+':'+p.id);
 for(const [i,t] of s.claims.entries()){
  const p=s.paragraphs[i],quoted='„'+t.quote+'“';
  if(t.id!=='t'+(i+1)||t.paragraphId!==p.id||t.quote?.length<40||t.quote.length>145||!p.text.includes(quoted)||p.text.split(quoted).length!==2||
  !t.question?.trim()||t.model?.length<90||t.trap?.length<65||t.options?.length!==2||t.options[0].id!=='A'||t.options[1].id!=='B'||t.options[0].text===t.options[1].text||
  t.options.some(o=>o.text?.length<90)||!['A','B'].includes(t.preferredId))throw Error('Unanchored chronology interpretation '+s.id+':'+t.id);
  chronologyAnchors++;if(t.preferredId==='B')chronologyPreferredB++;
 }
}
if(chronologyIds.size!==4||chronologyBands.size!==2||chronologyTopics.size!==4||chronologyAnchors!==12||chronologyPreferredB<4)throw Error('Insufficient distinct C1-C2 chronology coverage');


const m28=read(manifest.definitionDraftSource);
if(manifest.definitionDraftCount!==4||m28.length!==4)throw Error('M28 G06 definition dossier count mismatch');
const definitionIds=new Set(),definitionBands=new Set(),definitionTopics=new Set(),definitionTerms=new Set();let definitionAnchors=0,definitionB=0;
for(const s of m28){
 if(!/^SG-G06B-\d{3}$/.test(s.id)||definitionIds.has(s.id)||s.version!==1||s.domain!=='G06'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified G06 terminology source '+s.id);
 definitionIds.add(s.id);definitionBands.add(s.band);definitionTopics.add(s.focus);
 if(s.title?.length<35||s.focus?.length<55||s.brief?.length<110||s.paragraphs?.length!==3||s.distinctions?.length!==3)throw Error('Incomplete original G06 dossier '+s.id);
 const localTerms=new Set();
 for(const [i,p] of s.paragraphs.entries())if(p.id!=='p'+(i+1)||p.text?.length<750)throw Error('Incomplete G06 source paragraph '+s.id+':'+p.id);
 for(const [i,d] of s.distinctions.entries()){
  const p=s.paragraphs[i],quoted='„'+d.quote+'“';
  if(d.id!=='d'+(i+1)||d.paragraphId!==p.id||d.quote?.length<38||d.quote.length>150||!p.text.includes(quoted)||p.text.split(quoted).length!==2||
   d.term?.length<7||d.nearTerm?.length<7||d.term===d.nearTerm||localTerms.has(d.term)||d.question?.length<60||
   d.model?.length<85||d.trap?.length<75||d.options?.length!==2||d.options[0].id!=='A'||d.options[1].id!=='B'||d.options[0].text===d.options[1].text||
   d.options.some(o=>o.text?.length<95)||!['A','B'].includes(d.preferredId))throw Error('Unanchored G06 conceptual boundary '+s.id+':'+d.id);
  localTerms.add(d.term);definitionTerms.add(d.term);definitionAnchors++;if(d.preferredId==='B')definitionB++;
 }
}
if(definitionIds.size!==4||definitionBands.size!==2||definitionTopics.size!==4||definitionAnchors!==12||definitionTerms.size<10||definitionB<4)throw Error('Insufficient G06 definition-boundary diversity');


const m30=read(manifest.scopeDraftSource);
if(manifest.scopeDraftCount!==4||m30.length!==4)throw Error('M30 G04 scope dossier count mismatch');
const scopeIds=new Set(),scopeBands=new Set(),scopeFoci=new Set(),scopeParticles=new Set();let scopeAnchors=0,scopeB=0;
for(const s of m30){
 if(!/^SG-G04S-\d{3}$/.test(s.id)||scopeIds.has(s.id)||s.version!==1||s.domain!=='G04'||!['C1','C2'].includes(s.band)||s.status!=='DEMO_ONLY'||s.authorship!=='AI_DRAFT'||s.reviewedBy!==null||s.editorialApproval!==false||s.rights?.kind!=='ORIGINAL_DRAFT'||!s.rights.source?.trim())throw Error('Unqualified M30 scope source '+s.id);
 scopeIds.add(s.id);scopeBands.add(s.band);scopeFoci.add(s.focus);
 if(s.title?.length<35||s.focus?.length<65||s.brief?.length<125||s.paragraphs?.length!==3||s.scopes?.length!==3)throw Error('Incomplete G04 scope dossier '+s.id);
 for(const [i,p] of s.paragraphs.entries())if(p.id!=='p'+(i+1)||p.text?.length<650)throw Error('Incomplete G04 scope source paragraph '+s.id+':'+p.id);
 for(const [i,c] of s.scopes.entries()){
  const p=s.paragraphs[i],quoted='„'+c.quote+'“';
  if(c.id!=='s'+(i+1)||c.paragraphId!==p.id||c.quote?.length<30||c.quote.length>145||!p.text.includes(quoted)||p.text.split(quoted).length!==2||
   c.particle?.length<5||c.question?.length<45||c.model?.length<80||c.trap?.length<70||c.options?.length!==2||c.options[0].id!=='A'||c.options[1].id!=='B'||c.options[0].text===c.options[1].text||
   c.options.some(o=>o.text?.length<90)||!['A','B'].includes(c.preferredId))throw Error('Unanchored M30 scope interpretation '+s.id+':'+c.id);
  scopeAnchors++;scopeParticles.add(c.particle);if(c.preferredId==='B')scopeB++;
 }
}
if(scopeIds.size!==4||scopeBands.size!==2||scopeFoci.size!==4||scopeAnchors!==12||scopeParticles.size<10||scopeB<4)throw Error('Insufficient distinct G04 focus/negation scope coverage');

const result={valid:true,demo:demo.length,readingUnits:reading.length,readingQuestions:questionCount,pragmaticScenarios:pragmatic.length,readingTransfers:transfers.length,modalityDrafts:m12.length,caseTracingDrafts:m13.length,valencyDrafts:m14.length,focusDrafts:m15.length,referenceDrafts:m16.length,phraseologyDrafts:m17.length,polysemyDrafts:m18.length,stanceDrafts:m19.length,crossSourceDrafts:m20.length,compressionDrafts:m21.length,attributionDrafts:m22.length,repairDrafts:m23.length,argumentDrafts:m24.length,numericDrafts:m25.length,disclosureDrafts:m26.length,chronologyDrafts:m27.length,definitionDrafts:m28.length,scopeDrafts:m30.length,productionPrompts:production.length,reviewed:approved.length,counts,diagnosticApproved:0,targetP1:350,releaseReady:approved.length>=350};
console.log(JSON.stringify(result,null,2));
if(process.argv.includes('--release')&&!result.releaseReady){console.error('RELEASE_BLOCKED: fewer than 350 independently approved exercises.');process.exitCode=1}
