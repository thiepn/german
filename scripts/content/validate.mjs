import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=(p)=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const demo=[...read('content/fixtures/core.demo.json'),...read('content/fixtures/syntax-collocations.demo.json'),...read('content/fixtures/collocation-contrasts.demo.json'),...read('content/fixtures/nuance-grounded.demo.json'),...read('content/fixtures/advanced-precision.demo.json')];
const production=[...read('content/fixtures/production.demo.json'),...read('content/fixtures/production-continuation.demo.json')];
const authority=read('content/editorial/lexical-anchors.json');
const approved=read('content/approved/approved.json');
const ledger=read('content/editorial/approval-ledger.json');
const manifest=read('content/manifest.json');
const modes=new Set(['M01','M02','M03','M04','M05']);const ids=new Set();const counts=Object.fromEntries([...modes].map(m=>[m,0]));
const approvalById=new Map(ledger.map(r=>[r.id+'@'+r.version,r]));
if(approvalById.size!==ledger.length)throw Error('Duplicate editorial approval records');
const normalize=s=>s.trim().normalize('NFC').toLocaleLowerCase('de-DE').replace(/\s+/g,' ');
for(const [item,source] of [...demo.map(i=>[i,'demo']),...approved.map(i=>[i,'approved'])]){
 if(typeof item.id!=='string'||!/^SG-M0[1-5]-\d{3}$/.test(item.id))throw Error('Unrecognized stable ID '+item.id);
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
for(const item of demo)if(item.contrast){
 if(item.mode!=='M05'||item.contrast.kind!=='AUTHOR_DRAFT_CHOICE'||!Array.isArray(item.contrast.options)||item.contrast.options.length<2||new Set(item.contrast.options).size!==item.contrast.options.length||!item.contrast.rationale?.trim()||!item.contrast.options.includes(item.variants[0].slots.collocation))throw Error('Invalid M05 contrast '+item.id);
}
if(manifest.productionPromptCount!==production.length)throw Error('Production manifest inaccurate');
const result={valid:true,demo:demo.length,productionPrompts:production.length,reviewed:approved.length,counts,diagnosticApproved:0,targetP1:350,releaseReady:approved.length>=350};
console.log(JSON.stringify(result,null,2));
if(process.argv.includes('--release')&&!result.releaseReady){console.error('RELEASE_BLOCKED: fewer than 350 independently approved exercises.');process.exitCode=1}
