import raw from '../../../content/fixtures/reading-studies.demo.json';
import references from '../../../content/editorial/reading-anchors.json';
import {itemById} from '../content/registry';
import type {Mode} from '../content/types';
import type {ProductionEntry} from '../production/types';
export type ReadingQuestion={id:string;prompt:string;paragraphIds:string[];model:string;focus:string};
export type ReadingUnit={
 id:string;version:number;title:string;band:'C1'|'C2';domain:'G09';focus:string;register:string;
 paragraphs:{id:string;text:string}[];questions:ReadingQuestion[];
 anchorIds:string[];status:'DEMO_ONLY';author:string;
 rights:{kind:'ORIGINAL_DRAFT';source:string};editorial:{approved:false;reviewedBy:null};
 referenceScope:'LINGUISTIC_BACKGROUND_ONLY';
 transfer:{mode:Mode;itemId:string;why:string};
};
export const readingStudies=raw as ReadingUnit[];
export const readingAnchors=references.anchors;
export const isReadingEntry=(e:ProductionEntry)=>e.kind==='READING_STUDY'&&e.itemId.startsWith('SG-R09-');
export function studyId(unitId:string){return 'reading:'+unitId;}
export function nextUnanswered(unit:ReadingUnit,entry:ProductionEntry|null):ReadingQuestion|null{
 return unit.questions.find(q=>!entry?.revisions.some(r=>r.questionId===q.id))??null;
}
export function readingProgress(units:readonly ReadingUnit[],entries:readonly ProductionEntry[]){
 const reading=entries.filter(isReadingEntry);
 return {started:units.filter(u=>reading.some(e=>e.itemId===u.id)).length,answered:units.reduce((n,u)=>n+u.questions.filter(q=>reading.some(e=>e.itemId===u.id&&e.revisions.some(r=>r.questionId===q.id))).length,0),totalQuestions:units.reduce((n,u)=>n+u.questions.length,0)};
}
export function transferTarget(unit:ReadingUnit){
 const target=itemById.get(unit.transfer.itemId);
 if(!target||target.mode!==unit.transfer.mode||target.status==='WITHDRAWN')throw Error('Lesetransferziel ist nicht mehr verfügbar.');
 return target;
}
