import test from 'node:test';
import assert from 'node:assert/strict';
import {disclosureStudies,disclosureId,isDisclosureEntry,disclosureSource,independentDisclosure,hasRestricted,beginDisclosure,appendDisclosureDecision,appendAudience,firstDisclosureEvidence,savedDisclosureEvidence,nextDisclosureDecision,latestAudience,disclosureProgress,nextDisclosureStudy} from '../src/domain/disclosure/disclosure.ts';
import {archiveKind,archiveRow,archiveRows} from '../src/domain/archive/archive.ts';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,type BackupRecords} from '../src/persistence/portableBackup.ts';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
import {allItems} from '../src/domain/content/registry.ts';
const s=disclosureStudies[0],at=Date.UTC(2026,9,25,14);
const texts=[
'Ein schriftlicher Einspruch muss binnen vier Wochen nach Zustellung bei der zuständigen Prüfungsverwaltung eingehen; die erste Eingangsbestätigung ist keine Entscheidung zum Gegenstand der Anfechtung.',
'Eine Einsicht in die Prüfungsunterlagen findet nach einer geschützten Terminvereinbarung bei der zuständigen Verwaltung statt, ohne persönliche Gründe öffentlich mitteilen zu müssen.',
'Die Verwaltung teilt das Ergebnis erst nach einer getrennten inhaltlichen Prüfung mit; eine zugesagte positive Entscheidung oder einen festen Nachrichtentermin gibt es bislang nicht.'
];
const actions=[
'Die Verwaltung soll zunächst den fristgerechten Eingang dokumentieren und den eigentlichen Einspruch danach getrennt inhaltlich bewerten.',
'Für die Akteneinsicht müssen vor einem Termin die Berechtigung, ein geschützter Raum und der zuständige Zugang kontrolliert werden.',
'Die verantwortliche Stelle soll die Sachprüfung abschließen und erst danach die Ergebnisnachricht über den dafür vorgesehenen Kontaktweg senden.'
];
const omissions=[
'Individuelle interne Vorgangskennungen sind für eine allgemeine Fristauskunft nicht notwendig und bleiben deshalb außerhalb öffentlich zugänglicher Mitteilungen.',
'Nicht öffentliche Raumbezeichnungen und persönliche Lebensumstände werden weggelassen, weil die allgemein zugängliche Terminregelung ausreicht.',
'Die interne Nummer eines noch offenen Prüfverfahrens ist für die öffentliche Erklärung ohne Bedeutung und darf nicht veröffentlicht werden.'
];
const first=()=>beginDisclosure(s,'d1','A',texts[0],actions[0],omissions[0],at);
const second=(e=first())=>appendDisclosureDecision(e,s,'d2','B',texts[1],actions[1],omissions[1],'d2',at+1);
const third=(e=second())=>appendDisclosureDecision(e,s,'d3','A',texts[2],actions[2],omissions[2],'d3',at+2);
const publicText='Ein schriftlicher Einspruch gegen eine Prüfungsentscheidung muss innerhalb von vier Wochen nach Zustellung bei der Prüfungsverwaltung eingehen. Die zuständige Stelle bestätigt zunächst den Eingang, aber dadurch ist noch nichts über den Ausgang des Einspruchs entschieden. Wer die zugrunde liegenden Prüfungsunterlagen einsehen möchte, vereinbart dafür einen Termin bei der Prüfungsverwaltung. Die Einsicht erfolgt in einem geschützten Raum, ohne dass persönliche Lebensumstände gegenüber der Öffentlichkeit offengelegt werden müssen.\n\nDie inhaltliche Prüfung ist ein eigener Verfahrensschritt. Erst nach ihrem Abschluss erfolgt eine Mitteilung über das Ergebnis. Ein konkreter Zeitpunkt für die Entscheidung wurde nicht zugesagt. Für Rückfragen ist die zuständige Verwaltungsstelle zu kontaktieren. Die allgemeinen Verfahrensinformationen reichen aus; einzelne interne Bearbeitungsbezeichnungen sind für das Publikum nicht erforderlich.';
const internalText='Bei Eingängen gegen Prüfungsentscheidungen sind drei getrennte Bearbeitungsschritte festzuhalten: fristgerechter Eingang, geschützte Akteneinsicht und Sachprüfung. Schriftliche Eingänge werden zunächst auf die Vierwochenfrist ab Zustellung geprüft und dokumentiert. Eine erste Bestätigung des Eingangs darf dabei nicht als Entscheidung über den Einspruch ausgegeben werden. Für Akteneinsicht sollen Berechtigung, Termin und geschützter Zugang über die zuständige Stelle bestätigt werden. Angaben zu privaten Gründen werden außerhalb der dafür autorisierten Bearbeitung nicht weitergegeben.\n\nDie inhaltliche Prüfung muss vollständig abgeschlossen sein, bevor das Ergebnis mitgeteilt wird. Weil kein konkreter Termin feststeht, darf die Koordination weder einen positiven Ausgang noch einen Entscheidungstag versprechen. Die einzelnen Zuständigkeiten sind nachvollziehbar zu dokumentieren, ohne Fallkennungen in allgemeine Mitteilungen zu kopieren.';
const reason='Die Zieltexte bewahren die Frist, die Zugangsregelung und die ausstehende Sachentscheidung. Persönliche interne Kennungen werden nicht wiederholt, weil keine der beiden Kommunikationsaufgaben sie benötigt.';
test('four full original disclosure studies include twelve literal citations, fictional protected tokens and editorial holds',()=>{
 assert.equal(disclosureStudies.length,4);const bands=new Set(),tokens=new Set();
 for(const x of disclosureStudies){bands.add(x.band);assert.match(x.id,/^SG-G13D-\d{3}$/);assert.equal(x.status,'DEMO_ONLY');assert.equal(x.authorship,'AI_DRAFT');assert.equal(x.editorialApproval,false);assert.equal(x.rights.kind,'ORIGINAL_DRAFT');assert.deepEqual(x.audiences.map(a=>a.id),['PUBLIC','INTERNAL']);assert.equal(x.decisions.length,3);assert.equal(x.paragraphs.length,3);
 for(const d of x.decisions){assert.ok(x.paragraphs.find(p=>p.id===d.paragraphId)?.text.includes('„'+d.quote+'“'));assert.ok(!tokens.has(d.restricted));tokens.add(d.restricted);}
 }assert.equal(tokens.size,12);assert.deepEqual([...bands].sort(),['C1','C2']);assert.ok(!allItems.some(x=>x.id.startsWith('SG-G13D')));
});
test('immutable first answer and archive preserve stable source identity and never award a score',()=>{
 const e=first();assert.equal(e.id,disclosureId(s.id));assert.ok(isDisclosureEntry(e));assert.equal(disclosureSource(e)?.id,s.id);assert.equal(e.evaluated,'UNASSESSED');assert.equal(firstDisclosureEvidence(e)?.rewrite,texts[0]);assert.equal(firstDisclosureEvidence(e)?.paragraphId,'p1');assert.equal(archiveKind(e),'G13_DISCLOSURE');assert.equal(archiveRow(e).scope,'G13');assert.equal(firstDisclosureEvidence({...e,sourceId:'wrong'}),null);assert.equal(firstDisclosureEvidence({...e,decisionId:'d1|A|p3'}),null);
});
test('fictional restricted case identifiers must never appear in original explanations or audience texts',()=>{
 const d=s.decisions[0];assert.ok(independentDisclosure(s,d,texts[0],actions[0],omissions[0]));
 assert.ok(!independentDisclosure(s,d,texts[0]+d.restricted,actions[0],omissions[0]));
 assert.ok(!independentDisclosure(s,d,texts[0],actions[0]+d.restricted,omissions[0]));
 assert.ok(!independentDisclosure(s,d,texts[0],actions[0],omissions[0]+d.restricted));
 assert.throws(()=>beginDisclosure(s,'d3','A',texts[0],actions[0],omissions[0],at));
 assert.throws(()=>appendDisclosureDecision(first(),s,'d3','A',texts[2],actions[2],omissions[2],'skip',at+1));
 assert.throws(()=>appendAudience(third(),s,'PUBLIC',publicText+' '+d.restricted,reason,'leak',at+3));
});
test('second and third source explanations preserve first CAS record and exact answer ownership',()=>{
 const a=first(),b=second(a),c=third(b);assert.equal(a.revisions.length,0);assert.equal(b.revisions.length,1);assert.equal(c.revisions.length,2);assert.equal(c.original,a.original);assert.equal(savedDisclosureEvidence(b,s.decisions[1])?.choice,'B');assert.equal(savedDisclosureEvidence(b,s.decisions[1])?.paragraphId,'p2');assert.equal(nextDisclosureDecision(s,c),null);
 assert.throws(()=>appendDisclosureDecision(b,s,'d2','B',texts[1],actions[1],omissions[1],'duplicate',at+4));
});
test('independent audience outputs are appended separately and public revision retains internal original',()=>{
 assert.throws(()=>appendAudience(first(),s,'PUBLIC',publicText,reason,'early',at+2));
 const p=appendAudience(third(),s,'PUBLIC',publicText,reason,'public',at+3);
 assert.equal(latestAudience(p,'INTERNAL'),null);
 const b=appendAudience(p,s,'INTERNAL',internalText,reason,'internal',at+4);
 assert.equal(latestAudience(b,'PUBLIC')?.text,publicText);assert.equal(latestAudience(b,'INTERNAL')?.text,internalText);
 assert.throws(()=>appendAudience(b,s,'PUBLIC',publicText,reason,'identical',at+5));
 const revised=appendAudience(b,s,'PUBLIC',publicText+' Der konkrete Beginn der Frist ist anhand der zugestellten Entscheidung zu klären.',reason,'revision',at+5);
 assert.equal(revised.original,b.original);assert.deepEqual(revised.revisions.slice(0,4),b.revisions);assert.equal(latestAudience(revised,'INTERNAL')?.text,internalText);
 assert.equal(archiveRows([revised],{kind:'G13_DISCLOSURE',activity:'REVISED',period:'ALL',search:'zugestellten Entscheidung',now:at+7}).length,1);
});
test('progress counts source decisions and two audiences, not arbitrary mastery points',()=>{
 assert.deepEqual(disclosureProgress([]),{started:0,decisions:0,audiences:0,revised:0,total:4});
 assert.deepEqual(disclosureProgress([first()]),{started:1,decisions:1,audiences:0,revised:0,total:4});
 assert.deepEqual(disclosureProgress([third()]),{started:1,decisions:3,audiences:0,revised:0,total:4});
 const p=appendAudience(third(),s,'PUBLIC',publicText,reason,'p',at+3);
 assert.equal(disclosureProgress([p]).audiences,1);assert.equal(nextDisclosureStudy([p]).id,s.id);
 const b=appendAudience(p,s,'INTERNAL',internalText,reason,'i',at+4);assert.equal(nextDisclosureStudy([b]).id,disclosureStudies[1].id);assert.equal(disclosureProgress([b]).audiences,2);
});
test('portable backup v3 roundtrips both independently authored audiences with zero leaked synthetic tokens',async()=>{
 const e=appendAudience(appendAudience(third(),s,'PUBLIC',publicText,reason,'p',at+3),s,'INTERNAL',internalText,reason,'i',at+4);
 assert.ok(!hasRestricted(s,e.original+' '+e.revisions.map(r=>r.text+' '+r.reflection).join(' ')));
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[e],missions:[]};
 const json=await buildPortableBackup(records),recovered=await inspectPortableBackup(json);assert.equal(recovered.version,BACKUP_VERSION);assert.deepEqual(recovered.records.productionEntries,records.productionEntries);
 await assert.rejects(()=>inspectPortableBackup(json.replace('Vierwochenfrist','Dreiwochenfrist')),/Integritätsprüfung/);
});
test('original and quote dossier review worklist remains completely unapproved',()=>{
 const rows=collect().filter(x=>x.mode==='G13_DISCLOSURE');assert.equal(rows.length,16);assert.equal(rows.filter(x=>x.type==='G13_ORIGINAL_DISCLOSURE_SOURCE').length,4);assert.equal(rows.filter(x=>x.type==='G13_DISCLOSURE_DECISION').length,12);assert.ok(rows.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
