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
   prompt:item.prompt,target:item.variants?.map(v=>v.slots),distractors:item.contrast?.options.filter(x=>x!==item.variants[0].slots.collocation)??[],
   issues:['Independent language-editor assessment','All acceptable inflections and alternate answers','Contextual register and semantic ambiguity','CEFR/skill calibration','Original example and rights provenance',...(item.contrast?['Distractor plausibility and unambiguous instructions']:[])],
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
 return buildReviewQueue(graded,writing,read('content/editorial/lexical-anchors.json').anchors);
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
