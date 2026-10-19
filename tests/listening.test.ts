import test from 'node:test';import assert from 'node:assert/strict';
import {TASKS,newListeningEntry,addListeningNote,clock,limitTime,encodeAnchor,decodeAnchor,isListeningEntry,listeningEvidence,listeningEntries,validateLocalAudio,nextListeningTask} from '../src/domain/listening/listening.ts';
import {archiveKind,archiveRows} from '../src/domain/archive/archive.ts';
test('audio source validation and seek/anchor limits',()=>{
 assert.equal(validateLocalAudio('a.wav','audio/wav',44),null);
 assert.ok(validateLocalAudio('bad.txt','text/plain',100));
 assert.ok(validateLocalAudio('a.wav','audio/wav',0));
 assert.ok(validateLocalAudio('a.mp3','audio/mpeg',300*1024*1024));
 assert.equal(clock(65.9),'01:05');assert.equal(limitTime(-10,20),0);assert.equal(limitTime(100,20),20);
 assert.equal(decodeAnchor(encodeAnchor(17.4)),17.4);assert.equal(decodeAnchor('p1'),null);
});
test('original listening entry preserved and separated from writing evidence',()=>{
 const initial=newListeningEntry('listening-study:example','Die These ist vorläufig.',10);
 const revised=addListeningNote(initial,'position','Der Sprecher schränkt ein.','Unsicherer Begriff',12.5,'rev-1',20);
 assert.equal(initial.revisions.length,0);assert.equal(revised.original,initial.original);
 assert.equal(revised.revisions[0].paragraphId,'t=12.5');
 assert.equal(nextListeningTask(revised).id,'reasons');
 assert.deepEqual(listeningEvidence([revised]),{sessions:1,notes:1,withEvidence:1});
 assert.equal(listeningEntries([revised]).length,1);assert.ok(isListeningEntry(revised));assert.equal(archiveKind(revised),'G10_LISTENING');
 assert.equal(archiveRows([revised],{kind:'G10_LISTENING',activity:'ALL',period:'ALL',search:'vorläufig',now:40}).length,1);
 assert.equal(revised.sourceId,'USER_AUDIO_NOT_STORED');assert.equal(TASKS.length,4);
 assert.throws(()=>addListeningNote(revised,'unknown','x','',1,'rev-2',30));
});
