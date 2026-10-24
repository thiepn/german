# M16 — G01 Referenz und Determination in argumentativer Prosa

Six original fictional C1–C2 contextual source dossiers; three connected original German paragraphs and three grounded reference/quantification analyses per dossier (18 contrasting decisions). These do **not** extend the M01 noun-gender/article auto-grader or M13 case morphology. They address new-vs-given discourse entities, anaphoric re-identification, document identity, generic vs identified groups, demonstrative selection, mass nouns vs portions, predicative role naming, definite restrictive reference, existential vs contrastive negation and individual distribution.

Each saved decision requires:
1. A selection between two defensible *interpretations of a referent*, not a slot-level article guess.
2. An independent rewritten statement preserving or intentionally changing the discourse reference.
3. An explicit explanation of who or what is identified and what an alternate article could imply.

The unchanged initial decision, chosen interpretation, source version and paragraph are persisted once under `REFERENCE_STUDY`, `sourceId` and `decisionId=d1|A/B|p1`. Later `DECISION:dN` events are append-only production revisions. After all three decisions, independent discourse transfer and further `REWRITE` versions are available. Before/after source examples and author explanations accompany each saved interpretation; later writing versions use the existing word diff, explicitly without an automatic quality grade.

Original database: only `productionEntries`; the transactional `saveProductionEntry` CAS handles competing tabs. Eight IndexedDB stores and portable backup schema v3 remain unchanged. No new scheduler, grader, CEFR assessment, review engine, diagnostic scope, user accounts or external calls.

Content is `DEMO_ONLY`, `AI_DRAFT`, `ORIGINAL_DRAFT`, not approved for publication. Six source dossiers and 18 discrete decisions are in the independent editorial queue; article semantics, referent ambiguities, regional register and original authorship must be reviewed before any publication.

Native Today, G01 Curriculum, Progress and Archive/source-return integration. Source fixtures and manifest validated for rights, full paragraph quote grounding, unique IDs, exercise breadth and unapproved status. Node tests, TypeScript/Vite and genuine Chromium desktop/mobile plus M01–M15 regressions required before qualification. No merge, deployment or migration.
