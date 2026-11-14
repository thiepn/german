/**
 * M39 read-only reviewer evidence: source-identity fingerprints and targeted
 * semantic / provenance questions. These are NOT independent linguistic decisions.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateM38} from './m38Qualification.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const assert=(v,m)=>{if(!v)throw Error('M39 REVIEW_HOLD: '+m)};
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const dimensions={
 G01:'Artikelgebrauch, Identifizierbarkeit der Referenten, Nullartikel versus spezifischer Mengenbezug',
 G02:'Kasus im Haupt-/Relativsatz, Genus, Rektion, Pronomenform und zutreffendes Antezedens',
 G03:'Mehrdeutige Präpositionalanbindung; Akteur, Werkzeug, Ort und Beleggewicht',
 G04:'Konnektorbedeutung, zeitliche versus kausale Folgerung und Negations-/Bedingungsreichweite',
 G05:'Konjunktiv I, indirekte Rede, Passiv und tatsächliche Zuschreibungs-/Freigabewirkung',
 G06:'Polysemie in vollständigem Satzkontext; korrektes Autoren-Schlüsselwort und gegenteilige Lesarten',
 G07:'Idiom, Kollokation, Verpflichtungsstärke, plausible Antwortalternativen und Kontextbindung',
 G08:'Bedingte Zustimmung, epistemisches Hedging, Register und Grenzen von Ursache/Wirkung',
 G09:'Eingang, Prüfung, Freigabe und zeitlich bedingte Wirkung; keine fiktive Rechtsregel als echte Rechtsauskunft',
 G11:'Wiedergabe von Aussagen, Sprecherzuordnung und Grenzen einer begrenzten Stichprobe',
 G12:'Offene mündliche Antwort/Begründung, respektvolle Nachfragen und UNASSESSED statt automatischer Sprachnote',
 G13:'Datensparsame öffentliche Vermittlung, nicht veröffentlichte Kennungen und Fiktionshinweise'
};
const riskNotes={
 'SG-G02R-002:r1':'HARD BLOCK: v1 explanation has the incorrect gender/article sequence «das substantivierte Finanzierung». Compare only with staged v2 and require independent review.',
 'SG-G06-002:d1':'HARD BLOCK: v1 preferredId B contradicts technical-backup source and its own explanation; proposed v2 A remains unsigned.',
 'SG-G07-003:d1':'REVIEW: discuss whether distractor B could be read as partly true when preparation took place without a completed resolution. Do not claim unique distractor invalidity without a qualified editor.',
 'SG-G03A-002:a1':'REVIEW: source clarifies former storage in side room versus inspection in laboratory; inspect whether the short quote alone induces another reading.',
 'SG-G13D-001:d1':'REVIEW: four-week period is invented in the fictional document and must not be presented as general legal advice.',
 'SG-G12O-001:t1':'OPEN RESPONSE: spoken response and source-grounded respect can only be judged by human qualified evidence.',
 'SG-G12O-002:t1':'OPEN RESPONSE: avoid automatic CEFR or fluency inference from microphone use or response length.'
};
export function inspectM39({load=read}={}){
 const q=validateM38({load});
 assert(q.structuralGate==='PASS'&&q.releaseGate==='NO_GO'&&q.editorialGate==='NO_GO'&&q.privateAlphaGate==='NO_GO','M38 eligibility or authority unexpectedly changed');
 const rows=q.sourceCases.map(c=>{
  assert(dimensions[c.domain]&&c.paragraphs.length===3,'source or domain missing '+c.id);
  const sourceArray=load(c.source),study=sourceArray.find(s=>s.id===c.id.split(':')[0]&&s.version===c.version);
  assert(study&&study.rights.kind==='ORIGINAL_DRAFT'&&study.status==='DEMO_ONLY'&&!study.editorialApproval,'originality or editorial status drift '+c.id);
  const sourceFingerprint=sha({id:study.id,version:study.version,paragraphs:study.paragraphs,rights:study.rights,task:c.task});
  const options=c.task.options??[],open=c.domain==='G12';
  assert((open&&options.length===0)||(!open&&options.length>=2&&options.some(x=>x.id===c.task.preferredId)),'unreviewable options '+c.id);
  return {id:c.id,source:c.source,sourceVersion:c.version,sourceFingerprint,domain:c.domain,authorBand:c.authorBand,
   authorPreferredId:c.task.preferredId??null,answerChoices:options.map(o=>({id:o.id,text:o.text})),
   sourceQuote:c.task.quote,sourceRightsClaim:study.rights.source,provenance:'SELF_DECLARED_NOT_INDEPENDENTLY_VERIFIED',
   englishDescription:'Human reviewer must review complete three-paragraph source and every answer, including unlisted alternatives',
   domainReview:dimensions[c.domain],specialRisk:riskNotes[c.id]??null,
   independentGrammar:'NOT_REVIEWED',allPlausibleAlternatives:'NOT_REVIEWED',rightsClearance:'NOT_VERIFIED',
   cefrCalibration:'NOT_CALIBRATED',humanReviewer:null,editorialDecision:null};
 });
 assert(rows.length===26&&new Set(rows.map(x=>x.id)).size===26,'26-case source review inventory drift');
 assert(rows.every(r=>r.provenance==='SELF_DECLARED_NOT_INDEPENDENTLY_VERIFIED'&&r.humanReviewer===null&&r.editorialDecision===null),'invented editorial authority');
 const corrections=q.corrections.map(r=>({id:r.id,source:r.source,from:r.versionFrom,to:r.versionTo,
  proposedFingerprint:sha(r.draftV2),originalFingerprint:sha(r.legacyV1),
  changedFields:r.operations.map(o=>o.path.join('.')),status:'UNAPPROVED_STAGED_ONLY'}));
 assert(corrections.length===4,'versioned draft correction inventory drift');
 const g06=q.corrections.find(r=>r.id==='SG-G06-002');
 assert(g06?.legacyV1.decisions[0].preferredId==='B'&&g06?.legacyV1.decisions[2].preferredId==='B'&&
  g06?.draftV2.decisions[0].preferredId==='A'&&g06?.draftV2.decisions[2].preferredId==='A','G06 reversed keys no longer reproducible');
 const g02=q.corrections.find(r=>r.id==='SG-G02R-002');
 assert(g02?.legacyV1.anchors[0].model.includes('das substantivierte Finanzierung')&&g02?.draftV2.anchors[0].model.includes('die Finanzierung das Subjekt'),'G02 grammar defect no longer reproducible');
 const a=q.corrections.find(r=>r.id==='SG-M05-036'),b=q.corrections.find(r=>r.id==='SG-M05-037');
 assert(a?.draftV2.prompt.includes('auf Vollständigkeit')&&b?.draftV2.prompt.includes('keine verbindliche Zusage'),'collocation disambiguation review proposal drift');
 return {structural:'PASS',linguistic:'NOT_INDEPENDENTLY_REVIEWED',rights:'NOT_VERIFIED',cefr:'NOT_CALIBRATED',privateAlpha:'NO_GO',release:'NO_GO',
  G10:'BLOCKED_RIGHTS_CLEARED_AUDIO_ABSENT',caseCount:rows.length,corrections,rows,
  additionalOutsideSample:['SG-G06-002:d3','SG-M05-036','SG-M05-037'],requiredHumanEvidence:[
    'Reviewer real identity, qualifications, independence, signed source ID/version and decision',
    'Full three-paragraph source checked, valid answer alternatives and grammar/rubric judgements',
    'Originality search/rights provenance and actual permissions documented',
    'COE CEFR descriptors cross-walk and observed C1/C2 learner performances, not author labels',
    'Correction version approval and historical archive/backup transition plan',
    'Explicit hold for G10 and non-objective studios without rights-cleared reviewed content'
  ]};
}
export function renderM39(result=inspectM39()){
 const out=['# M39 — independent reviewer supplement (NOT AN APPROVAL)','',
  '26 original v1 cases. Each fingerprint covers the exact original paragraphs, rights claim and task. A SHA-256 digest proves file-state identity only, not originality, correctness, human judgement or license.',
  'Read the entire M38 packet using npm run audit:m38. The M39 supplement adds issue-focused questions; both must be reviewed by a separate qualified person.',
  ''];
 for(const c of result.rows){
  out.push('## '+c.id+' · '+c.domain+' · author-tagged '+c.authorBand+' · v'+c.sourceVersion,'',
   'Source: '+c.source,'Fingerprint (SHA-256): '+c.sourceFingerprint,
   'Exact quote: '+c.sourceQuote,
   'Review focus: '+c.domainReview,
   'Special risk: '+(c.specialRisk??'None pre-identified; this is NOT evidence of accuracy.'),
   'Rights claim (unverified): '+c.sourceRightsClaim,
   'Author-preferred option (unverified): '+(c.authorPreferredId??'OPEN RESPONSE / UNGRADED'),'');
  for(const option of c.answerChoices)out.push('Option '+option.id+': '+option.text);
  out.push('',
   'Human reviewer / independent authority: __________________',
   'Correct meaning, all acceptable answers, alternative explanations: __________________',
   'Source identity and originality/rights evidence: __________________',
   'Relevant official CEFR descriptor + learner performance evidence: __________________',
   'Approve / correct to a new version / reject; dated signed reference: __________________','');
 }
 out.push('## Staged version-two proposals (not in runtime, still DEMO_ONLY)','');
 for(const c of result.corrections)out.push('- '+c.id+' v'+c.from+'→v'+c.to+' source SHA-256 '+c.originalFingerprint+'; proposal SHA-256 '+c.proposedFingerprint+'; changed: '+c.changedFields.join(', ')+'; no human approval');
 out.push('','Release: NO_GO; private alpha: NO_GO. Do not merge, deploy, migrate, publish or change rights/CEFR status.','');
 return out.join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectM39();
 if(process.argv.includes('--markdown'))console.log(renderM39(result));
 else if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
 else console.log(JSON.stringify({M39:'PASS_STRUCTURAL_ONLY',candidates:result.caseCount,proposals:result.corrections.length,
  linguistic:result.linguistic,rights:result.rights,cefr:result.cefr,alpha:result.privateAlpha,release:result.release},null,2));
}
