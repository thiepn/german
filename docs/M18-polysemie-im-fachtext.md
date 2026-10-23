# M18 — G06 Kontextuelle Mehrdeutigkeit und semantische Präzision

## Scope and ownership

**Distinct from earlier phases.** M06 already grades isolated expressions of certainty, evidence and near-synonyms. M17 addresses idiomatic multiword expressions and the status of reported commitments. M18 requires **single-word lexical sense disambiguation across sustained source documents**. It does not expand M06's graded items, M03/G03 valency drills, or G01 determiner-reference judgments. Reading remains evidence-led but a separate G06 authored task needs independent paraphrase, excluded-sense reasoning, coherent transfer and later revision.

## Original source corpus

Six **original fictional** C1–C2 three-paragraph reports (18 sustained source paragraphs, 18 distinct explicitly identified polysemy families):
1. A municipal bylaw distinguishes legal norm enactment, temporary non-application and formal revocation from waiving a debt, exposing someone to risk or keeping records.
2. A digital archive separates technical backup, database representation and catalog registration from access commitments, physical depiction and full semantic understanding.
3. A research report separates documentary substantiation, itemized cost disclosure and reconciliation of inconsistent figures from allocating physical capacity, expelling a person and disbanding a group.
4. Administrative service changes distinguish configuring opening hours, relocating an event and converting a process from staffing, rescheduling and moving physical objects.
5. A project budget separates charging a ledger, partly financing expenditure and writing off a doubtful receivable from accusing staff, roofing and copying text.
6. Academic admissions distinguish permission to apply, recognition of prior work and deferral of a case from admission guarantees, financial offsetting and physically returning documents.

Each document supplies three literal source spans and one linguistically distinct contrast per paragraph, each with two interpretive options, a contextual explanation and a concrete rewriting brief. The complete source remains visible throughout the learner workflow.

The learner chooses a meaning, independently paraphrases the intended factual content in German and explicitly rejects the unsupported other sense. After all three immutable source-linked decisions, they produce a multi-sentence professional summary and can save subsequent **append-only** revisions with the existing word-level difference viewer.

## Architecture and rights

Identity: `SG-G06-001` through `SG-G06-006`, version 1; unique saved production IDs `polysemy:<sourceId>`; immutable source ID, version, first decision and original wording. Subsequent decisions use `DECISION:d2`/`DECISION:d3`; transfer and revisions use `TRANSFER` and `REWRITE`, all with paragraph references. Preserve original M01–M17 learner history and IDs. Save using the existing `saveProductionEntry` IndexedDB transactional CAS (including rejected competing-tab writes), eight original stores and portable backup v3. No new user identity, scorer, scheduler, auto-grade, mastery prediction, rights grant, external call or database migration.

The new authored sources are `DEMO_ONLY`, `AI_DRAFT`, `ORIGINAL_DRAFT`, `editorialApproval:false` and explicitly unauthorised for publication. Six original source and 18 lexical contrast dossiers (24 total) enter the existing unapproved editorial queue. Independent German editorial review must assess polysemy, register, conceptual accuracy, idiom, acceptable alternative senses and rights before any approval; no Goethe, CEFR or native-speaker proficiency credit is generated.

Native integration: Today, G06 Curriculum, observed-only Progress, writing Archive with source return. Readable desktop/mobile CSS without decorative microcopy.

## Qualification

Run source/editorial content validation, targeted Node domain tests (8), full old Node/TypeScript/Vite/build suite; real Chromium desktop 1280px and mobile 360px source selections, copying rejection, archived first analysis, independent paraphrase, staged transfer, unchanged revision prevention, stale multi-tab CAS rejection, full Archive round trip and IndexedDB reload. Run unchanged M01–M17 workflows and responsive/dark-mode/copy tests. Preserve draft PR #1, branch ownership, no merge, no deployment or migrations.
