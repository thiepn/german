import test from 'node:test';
import assert from 'node:assert/strict';
import {preparations,selfReviews,sourceReasons,boundaries,memo,reason,revised} from './fixtures/oral.mjs';
import {oralStudies,oralId,isOralEntry,oralSource,independentOral,beginOral,firstOral,savedOral,nextOral,appendOral,
 appendOralDocument,latestOralDocument,substantialOralRevision,oralProgress,nextOralStudy} from '../src/domain/oral/oral';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,BACKUP_STORES,type BackupRecords} from '../src/persistence/portableBackup';
import {allItems,domains} from '../src/domain/content/registry';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
const source=oralStudies[0],at=Date.UTC(2026,9,30,13);
const start=(mode:'MIC'|'TEXT'='MIC')=>beginOral(source,'t1',mode,preparations[0],selfReviews[0],sourceReasons[0],boundaries[0],at);
const step2=(e=start())=>appendOral(e,source,'t2','TEXT',preparations[1],selfReviews[1],sourceReasons[1],boundaries[1],'t2-01',at+1);
const step3=(e=step2())=>appendOral(e,source,'t3','TEXT',preparations[2],selfReviews[2],sourceReasons[2],boundaries[2],'t3-01',at+2);
const transfer=(e=step3())=>appendOralDocument(e,source,'TRANSFER',memo,reason,'t1','transfer-01',at+3);
test('M35 final V1.0 feature boundary contains all 13 domains and no invented scored G12 data',()=>{
 assert.deepEqual(domains.map(([id])=>id),Array.from({length:13},(_,i)=>'G'+String(i+1).padStart(2,'0')));
 assert.equal(allItems.filter(i=>i.id.startsWith('SG-G12O-')).length,0);
 assert.equal(oralStudies.length,4);
});
test('M35 four original multi-paragraph C1/C2 sources, twelve distinct literal anchors, rights hold',()=>{
 const ids=new Set(),speakers=new Set(),bands=new Set();let count=0;
 for(const s of oralStudies){
  assert.match(s.id,/^SG-G12O-\d{3}$/);assert.ok(!ids.has(s.id));ids.add(s.id);bands.add(s.band);
  assert.equal(s.status,'DEMO_ONLY');assert.equal(s.authorship,'AI_DRAFT');assert.equal(s.reviewedBy,null);assert.equal(s.editorialApproval,false);
  assert.equal(s.rights.kind,'ORIGINAL_DRAFT');assert.equal(s.paragraphs.length,3);assert.equal(s.turns.length,3);
  for(const [i,t] of s.turns.entries()){
   const p=s.paragraphs[i];assert.ok(p.text.length>=900);assert.equal(p.id,t.paragraphId);
   assert.equal(p.text.split('„'+t.quote+'“').length,2);speakers.add(t.speaker);count++;
  }
 }
 assert.deepEqual([...bands].sort(),['C1','C2']);assert.equal(count,12);assert.ok(speakers.size>=10);
});
test('M35 live rehearsal mode records ONLY text and mode as unassessed immutable first evidence',()=>{
 const e=start();assert.equal(e.id,oralId(source.id));assert.ok(isOralEntry(e));assert.equal(oralSource(e)?.id,source.id);
 assert.equal(e.itemVersion,1);assert.equal(e.evaluated,'UNASSESSED');assert.deepEqual(e.revisions,[]);
 assert.equal(firstOral(e)?.mode,'MIC');assert.equal(firstOral(e)?.preparation,preparations[0]);
 assert.ok(!JSON.stringify(e).includes('audio/webm'));assert.ok(!JSON.stringify(e).includes('blob:'));
 assert.equal(archiveKind(e),'G12_ORAL');assert.equal(archiveRow(e).scope,'G12');
 assert.equal(firstOral({...e,sourceId:'changed'}),null);
 assert.equal(firstOral({...e,decisionId:'t1|MIC|p3'}),null);
});
test('M35 text-only accessibility path is supported without claiming recorded audio',()=>{
 const e=start('TEXT');assert.equal(firstOral(e)?.mode,'TEXT');assert.equal(oralProgress([e]).withMic,0);
 assert.equal(oralProgress([start()]).withMic,1);
});
test('M35 reject copied dialogue, duplicated source reasoning, missing evidence, invalid mode and skipped steps',()=>{
 const t=source.turns[0];assert.equal(independentOral(t,preparations[0],selfReviews[0],sourceReasons[0],boundaries[0]),true);
 assert.equal(independentOral(t,preparations[0],preparations[0],sourceReasons[0],boundaries[0]),false);
 assert.equal(independentOral(t,t.quote+' '+preparations[0],selfReviews[0],sourceReasons[0],boundaries[0]),false);
 assert.equal(independentOral(t,preparations[0],selfReviews[0],'zu kurz',boundaries[0]),false);
 assert.throws(()=>beginOral(source,'t2','MIC',preparations[0],selfReviews[0],sourceReasons[0],boundaries[0],at),/fehlen/);
 assert.throws(()=>beginOral(source,'t1','FAKE' as never,preparations[0],selfReviews[0],sourceReasons[0],boundaries[0],at),/fehlen/);
 assert.throws(()=>appendOral(start(),source,'t3','TEXT',preparations[2],selfReviews[2],sourceReasons[2],boundaries[2],'bad',at+1),/Reihenfolge/);
});
test('M35 three source-linked turns append sequentially, preserve original and independent microphone mode',()=>{
 const first=start(),second=step2(first),third=step3(second);
 assert.equal(first.revisions.length,0);assert.equal(second.revisions.length,1);assert.equal(third.revisions.length,2);
 assert.equal(third.original,first.original);
 assert.equal(third.revisions[0].questionId,'ORAL:t2');assert.equal(third.revisions[1].questionId,'ORAL:t3');
 assert.equal(savedOral(second,source.turns[1])?.mode,'TEXT');assert.equal(savedOral(third,source.turns[2])?.sourceReason,sourceReasons[2]);
 assert.equal(nextOral(source,third),null);assert.equal(third.evaluated,'UNASSESSED');
 assert.throws(()=>appendOral(third,source,'t3','MIC',preparations[2],selfReviews[2],sourceReasons[2],boundaries[2],'again',at+4),/Reihenfolge/);
});
test('M35 genuine full-document transfer, substantial audience rewrite and archived version comparison',()=>{
 assert.throws(()=>appendOralDocument(start(),source,'TRANSFER',memo,reason,'t1','early',at+3),/fehlt/);
 assert.throws(()=>appendOralDocument(step3(),source,'REWRITE',memo,reason,'t1','early',at+3),/fehlt/);
 assert.throws(()=>appendOralDocument(step3(),source,'TRANSFER',memo,'kurz','t1','short',at+3),/fehlt/);
 assert.throws(()=>appendOralDocument(step3(),source,'TRANSFER',memo,reason,'unknown','wrong',at+3),/fehlt/);
 const e=transfer();assert.equal(latestOralDocument(e)?.questionId,'TRANSFER');
 assert.equal(substantialOralRevision(memo,memo+' Ein Satz.'),false);
 assert.throws(()=>appendOralDocument(e,source,'REWRITE',memo,reason,'t1','same',at+4),/fehlt/);
 const r=appendOralDocument(e,source,'REWRITE',revised,reason,'t3','rewrite',at+4);
 assert.equal(r.original,e.original);assert.deepEqual(r.revisions.slice(0,3),e.revisions);
 assert.equal(versionPair(r,3)?.previous,memo);
 assert.equal(archiveRows([r],{kind:'G12_ORAL',activity:'REVISED',period:'ALL',search:'Sitzungsprotokoll',now:at+5}).length,1);
});
test('M35 observed-only progress and resume logic do not fabricate oral proficiency scores',()=>{
 assert.deepEqual(oralProgress([]),{started:0,analyses:0,withMic:0,transferred:0,revised:0,total:4});
 assert.deepEqual(oralProgress([start()]),{started:1,analyses:1,withMic:1,transferred:0,revised:0,total:4});
 assert.equal(oralProgress([step3()]).analyses,3);assert.equal(oralProgress([transfer()]).transferred,1);
 assert.equal(nextOralStudy([start()]).id,source.id);assert.equal(nextOralStudy([transfer()]).id,oralStudies[1].id);
 assert.equal(oralProgress([appendOralDocument(transfer(),source,'REWRITE',revised,reason,'t3','rewrite',at+4)]).revised,1);
});
test('M35 existing eight-store backup v3 roundtrip includes text only and detects corruption',async()=>{
 assert.equal(BACKUP_STORES.length,8);assert.equal(BACKUP_VERSION,3);
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const raw=await buildPortableBackup(records),back=await inspectPortableBackup(raw);
 assert.equal(back.version,3);assert.deepEqual(back.records.productionEntries,records.productionEntries);
 assert.equal(raw.includes('"audio"'),false);assert.equal(raw.includes('data:audio'),false);
 const bad=raw.replace('Stadtteilversammlung','Stadtteilversamlung');assert.notEqual(bad,raw);
 await assert.rejects(()=>inspectPortableBackup(bad),/Integritätsprüfung/);
});
test('M35 independent editorial queue retains four full original sources plus twelve oral anchors unapproved',()=>{
 const candidates=collect().filter(x=>x.mode==='G12_ORAL');
 assert.equal(candidates.length,16);
 assert.equal(candidates.filter(x=>x.type==='G12_ORIGINAL_ORAL_SOURCE').length,4);
 assert.equal(candidates.filter(x=>x.type==='G12_SPOKEN_RESPONSE_ANCHOR').length,12);
 assert.ok(candidates.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
