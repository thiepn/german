import test from 'node:test';import assert from 'node:assert/strict';
import {archiveKind,archiveRow,archiveRows,archiveInsight,versionPair} from '../src/domain/archive/archive.ts';
import {productionPrompts} from '../src/domain/production/prompts.ts';
import {pragmaticScenarios} from '../src/domain/pragmatics/pragmatics.ts';
import {readingStudies} from '../src/domain/reading/reading.ts';
import {readingTransferBriefs,readingTransferId} from '../src/domain/reading/transfer.ts';
import type {ProductionEntry} from '../src/domain/production/types.ts';
const NOW=Date.UTC(2026,9,18);
const m04:ProductionEntry={id:'writing-original',itemId:productionPrompts[0].id,itemVersion:1,createdAt:NOW-3*86400000,original:'Der Bericht bleibt vorläufig.',revisions:[{id:'r-1',at:NOW-86400000,text:'Der Bericht sei vorläufig.',reflection:'Indirekte Rede',lens:'SYNTAX',selfChecks:['Konjunktiv prüfen']},{id:'r-2',at:NOW-1000,text:'Der Bericht könne vorläufig bleiben.',reflection:'Unsicherheit verdeutlicht',lens:'BEDEUTUNG',selfChecks:[]}],evaluated:'UNASSESSED'};
const g08:ProductionEntry={id:'pragmatic:'+pragmaticScenarios[0].id,itemId:pragmaticScenarios[0].id,itemVersion:1,createdAt:NOW-2*86400000,original:'Ich möchte höflicher antworten.',kind:'PRAGMATIC_STUDY',decisionId:'option',revisions:[],evaluated:'UNASSESSED'};
const reading:ProductionEntry={id:'reading:'+readingStudies[0].id,itemId:readingStudies[0].id,itemVersion:1,kind:'READING_STUDY',createdAt:NOW-30*86400000,original:'Ein Befund ist nicht die Ursache.',revisions:[{id:'q1',at:NOW-5*86400000,text:'Der Bericht belegt keine Kausalität.',reflection:'Absatz zwei',questionId:'q1',paragraphId:'p2'}],evaluated:'UNASSESSED'};
const transfer:ProductionEntry={id:readingTransferId(readingStudies[0].id),itemId:readingTransferBriefs[0].id,itemVersion:1,kind:'READING_TRANSFER',sourceId:readingStudies[0].id,createdAt:NOW-2*86400000,original:'Für die Arbeitsgruppe ist die Aussage noch vorläufig.',revisions:[],evaluated:'UNASSESSED'};
const all=[reading,transfer,g08,m04],q={kind:'ALL' as const,activity:'ALL' as const,period:'ALL' as const,search:'',now:NOW};
test('projection recognizes original owners and never folds G08/G09 into M04',()=>{
 assert.deepEqual(all.map(archiveKind),['G09_READING','G09_TRANSFER','G08','M04']);
 const rows=archiveRows(all,q);assert.equal(rows.length,4);
 assert.ok(rows.every(r=>r.title&&r.description&&r.entry.id));
 assert.equal(rows.find(r=>r.kind==='G09_TRANSFER')?.title,readingTransferBriefs[0].title);
 assert.equal(rows.find(r=>r.kind==='M04')?.title,productionPrompts[0].objective);
 assert.deepEqual(all.map(e=>e.original),[reading.original,transfer.original,g08.original,m04.original]);
});
test('search includes original, later versions and reflections without external lookup',()=>{
 assert.equal(archiveRows(all,{...q,search:'unsicherheit'}).length,1);
 assert.equal(archiveRows(all,{...q,search:'Kausalität'}).length,1);
 assert.equal(archiveRows(all,{...q,search:'  KONJUNKTIV  '}).length,1);
 assert.equal(archiveRows(all,{...q,search:'Nonsense-987'}).length,0);
});
test('filters distinguish revised records, first-only and calendar recency',()=>{
 assert.equal(archiveRows(all,{...q,kind:'G08'}).length,1);
 assert.equal(archiveRows(all,{...q,activity:'REVISED'}).length,2);
 assert.equal(archiveRows(all,{...q,activity:'FIRST_ONLY'}).length,2);
 assert.equal(archiveRows(all,{...q,period:'7D'}).length,4);
 assert.equal(archiveRows(all,{...q,period:'7D',kind:'G09_READING'}).length,1);
 assert.equal(archiveRows(all,{...q,period:'30D'}).length,4);
 assert.equal(archiveRows(all,{...q,period:'7D',now:NOW+60*86400000}).length,0);
});
test('insight counts only observed revision events and explicit self-checks',()=>{
 const result=archiveInsight(archiveRows(all,q));
 assert.equal(result.firstDrafts,4);assert.equal(result.revisedEntries,2);assert.equal(result.revisionEvents,3);
 assert.equal(result.selfChecks,1);assert.equal(result.reflections,3);assert.equal(result.questionAnswers,1);
 assert.equal(result.lenses.SYNTAX,1);assert.equal(result.lenses.BEDEUTUNG,1);
 assert.equal(result.days,5);
 assert.deepEqual(archiveInsight([]).firstDrafts,0);
});
test('historical version pairs retain literal source text and do not score quality',()=>{
 const a=versionPair(m04,0),b=versionPair(m04,1);
 assert.equal(a?.previous,m04.original);assert.equal(a?.current,m04.revisions[0].text);
 assert.equal(b?.previous,m04.revisions[0].text);assert.equal(b?.current,m04.revisions[1].text);
 assert.equal(versionPair(m04,90),null);
 assert.equal(m04.original,'Der Bericht bleibt vorläufig.');
});
test('removed catalog items remain discoverable by their original identity',()=>{
 const missing={...m04,id:'legacy-long-preserved',itemId:'SG-P04-999',original:'Ursprüngliche Aussage'};
 const row=archiveRow(missing);assert.match(row.title,/SG-P04-999/);
 assert.match(row.context,/nicht mehr im Entwurfskatalog/);
});
