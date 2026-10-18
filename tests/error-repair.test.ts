import test from 'node:test';
import assert from 'node:assert/strict';
import {buildErrorClusters,projectErrors} from '../src/domain/errors/errorProjection.ts';
import type {Exercise,Attempt} from '../src/domain/content/types.ts';

const item=(id:string,topic='Nomen und Artikel',version=1):Exercise=>({
 id,version,mode:'M01',skillId:'G01.GENUS',band:'C1',topic,prompt:id,
 slots:[{id:'article',label:'Artikel'}],variants:[{slots:{article:'der'}}],
 explanation:'Nur Autorenentwurf.',misconception:'Formwahl',reviewPrompt:id,reviewAnswer:'der',
 status:'DEMO_ONLY',rights:{kind:'ORIGINAL_DRAFT',source:'Synthetic tests'}
});
const attempt=(id:string,itemId:string,at:number,result:Attempt['result']='INCORRECT',version=1):Attempt=>({
 id,itemId,itemVersion:version,mode:'M01',skillId:'G01.GENUS',at,
 slots:{article:result==='CORRECT'?'der':'die'},score:result==='CORRECT'?1:0,correct:result==='CORRECT',
 hinted:false,result,sessionId:id,variantIndex:null
});
test('groups recurring errors but keeps every original first answer; fresh context truly unseen',()=>{
 const one=item('x'),two=item('y'),fresh=item('z'),other=item('other','Andere Regel');
 const items=new Map([one,two,fresh,other].map(x=>[x.id,x]));
 const attempts=[attempt('a','x',1),attempt('b','y',2),attempt('c','other',3)];
 const clusters=buildErrorClusters(attempts,items);
 assert.equal(clusters.length,2);
 const cluster=clusters.find(x=>x.topic==='Nomen und Artikel')!;
 assert.equal(cluster.failures.length,2);
 assert.deepEqual(cluster.failures.map(x=>x.id),['b','a']);
 assert.equal(cluster.freshContextId,'z');
 assert.equal(cluster.repeatItemId,'y');
 assert.equal(cluster.status,'OFFEN');
 assert.equal(projectErrors(attempts,items).length,3);
});
test('one successful follow-up cannot certify recovery; two distinct later items on different days are evidence only',()=>{
 const start=Date.UTC(2026,9,10),day=86400000;
 const items=new Map(['x','y','z','w'].map(x=>[x,item(x)]));
 const logs=[attempt('a','x',start),attempt('b','y',start+day,'CORRECT')];
 let clusters=buildErrorClusters(logs,items);
 assert.equal(clusters[0].status,'ERNEUT_UNSICHER');
 logs.push(attempt('c','z',start+2*day,'CORRECT'));
 clusters=buildErrorClusters(logs,items);
 assert.equal(clusters[0].status,'WIEDER_ANGEWENDET');
 assert.equal(clusters[0].freshContextId,'w');
 logs.push(attempt('d','w',start+3*day));
 assert.equal(buildErrorClusters(logs,items)[0].status,'OFFEN');
});
test('never uses withdrawn, previously attempted or revised source as a fresh-context transfer',()=>{
 const old=item('x','Nomen und Artikel',2);
 const withdrawn={...item('y'),status:'WITHDRAWN' as const},used=item('z');
 const items=new Map([old,withdrawn,used].map(x=>[x.id,x]));
 const logs=[attempt('old','x',10,'INCORRECT',1),attempt('used','z',11,'CORRECT')];
 const clusters=buildErrorClusters(logs,items);
 assert.equal(clusters.length,1);
 assert.equal(clusters[0].freshContextId,null);
 assert.equal(clusters[0].repeatItemId,null);
 assert.equal(clusters[0].sourceCurrent,false);
 assert.equal(clusters[0].failures[0].id,'old');
});
