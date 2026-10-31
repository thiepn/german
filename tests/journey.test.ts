import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDIO_LINKS,linksForDomain} from '../src/domain/journey/catalog';
import {recentWork,recentWorkForDomain} from '../src/domain/journey/continuation';
import {archiveRows,archiveKind} from '../src/domain/archive/archive';
import {domains} from '../src/domain/content/registry';
import {oralStudies,beginOral,oralId} from '../src/domain/oral/oral';
import {relativeStudies,relativeId} from '../src/domain/relative/relative';
import {preparations,selfReviews,sourceReasons,boundaries} from './fixtures/oral.mjs';
import type {ProductionEntry} from '../src/domain/production/types';
const at=Date.UTC(2026,9,31,8,30);
const oral=()=>beginOral(oralStudies[0],'t1','TEXT',preparations[0],selfReviews[0],sourceReasons[0],boundaries[0],at);
const writing=():ProductionEntry=>({id:'production:SG-P04-001',kind:undefined,itemId:'SG-P04-001',itemVersion:1,createdAt:at-1000,
 original:'Die Stadtverwaltung gab bekannt, dass die Darstellung ergänzt werden müsse.',revisions:[],evaluated:'UNASSESSED'});
test('M36 catalog single source covers G01-G13 with thirty distinct actions and functional labels',()=>{
 assert.equal(STUDIO_LINKS.length,30);
 assert.deepEqual(new Set(STUDIO_LINKS.map(x=>x.domain)),new Set(domains.map(([id])=>id)));
 assert.equal(new Set(STUDIO_LINKS.map(x=>x.action)).size,30);
 assert.ok(STUDIO_LINKS.every(x=>x.today.trim().length>10&&x.curriculum.trim().length>10));
 for(const [id] of domains)assert.ok(linksForDomain(id).length>0);
 assert.equal(STUDIO_LINKS.find(x=>x.action==='onOral')?.today,'Mündliche Stellungnahmen · G12');
 assert.equal(STUDIO_LINKS.find(x=>x.action==='onOral')?.curriculum,'Mündliche Stellungnahmen erproben');
 assert.equal(STUDIO_LINKS.find(x=>x.action==='onRelative')?.domain,'G02');
});
test('M36 recent-work journey uses archive authority and exact immutable source IDs without copying records',()=>{
 const a=oral(),b=writing(),rows=recentWork([b,a]);
 assert.equal(rows.length,2);assert.equal(rows[0].entry,a);assert.equal(rows[0].entry.id,oralId(oralStudies[0].id));
 assert.equal(rows[0].kind,'G12_ORAL');assert.equal(rows[0].scope,'G12');
 assert.equal(rows[1].entry,b);assert.equal(rows[1].kind,'M04');
 assert.equal(archiveKind(a),'G12_ORAL');
 assert.deepEqual(rows.map(r=>r.entry.id),archiveRows([b,a],{kind:'ALL',activity:'ALL',period:'ALL',search:'',now:Date.now()}).map(r=>r.entry.id));
});
test('M36 most recent revision outranks initial creation and stable tie break remains deterministic',()=>{
 const older=writing(),newer=oral();
 const revisions=[{id:'re1',at:at+500,text:'Diese Überarbeitung bleibt unbewertet.',reflection:'Quellenbezug erläutert.'}];
 const changed={...older,revisions};
 assert.deepEqual(recentWork([newer,changed]).map(r=>r.entry.id),[older.id,newer.id]);
 assert.equal(recentWork([newer,changed],1)[0].entry,changed);
 assert.deepEqual(recentWork([newer,changed],0),[]);
 assert.throws(()=>recentWork([newer],-1),/Invalid continuation/);
 assert.throws(()=>recentWork([newer],1.5),/Invalid continuation/);
});
test('M36 domain-linked continuation never guesses a wrong source or fabricates a G12 score',()=>{
 const a=oral(),b=writing(),rows=[b,a];
 assert.equal(recentWorkForDomain(rows,'G12')?.entry.id,oralId(a.itemId));
 assert.equal(recentWorkForDomain(rows,'G04')?.entry.id,b.id);
 assert.equal(recentWorkForDomain(rows,'G02'),null);
 assert.equal(recentWorkForDomain(rows,'G99'),null);
 assert.equal(a.evaluated,'UNASSESSED');
});
test('M36 deleted/missing source data remains findable as historical work, not silently remapped',()=>{
 const historical:ProductionEntry={id:relativeId(relativeStudies[0].id),kind:'RELATIVE_STUDY',itemId:relativeStudies[0].id,
 itemVersion:999,sourceId:relativeStudies[0].id,createdAt:at+500,original:'Historischer eigener Text mit einer nicht mehr lieferbaren Quellenversion.',
 revisions:[],evaluated:'UNASSESSED'};
 const rows=recentWork([historical]);assert.equal(rows.length,1);
 assert.equal(rows[0].entry,historical);assert.equal(rows[0].kind,'G02_RELATIVE');
 assert.equal(rows[0].entry.itemVersion,999);assert.match(rows[0].context,/nicht mehr im Entwurfskatalog/);
});
test('M36 continuation selection is read-only and never modifies eight-store or historical entries',()=>{
 const a=oral(),b=writing(),before=JSON.stringify([a,b]);
 recentWorkForDomain([a,b],'G12');recentWorkForDomain([a,b],'G04');recentWork([a,b],3);
 assert.equal(JSON.stringify([a,b]),before);
 assert.deepEqual(a.revisions,[]);assert.equal(a.original,oral().original);
});
