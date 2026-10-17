import type { Attempt } from '../content/types';
export type Mastery={skillId:string; estimate:number; confidence:number; evidence:number; n:number; uniqueItems:number; dates:number; };
export function estimateMastery(attempts:Attempt[],skillId:string,now=Date.now()):Mastery {
 const eligible=attempts.filter(x=>x.skillId===skillId&&x.result!=='VOID'&&x.at<=now&&now-x.at<=180*86400000).sort((a,b)=>a.at-b.at);
 const seen=new Set<string>();let alpha=1,beta=1,evidence=0;const retained:Attempt[]=[];
 for(const a of eligible){const bucket=Math.floor(a.at/(14*86400000));const k=a.itemId+':'+bucket;if(seen.has(k))continue;seen.add(k);const w=Math.pow(2,-(now-a.at)/86400000/90)*(a.hinted?0.5:1);alpha+=w*a.score;beta+=w*(1-a.score);evidence+=w;retained.push(a);}
 return {skillId,estimate:alpha/(alpha+beta),confidence:1-Math.exp(-evidence/12),evidence,n:retained.length,uniqueItems:new Set(retained.map(x=>x.itemId)).size,dates:new Set(retained.map(x=>new Date(x.at).toISOString().slice(0,10))).size};
}
