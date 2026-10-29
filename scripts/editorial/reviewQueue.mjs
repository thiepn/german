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
 const phraseology=read(manifest.phraseologyDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G07_ORIGINAL_SOURCE',mode:'G07_PHRASEOLOGY',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Check all original German paragraphs for idiomatic accuracy and source rights','Verify phraseological source expressions and reporting context','Assess C1/C2 training complexity without any CEFR certification'],independentEditorialApproval:false},
  ...s.decisions.map(d=>({id:s.id+':'+d.id,version:s.version,type:'G07_PHRASEOLOGY_CONTRAST',mode:'G07_PHRASEOLOGY',status:s.status,authorId:s.author,prompt:d.question,quote:d.quote,alternate:d.alternate,paragraphId:d.paragraphId,options:d.options,preferredId:d.preferredId,model:d.explanation,issues:['Validate literal source quote and fixed-expression integrity','Check commitment, action, responsibility and evidential boundary, including viable readings of alternatives','Independently verify paraphrase prompt, authored explanation and transfer instruction','Do not imply independent language approval, grading or release eligibility'],independentEditorialApproval:false}))
 ]);
 if(phraseology.length!==manifest.phraseologyDraftCount*4)throw Error('Missing G07 phraseology editorial dossiers');
 const polysemy=read(manifest.polysemyDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G06_ORIGINAL_SOURCE',mode:'G06_POLYSEMY',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Review all newly authored German paragraphs and original rights','Check specialist lexical meanings and C1/C2 authenticity','Check factual plausibility and domain-specific terminology before any learner publication'],independentEditorialApproval:false},
  ...s.decisions.map(d=>({id:s.id+':'+d.id,version:s.version,type:'G06_SENSE_CONTRAST',mode:'G06_POLYSEMY',status:s.status,authorId:s.author,prompt:d.question,quote:d.quote,alternate:d.alternate,paragraphId:d.paragraphId,lemma:d.lemma,options:d.options,preferredId:d.preferredId,model:d.explanation,issues:['Verify literal paragraph quote, lexical senses and grammatical idiom of both alternatives','Check that preferred reading follows source context and competing sense is meaningful','Review authored paraphrase, exclusion justification and independent transfer task','No automatic C1/C2 certification, learner grading or publication without independent approval'],independentEditorialApproval:false}))
 ]);
 if(polysemy.length!==manifest.polysemyDraftCount*4)throw Error('Missing G06 lexical semantic editorial dossiers');

 const stance=read(manifest.stanceDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G08_ORIGINAL_DISCOURSE_SOURCE',mode:'G08_STANCE',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independently review all three German source paragraphs and original rights','Check reported institutional perspective and methodological accuracy','No automatic writing evaluation or CEFR certification'],independentEditorialApproval:false},
  ...s.decisions.map(d=>({id:s.id+':'+d.id,version:s.version,type:'G08_STANCE_CONTRAST',mode:'G08_STANCE',status:s.status,authorId:s.author,prompt:d.question,quote:d.quote,alternate:d.alternate,paragraphId:d.paragraphId,move:d.move,options:d.options,preferredId:d.preferredId,model:d.explanation,issues:['Check quote against original passage and implied stance','Evaluate whether the authored contrast is genuinely inferentially distinct','Confirm acceptable readings, register and degree of commitment','Independently review transfer brief; no grading or publication approval'],independentEditorialApproval:false}))
 ]);
 if(stance.length!==manifest.stanceDraftCount*4)throw Error('Missing G08 stance editorial dossiers');

 const cross=read(manifest.crossSourceDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G09_ORIGINAL_SOURCE_PAIR',mode:'G09_CROSS_SOURCE',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,sourceTitles:s.sources.map(x=>x.title),issues:['Review all six original German paragraphs and rights in both documents','Independently check stated sample sizes, methodology, reporting limits and plausibility','Do not infer publication or CEFR approval'],independentEditorialApproval:false},
  ...s.comparisons.map(d=>({id:s.id+':'+d.id,version:s.version,type:'G09_CROSS_SOURCE_CONTRAST',mode:'G09_CROSS_SOURCE',status:s.status,authorId:s.author,prompt:d.question,quoteA:d.quoteA,quoteB:d.quoteB,sourceA:d.sourceA,sourceB:d.sourceB,issue:d.issue,options:d.options,preferredId:d.preferredId,model:d.model,issues:['Confirm both quotations are literal and their source locations are correct','Review interpretive compatibility, contradictory evidence, different measurement units and unsupported stronger inferences','Review audience-oriented synthesis task, adequate alternative readings, idiomatic German and source rights','Original suggestions do not grade independent writing or confer approval'],independentEditorialApproval:false}))
 ]);
 if(cross.length!==manifest.crossSourceDraftCount*4)throw Error('Incomplete G09 cross-source editorial dossiers');

 const compression=read(manifest.compressionDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G04_ORIGINAL_COMPLEX_DOCUMENT',mode:'G04_COMPRESSION',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independently review all three multi-paragraph C1-C2 German sources and rights','Check nuance, agency, scope and plausible institutional conditions','No automatic grading, CEFR credit or publication approval'],independentEditorialApproval:false},
  ...s.operations.map(o=>({id:s.id+':'+o.id,version:s.version,type:'G04_BIDIRECTIONAL_SYNTAX',mode:'G04_COMPRESSION',status:s.status,authorId:s.author,prompt:o.question,quote:o.quote,paragraphId:o.paragraphId,family:o.family,options:o.options,preferredId:o.preferredId,model:o.model,issues:['Confirm quote against exact source paragraph','Independently check nominalization and participial or conditional syntax analysis','Verify expansion and compression preserve negation, scope, agent, conditionality and evidential status','Review audience-specific transfer, alternative readings and idiomatic German; no auto-grade or approval'],independentEditorialApproval:false}))
 ]);
 if(compression.length!==manifest.compressionDraftCount*4)throw Error('Incomplete G04 compression editorial dossiers');

 const attribution=read(manifest.attributionDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G11_ORIGINAL_ATTRIBUTION_DOCUMENT',mode:'G11_ATTRIBUTION',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independently review all three original fictional source texts and direct quotations','Assess genre-specific citation, attribution and stylistic suitability, including quotation punctuation','Verify authorship/rights and maintain DEMO_ONLY; no CEFR claims'],independentEditorialApproval:false},
  ...s.anchors.map(a=>({id:s.id+':'+a.id,version:s.version,type:'G11_QUOTE_PARAPHRASE_INTEGRATION',mode:'G11_ATTRIBUTION',status:s.status,authorId:s.author,prompt:a.question,quote:a.quote,paragraphId:a.paragraphId,speaker:a.speaker,options:a.options,preferredId:a.preferredId,model:a.model,issues:['Verify verbatim quote and source location against original document','Review exact speaker and proposition attribution, conditional modality and evidential limits','Review direct quote embedding and independent indirect paraphrase idiom in German','Check original transfer brief and case-specific limitations without granting editorial approval or automatic scoring'],independentEditorialApproval:false}))
 ]);
 if(attribution.length!==manifest.attributionDraftCount*4)throw Error('Incomplete G11 attribution editorial dossiers');

 const repair=read(manifest.repairDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G12_ORIGINAL_DISCUSSION_RECORD',mode:'G12_REPAIR',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independently review all three fictional source paragraphs, rights and idiomatic German dialogue','Check realistic conversational ambiguity, role attribution and decision-making authority','No source approval, automatic proficiency assessment or publication'],independentEditorialApproval:false},
  ...s.repairs.map(t=>({id:s.id+':'+t.id,version:s.version,type:'G12_AMBIGUITY_REPAIR',mode:'G12_REPAIR',status:s.status,authorId:s.author,prompt:t.question,quote:t.quote,speaker:t.speaker,paragraphId:t.paragraphId,options:t.options,preferredId:t.preferredId,clarified:t.clarified,model:t.model,issues:['Verify verbatim utterance and speaker in source paragraph','Independently review plausible conflicting interpretations and conditional commitments','Assess open-ended clarification question, cautious reply and unresolved-status transfer','Preserve author rights, DEMO_ONLY status and no automatic scores'],independentEditorialApproval:false}))
 ]);
 if(repair.length!==manifest.repairDraftCount*4)throw Error('Incomplete G12 repair editorial dossiers');

 const argument=read(manifest.argumentDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G11_ORIGINAL_ARGUMENT_SOURCE',mode:'G11_ARGUMENT',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independently review original German prose, rights and all source scopes','Evaluate plausibility of premises, opposing arguments and limited institutional decisions','Preserve DEMO_ONLY, no language score, CEFR credit or publication signoff'],independentEditorialApproval:false},
  ...s.arguments.map(a=>({id:s.id+':'+a.id,version:s.version,type:'G11_WARRANT_AND_COUNTERARGUMENT',mode:'G11_ARGUMENT',status:s.status,authorId:s.author,prompt:a.question,quote:a.quote,paragraphId:a.paragraphId,options:a.options,preferredId:a.preferredId,model:a.model,counter:a.counter,issues:['Check literal source quote against paragraph','Independently review inferential warrant, alternative causes and strongest plausible objections','Verify nuanced counterargument, independent production and revision transfer','Keep editorial approval false; no auto-grade for free German writing'],independentEditorialApproval:false}))
 ]);
 if(argument.length!==manifest.argumentDraftCount*4)throw Error('Incomplete G11 argument editorial dossiers');

 const numeric=read(manifest.numericDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G09_ORIGINAL_NUMERICAL_SOURCE',mode:'G09_NUMERIC',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independently verify all fictional counts, units, denominators, percentage arithmetic and temporal comparisons','Review complete idiomatic original German, rights and proposed reader audience','No human review completed; keep DEMO_ONLY, no CEFR grade or publication'],independentEditorialApproval:false},
  ...s.claims.map(n=>({id:s.id+':'+n.id,version:s.version,type:'G09_QUANTITATIVE_CLAIM',mode:'G09_NUMERIC',status:s.status,authorId:s.author,prompt:n.question,quote:n.quote,paragraphId:n.paragraphId,options:n.options,preferredId:n.preferredId,model:n.model,trap:n.trap,issues:['Verify literal quote against original source paragraph','Recalculate source arithmetic and distinguish counts, percent and percentage points','Review original denominator, measurement unit, cohort and forecast boundaries','Assess independent German writing without automatic grading or approval'],independentEditorialApproval:false}))
 ]);
 if(numeric.length!==manifest.numericDraftCount*4)throw Error('Incomplete G09 numeric editorial dossiers');

 const disclosure=read(manifest.disclosureDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G13_ORIGINAL_DISCLOSURE_SOURCE',mode:'G13_DISCLOSURE',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independent review of full original fictional sources, limits and rights','Verify clarity of both target audiences and information minimization','No independent approval or publication'],independentEditorialApproval:false},
  ...s.decisions.map(d=>({id:s.id+':'+d.id,version:s.version,type:'G13_DISCLOSURE_DECISION',mode:'G13_DISCLOSURE',status:s.status,authorId:s.author,prompt:d.question,quote:d.quote,paragraphId:d.paragraphId,options:d.options,preferredId:d.preferredId,action:d.action,boundary:d.boundary,issues:['Check direct source quotation, action and fictional restricted token','Check limited disclosure without unnecessary detail and no invented approval','Check independent public/internal versions and meaningful revisions; no automatic grades'],independentEditorialApproval:false}))
 ]);
 if(disclosure.length!==manifest.disclosureDraftCount*4)throw Error('Incomplete G13 disclosure editorial worklist');

 const chronology=read(manifest.chronologyDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G09_ORIGINAL_PROCEDURAL_SOURCE',mode:'G09_CHRONOLOGY',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independently verify original full-length German fictional source and source rights','Assess whether chronology and approval logic are linguistically plausible rather than legal advice','Maintain DEMO_ONLY, with no approval, grade or publication'],independentEditorialApproval:false},
  ...s.claims.map(t=>({id:s.id+':'+t.id,version:s.version,type:'G09_CONDITIONAL_CHRONOLOGY',mode:'G09_CHRONOLOGY',status:s.status,authorId:s.author,prompt:t.question,quote:t.quote,paragraphId:t.paragraphId,options:t.options,preferredId:t.preferredId,model:t.model,trap:t.trap,issues:['Check literal quotation exactly once in named paragraph','Verify temporal markers, precedence and conditional or postponed effects','Verify independent three-field German response and transfer memo are source-appropriate','Human editorial approval only; never infer proficiency from writing lengths'],independentEditorialApproval:false}))
 ]);
 if(chronology.length!==manifest.chronologyDraftCount*4)throw Error('Incomplete G09 chronology editorial queue');

 const definitions=read(manifest.definitionDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G06_ORIGINAL_CONCEPT_DEFINITION_SOURCE',mode:'G06_DEFINITION',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independently review complete original German prose, fictional domain scope and rights','Check consistency of the document-specific definitions, without claiming universal technical definitions','Preserve DEMO_ONLY, AI_DRAFT and no independent approval, CEFR grade or publication'],independentEditorialApproval:false},
  ...s.distinctions.map(d=>({id:s.id+':'+d.id,version:s.version,type:'G06_OPERATIONAL_DEFINITION_BOUNDARY',mode:'G06_DEFINITION',status:s.status,authorId:s.author,prompt:d.question,quote:d.quote,paragraphId:d.paragraphId,term:d.term,nearTerm:d.nearTerm,options:d.options,preferredId:d.preferredId,model:d.model,trap:d.trap,issues:['Match the quotation literally to exactly one source paragraph','Check term, adjacent concept, excluded inference and substantive boundary example','Review independent multi-paragraph terminological memo and meaningful revisions without auto-grading','No editorial approval or publication until independently assessed'],independentEditorialApproval:false}))
 ]);
 if(definitions.length!==manifest.definitionDraftCount*4)throw Error('Incomplete M28 G06 editorial sources and anchors');

 const scope=read(manifest.scopeDraftSource).flatMap(s=>[
  {id:s.id,version:s.version,type:'G04_ORIGINAL_SCOPE_SOURCE',mode:'G04_SCOPE',status:s.status,authorId:s.author,prompt:s.title,source:s.rights.source,issues:['Independent edit of original German, scope and rights','Review C1/C2 calibration without claiming automated CEFR measurement','No publication or approval until independently reviewed'],independentEditorialApproval:false},
  ...s.scopes.map(c=>({id:s.id+':'+c.id,version:s.version,type:'G04_FOCUS_PARTICLE_OR_NEGATION_SCOPE',mode:'G04_SCOPE',status:s.status,authorId:s.author,prompt:c.question,quote:c.quote,paragraphId:c.paragraphId,particle:c.particle,options:c.options,preferredId:c.preferredId,model:c.model,trap:c.trap,issues:['Verify literal quote occurs once in named source paragraph','Verify truth-conditional negation scope, focus alternatives and counterexamples','Review independent document, audience revision and no automated free-writing grade','Preserve DEMO_ONLY and unreviewed rights'],independentEditorialApproval:false}))
 ]);
 if(scope.length!==manifest.scopeDraftCount*4)throw Error('Incomplete M30 G04 editorial source and anchor queue');
 const result=[...existing,...reading,...pragmatic,...transfers,...modality,...caseTracing,...valency,...focus,...reference,...phraseology,...polysemy,...stance,...cross,...compression,...attribution,...repair,...argument,...numeric,...disclosure,...chronology,...definitions,...scope],allIds=new Set();
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
