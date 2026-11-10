
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateM43,renderM43} from '../scripts/editorial/m43Review.mjs';
import {validateM38} from '../scripts/editorial/m38Qualification.mjs';
import {validateM42} from '../scripts/editorial/m42Review.mjs';
import {attachmentStudies,attachmentSource} from '../src/domain/attachment/attachment.ts';
import {archiveKind,archiveRow} from '../src/domain/archive/archive.ts';
import type {ProductionEntry} from '../src/domain/production/types.ts';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
test('M43 one inactive G03 v2 changes only four explanatory fields, never source, quote or original key',()=>{
 const r=validateM43(),c=read('content/editorial/m43-versioned-drafts.json').cases[0];
 assert.equal(r.status,'PASS_AUTHOR_STRUCTURAL_ONLY');assert.equal(r.release,'NO_GO');
 assert.equal(r.sample.length,26);assert.equal(r.priorM38,4);assert.equal(r.priorM42,13);
 const v1=read(c.source).find((s:any)=>s.id===c.id&&s.version===1);
 assert.deepEqual(c.legacyV1,v1);assert.equal(c.draftV2.version,2);
 assert.equal(v1.attachments[0].preferredId,'B');assert.equal(c.draftV2.attachments[0].preferredId,'B');
 assert.deepEqual(c.draftV2.paragraphs,v1.paragraphs);assert.equal(c.draftV2.attachments[0].quote,v1.attachments[0].quote);
 assert.ok(c.draftV2.attachments[0].model.includes('adverbial')&&c.draftV2.attachments[0].model.includes('attributiv'));
 assert.equal(read(c.source).some((s:any)=>s.id===c.id&&s.version===2),false);
 assert.equal(validateM38().corrections.length,4);assert.equal(validateM42().newDrafts,11);
});
test('M43 concise independent review packet has 26 cases, all M38/M42 proposals and 15 release source groups',()=>{
 const r=validateM43(),md=renderM43(r);
 assert.equal(r.sample.length,26);assert.equal(new Set(r.sample.map((c:any)=>c.id)).size,26);
 assert.equal(r.priorities.length,4);assert.equal(r.groups.length,15);
 assert.equal(r.groups.reduce((n:number,g:any)=>n+g.imports,0),38);
 assert.equal(r.groups.filter((g:any)=>/^G(?:0[1-9]|1[0-3])$/.test(g.group)).length,13);
 assert.ok(r.groups.some((g:any)=>g.group==='M01–M07')&&r.groups.some((g:any)=>g.group==='UNMAPPED_HOLD'));
 assert.ok(md.includes('SG-G07-003:d1')&&md.includes('SG-G03A-002:a1'));
 assert.ok(md.includes('Reviewer')||md.includes('reviewer'));
 assert.match(md,/Official CEFR/);assert.match(md,/NO_GO/);
 assert.equal(r.rights,'NOT_VERIFIED');assert.equal(r.cefr,'NOT_CALIBRATED');
});
test('M43 retains source-version 1 archive and learner entry without activating proposed v2',()=>{
 const s=attachmentStudies.find(x=>x.id==='SG-G03A-002')!;
 assert.equal(s.version,1);
 const e:ProductionEntry={id:'attachment:'+s.id,itemId:s.id,itemVersion:1,kind:'ATTACHMENT_STUDY',sourceId:s.id,
  createdAt:10,original:'Original learner text',revisions:[],evaluated:'UNASSESSED'};
 assert.equal(attachmentSource(e)?.version,1);assert.equal(archiveKind(e),'G03_ATTACHMENT');
 assert.equal(archiveRow(e).entry.original,e.original);assert.equal(attachmentStudies.some(s=>s.version!==1),false);
});
test('M43 rejects fabricated human approval, altered previous text and unreviewed patch scope',()=>{
 const original=read('content/editorial/m43-versioned-drafts.json'),before=JSON.stringify(original);
 function bad(change:(p:any)=>void){const p=structuredClone(original);change(p);assert.throws(()=>validateM43({load:(path:string)=>path==='content/editorial/m43-versioned-drafts.json'?p:read(path)}),/M43 REVIEW_HOLD/);}
 bad(p=>p.independentApproval=true);bad(p=>p.rightsApproval=true);bad(p=>p.cefrCalibration=true);
 bad(p=>p.cases[0].legacyV1.paragraphs[0].text='Tampered');
 bad(p=>p.cases[0].draftV2.attachments[1].preferredId='B');
 bad(p=>p.cases[0].operations[0].to=p.cases[0].operations[0].from);
 assert.equal(JSON.stringify(read('content/editorial/m43-versioned-drafts.json')),before);
});
