export type Mode = 'M01' | 'M02' | 'M03' | 'M04' | 'M05';
export type EntryTrack = 'BRIDGE_C1' | 'C1_C2' | 'C2_PLUS';
export type EditorialStatus = 'DEMO_ONLY' | 'REVIEWED' | 'WITHDRAWN';
export type Slot = { id: string; label: string; caseSensitive?: boolean };
export type AnswerVariant = { slots: Record<string,string>; note?: string };
export type Exercise = {
 id: string; version: number; mode: Mode; skillId: string; band: 'BRIDGE_C1' | 'C1' | 'C2';
 topic: string; prompt: string; slots: Slot[]; variants: AnswerVariant[];
 explanation: string; misconception: string; reviewPrompt: string; reviewAnswer: string;
 contrast?: { options: string[]; rationale: string; kind:'AUTHOR_DRAFT_CHOICE' }; lexicalAuthority?: { anchorId:string; scope:'LEXICAL_FORM_ONLY'; editorialApproved:false }; status: EditorialStatus; authorId?: string; editorial?: { reviewId?: string; reviewedBy?: string; reviewedAt?: string; sourceChecked?: boolean; languageChecked?: boolean; rightsChecked?: boolean }; rights: { kind: 'ORIGINAL_DRAFT' | 'ORIGINAL_REVIEWED' | 'LICENSED'; source: string; reviewedBy?: string; reviewedAt?: string };
};
export type Attempt = { id: string; itemId: string; itemVersion: number; mode: Mode; skillId: string; at: number; slots: Record<string,string>; score: number; correct: boolean; hinted: boolean; result: 'CORRECT'|'PARTIAL'|'INCORRECT'|'VOID'; sessionId: string; variantIndex: number | null; };
export type ReviewCard = { id: string; itemId: string; itemVersion: number; dueAt: number; stability: number; difficulty: number; lastReviewedAt: number | null; lapses: number; algorithmVersion: 'sg-recall-0.1' | 'sg-recall-0.2'; };
export type ReviewEvent = { id: string; cardId: string; itemId: string; grade: 'Again' | 'Hard' | 'Good' | 'Easy'; at: number; scheduledDueAt: number; algorithmVersion: 'sg-recall-0.1' | 'sg-recall-0.2'; };
export type LearnerSettings = { id:'local'; entryTrack: EntryTrack; dailyMinutes: 10|20|30|45|60; createdAt:number };
export type Draft = { id:'active'; itemId: string; slots: Record<string,string>; mode:Mode; sessionId:string; updatedAt:number };
