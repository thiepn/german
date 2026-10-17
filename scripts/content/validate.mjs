import {readFileSync} from 'node:fs';
const items=JSON.parse(readFileSync(new URL('../../content/fixtures/core.demo.json',import.meta.url),'utf8'));
const ids=new Set();const counts={M01:0,M02:0,M03:0};let reviewed=0;
for(const item of items){
 if(ids.has(item.id))throw Error('Duplicate '+item.id);ids.add(item.id);
 if(!Object.hasOwn(counts,item.mode))throw Error('Mode '+item.id);
 if(!item.prompt||!item.explanation||!item.reviewAnswer||!item.misconception||!item.skillId)throw Error('Missing text '+item.id);
 if(!item.slots.length||!item.variants.length)throw Error('Empty answer '+item.id);
 for(const variant of item.variants)for(const slot of item.slots)if(typeof variant.slots[slot.id]!=='string'||!variant.slots[slot.id].trim())throw Error('Invalid variant '+item.id);
 if(item.status==='REVIEWED'){if(item.rights?.kind==='ORIGINAL_DRAFT'||!item.rights?.reviewedBy||!item.rights?.reviewedAt)throw Error('False approval '+item.id);reviewed++;}
 else if(item.status!=='DEMO_ONLY')throw Error('Status '+item.id);
 counts[item.mode]++;
}
console.log(JSON.stringify({valid:true,total:items.length,reviewed,demo:items.length-reviewed,counts,SG01Target:240,contentComplete:reviewed>=240},null,2));
