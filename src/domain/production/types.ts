export type ProductionPrompt={id:string;version:1;skillId:'G04.SYNTAX';band:'C1'|'C2';instruction:string;source:string;objective:string;sample:string;noticing:string[];status:'DEMO_ONLY';authorship:'AI_DRAFT';reviewedBy:null;};
export type ProductionRevision={id:string;at:number;text:string;reflection:string};
export type ProductionEntry={id:string;itemId:string;itemVersion:number;createdAt:number;original:string;revisions:ProductionRevision[];evaluated:'UNASSESSED';};
