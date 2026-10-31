import test from 'node:test';
import assert from 'node:assert/strict';
import {scopeStudies,scopeId,isScopeEntry,scopeSource,independentScope,beginScope,firstScopeEvidence,appendScopeEvidence,savedScopeEvidence,nextScope,latestScopeDocument,appendScopeDocument,substantialScopeRevision,scopeProgress,nextScopeStudy} from '../src/domain/scope/scope';
import {archiveKind,archiveRow,archiveRows,versionPair} from '../src/domain/archive/archive';
import {buildPortableBackup,inspectPortableBackup,BACKUP_VERSION,BACKUP_STORES,type BackupRecords} from '../src/persistence/portableBackup';
import {collect} from '../scripts/editorial/reviewQueue.mjs';
const s=scopeStudies[0],at=Date.UTC(2026,9,29,8);
const interpretations=[
 'Der Bericht verneint, dass die Präsentation ausnahmslos auf sämtliche geförderten Projekte zutrifft. Einige Projekte können durchaus vorgestellt worden sein, andere dagegen nicht.',
 'Die Partikel nur begrenzt die Veröffentlichung auf Fälle mit vorheriger schriftlicher Rückmeldung. Eine Rückmeldung macht den folgenden Schritt aber nicht automatisch zwingend.',
 'Die Partikel auch nimmt Vereine zusätzlich in den Kreis jener auf, die eine Korrektur vorschlagen dürfen. Die zuvor beteiligten Personen bleiben dennoch eingeschlossen.'
];
const boundaries=[
 'Man darf aus dieser Quellenformulierung weder den vollständigen Ausfall aller Veranstaltungen noch die Behauptung ableiten, jedes Projekt habe seine Arbeit bereits öffentlich gezeigt.',
 'Die Formulierung liefert keinen hinreichenden Auslöser für eine automatische Freigabe. Weitere Prüfungen dürfen stattfinden, ohne dem Satz über die notwendige Bedingung zu widersprechen.',
 'Die neue Erwähnung macht das Vorschlagsrecht nicht exklusiv für Vereine. Außerdem bleibt die Annahme einer zwingenden Übernahme ihrer Anregungen sprachlich unberechtigt.'
];
const examples=[
 'Eine Initiative hat ihre Arbeit auf einer Bühne präsentiert und eine andere musste den Termin absagen. Genau diese Verteilung passt zur Negation der Gesamtbehauptung.',
 'Nach einer fristgerechten schriftlichen Rückmeldung lässt die Geschäftsstelle den Entwurf weiterhin ruhen, weil eine ungeklärte Bildfreigabe aussteht. Der nur-Satz bleibt trotzdem wahr.',
 'Eine Vertreterin des Redaktionsteams und ein Mitglied eines Vereins schicken jeweils einen Vorschlag. Beide werden geprüft, aber eine Anregung wird aus sachlichen Gründen nicht übernommen.'
];
const memo='Der fiktive Förderbericht ist für die öffentliche Kommunikation nur dann geeignet, wenn seine sprachlichen Einschränkungen unverändert bleiben. Der erste Satz nimmt den Gesamtheitsanspruch zurück: Er sagt nicht, dass sämtliche Projekte ohne Vorstellung geblieben seien. Die Formulierung erlaubt mindestens einen abweichenden Fall, gibt aber keine genaue Zahl vor. Eine Schlagzeile über einen vollständigen Ausfall würde diesen Unterschied unzulässig tilgen. Bei der Veröffentlichungsregel steht das einschränkende Wort vor der notwendigen Voraussetzung. Es darf deshalb nicht als verbindliche Zusage ausgegeben werden, dass eine Rückmeldung allein zur unmittelbaren Freigabe führt.\n\nIm weiteren Teil erweitert das Wort auch den Kreis der zur Korrekturanregung berechtigten Personen. Es nimmt vorhandenen Beteiligten ihr Mitspracherecht gerade nicht weg und verleiht den neuen Vorschlägen keine automatische Entscheidungskraft. Eine kurze Informationsfassung sollte diese drei logischen Grenzen nacheinander erläutern: kein vollständiger Ausfall, keine hinreichende Freigabebedingung und kein exklusives Korrekturrecht. Dadurch kann die lokale Öffentlichkeit den tatsächlichen Sachstand erkennen, ohne vermeintliche Zusagen oder Verbote in den Bericht hineinzulesen.';
const why='Ich habe die Reichweite der Negation und den Unterschied zwischen notwendiger und hinreichender Bedingung ausdrücklich erklärt. Die additive Formulierung bleibt als Erweiterung des Adressatenkreises erhalten.';
const revised=memo+'\n\nFür den Presseverteiler wird zusätzlich klargestellt, dass einzelne öffentliche Präsentationen stattgefunden haben und der Terminplan weiterhin differenziert geprüft werden muss. Bereits vorhandene Korrekturrechte werden nicht beschnitten; neue Vorschläge werden im üblichen Verfahren nachvollziehbar gesichtet. Diese Formulierung verhindert unzutreffende pauschale Schlagzeilen und erklärt die begrenzten Zuständigkeiten verständlich.';
const begin=()=>beginScope(s,'s1','B',interpretations[0],boundaries[0],examples[0],at);
const second=(e=begin())=>appendScopeEvidence(e,s,'s2','A',interpretations[1],boundaries[1],examples[1],'rev2',at+1);
const third=(e=second())=>appendScopeEvidence(e,s,'s3','B',interpretations[2],boundaries[2],examples[2],'rev3',at+2);
const transfer=(e=third())=>appendScopeDocument(e,s,'TRANSFER',memo,why,'s1','memo',at+3);
test('M30 four original multi-paragraph C1/C2 sources, twelve literal focus/negation anchors and rights gates',()=>{
 assert.equal(scopeStudies.length,4);const ids=new Set<string>(),bands=new Set<string>(),particles=new Set<string>();let count=0;
 for(const x of scopeStudies){
  assert.match(x.id,/^SG-G04S-\d{3}$/);assert.equal(ids.has(x.id),false);ids.add(x.id);bands.add(x.band);
  assert.equal(x.status,'DEMO_ONLY');assert.equal(x.authorship,'AI_DRAFT');assert.equal(x.reviewedBy,null);assert.equal(x.editorialApproval,false);assert.equal(x.rights.kind,'ORIGINAL_DRAFT');
  assert.equal(x.paragraphs.length,3);assert.equal(x.scopes.length,3);
  for(const [i,q] of x.scopes.entries()){
   assert.equal(x.paragraphs[i].id,q.paragraphId);assert.ok(x.paragraphs[i].text.length>=650);
   assert.equal(x.paragraphs[i].text.split('„'+q.quote+'“').length,2);assert.equal(q.options.length,2);
   particles.add(q.particle);count++;
  }
 }assert.deepEqual([...bands].sort(),['C1','C2']);assert.equal(count,12);assert.ok(particles.size>=10);
});
test('first persisted writing is ungraded, source-bound and immutable in its object shape',()=>{
 const e=begin();assert.equal(e.id,scopeId(s.id));assert.ok(isScopeEntry(e));assert.equal(scopeSource(e)?.id,s.id);
 assert.equal(e.evaluated,'UNASSESSED');assert.equal(e.revisions.length,0);assert.equal(firstScopeEvidence(e)?.choice,'B');
 assert.equal(firstScopeEvidence(e)?.paragraphId,'p1');assert.equal(archiveKind(e),'G04_SCOPE');assert.equal(archiveRow(e).scope,'G04');
 assert.equal(firstScopeEvidence({...e,sourceId:'missing'}),null);assert.equal(firstScopeEvidence({...e,decisionId:'s1|A|p2'}),null);
});
test('independent analysis rejects quote copying, duplicated fields, invalid choices and skipped claims',()=>{
 const q=s.scopes[0];assert.equal(independentScope(q,interpretations[0],boundaries[0],examples[0]),true);
 assert.equal(independentScope(q,interpretations[0],interpretations[0],examples[0]),false);
 assert.equal(independentScope(q,q.quote+' '+interpretations[0],boundaries[0],examples[0]),false);
 assert.equal(independentScope(q,interpretations[0],boundaries[0],boundaries[0]),false);
 assert.throws(()=>beginScope(s,'s2','B',interpretations[0],boundaries[0],examples[0],at),/fehlen/);
 assert.throws(()=>beginScope(s,'s1','X' as never,interpretations[0],boundaries[0],examples[0],at),/fehlen/);
 assert.throws(()=>appendScopeEvidence(begin(),s,'s3','B',interpretations[2],boundaries[2],examples[2],'skip',at+1),/Reihenfolge/);
});
test('ordered source evidence preserves append-only history and unpreferred choices without automatic score',()=>{
 const a=begin(),b=second(a),c=third(b);
 assert.equal(a.revisions.length,0);assert.equal(b.revisions.length,1);assert.equal(c.revisions.length,2);
 assert.equal(c.original,a.original);assert.equal(savedScopeEvidence(b,s.scopes[1])?.choice,'A');
 assert.equal(savedScopeEvidence(c,s.scopes[2])?.example,examples[2]);assert.equal(nextScope(s,c),null);
 assert.throws(()=>appendScopeEvidence(c,s,'s3','B',interpretations[2],boundaries[2],examples[2],'repeat',at+4),/Reihenfolge/);
 assert.throws(()=>appendScopeEvidence({...b,sourceId:'altered'},s,'s3','B',interpretations[2],boundaries[2],examples[2],'bad',at+3));
});
test('full-document transfer and substantive audience revision require prior three claims and distinct text',()=>{
 assert.throws(()=>appendScopeDocument(begin(),s,'TRANSFER',memo,why,'s1','premature',at+3),/fehlt/);
 assert.throws(()=>appendScopeDocument(third(),s,'REWRITE',memo,why,'s1','missing',at+3),/fehlt/);
 assert.throws(()=>appendScopeDocument(third(),s,'TRANSFER',memo,'kurz','s1','short',at+3),/fehlt/);
 assert.throws(()=>appendScopeDocument(third(),s,'TRANSFER',memo,why,'unknown','bad',at+3),/fehlt/);
 const e=transfer();assert.equal(latestScopeDocument(e)?.questionId,'TRANSFER');
 assert.equal(substantialScopeRevision(memo,memo+' Satz.'),false);
 assert.throws(()=>appendScopeDocument(e,s,'REWRITE',memo+' Satz.',why,'s1','similar',at+4),/fehlt/);
 const revisedEntry=appendScopeDocument(e,s,'REWRITE',revised,why,'s3','rewrite',at+4);
 assert.equal(revisedEntry.original,e.original);assert.deepEqual(revisedEntry.revisions.slice(0,3),e.revisions);
 assert.equal(versionPair(revisedEntry,3)?.previous,memo);
 assert.equal(archiveRows([revisedEntry],{kind:'G04_SCOPE',activity:'REVISED',period:'ALL',search:'Presseverteiler',now:at+5}).length,1);
});
test('progress and next study are observed activity only, not CEFR proficiency',()=>{
 assert.deepEqual(scopeProgress([]),{started:0,analyses:0,transferred:0,revised:0,total:4});
 assert.deepEqual(scopeProgress([begin()]),{started:1,analyses:1,transferred:0,revised:0,total:4});
 assert.equal(scopeProgress([third()]).analyses,3);
 assert.equal(scopeProgress([transfer()]).transferred,1);
 assert.equal(nextScopeStudy([begin()]).id,s.id);assert.equal(nextScopeStudy([transfer()]).id,scopeStudies[1].id);
 const e=appendScopeDocument(transfer(),s,'REWRITE',revised,why,'s3','rewrite',at+4);
 assert.equal(scopeProgress([e]).revised,1);
});
test('eight-store backup v3 round-trips exact original, references, revisions and integrity',async()=>{
 assert.equal(BACKUP_STORES.length,8);
 const records:BackupRecords={attempts:[],cards:[],reviewEvents:[],settings:[],drafts:[],diagnosticSessions:[],productionEntries:[transfer()],missions:[]};
 const raw=await buildPortableBackup(records),decoded=await inspectPortableBackup(raw);
 assert.equal(decoded.version,BACKUP_VERSION);assert.equal(BACKUP_VERSION,3);
 assert.deepEqual(decoded.records.productionEntries,records.productionEntries);
 await assert.rejects(()=>inspectPortableBackup(raw.replace('Fiktive','Manipulierte').replace('Förderbericht','Manipuliert')),/Integritätsprüfung/);
});
test('M30 editorial queue holds all 16 original sources and scope claims unapproved',()=>{
 const rows=collect().filter(x=>x.mode==='G04_SCOPE');assert.equal(rows.length,16);
 assert.equal(rows.filter(x=>x.type==='G04_ORIGINAL_SCOPE_SOURCE').length,4);
 assert.equal(rows.filter(x=>x.type==='G04_FOCUS_PARTICLE_OR_NEGATION_SCOPE').length,12);
 assert.ok(rows.every(x=>x.status==='DEMO_ONLY'&&!x.independentEditorialApproval));
});
