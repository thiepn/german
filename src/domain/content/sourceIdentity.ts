import type {ProductionEntry} from '../production/types';
/** Source-version-qualified ID for FUTURE records. Historical v1 ID is immutable.
 * No conversion, migration or automatic activation is performed.
 */
export function sourceEntryId(namespace:'relative'|'polysemy'|'phraseology'|'attachment',sourceId:string,version:number):string{
 if(!/^[A-Za-z0-9-]{1,256}$/.test(sourceId)||!Number.isSafeInteger(version)||version<1||version>9999)
  throw Error('Ungültige Quellenversion oder Quellenkennung');
 return namespace+':'+sourceId+(version===1?'':':v'+version);
}
export function matchesSourceEntry(e:ProductionEntry,kind:'RELATIVE_STUDY'|'POLYSEMY_STUDY'|'PHRASEOLOGY_STUDY'|'ATTACHMENT_STUDY',namespace:'relative'|'polysemy'|'phraseology'|'attachment'):boolean{
 return e.kind===kind&&Number.isSafeInteger(e.itemVersion)&&e.itemVersion>=1&&e.itemVersion<=9999&&
 /^[A-Za-z0-9-]{1,256}$/.test(e.itemId)&&e.id===sourceEntryId(namespace,e.itemId,e.itemVersion);
}
/** Fail closed if an older learner entry's exact version is absent. Never fall forward. */
export function exactSourceForEntry<T extends {id:string;version:number}>(entry:ProductionEntry,sources:readonly T[]):T|null{
 if(!entry.sourceId||entry.sourceId!==entry.itemId||!Number.isSafeInteger(entry.itemVersion)||entry.itemVersion<1)return null;
 return sources.find(s=>s.id===entry.itemId&&s.version===entry.itemVersion)??null;
}
