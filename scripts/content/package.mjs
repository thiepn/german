import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const approved=JSON.parse(readFileSync('content/approved/approved.json','utf8'));
const ledger=JSON.parse(readFileSync('content/editorial/approval-ledger.json','utf8'));
if(approved.length!==ledger.length)throw Error('Approved source is not aligned with approval ledger');
if(process.argv.includes('--release')&&approved.length<350)throw Error('Unapproved corpus cannot be released');
mkdirSync(resolve('dist/data'),{recursive:true});
writeFileSync(resolve('dist/data/approved.v1.json'),JSON.stringify({schemaVersion:1,status:approved.length>=350?'RELEASE_CANDIDATE':'EMPTY_NON_RELEASE',items:approved})+'\n');
console.log('Approved-only content pack: '+approved.length+' independently reviewed items (demo excluded)');
