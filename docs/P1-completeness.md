# P1 product-wide completeness — source-grounded draft status

## Implemented learner-facing experiences
Five objective modes; Today and resumable bounded mission; original attempt/review history; local backup/restore; guided Error Archive; progress evidence; diagnostic UI that remains gated; Momentum Precision responsive shell; M04 unscored writing studio with immutable first drafts and explicit version comparison; M05 context choices with lexical reference links.

## Real content inventory
- Objective drafts: **178** (130 before the 48-item advanced precision contribution; full breakdown in content-validation CI output).
- Ungraded M04 prompts: **20**, each an original AI-assisted draft; ten lesson manuscripts are also unreviewed.
- Reviewed: **0 of 350** P1 exercises, **0 of 50** P1 diagnostic holdouts, **0 of 72** full Diagnostic A items.
- Lexical reference coverage: 12 M05 drafts link to six dictionary headwords; this is NOT editorial approval for the prompts, alternative answers or difficulty.
- Corpus release authority remains `content/approved/approved.json` plus independent approval ledger. The trainer uses demo fixtures; the approved pack does not.

## Architecture and preservation
- IndexedDB database `sprachgefuehl-learning-v1`, schema **v4**: attempts, cards, review events, settings, drafts, diagnostic sessions, writing entries and missions. Preserve all native keys and original history.
- JSON/SHA-256 portable backup **v3**, includes all eight stores and accepts authentic prior v1/v2 formats. Merge-only restore; no implicit overwriting of existing historical IDs.
- Browser offline app shell survives refresh; no published public origin or real-device installation validation.
- Artikelwerk storage and repository remain separate.

## Remaining significant original product gaps
- Independent linguist verification, alternate-answer coverage, false-negative analysis, licensing records and editorial calibration are missing. CLI dossiers are only a review aid.
- Robust diagnostic learner outcomes, approved holdouts and rights-cleared listening audio are absent; both pilots must remain gated.
- M06–M08 and full reading/listening/speaking/mediation studios not implemented.
- Automatic scoring of free-form writing is deliberately absent; studio assists self-review but does not assess C2 competence.
- FSRS-grade scheduler calibration, accessible end-to-end audits, physical Android PWA, multi-tab/quota stress and service-worker upgrade rehearsals remain unqualified.
- Word-level revision diff is a mechanical comparison, not grammar detection or textual quality evaluation.

## Next implementation priorities
1. Recruit/organize independent editorial review, obtain human signoff of carefully sampled items and legitimate alternative responses before increasing official coverage.
2. Integrate authentic assessed C1/C2 reading and listening with rights-cleared materials; keep assessment gate blocked until genuinely complete.
3. Improve multi-session writing progress with user-controlled writing archives/retention and review-guided insight without fabricated fluency scores.
4. Verify data-safe migration, PWA offline upgrades, accessibility and physical-device recovery.
5. Preserve the draft PR and finish exact-head checks before any merge decision.

## New G09 learner journey
- Four original fictional reading passages (12 paragraph-cited evidence questions), saved initial reading interpretation and question-specific evidence notes, no automatic grading.
- Readings linked to existing M04/M05 practice; progress remains separate from open-writing counts.
- IDS grammis conceptual references only; all reading content DEMO_ONLY. See `docs/P1-reading.md`.
- Editorial CLI expands to 214 nonapproved dossiers with manifest-aligned completeness checks; 0 approved holdouts or CEFR levels.
- Existing IndexedDB v4, owner-backup v3 (including v1/v2 restore), missions and Artikelwerk isolation unchanged.
