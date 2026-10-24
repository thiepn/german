import raw from '../../../content/fixtures/reading-transfer.demo.json';
import type {ProductionEntry} from '../production/types';
export type ReadingTransferBrief={id:string;version:1;unitId:string;title:string;instruction:string;audience:string;register:string;checks:string[];status:'DEMO_ONLY';authorship:'AI_DRAFT';reviewedBy:null;editorialApproval:false;rights:{kind:'ORIGINAL_DRAFT';source:string}};
export const readingTransferBriefs=raw as ReadingTransferBrief[];
export const readingTransferId=(unitId:string)=>'reading-transfer:'+unitId;
export const isReadingTransfer=(entry:ProductionEntry)=>entry.kind==='READING_TRANSFER'&&entry.id===readingTransferId(entry.sourceId??'');
export function readingTransferFor(unitId:string){return readingTransferBriefs.find(b=>b.unitId===unitId)??null}
export function readingTransferProgress(entries:readonly ProductionEntry[]){
 const own=entries.filter(isReadingTransfer);
 return {drafted:own.length,revisions:own.reduce((n,e)=>n+e.revisions.length,0),total:readingTransferBriefs.length};
}
