import type { Exercise } from '../content/types';
export type GradeResult = { status:'CORRECT'|'PARTIAL'|'INCORRECT'|'VOID'; score:number; perSlot:Record<string,boolean>; variantIndex:number|null; };
export function normalizeGerman(raw:string, caseSensitive=false):string {
  const n=raw.normalize('NFC').trim().replace(/\s+/g,' ');
  return caseSensitive?n:n.toLocaleLowerCase('de-DE');
}
export function gradeAnswer(ex:Exercise, supplied:Record<string,string>): GradeResult {
 if(ex.status==='WITHDRAWN'||ex.variants.length===0)return {status:'VOID',score:0,perSlot:{},variantIndex:null};
 const keys=ex.slots.map(s=>s.id);
 const caseSensitive=(k:string)=>!!ex.slots.find(s=>s.id===k)?.caseSensitive;
 const exact=ex.variants.findIndex(v=>keys.every(k=>normalizeGerman(supplied[k]??'',caseSensitive(k))===normalizeGerman(v.slots[k]??'',caseSensitive(k))));
 const perSlot=Object.fromEntries(keys.map(k=>[k,ex.variants.some(v=>normalizeGerman(supplied[k]??'',caseSensitive(k))===normalizeGerman(v.slots[k]??'',caseSensitive(k)))]));
 if(exact>=0)return {status:'CORRECT',score:1,perSlot,variantIndex:exact};
 const score=keys.filter(k=>perSlot[k]).length/Math.max(1,keys.length);
 return {status:score>0?'PARTIAL':'INCORRECT',score,perSlot,variantIndex:null};
}
