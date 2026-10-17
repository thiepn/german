import raw from '../../../content/assessment/p1.approved.json';
import approvals from '../../../content/editorial/approval-ledger.json';
import {allItems} from '../content/registry';
import type {PilotItem,Approval} from './p1Pilot';
export const pilotItems=raw as PilotItem[];
export const pilotApprovals=approvals as Approval[];
export const practiceIds=new Set(allItems.map(i=>i.id));
