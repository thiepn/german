# P1 feature-first completeness and next substantial batch

## Working now
Core app shell, local settings, active exercise drafts, five modes, immutable first attempt events, grade feedback, error archive, review scheduling, Today and curriculum, progress view, offline app shell, versioned local JSON export, SHA-256 integrity checking and non-destructive merge-only import across all seven local stores.

## Content reality
- SG01 original target: 240 independently approved M01–M03 items — current approved 0, draft 36.
- Generalized P1 target: 350 independently approved items across M01–M05 — current approved 0, demo 118.
- Demo counts: 12 / 12 / 12 / 33 / 49. These are separate from approved counts and cannot satisfy release gates.
- 12 separate M04 free-writing prompts and 10 lessons are authoring drafts, not approved; the writing prompts do not count toward auto-graded exercise quotas.

## Product gaps
- M04 restricted morphosyntactic grading is complemented by a separate genuine free-writing studio: first draft saved permanently, draft sample/criteria shown afterward and revisions appended. No automatic linguistic judgement or C2 score.
- M05 now offers contextual fill-in and 14 two-choice contrast explanations. Editorial review must identify genuinely acceptable alternatives and remove ambiguous distractors.
- Diagnostic A engine exists but no approved/rights-cleared items. No testing with learners possible until actual review and audio evidence.
- Review scheduler remains a deterministic draft, not production FSRS with calibrated stability.
- Reassessment, diagnostic B, media-first listening and richer advanced-writing workflows remain P2/P3.
- Error archive currently stores submitted answers, but there is no full version-pinned lexical explanation archive; user-owned export/restore now exists, with physical-device and quota stress checks still outstanding.
- Operational browser a11y audits, Android physical device and service worker upgrade across releases still needed.

## Next implementation priority
1. Build genuine authored advanced content in manageable reviewable batches with lexicographic corroboration and human signoff rather than filling counts.
2. Build M04 free-production scaffolding with explicitly non-automated assessment for genuinely open-ended answers.
3. Complete diagnostic-A source-authority system with audio licensing evidence; unlock only when the full form is qualified.
4. User-owned seven-store backup and merge-only restore implemented and qualified in Chromium; next: physical Android and quota/multi-tab failure testing without touching Artikelwerk.
5. Run source/test/browser checks on the same draft before claiming merge readiness.

## October 18 recovery batch
- Non-destructive data management UI, JSON/SHA-256 export, integrity/format validation, atomic merge-only restoration. All seven stores include diagnostics and writing entries; additive IndexedDB v2→v3 migration to store immutable writing versions; existing user records preserved.
- Explicit preview/confirmation before import, error reporting, no implicit replacement of local settings or active drafts.
- Exact-head CI includes 17 Node tests, TypeScript, production build, and Chromium desktop/mobile, fresh-context recovery, reload and tamper handling.
- Approval remains **0 of 350**. The 72-item diagnostic remains blocked; do not substitute synthetic or demo-only evidence.

## October 18 writing and contrast batch
- 14 M05 contrast exercises and 12 distinct M04 open-writing prompts, all DEMO_ONLY, 0 editorially approved.
- Owner-written first drafts and revisions stored separately, no auto-grading or replacement of the original.
- SHA-256 portable backup v2 includes seven stores, with signed legacy v1 six-store imports preserved; checksums, atomic merge, duplicate imports and mobile/desktop round-trips tested.
- The latest qualified CI run, not prior historical counts, is the source of exact test quantities.

## Subsequent authored continuity batch — draft PR #1
- 130 objective DEMO_ONLY items (12/12/12/33/61), 20 ungraded writing prompts; 0 reviewed.
- Guided M04 rewriting lens, self-check record, persisted revision history, word-level difference inspection and next incomplete task.
- 12 new M05 contextual contrast drafts; six Duden dictionary anchors attest only to the lexical expressions. All sentence and distractor editorial checks remain unapproved.
- Read-only CLI review packets with source links, ambiguity flags and independent reviewer checklist. No automated approval creation or CEFR scores.
- Existing IndexedDB v3, backup format v2, legacy backup v1, offline shell and Artikelwerk unchanged.
