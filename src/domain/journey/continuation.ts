import {archiveRows,type ArchiveRow} from '../archive/archive';
import type {ProductionEntry} from '../production/types';

/** Read-only, source-exact learner continuity. No derived proficiency, grades or new persisted IDs. */
export function recentWork(entries:readonly ProductionEntry[],limit=3):ArchiveRow[]{
 if(!Number.isSafeInteger(limit)||limit<0)throw Error('Invalid continuation limit');
 if(!limit)return [];
 const rows=archiveRows(entries,{kind:'ALL',activity:'ALL',period:'ALL',search:'',now:Date.now()});
 return rows.filter(row=>Number.isFinite(row.lastAt)&&row.lastAt>=0).slice(0,limit);
}
export function recentWorkForDomain(entries:readonly ProductionEntry[],domain:string):ArchiveRow|null{
 if(!/^G(?:0[1-9]|1[0-3])$/.test(domain))return null;
 return recentWork(entries,entries.length).find(row=>row.scope===domain)??null;
}
