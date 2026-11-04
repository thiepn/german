import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceEntryId,exactSourceForEntry,matchesSourceEntry} from '../src/domain/content/sourceIdentity.ts';
import {relativeStudies,relativeId,isRelativeEntry,relativeSource,nextRelativeStudy,relativeProgress} from '../src/domain/relative/relative.ts';
import {polysemyStudies,polysemyEntryId,isPolysemyEntry,polysemySource,nextPolysemyStudy,polysemyProgress} from '../src/domain/polysemy/polysemy.ts';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive.ts';
import {projectErrors,buildErrorClusters} from '../src/domain/errors/errorProjection.ts';
import {allItems,itemById} from '../src/domain/content/registry.ts';
import {qualifyM41,renderM41} from '../scripts/content/m41Qualification.mjs';
import type {ProductionEntry} from '../src/domain/production/types.ts';
import type {Attempt,Exercise} from '../src/domain/content/types.ts';
const mock=(kind:'RELATIVE_STUDY'|'POLYSEMY_STUDY',id:string,version:number,entryId:string):ProductionEntry=>({
 id:entryId,kind,itemId:id,sourceId:id,itemVersion:version,createdAt:40,original:'Historical immutable text',
 revisions:[{id:'historical-revision',at:50,text:'Unchanged original learner revision',reflection:'Independent reflection'}],
 evaluated:'UNASSESSED'
});
test('M41 legacy v1 entry IDs stay byte-identical, future source versions obtain disjoint keys',()=>{
 assert.equal(relativeId('SG-G02R-002'),'relative:SG-G02R-002');
 assert.equal(polysemyEntryId('SG-G06-002'),'polysemy:SG-G06-002');
 assert.equal(relativeId('SG-G02R-002',2),'relative:SG-G02R-002:v2');
 assert.equal(polysemyEntryId('SG-G06-002',2),'polysemy:SG-G06-002:v2');
 assert.notEqual(relativeId('SG-G02R-002',1),relativeId('SG-G02R-002',2));
 assert.throws(()=>sourceEntryId('relative','../danger',2),/Ungültige/);
 assert.throws(()=>sourceEntryId('relative','SG-G02R-002',0),/Ungültige/);
 assert.throws(()=>sourceEntryId('relative','SG-G02R-002',Number.NaN),/Ungültige/);
});
test('M41 archive never mislabels unsupported v2 as v1 even when item/source IDs agree',()=>{
 const rel=mock('RELATIVE_STUDY','SG-G02R-002',2,relativeId('SG-G02R-002',2));
 const poly=mock('POLYSEMY_STUDY','SG-G06-002',2,polysemyEntryId('SG-G06-002',2));
 for(const [entry,kind,scope] of [[rel,'G02_RELATIVE','G02'],[poly,'G06_POLYSEMY','G06']] as const){
  assert.equal(archiveKind(entry),kind);
  assert.equal(archiveRow(entry).scope,scope);
  assert.match(archiveRow(entry).title,/Historischer Entwurf .* v2/);
  assert.match(archiveRow(entry).context,/Quellenversion nicht verfügbar/);
  assert.equal(versionPair(entry,0)?.previous,entry.original);
  assert.equal(archiveRow(entry).entry.original,entry.original);
 }
 assert.equal(relativeSource(rel),null);assert.equal(polysemySource(poly),null);
 assert.equal(isRelativeEntry(rel),true);assert.equal(isPolysemyEntry(poly),true);
 assert.equal(archiveRows([rel,poly],{kind:'ALL',activity:'ALL',period:'ALL',search:'historical',now:60}).length,2);
});
test('M41 both v1 source records resolve exactly and future-v2 only fake records cannot consume v1 progress',()=>{
 const rs=relativeStudies[0],ps=polysemyStudies[0];
 const a=mock('RELATIVE_STUDY',rs.id,1,relativeId(rs.id)),b=mock('POLYSEMY_STUDY',ps.id,1,polysemyEntryId(ps.id));
 assert.equal(relativeSource(a)?.version,1);assert.equal(polysemySource(b)?.version,1);
 const v2rel={...a,itemVersion:2,id:relativeId(rs.id,2)},v2poly={...b,itemVersion:2,id:polysemyEntryId(ps.id,2)};
 assert.equal(relativeSource(v2rel),null);assert.equal(polysemySource(v2poly),null);
 assert.equal(relativeProgress([v2rel]).started,0);assert.equal(polysemyProgress([v2poly]).started,0);
 assert.equal(nextRelativeStudy([v2rel]).id,relativeStudies[0].id);
 assert.equal(nextPolysemyStudy([v2poly]).id,polysemyStudies[0].id);
 assert.equal(exactSourceForEntry({...a,sourceId:'wrong'},relativeStudies),null);
 assert.equal(isRelativeEntry({...v2rel,id:relativeId(rs.id)}),false);
 assert.equal(isPolysemyEntry({...v2poly,id:polysemyEntryId(ps.id)}),false);
 // Historical legacy-shaped IDs remain discoverable, never misresolved to v1.
 assert.equal(archiveKind({...v2rel,id:relativeId(rs.id)}),'G02_RELATIVE');
 assert.equal(archiveKind({...v2poly,id:polysemyEntryId(ps.id)}),'G06_POLYSEMY');
});
test('M41 old M05 answer and explanation must never come from current same-ID version',()=>{
 const item=allItems.find(x=>x.id==='SG-M05-036')!;
 assert.equal(item.version,1);
 const attempt:Attempt={id:'historical-2',sessionId:'old',itemId:item.id,itemVersion:2,at:5,mode:item.mode,skillId:item.skillId,slots:{collocation:'prüfen'},score:0,correct:false,hinted:false,result:'INCORRECT',variantIndex:null};
 const stale=projectErrors([attempt],itemById);
 assert.equal(stale.length,1);assert.equal(stale[0].item,undefined);
 const v1=projectErrors([{...attempt,itemVersion:1}],itemById);
 assert.equal(v1[0].item?.version,1);
 const current=buildErrorClusters([attempt],itemById);
 assert.equal(current[0].sourceCurrent,false);assert.equal(current[0].repeatItemId,null);
 const sourceV2={...item,version:2} satisfies Exercise;
 const index=new Map([[item.id,sourceV2]]);
 assert.equal(projectErrors([{...attempt,itemVersion:1}],index)[0].item,undefined);
});
test('M41 release inventory covers ALL 38 original demo imports; review packet cannot self-approve',()=>{
 const r=qualifyM41();
 assert.equal(r.sourceCount,38);assert.equal(r.sourceFiles,32);
 assert.equal(r.stagedRevisions.length,4);assert.equal(r.originalCaseCount,26);
 assert.ok(r.domains.some((x:any)=>x.domain==='G02'));
 assert.ok(r.domains.some((x:any)=>x.domain==='G06'));
 assert.ok(r.domains.some((x:any)=>x.domain==='G10'));
 assert.ok(r.domains.every((x:any)=>x.releaseDecision==='NO_GO'&&!x.rightsApproved));
 assert.equal(r.release,'NO_GO');assert.equal(r.privateAlpha,'NO_GO');
 const markdown=renderM41(r);assert.match(markdown,/CEFR descriptor/);
 assert.match(markdown,/NOT verified|NOT adjudicated/i);
 assert.throws(()=>qualifyM41({approved:[{id:'fake'}]}),/approval\/manifest/);
});
