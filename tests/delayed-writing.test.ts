import test from 'node:test';
import assert from 'node:assert/strict';
import type {ProductionEntry,ProductionRevision} from '../src/domain/production/types';
import {referenceStudies} from '../src/domain/reference/reference';
import {definitionStudies} from '../src/domain/definition/definition';
import {disclosureStudies} from '../src/domain/disclosure/disclosure';
import {delayedWritingSummary,candidateFor,saveColdRecall,saveSourceRepair,DELAYED_KINDS} from '../src/domain/journey/delayedWriting';
const DAY=86400000,at=Date.UTC(2026,9,1,12);
const passage='Eine Fachfrau von außerhalb prüft einen Bericht. Ihre vorbereitende Aussage betrifft nur die geprüften Anträge und erlaubt keine allgemeine Behauptung über die vollständige Freigabe.';
function saved(kind='REFERENCE_STUDY'):ProductionEntry{
 const s=kind==='DEFINITION_STUDY'?definitionStudies[0]:kind==='DISCLOSURE_STUDY'?disclosureStudies[0]:referenceStudies[0];
 const q=kind==='DISCLOSURE_STUDY'?'AUDIENCE:PUBLIC':'TRANSFER',prefix=kind==='DEFINITION_STUDY'?'definition:':kind==='DISCLOSURE_STUDY'?'disclosure:':'reference:';
 const r:ProductionRevision={id:'transfer-1',at,text:passage,reflection:'Quellenhinweis',questionId:q,paragraphId:s.paragraphs[0].id};
 return {id:prefix+s.id,kind:kind as ProductionEntry['kind'],itemId:s.id,itemVersion:s.version,sourceId:s.id,decisionId:'d1|A|p1',createdAt:at-DAY,original:'Unveränderliche erste Quellenanalyse',revisions:[r],evaluated:'UNASSESSED'};
}
const reconstructed='Die Fachfrau arbeitete mit einem begrenzten Auftrag. Sie überprüfte einige Unterlagen und stellte fest, dass sie vermutlich zur Entscheidung über den gesamten Vorgang berechtigt gewesen sei. Die Aussage ist in ihrem Umfang aber weiter unklar und muss mit der Quelle abgeglichen werden.';
const uncertainty='Es ist unsicher, ob die Stellungnahme tatsächlich eine allgemeine Freigabe erlaubt oder nur begrenzte Prüfergebnisse wiedergibt.';
const corrected='Die beauftragte Fachfrau prüfte ausschließlich die genannten Anträge und legte dazu eine vorbereitende Einschätzung vor. Die Quelle stützt keine abschließende Freigabe weiterer Vorgänge; eine solche Entscheidung bleibt von dem dokumentierten Prüfauftrag zu unterscheiden.';
const reason='Im Ausgangsabsatz wird nur der konkrete Prüfauftrag beschrieben. Die Erinnerung hat diesen begrenzten Befund unzulässig zu einer generellen Freigabe erweitert; die korrigierte Fassung grenzt den Geltungsbereich ausdrücklich ab.';
test('delayed review cannot begin on the same day or before 24h, and first draft is immutable',()=>{
 const e=saved(),original=JSON.stringify(e);
 assert.equal(delayedWritingSummary(at+DAY-1,[e]).due,0);
 const s=delayedWritingSummary(at+DAY,[e]);assert.equal(s.due,1);assert.equal(s.selected?.round,1);
 assert.equal(JSON.stringify(e),original);
 assert.deepEqual(new Set(DELAYED_KINDS).size,6);
 assert.throws(()=>saveColdRecall(e,s.selected!,reconstructed,uncertainty,'early',at+DAY-1),/fälliger Abruf/);
});
test('cold reconstruction stays separate from source-based correction and requires genuine new text',()=>{
 const e=saved(),c=delayedWritingSummary(at+DAY,[e]).selected!;
 assert.throws(()=>saveColdRecall(e,c,passage,uncertainty,'duplicate',at+DAY),/ungestützter/);
 let after=saveColdRecall(e,c,reconstructed,uncertainty,'cold-1',at+DAY);
 assert.equal(after.original,e.original);assert.equal(after.revisions.length,2);
 const state=delayedWritingSummary(at+DAY,[after]);assert.equal(state.pending,1);assert.equal(state.due,0);assert.equal(state.selected?.baseline.id,'transfer-1');
 assert.throws(()=>saveColdRecall(after,state.selected!,reconstructed,uncertainty,'again',at+DAY),/ungestützter/);
 assert.throws(()=>saveSourceRepair(after,state.selected!,reconstructed,reason,'p1','repair',at+DAY),/Quellenbeleg/);
 assert.throws(()=>saveSourceRepair(after,state.selected!,reconstructed+' Eine völlig kleine Änderung.',reason,'p1','too-small',at+DAY),/Quellenbeleg/);
 assert.throws(()=>saveSourceRepair(after,state.selected!,corrected,reason,'not-a-paragraph','repair',at+DAY),/Quellenbeleg/);
 after=saveSourceRepair(after,state.selected!,corrected,reason,referenceStudies[0].paragraphs[0].id,'repair-1',at+DAY+1);
 assert.equal(delayedWritingSummary(at+DAY+1,[after]).finished,1);
 assert.equal(after.revisions[1].text,reconstructed);assert.equal(after.revisions[2].paragraphId,referenceStudies[0].paragraphs[0].id);
 assert.equal(after.revisions[0].text,e.revisions[0].text);
});
test('fixed 7d and 21d follow-ups are not mistaken for proven retention',()=>{
 let e=saved(),c=delayedWritingSummary(at+DAY,[e]).selected!;
 e=saveColdRecall(e,c,reconstructed,uncertainty,'c1',at+DAY);
 c=delayedWritingSummary(at+DAY,[e]).selected!;
 e=saveSourceRepair(e,c,corrected,reason,referenceStudies[0].paragraphs[0].id,'r1',at+DAY+1);
 assert.equal(delayedWritingSummary(at+DAY+1+7*DAY-1,[e]).due,0);
 c=delayedWritingSummary(at+DAY+1+7*DAY,[e]).selected!;assert.equal(c.round,2);
 e=saveColdRecall(e,c,reconstructed+' Der konkrete Rechtsakt ist mir unklar.',uncertainty,'c2',at+DAY+1+7*DAY);
 c=delayedWritingSummary(at+DAY+1+7*DAY,[e]).selected!;
 e=saveSourceRepair(e,c,corrected+' Die Zuständigkeit für spätere Fälle ist dadurch ebenfalls nicht festgelegt.',reason,referenceStudies[0].paragraphs[0].id,'r2',at+DAY+2+7*DAY);
 assert.equal(delayedWritingSummary(at+DAY+2+7*DAY+21*DAY-1,[e]).due,0);
 assert.equal(delayedWritingSummary(at+DAY+2+28*DAY,[e]).selected?.round,3);
});
test('wrong-version, foreign source id and absent transfer never become a due review',()=>{
 const e=saved();assert.equal(delayedWritingSummary(at+2*DAY,[{...e,itemVersion:99}]).selected,null);
 assert.equal(delayedWritingSummary(at+2*DAY,[{...e,sourceId:'another'}]).selected,null);
 assert.equal(delayedWritingSummary(at+2*DAY,[{...e,revisions:[]}]).selected,null);
});
test('G13 audience writing is recognized; previously unreviewed versions and different tracks stay separate',()=>{
 const e=saved('DISCLOSURE_STUDY');
 assert.equal(delayedWritingSummary(at+DAY,[e]).selected?.row.kind,'G13_DISCLOSURE');
 const dc=delayedWritingSummary(at+DAY,[e]).selected!;
 assert.throws(()=>saveColdRecall(e,dc,reconstructed+' '+disclosureStudies[0].decisions[0].restricted,uncertainty,'restricted',at+DAY),/ungestützter/);
 const d=saved('DEFINITION_STUDY');
 const summary=delayedWritingSummary(at+DAY,[e,d]);assert.equal(summary.due,2);
 assert.equal(candidateFor(d,at+DAY)?.candidate?.row.kind,'G06_DEFINITION');
});
test('stale candidate, duplicate IDs and invalid correction are rejected without mutating revisions',()=>{
 const e=saved(),c=delayedWritingSummary(at+DAY,[e]).selected!,original=JSON.stringify(e);
 const a=saveColdRecall(e,c,reconstructed,uncertainty,'unique',at+DAY);
 assert.throws(()=>saveColdRecall(a,c,reconstructed,uncertainty,'not-current',at+DAY),/ungestützter/);
 const pending=delayedWritingSummary(at+DAY,[a]).selected!;
 assert.throws(()=>saveSourceRepair(a,pending,corrected,reason,referenceStudies[0].paragraphs[0].id,'unique',at+DAY+1),/Quellenbeleg/);
 assert.equal(JSON.stringify(e),original);
});
