# P1 G09 reading continuity — original draft implementation

## New learner experience
Four 3-paragraph, fictional C1–C2 original reading studies and twelve paragraph-grounded evidence questions. The reading space asks a learner to interpret an argument, record their **immutable first interpretation**, answer one evidence question at a time, select a supporting paragraph, reveal an unreviewed model interpretation only after a response is saved, and launch an existing M04/M05 transfer exercise. There is **no automatic comprehension score**. The source material is not an authentic third-party article.

Each study provides links to IDS grammis pages that describe the relevant grammatical concepts (indirect speech, concessions, connectors). These links do not authenticate the fictional story, guarantee its pedagogy, or grant republication rights to IDS text. All paragraphs and sample answers are newly authored, AI-assisted demo material and must be reviewed by a qualified German-language editor.

## Storage contract
Reading records use the existing `productionEntries` object store with stable `reading:SG-R09-...` IDs and `kind:'READING_STUDY'`. The original paragraph interpretation is immutable. Evidence answers are appended as revision events with `questionId`, `paragraphId`, `text` and `reflection`. Existing writing prompts use their original IDs and are **not counted** as reading units; writing-progress counters exclude reading records. The same immutable first-write/revision CAS mechanism applies.

**No IndexedDB upgrade**: preserve database name `sprachgefuehl-learning-v1` and schema v4, including missions and all eight stores. Existing portable backup format v3 automatically includes reading notes and revisions, accepts signed v1/v2 files, and remains merge-only. Offline PWA source content is bundled and no network access is required to render passages. External grammar references will not open offline.

## Content authority
- Four G09 passages, twelve questions, three IDS source anchors; all `DEMO_ONLY`.
- No independently approved texts, questions, reading rubrics or external third-party content.
- Review worklist now contains all 178 existing objective drafts, twenty unscored writing prompts, four reading texts and twelve reading questions: **214 dossiers**, none approved.
- Explicit `npm run check:content` validates paragraph IDs, question references, transfer syntax, original rights, review status and source URL scope. `npm run check:editorial` must discover every dossier from the manifest; it creates no approval.
- Cross-mode buttons are not evidence of reading mastery, and exercises linked to reading retain the existing mode-scoring limitations.

## Qualification and remaining risks
Unit and browser checks cover source scoping, progress projection, immutable evidence events, page reload, owner backup restore, reading-to-exercise transfer and responsive layouts. Full semantic correctness, alternative valid question responses, accessibility audit, real-device PWA and multi-tab quota failures remain unqualified. Writing scores and CEFR results are not inferred.
