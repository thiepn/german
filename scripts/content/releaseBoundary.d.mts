export type DemoReference={file:string;fixture:string;kind:'STATIC_DEMO_FIXTURE_REFERENCE'};
export type SourceBoundary={channel:'DEMO_ONLY'|'APPROVED_ONLY';classification:'DRAFT_DEMO_REFERENCES_PRESENT'|'NO_DIRECT_DEMO_REFERENCES';demoImportCount:number;files:number;refs:DemoReference[];releaseQualified:false};
export function scanDemoReferences(sourceRoot?:string):DemoReference[];
export function auditSourceBoundary(options?:{sourceRoot?:string;channel?:string}):SourceBoundary;
export function verifyNoDemoLeakage(distRoot:string,options?:{strict?:boolean}):{filesScanned:number;violations:{file:string;markers:string[]}[];releaseQualified:boolean};
