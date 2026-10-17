# P1 feature-first completeness and next substantial batch

## Working now
Core app shell, local settings, active exercise drafts, five modes, immutable first attempt events, grade feedback, error archive, review scheduling, Today and curriculum, progress view, offline app shell.

## Content reality
- SG01 original target: 240 independently approved M01–M03 items — current approved 0, draft 36.
- Generalized P1 target: 350 independently approved items across M01–M05 — current approved 0, demo 104.
- Demo counts: 12 / 12 / 12 / 33 / 35. These are separate from approved counts and cannot satisfy release gates.
- 10 lessons are authoring drafts, not approved.

## Product gaps
- M04 restricted morphosyntactic targets do not represent free-form C2 rewriting; open rewriting needs explicit grading/feedback policy.
- M05 currently only one contextual fill-in interface; editorial review must find equally acceptable collocational alternatives.
- Diagnostic A engine exists but no approved/rights-cleared items. No testing with learners possible until actual review and audio evidence.
- Review scheduler remains a deterministic draft, not production FSRS with calibrated stability.
- Reassessment, diagnostic B, media-first listening and richer advanced-writing workflows remain P2/P3.
- Error archive currently stores submitted answers, but there is no full version-pinned lexical explanation archive or user-owned export/restore.
- Operational browser a11y audits, Android physical device and service worker upgrade across releases still needed.

## Next implementation priority
1. Build genuine authored advanced content in manageable reviewable batches with lexicographic corroboration and human signoff rather than filling counts.
2. Build M04 free-production scaffolding with explicitly non-automated assessment for genuinely open-ended answers.
3. Complete diagnostic-A source-authority system with audio licensing evidence; unlock only when the full form is qualified.
4. Add user-owned data exports, round-trip recovery and schema migration regression tests without touching Artikelwerk.
5. Run source/test/browser checks on the same draft before claiming merge readiness.
