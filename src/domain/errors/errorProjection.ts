import type { Attempt,Exercise } from '../content/types';
export function projectErrors(attempts:Attempt[],byId:Map<string,Exercise>) {
 return attempts.filter(a=>a.result==='INCORRECT'||a.result==='PARTIAL').sort((a,b)=>b.at-a.at).map(a=>({attempt:a,item:byId.get(a.itemId)})).filter(e=>!!e.item);
}
