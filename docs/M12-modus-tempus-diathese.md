# M12 — G05 Modus, Tempus und Diathese

## Distinct learner-facing coverage

Six original C1–C2 context studies with 18 contrast tasks: Konjunktiv I in attributed assertions and Perfekt reports, Konjunktiv II counterfactual/conditional clauses, temporal anteriority, evidential/modal readings, deontic obligation, Vorgangs- and Zustandspassiv and the suppressed agent. Authored German paragraphs are original fictional context, not external recordings, transcripts or licensed source text.

A learner first selects one possible context-dependent interpretation and writes an immutable ungraded interpretation. Subsequent contrast answers require a separate semantic limitation and are stored as append-only revisions. After submitting each response, the learner can inspect the original author draft's modeled interpretation and detailed grammatical reason, clearly labeled as editorially unreviewed and not an automatic grade. After all three contrasts, the learner independently produces an attributed/qualified German formulation grounded in a selected paragraph, optionally revises it, and uses word-level diff for comparing successive *output* versions. No automatic mastery, diagnostic, pronunciation or CEFR award.

## Invariants

Uses existing `productionEntries` and `saveProductionEntry` transactional compare-and-swap. First record: `modality:<original unit id>`, immutable `original` free response and `decisionId` `c1|chosen option|paragraph`, source ID and version. Further contrasts: revisions with `questionId` `CONTRAST:cN`, selected option in `selfChecks`, quote paragraph in `paragraphId`, interpretation `text`, limitation `reflection`. Text output: `TRANSFER`; further redrafts: `REWRITE` with paragraph and written rationale. The archive does not invite comparisons between unlike contrast interpretations or an interpretation and a full composition. Only text revisions expose meaningful before/after comparisons.

No changes to eight IndexedDB stores, v3 portable backup, existing attempt/grading/review/diagnostic/missions owners, Artikelwerk, approved items, or all previously recorded IDs. Original corpus is marked `DEMO_ONLY`, unapproved, separately registered for validation and human source/grammar/alternatives review in the original editorial worklist; never silently counted among graded exercises. Source and learner records remain local-first.

## Verification

Content validation covers source paragraph and literal quote grounding, metadata, IDs, options, domain and coverage; Node tests cover semantic stage order, ungraded choices, append-only original preservation, backup v3, review worklist; Chromium desktop/mobile exercises initial interpretation, feedback, independent writing, revision, archive, reload, and cross-tab stale-write rejection.
