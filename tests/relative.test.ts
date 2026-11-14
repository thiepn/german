import test from 'node:test';
import assert from 'node:assert/strict';
import {transformations,counterreadings,syntaxEvidences,boundaries,memo,reason,revised} from './fixtures/relative.mjs';
import {relativeStudies,relativeId,isRelativeEntry,relativeSource,independentRelative,beginRelative,firstRelative,savedRelative,nextRelative,appendRelative,appendRelativeMemo,latestRelativeMemo,substantialRelativeRevision,relativeProgress,nextRelativeStudy} from '../src/domain/relative/relative';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,BACKUP_STORES,type BackupRecords} from '../src/persistence/portableBackup';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry';
const study=relativeStudies[0],at=Date.UTC(2026,9,30,10);
const first=()=>beginRelative(study,'r1','A',transformations[0],counterreadings[0],syntaxEvidences[0],boundaries[0],at);
const second=(e=first())=>appendRelative(e,study,'r2','B',transformations[1],counterreadings[1],syntaxEvidences[1],boundaries[1],'case-r2',at+1);
const third=(e=second())=>appendRelative(e,study,'r3','A',transformations[2],counterreadings[2],syntaxEvidences[2],boundaries[2],'case-r3',at+2);
const transfer=(e=third())=>appendRelativeMemo(e,study,'TRANSFER',memo,reason,'r1','memo1',at+3);
test('M34 four complete C1/C2 source dossiers with twelve distinct literal anchors and closed editorial rights',()=>{
 assert.equal(relativeStudies.length,4);
 const ids=new Set<string>(),roles=new Set<string>(),bands=new Set<string>();let n=0,b=0;
 for(const s of relativeStudies){
  assert.match(s.id,/^SG-G02R-\d{3}$/);assert.equal(ids.has(s.id),false);ids.add(s.id);bands.add(s.band);
  assert.equal(s.version,1);assert.equal(s.status,'DEMO_ONLY');assert.equal(s.authorship,'AI_DRAFT');assert.equal(s.reviewedBy,null);assert.equal(s.editorialApproval,false);assert.equal(s.rights.kind,'ORIGINAL_DRAFT');
  assert.equal(s.paragraphs.length,3);assert.equal(s.anchors.length,3);
  for(const [i,a] of s.anchors.entries()){
   const p=s.paragraphs[i];assert.ok(p.text.length>=830);assert.equal(a.paragraphId,p.id);assert.equal(p.text.split('„'+a.quote+'“').length,2);
   assert.equal(a.options.length,2);assert.notEqual(a.options[0].text,a.options[1].text);roles.add(a.phenomenon);n++;if(a.preferredId==='B')b++;
  }
 }
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.equal(n,12);assert.equal(roles.size,12);assert.equal(b,6);
 assert.equal(allItems.filter(item=>item.id.startsWith('SG-G02R-')).length,0);
});
test('M34 first independent transformation is immutable, source-bound, unassessed and classified G02',()=>{
 const e=first();assert.equal(e.id,relativeId(study.id));assert.ok(isRelativeEntry(e));assert.equal(relativeSource(e)?.id,study.id);
 assert.equal(e.itemVersion,1);assert.equal(e.evaluated,'UNASSESSED');assert.deepEqual(e.revisions,[]);
 assert.equal(firstRelative(e)?.transformation,transformations[0]);assert.equal(firstRelative(e)?.choice,'A');assert.equal(firstRelative(e)?.paragraphId,'p1');
 assert.equal(archiveKind(e),'G02_RELATIVE');assert.equal(archiveRow(e).scope,'G02');
 assert.equal(firstRelative({...e,sourceId:'wrong'}),null);assert.equal(firstRelative({...e,decisionId:'r1|A|p2'}),null);
});
test('M34 copied source, collapsed responses, invalid case choice, short syntax reasoning and out-of-order anchors are rejected',()=>{
 const p=study.anchors[0];assert.equal(independentRelative(p,transformations[0],counterreadings[0],syntaxEvidences[0],boundaries[0]),true);
 assert.equal(independentRelative(p,transformations[0],transformations[0],syntaxEvidences[0],boundaries[0]),false);
 assert.equal(independentRelative(p,p.quote+' '+transformations[0],counterreadings[0],syntaxEvidences[0],boundaries[0]),false);
 assert.equal(independentRelative(p,transformations[0],counterreadings[0],'zu kurz',boundaries[0]),false);
 assert.throws(()=>beginRelative(study,'r2','B',transformations[0],counterreadings[0],syntaxEvidences[0],boundaries[0],at),/erforderlich/);
 assert.throws(()=>beginRelative(study,'r1','X' as never,transformations[0],counterreadings[0],syntaxEvidences[0],boundaries[0],at),/erforderlich/);
 assert.throws(()=>appendRelative(first(),study,'r3','A',transformations[2],counterreadings[2],syntaxEvidences[2],boundaries[2],'skip',at+1),/Reihenfolge/);
});
test('M34 three relative-case analyses retain immutable first response, append-only evidence and unpreferred interpretations without grading',()=>{
 const a=first(),b=second(a),c=third(b);
 assert.equal(a.revisions.length,0);assert.equal(b.revisions.length,1);assert.equal(c.revisions.length,2);assert.equal(c.original,a.original);
 assert.equal(c.revisions[0].questionId,'RELATIVE:r2');assert.equal(c.revisions[1].questionId,'RELATIVE:r3');
 assert.equal(savedRelative(b,study.anchors[1])?.choice,'B');assert.equal(savedRelative(c,study.anchors[2])?.syntaxEvidence,syntaxEvidences[2]);assert.equal(nextRelative(study,c),null);
 assert.equal(c.evaluated,'UNASSESSED');
 assert.throws(()=>appendRelative(c,study,'r3','A',transformations[2],counterreadings[2],syntaxEvidences[2],boundaries[2],'duplicate',at+4),/Reihenfolge/);
 const other=beginRelative(study,'r1','B',transformations[0],counterreadings[0],syntaxEvidences[0],boundaries[0],at);
 assert.equal(firstRelative(other)?.choice,'B');assert.equal(other.evaluated,'UNASSESSED');
});
test('M34 multi-paragraph independent case report and meaningful revision preserve original and source boundaries',()=>{
 assert.throws(()=>appendRelativeMemo(first(),study,'TRANSFER',memo,reason,'r1','premature',at+3),/fehlt/);
 assert.throws(()=>appendRelativeMemo(third(),study,'REWRITE',memo,reason,'r1','premature',at+3),/fehlt/);
 assert.throws(()=>appendRelativeMemo(third(),study,'TRANSFER',memo,'Zu kurz','r1','reason',at+3),/fehlt/);
 assert.throws(()=>appendRelativeMemo(third(),study,'TRANSFER',memo,reason,'unknown','anchor',at+3),/fehlt/);
 const e=transfer();assert.equal(latestRelativeMemo(e)?.questionId,'TRANSFER');assert.equal(substantialRelativeRevision(memo,memo+' Ein Wort.'),false);
 assert.throws(()=>appendRelativeMemo(e,study,'REWRITE',memo,reason,'r1','same',at+4),/fehlt/);
 const r=appendRelativeMemo(e,study,'REWRITE',revised,reason,'r3','rewrite',at+4);
 assert.equal(r.original,e.original);assert.deepEqual(r.revisions.slice(0,3),e.revisions);
 assert.equal(versionPair(r,3)?.previous,memo);assert.equal(latestRelativeMemo(r)?.paragraphId,'p3');
 assert.equal(archiveRows([r],{kind:'G02_RELATIVE',activity:'REVISED',period:'ALL',search:'Bürgerinformation',now:at+5}).length,1);
});
test('M34 progress and next source record actual writing, transfer and revision without CEFR grade',()=>{
 assert.deepEqual(relativeProgress([]),{started:0,analyses:0,transferred:0,revised:0,total:4});
 assert.deepEqual(relativeProgress([first()]),{started:1,analyses:1,transferred:0,revised:0,total:4});
 assert.equal(relativeProgress([third()]).analyses,3);assert.equal(relativeProgress([transfer()]).transferred,1);
 assert.equal(nextRelativeStudy([first()]).id,study.id);assert.equal(nextRelativeStudy([transfer()]).id,relativeStudies[1].id);
 const r=appendRelativeMemo(transfer(),study,'REWRITE',revised,reason,'r3','rev',at+4);assert.equal(relativeProgress([r]).revised,1);
});
test('M34 canonical portable backup v3 restores G02 source evidence across eight stores and detects tampering',async()=>{
 assert.equal(BACKUP_STORES.length,8);assert.equal(BACKUP_VERSION,3);
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const raw=await buildPortableBackup(records),restored=await inspectPortableBackup(raw);
 assert.equal(restored.version,3);assert.deepEqual(restored.records.productionEntries,records.productionEntries);
 const broken=raw.replace('Die Kommission bekam','Die Kommission stahl');assert.notEqual(broken,raw);
 await assert.rejects(()=>inspectPortableBackup(broken),/Integritätsprüfung/);
});
test('M34 editorial queue retains four unapproved sources and twelve distinct case anchors',()=>{
 const rows=collect().filter(x=>x.mode==='G02_RELATIVE');assert.equal(rows.length,16);
 assert.equal(rows.filter(x=>x.type==='G02_ORIGINAL_RELATIVE_SOURCE').length,4);
 assert.equal(rows.filter(x=>x.type==='G02_RELATIVE_CASE_ANCHOR').length,12);
 assert.ok(rows.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
