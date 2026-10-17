import type {ProductionEntry,ProductionPrompt} from './types';
export type Lens='BEDEUTUNG'|'REGISTER'|'SYNTAX'|'KOHÄRENZ';
export const LENSES:Record<Lens,{title:string;question:string}>={
 BEDEUTUNG:{title:'Aussage und Reichweite',question:'Was bleibt eine Vermutung? Welche inhaltliche Grenze darf nicht entfallen?'},
 REGISTER:{title:'Stil und Register',question:'Sind Ton, Präzision und Distanz passend zur Textsorte?'},
 SYNTAX:{title:'Grammatik und Satzbau',question:'Stimmen Rektion, Modus, Kongruenz und Satzklammer?'},
 KOHÄRENZ:{title:'Argumentation und Verknüpfung',question:'Sind Gegensatz, Bedingung und Folgerung klar unterscheidbar?'}
};
export type Change={kind:'same'|'added'|'removed';text:string};
const tokens=(s:string)=>s.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}\s]/gu)??[];
/** Word-level LCS with bounded work; render as learner assistance, never linguistic grading. */
export function revisionDiff(before:string,after:string):Change[]{
 const a=tokens(before),b=tokens(after);
 if(a.length>360||b.length>360)return [{kind:'removed',text:before},{kind:'added',text:after}];
 const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
 const result:Change[]=[];let i=0,j=0;
 const add=(kind:Change['kind'],word:string)=>{const last=result.at(-1);if(last?.kind===kind)last.text+=' '+word;else result.push({kind,text:word})};
 while(i<a.length&&j<b.length){
  if(a[i]===b[j]){add('same',a[i]);i++;j++;}
  else if(dp[i+1][j]>=dp[i][j+1])add('removed',a[i++]);
  else add('added',b[j++]);
 }
 while(i<a.length)add('removed',a[i++]);
 while(j<b.length)add('added',b[j++]);
 return result;
}
export function journey(prompts:readonly ProductionPrompt[],entries:readonly ProductionEntry[]){
 return prompts.map(p=>{
  const history=entries.filter(e=>e.itemId===p.id).sort((a,b)=>b.createdAt-a.createdAt);
  return {prompt:p,history,started:history.length>0,revisions:history.reduce((n,e)=>n+e.revisions.length,0)};
 });
}
export function nextWritingPrompt(prompts:readonly ProductionPrompt[],entries:readonly ProductionEntry[]):string|null{
 const candidates=journey(prompts,entries);
 return candidates.find(x=>x.started&&x.revisions===0)?.prompt.id??
 candidates.find(x=>!x.started)?.prompt.id??
 candidates.sort((a,b)=>a.revisions-b.revisions)[0]?.prompt.id??null;
}
