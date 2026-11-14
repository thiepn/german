import test from 'node:test';
import assert from 'node:assert/strict';
import {registerStudies,registerId,registerSource,independentRegister,beginRegister,firstRegister,registerStage,appendRegister,registerProgress} from '../src/domain/register/register';
import {archiveRows} from '../src/domain/archive/archive';
const prose=(suffix:string)=>('Wir benennen die nachweisbare Einschränkung ausdrücklich und vermeiden zugleich eine unbelegte Zusage. Die Entscheidung über den nächsten Schritt bleibt bei den Betroffenen. '+suffix+' ').repeat(3)+'\n\n'+'Wir schlagen eine konkret begrenzte Rückmeldung vor, ohne die Sachlage zu verharmlosen oder einzelne Personen zu beschuldigen. '.repeat(3);
const why='Die Quellenstelle enthält eine relevante Verantwortungszuschreibung. Ich korrigiere die unzulässige Implikation und begrenze die angebotene Alternative ausdrücklich auf das nachweislich Mögliche.';
test('all four source anchors are exact and editorial gates remain closed',()=>{
 assert.equal(registerStudies.length,4);
 for(const s of registerStudies){assert.equal(s.paragraphs.length,3);assert.ok(s.paragraphs.find(p=>p.id===s.anchor.paragraphId)?.text.includes(s.anchor.quote));assert.equal(s.status,'DEMO_ONLY');assert.equal(s.editorialApproval,false);assert.equal(s.reviewedBy,null);assert.equal(s.rights.kind,'ORIGINAL_DRAFT');}
});
test('first, transfer, multiple revisions, archive and immutable initial evidence',()=>{
 const s=registerStudies[0],first=beginRegister(s,prose('Anfang'),why,1000);
 assert.equal(first.id,registerId(s.id));assert.equal(registerSource(first)?.id,s.id);assert.equal(registerStage(first),'TRANSFER');assert.ok(firstRegister(first));
 const transfer=appendRegister(first,s,'TRANSFER',prose('Andere Adressaten'),why,'r1',1001);
 const revised=appendRegister(transfer,s,'REWRITE',prose('Konkrete Korrektur'),why,'r2',1002);
 assert.equal(registerStage(revised),'REWRITE');assert.equal(revised.original,first.original);assert.equal(revised.revisions.length,2);
 assert.equal(registerProgress([revised]).revised,1);
 assert.equal(archiveRows([revised],{kind:'G08_REGISTER_RESPONSIBILITY',activity:'REVISED',period:'ALL',search:'Konkrete Korrektur',now:1003}).length,1);
 assert.throws(()=>appendRegister(revised,s,'REWRITE',prose('Konkrete Korrektur'),why,'r3',1003));
});
test('reject missing anchor, copied source, shallow output, wrong stage and stale source',()=>{
 const s=registerStudies[1],p=prose('Neuer Text');
 assert.equal(independentRegister(s,s.anchor.quote+'\n\n'+p,why),false);
 assert.equal(independentRegister(s,'Kurz.',why),false);
 assert.throws(()=>beginRegister(s,p,'kurz',1));
 const first=beginRegister(s,p,why,1);
 assert.throws(()=>appendRegister(first,s,'REWRITE',prose('Revision'),why,'r',2));
 assert.throws(()=>appendRegister({...first,sourceId:'other'},s,'TRANSFER',prose('Neu'),why,'r',2));
 assert.throws(()=>appendRegister(first,s,'TRANSFER',p,why,'r',2));
 assert.equal(firstRegister({...first,decisionId:'invalid'}),null);
});
