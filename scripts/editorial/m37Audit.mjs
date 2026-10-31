/**
 * M37 fail-closed editorial QA packet. Mechanical checks are NOT editorial sign-off.
 * Source material and historical learner data are never mutated by this script.
 */
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {collect} from './reviewQueue.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const norm=s=>String(s).normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const CHILD_KEYS=['anchors','decisions','attachments','relations','contrasts','claims','turns'];
const BLOCKER_IDS=['SG-M05-036','SG-M05-037','SG-G02R-002:r1'];
const REQUIRED_CHECKS=[
 'Full source and anchor identity','German gender, case, valency and idiom',
 'All acceptable alternative answers and distractor plausibility',
 'Contextually valid register and inferential scope',
 'Rights and author provenance attestation','Qualified human CEFR calibration',
 'Target-audience transfer accuracy'
];
const assert=(condition,message)=>{if(!condition)throw Error('M37 editorial gate: '+message)};
function currentDefects(){
 const graded=read('content/fixtures/collocation-contrasts.demo.json');
 const item=id=>graded.find(t=>t.id===id);
 const a=item('SG-M05-036'),b=item('SG-M05-037');
 const studies=read('content/fixtures/g02-relative.demo.json');
 const study=studies.find(x=>x.id==='SG-G02R-002'),anchor=study?.anchors?.find(x=>x.id==='r1');
 assert(a?.prompt==='Die Behörde muss den Antrag sorgfältig ___ .' && a.contrast.options.includes('prüfen')&&a.contrast.options.includes('ablehnen'),'SG-M05-036 changed; re-review potential alternative');
 assert(b?.prompt==='Die Geschäftsführung möchte den Beschäftigten eine Perspektive ___ .'&&b.contrast.options.includes('aufzeigen')&&b.contrast.options.includes('versprechen'),'SG-M05-037 changed; re-review ambiguity');
 assert(anchor?.model?.includes('das substantivierte Finanzierung'),'SG-G02R-002 grammar model changed; revise findings and re-review version');
 return BLOCKER_IDS;
}
/**
 * Injection-friendly for mutation / negative QA tests, returning only verified structure.
 * Never grades German, invents CEFR outcomes, or writes into approval ledger.
 */
