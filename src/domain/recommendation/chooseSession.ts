import type { Attempt,Exercise,ReviewCard } from '../content/types';
export function chooseSession(items:Exercise[],attempts:Attempt[],cards:ReviewCard[],now:number,count:number){
 const practiced=new Set(attempts.map(a=>a.itemId));
 const due=new Set(cards.filter(c=>c.dueAt<=now).map(c=>c.itemId));
 return [...items].filter(i=>i.status!=='WITHDRAWN').sort((a,b)=>{
 const score=(i:Exercise)=>(due.has(i.id)?10:0)+(!practiced.has(i.id)?4:0)-attempts.filter(x=>x.itemId===i.id).length;
 return score(b)-score(a)||a.id.localeCompare(b.id);
 }).slice(0,count);
}
