import raw from '../../../content/assessment/p1.approved.json';
import approvals from '../../../content/editorial/approval-ledger.json';
import {allItems} from '../content/registry';
import type {PilotItem,Approval} from './p1Pilot';
export const pilotItems=raw as PilotItem[];
const holdoutIds=new Set(pilotItems.map(x=>x.id+'@'+x.version));
export const pilotApprovals=(approvals as Approval[]).filter(a=>holdoutIds.has(a.id+'@'+a.version));
export const practiceIds=new Set(allItems.map(i=>i.id));
