import test from 'node:test';
import assert from 'node:assert/strict';
import {phraseologyEntryId,phraseologyStudies,phraseologySource,isPhraseologyEntry,phraseologyProgress,nextPhraseologyStudy} from '../src/domain/phraseology/phraseology.ts';
import {archiveKind,archiveRow,archiveRows} from '../src/domain/archive/archive.ts';
import {sourceEntryId} from '../src/domain/content/sourceIdentity.ts';
import type {ProductionEntry} from '../src/domain/production/types.ts';
const id=phraseologyStudies[0].id;
const e=(version:number,entryId:string):ProductionEntry=>({
 id:entryId,itemId:id,itemVersion:version,sourceId:id,kind:'PHRASEOLOGY_STUDY',
 createdAt:10,original:'Historical learner response',revisions:[{id:'r1',at:20,text:'Historical learner revision',reflection:'Own thinking'}],evaluated:'UNASSESSED'
});
test('M42 future G07 v2 keys are disjoint, while historical G07 v1 IDs remain byte-identical',()=>{
 assert.equal(phraseologyEntryId(id),'phraseology:'+id);
 assert.equal(sourceEntryId('phraseology',id,1),phraseologyEntryId(id));
 assert.equal(phraseologyEntryId(id,2),'phraseology:'+id+':v2');
 assert.notEqual(phraseologyEntryId(id),phraseologyEntryId(id,2));
 assert.throws(()=>phraseologyEntryId(id,-1),/Ungültige/);
});
test('M42 G07 archive versions never borrow different-version source or overwrite old learner history',()=>{
 const a=e(1,phraseologyEntryId(id)),b=e(2,phraseologyEntryId(id,2));
 assert.equal(isPhraseologyEntry(a),true);assert.equal(isPhraseologyEntry(b),true);
 assert.equal(phraseologySource(a)?.version,1);
 assert.equal(phraseologySource(b),null,'unapproved v2 not available');
 assert.equal(archiveKind(b),'G07_PHRASEOLOGY');
 assert.match(archiveRow(b).title,/Historischer Entwurf/);
 assert.match(archiveRow(b).context,/Quellenversion nicht verfügbar/);
 assert.equal(archiveRow(b).entry.original,b.original);
 assert.deepEqual(archiveRow(b).entry.revisions,b.revisions);
 const legacyUnqualified=e(2,phraseologyEntryId(id));
 assert.equal(isPhraseologyEntry(legacyUnqualified),false);
 assert.equal(phraseologySource(legacyUnqualified),null);
 assert.equal(archiveKind(legacyUnqualified),'G07_PHRASEOLOGY','legacy-shaped unavailable version remains discoverable');
 assert.match(archiveRow(legacyUnqualified).context,/Quellenversion nicht verfügbar/);
 assert.equal(archiveRows([a,b,legacyUnqualified],{kind:'ALL',activity:'ALL',period:'ALL',search:'Historical',now:30}).length,3);
});
test('M42 proposed v2 G07 records cannot silently count as v1 progress or consume next-study selection',()=>{
 const v2=e(2,phraseologyEntryId(id,2));
 assert.deepEqual(phraseologyProgress([v2]),phraseologyProgress([]));
 assert.equal(nextPhraseologyStudy([v2]).id,phraseologyStudies[0].id);
 assert.equal(phraseologyProgress([]).total,6);
});
