import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
export function buildReviewQueue(graded,production,anchors){
 const source=new Map(anchors.map(x=>[x.id,x]));
 const items=graded.map(item=>{
  const ref=item.lexicalAuthority?source.get(item.lexicalAuthority.anchorId):null;
  if(item.lexicalAuthority&&!ref)throw Error('Lexical anchor missing '+item.id);
  return {id:item.id,version:item.version,type:'OBJECTIVE',mode:item.mode,status:item.status,authorId:item.authorId??'UNRECORDED',
   prompt:item.prompt,target:item.variants?.map(v=>v.slots),distractors:item.contrast?.options.filter(x=>x!==item.variants[0].slots.collocation)??item.decision?.options.filter(x=>x!==item.variants[0].slots.choice)??[],
   issues:['Independent language-editor assessment','All acceptable inflections and alternate answers','Contextual register and semantic ambiguity','CEFR/skill calibration','Original example and rights provenance',...(item.contrast||item.decision?['Distractor plausibility and unambiguous instructions','Acceptable semantic and register alternatives']:[])],
   lexicalReference:ref?{url:ref.url,headword:ref.headword,claim:ref.claim,scope:'LEXICAL_FORM_ONLY'}:null,
   independentEditorialApproval:false};
 });
 const writing=production.map(p=>({
  id:p.id,version:p.version,type:'OPEN_WRITING',mode:'M04',status:p.status,authorId:'SG_DRAFT_20261018',prompt:p.instruction,source:p.source,sample:p.sample,
  issues:['Human assessment of alternative valid rewrites','Maintain original meaning and epistemic limits','Register and syntactic correctness','Privacy of learner output','CEFR calibration by qualified editor','Rights/source provenance'],
  independentEditorialApproval:false
 }));
 const out=[...items,...writing];const ids=new Set();
 for(const x of out){if(ids.has(x.id))throw Error('Duplicate editorial candidate '+x.id);ids.add(x.id);if(x.status!=='DEMO_ONLY'||x.independentEditorialApproval!==false)throw Error('Attempt to certify unapproved worklist item '+x.id);}
 return out.sort((a,b)=>a.id.localeCompare(b.id));
}
export function collect(){
 const manifest=read('content/manifest.json');
 const authored=manifest.authoringSources.flatMap(p=>read(p));
 const graded=authored.filter(i=>i.id?.startsWith('SG-M'));
 const writing=authored.filter(i=>i.id?.startsWith('SG-P04'));
 if(graded.length!==manifest.demoItemCount||writing.length!==manifest.productionPromptCount||graded.length+writing.length!==authored.length)throw Error('Review queue does not cover entire declared authoring manifest.');
 const existing=buildReviewQueue(graded,writing,read('content/editorial/lexical-anchors.json').anchors);
 const units=(manifest.readingSources??[]).flatMap(read);
 if(units.length!==manifest.readingUnitCount)throw Error('Editorial queue cannot ignore reading units');
 const reading=units.flatMap(u=>[
  {id:u.id,version:u.version,type:'READING_TEXT',mode:'G09',status:u.status,authorId:u.author,source:u.rights.source,prompt:u.title,issues:['Independent editorial reading of entire passage','Check every interpretation and implied factual claim','Copyright and original source provenance','CEFR text and comprehension calibration'],independentEditorialApproval:false},
  ...u.questions.map(q=>({id:u.id+':'+q.id,version:u.version,type:'READING_EVIDENCE',mode:'G09',status:u.status,authorId:u.author,prompt:q.prompt,model:q.model,evidence:q.paragraphIds,issues:['Check exact paragraph grounding','Accept all defensible responses','Avoid ungrounded certainty and ambiguity','Independent calibrated human review'],independentEditorialApproval:false}))
 ]);
 if(reading.length!==manifest.readingUnitCount+manifest.readingQuestionCount)throw Error('Editorial queue reading question mismatch');
 const ids=new Set(existing.map(x=>x.id));for(const x of reading){if(ids.has(x.id)||x.status!=='DEMO_ONLY'||x.independentEditorialApproval)throw Error('Invalid reading editorial dossier '+x.id);ids.add(x.id)}
 const pragmatic=read(manifest.pragmaticAuthoringSource).map(s=>({id:s.id,version:s.version,type:'PRAGMATIC_CHOICE',mode:'G08',status:s.status,authorId:'SG_AI_DRAFT_20261018',prompt:s.context,task:s.task,alternatives:s.options,preferredIds:s.preferredIds,issues:['Check multiple contextually justified choices','Check implicit social power and cultural assumptions','Human evaluation of phrasing and politeness','Rights/source provenance','CEFR level not established by author','Check rewritten text prompt'],independentEditorialApproval:false}));
 const transfers=read(manifest.readingTransferAuthoringSource).map(b=>({id:b.id,version:b.version,type:'READING_WRITTEN_TRANSFER',mode:'G09',status:b.status,authorId:'SG_AI_DRAFT_20261018',unitId:b.unitId,prompt:b.instruction,audience:b.audience,checks:b.checks,issues:['Verify reading-dependent source fidelity','Ensure fair audience and register requirements','Allow alternate correct rewrites','No machine scoring or CEFR calibration'],independentEditorialApproval:false}));
 if(pragmatic.length!==manifest.pragmaticScenarioCount||transfers.length!==manifest.readingTransferCount)throw Error('Missing pragmatic or transfer editorial dossiers');
 const modality=read(manifest.modalityDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G05_ORIGINAL_SOURCE',mode:'G05',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independent grammatical and linguistic assessment of all paragraphs','Register, discourse and temporal/evidential interpretations','Original authorship and source rights','C1–C2 calibration without automatic certification'],independentEditorialApproval:false},
  ...s.contrasts.map(c=>({id:s.id+':'+c.id,version:s.version,type:'G05_AUTHOR_CONTRAST',mode:'G05',status:s.status,authorId:s.author,prompt:c.prompt,quote:c.quote,optionIds:c.options.map(o=>o.id),preferredId:c.preferredId,model:c.model,issues:['Verify the contrast against the cited paragraph','Check ambiguity and competing defensible interpretations','Review author feedback accuracy and teaching value','No inferred CEFR or automated grading'],independentEditorialApproval:false}))
 ]);
 if(modality.length!==manifest.modalityDraftCount*4)throw Error('Missing G05 draft editorial dossiers');
 const caseTracing=read(manifest.caseTracingDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G02_ORIGINAL_SOURCE',mode:'G02',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independently review every source paragraph and deliberately malformed example','Check original authorship, rights and stable case identities','Verify real C1–C2 difficulty before any certification'],independentEditorialApproval:false},
  ...s.repairs.map(t=>({id:s.id+':'+t.id,version:s.version,type:'G02_GOVERNED_REPAIR',mode:'G02',status:s.status,authorId:s.author,prompt:t.quote,paragraphId:t.paragraphId,governor:t.governor,canonicalSolution:t.solution,issues:['Verify syntactic governor, gender, number and case including acceptable variants','Verify adjective/participle/noun inflection and register','Validate model explanation and learner task clarity','Do not auto-grade free repairs or certify C1–C2 level'],independentEditorialApproval:false}))
 ]);
 if(caseTracing.length!==manifest.caseTracingDraftCount*4)throw Error('Missing G02 original editorial dossiers');
 const valency=read(manifest.valencyDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G03_ORIGINAL_SOURCE',mode:'G03',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independently verify all original prose, register and rights','Verify the intended governing predicates and argument structure','Confirm C1/C2 complexity without any CEFR certification'],independentEditorialApproval:false},
  ...s.frames.map(f=>({id:s.id+':'+f.id,version:s.version,type:'G03_VALENCY_FRAME',mode:'G03',status:s.status,authorId:s.author,prompt:f.question,quote:f.quote,paragraphId:f.paragraphId,governor:f.governor,alternate:f.alternate,options:f.options,preferredId:f.preferredId,model:f.model,issues:['Validate both grammatical frames and acceptable semantic overlap','Confirm source-anchored interpretation and genuine alternative effects','Independently review authorship, semantics, syntactic role and feedback','Do not infer learner proficiency or release without review'],independentEditorialApproval:false}))
 ]);
 if(valency.length!==manifest.valencyDraftCount*4)throw Error('Missing G03 editorial review dossiers');
 const focus=read(manifest.focusDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G04_ORIGINAL_SOURCE',mode:'G04_FOCUS',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independent authenticity, German idiom and rights review for all source paragraphs','Check discourse premises and context for every focus-dependent interpretation','Check C1/C2 learning progression without awarding CEFR credit'],independentEditorialApproval:false},
  ...s.contrasts.map(c=>({id:s.id+':'+c.id,version:s.version,type:'G04_DISCOURSE_CONTRAST',mode:'G04_FOCUS',status:s.status,authorId:s.author,prompt:c.question,quote:c.quote,paragraphId:c.paragraphId,options:c.options,preferredId:c.preferredId,model:c.model,issues:['Validate source quote and each grammatical alternative','Check scope/topic-focus implications, acceptable interpretations and ambiguous focus readings','Verify independent reformulation prompt, correction explanation and transfer objective','No automatic grades, CEFR claims or approval inferred from authored choices'],independentEditorialApproval:false}))
 ]);
 if(focus.length!==manifest.focusDraftCount*4)throw Error('Missing G04 focus editorial dossiers');
 const reference=read(manifest.referenceDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G01_ORIGINAL_SOURCE',mode:'G01_REFERENCE',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independent review of all three German source paragraphs and rights','Check discourse referents, first mentions and article interpretation','Assess plausibility of C1/C2 original tasks without awarding CEFR levels'],independentEditorialApproval:false},
  ...s.decisions.map(d=>({id:s.id+':'+d.id,version:s.version,type:'G01_REFERENCE_DECISION',mode:'G01_REFERENCE',status:s.status,authorId:s.author,prompt:d.question,quote:d.quote,alternate:d.alternate,paragraphId:d.paragraphId,options:d.options,preferredId:d.preferredId,model:d.model,issues:['Verify exact original source anchor and determiner contrast','Check contextual referent identity, scope, ambiguity and register variants','Check independent rewrite prompt, explanation and transfer accuracy','Do not certify proficiency, auto-grade free text or publish without independent review'],independentEditorialApproval:false}))
 ]);
 if(reference.length!==manifest.referenceDraftCount*4)throw Error('Missing G01 reference editorial dossiers');
 const result=[...existing,...reading,...pragmatic,...transfers,...modality,...caseTracing,...valency,...focus,...reference],allIds=new Set();
 for(const x of result){if(allIds.has(x.id)||x.status!=='DEMO_ONLY'||x.independentEditorialApproval!==false)throw Error('Invalid editorial worklist member '+x.id);allIds.add(x.id);}
 return result.sort((a,b)=>a.id.localeCompare(b.id));
}
const isCLI=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCLI){
 const args=process.argv.slice(2);
 const idx=args.indexOf('--id'),modeIdx=args.indexOf('--mode');
 let candidates=collect();
 if(idx>=0)candidates=candidates.filter(x=>x.id===args[idx+1]);
 if(modeIdx>=0)candidates=candidates.filter(x=>x.mode===args[modeIdx+1]);
 if(idx>=0&&!candidates.length)throw Error('Unknown review ID');
 if(args.includes('--summary')){
  console.log(JSON.stringify({total:candidates.length,unapproved:candidates.filter(x=>!x.independentEditorialApproval).length,byMode:Object.fromEntries([...new Set(candidates.map(x=>x.mode))].map(m=>[m,candidates.filter(x=>x.mode===m).length])),lexicallyReferenced:candidates.filter(x=>x.lexicalReference).length,formallyApproved:0},null,2));
 }else if(args.includes('--markdown')){
  for(const x of candidates)console.log('## '+x.id+' — '+x.mode+' / '+x.type+'\n\n**Status:** DEMO_ONLY — no signoff\n\n**Task:** '+x.prompt+'\n\n'+(x.lexicalReference?'Reference: '+x.lexicalReference.url+' (lexical expression only)\n\n':'')+'Human review:\n'+x.issues.map(y=>'- [ ] '+y).join('\n')+'\n');
 }else console.log(JSON.stringify(candidates,null,2));
}
