import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const approved=JSON.parse(readFileSync('content/approved/approved.json','utf8'));
const ledger=JSON.parse(readFileSync('content/editorial/approval-ledger.json','utf8'));
const manifest=JSON.parse(readFileSync('content/manifest.json','utf8'));
if(approved.length!==ledger.length)throw Error('Approved source is not aligned with approval ledger');
if(process.argv.includes('--release')){
 if(process.env.SG_CONTENT_CHANNEL!=='APPROVED_ONLY')throw Error('RELEASE_BLOCKED: approved-only build channel was not selected');
 if(manifest.releaseStatus!=='RELEASE_CANDIDATE'||manifest.releaseStudiosQualified!==true||
  approved.length<350||manifest.publishedApprovedCount!==approved.length||
  manifest.lessonApprovalCount<10)throw Error('RELEASE_BLOCKED: incomplete independent editorial/content authorization');
}
mkdirSync(resolve('dist/data'),{recursive:true});
writeFileSync(resolve('dist/data/approved.v1.json'),JSON.stringify({schemaVersion:1,status:approved.length>=350&&manifest.releaseStudiosQualified===true?'RELEASE_CANDIDATE':'EMPTY_NON_RELEASE',items:approved})+'\n');
console.log('Approved-only content pack: '+approved.length+' independently reviewed items (demo excluded; runtime channel separately enforced)');