export function validateM37(packet,{source=read,queue=collect()}={}){
 const manifest=source('content/manifest.json'),approved=source(manifest.approvedItemSource),ledger=source(manifest.editorialLedger);
 assert(manifest.releaseStatus==='DEMO_ONLY'&&manifest.v1FeatureBoundary==='FROZEN_AFTER_M35_DRAFT_NOT_RELEASE_APPROVED','V1 feature or release gate changed');
 assert(approved.length===0&&ledger.length===0&&manifest.publishedApprovedCount===0&&manifest.lessonApprovalCount===0,'existing approvals changed; independent signed review required');
 assert(packet.schemaVersion===1&&packet.phase==='M37'&&packet.scope==='UNAPPROVED_PRIVATE_ALPHA_CANDIDATES'&&packet.editorialAuthority==='NONE'&&packet.candidateApproval==='NOT_REVIEWED','sample claims editorial authority or wrong scope');
 assert(packet.totalCandidates===26&&packet.candidates?.length===26,'alpha sample must contain exactly 26 real draft cases');
 assert(packet.excludedDomain==='G10'&&/audio/i.test(packet.excludedReason),'missing G10 media-rights hold');
 assert(JSON.stringify(packet.requestedIndependentChecks)===JSON.stringify(REQUIRED_CHECKS),'review dimensions silently reduced');
 assert(packet.knownDefects?.length===3&&new Set(packet.knownDefects.map(x=>x.id)).size===3,'known editorial defects silently dropped');
 assert(BLOCKER_IDS.every(id=>packet.knownDefects.some(x=>x.id===id&&x.status!=='APPROVED')),'defect quarantine lost');
 const ids=new Set(),bands={C1:0,C2:0},domains={};const copies=new Set(),checks=[];
 const byId=new Map(queue.map(x=>[x.id,x]));
 assert(byId.size===queue.length&&queue.length>=682,'editorial candidate inventory missing or duplicated');
 assert(queue.every(x=>x.status==='DEMO_ONLY'&&x.independentEditorialApproval===false),'false review approval in inventory');
 assert(!queue.some(x=>String(x.mode).startsWith('G10')),'new G10 content requires independent audio and rights packet');
 for(const record of packet.candidates){
  const {id,studyId,anchorId,source:sourcePath,domain,band,version}=record;
  assert(!ids.has(id)&&id===studyId+':'+anchorId,'duplicate or incorrect source/anchor ID '+id);ids.add(id);
  assert(/^G(?:0[1-9]|1[0-3])$/.test(domain)&&domain!=='G10','unsupported candidate domain '+id);
  assert(['C1','C2'].includes(band),'unsupported CEFR author-draft tag '+id);
  assert(record.reviewStatus==='NOT_REVIEWED'&&record.rightsStatus==='ORIGINAL_DRAFT_DEMO_ONLY','unearned human/rights approval '+id);
  assert(typeof record.reviewRisk==='string'&&record.reviewRisk.length>=12,'missing substantive review risk '+id);
  assert(/^content\/fixtures\/[a-z0-9-]+\.demo\.json$/.test(sourcePath),'source path outside original fixture pack');
  const studies=source(sourcePath),study=studies.find(s=>s.id===studyId);
  assert(study&&study.version===version&&study.domain===domain&&study.band===band,'source ID/version/skill mismatch '+id);
  assert(study.status==='DEMO_ONLY'&&study.authorship==='AI_DRAFT'&&study.editorialApproval===false&&study.reviewedBy===null,'source changed review state '+id);
  assert(study.rights?.kind==='ORIGINAL_DRAFT'&&study.rights.source?.trim().length>=20,'source rights provenance missing '+id);
  const key=CHILD_KEYS.find(k=>Array.isArray(study[k])&&study[k].some(x=>x.id===anchorId));
  assert(key,'anchored learning task missing '+id);
  const task=study[key].find(x=>x.id===anchorId),paragraph=study.paragraphs?.find(p=>p.id===task.paragraphId);
  assert(paragraph?.text&&paragraph.text.length>=120,'missing original passage or paragraph '+id);
  const quote=task.quote;
  assert(typeof quote==='string'&&quote.length>=18,'missing literal quote '+id);
  const appearances=study.paragraphs.reduce((n,p)=>n+p.text.split(quote).length-1,0);
  assert(appearances===1&&paragraph.text.includes(quote),'quote must occur literally once in declared paragraph '+id);
  const normalizedQuote=norm(quote);
  assert(!copies.has(normalizedQuote),'duplicate source quote across sampled original cases '+id);copies.add(normalizedQuote);
  if(task.options){
   assert(task.options.length>=2&&task.options.every(o=>o.id&&typeof o.text==='string'&&o.text.trim()),'empty choice '+id);
   assert(new Set(task.options.map(x=>x.id)).size===task.options.length,'duplicate option ID '+id);
   assert(new Set(task.options.map(x=>norm(x.text))).size===task.options.length,'identical normalized choices '+id);
   assert(task.options.some(x=>x.id===task.preferredId),'preferred answer not in explicit options '+id);
  }else assert(key==='turns'&&domain==='G12','unexpected ungraded case shape '+id);
  assert(byId.has(id)&&byId.get(id).version===version,'missing editorial queue task or wrong version '+id);
  assert(!byId.get(id).independentEditorialApproval,'unearned review approval '+id);
  domains[domain]=(domains[domain]??0)+1;bands[band]++;
  checks.push({id,domain,band,source:sourcePath,version,anchorId,sourceQuoteMatches:appearances,optionCount:task.options?.length??0,mechanical:'PASS',linguistic:'NOT_REVIEWED',rights:'NOT_APPROVED',cefr:'NOT_CALIBRATED'});
 }
 const expected=['G01','G02','G03','G04','G05','G06','G07','G08','G09','G11','G12','G13'];
 assert(Object.keys(domains).length===12&&expected.every(x=>domains[x]===(x==='G07'?4:2)),'unbalanced private-alpha sample or ungrounded domain');
 assert(bands.C1===13&&bands.C2===13,'C1/C2 sample imbalance');
 return {structuralGate:'PASS',editorialGate:'NO_GO',privateAlphaGate:'NO_GO',releaseGate:'NO_GO',
  inventoryCount:queue.length,candidateCount:checks.length,verifiedAnchors:checks.length,
  authorCefrBands:bands,coverage:domains,g10:'BLOCKED_NO_RIGHTS_CLEARED_AUDIO',existingApprovedItems:approved.length,
  independentApprovalCount:0,knownDefectIds:packet.knownDefects.map(x=>x.id),checks};
}
export function runM37Audit(){
 const packet=read('content/editorial/m37-alpha-candidates.json');
 const findings=validateM37(packet);
 const defects=currentDefects();
 assert(defects.every(id=>findings.knownDefectIds.includes(id)),'documented source risks diverged');
 return findings;
}
const isCli=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCli){
 const findings=runM37Audit();
 if(process.argv.includes('--summary'))console.log(JSON.stringify({
  M37:'PASS_STRUCTURAL_ONLY',editorial:findings.editorialGate,alpha:findings.privateAlphaGate,
  release:findings.releaseGate,candidates:findings.candidateCount,anchors:findings.verifiedAnchors,
  bands:findings.authorCefrBands,domainCoverage:Object.keys(findings.coverage).length,
  G10:findings.g10,queue:findings.inventoryCount,unapproved:findings.inventoryCount,
  blockers:findings.knownDefectIds
 },null,2));
 else console.log(JSON.stringify(findings,null,2));
}
