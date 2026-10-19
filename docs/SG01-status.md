# SG-01 P1 current implementation status

Draft PR #1: `feature/sg01-core-learning-foundation`. **Not merged or deployed.**

- Current content: **202 DEMO_ONLY objective exercises** plus **20 unscored M04 writing prompts** and ten draft lessons. Independently approved: **zero**.
- M01–M07, Momentum Precision Today/finite mission, persisted error/review history and safe local-only owner data foundation exist.
- M04 includes guided revision lens, human self-check prompts, immutable original and revisions, latest-version difference display, and next-unfinished writing journey.
- M06 Wortgefühl offers 12 semantic precision decisions, M07 Stilwechsel offers 12 audience/register decisions; all are DEMO_ONLY authored choices, not automated free-text assessment.
- M05 includes contrast exercises with nuanced explanations; 12 entries point to six externally verified dictionary headwords only. No external dictionary examples are embedded.
- P1 independent holdout pilot requires 50 approved unseen assessment items; full Diagnostic A requires 72 independently approved multimodal items. Both remain blocked.
- IndexedDB `sprachgefuehl-learning-v1` schema **4**, backup format **3** (v1/v2 import retained), eight stores, offline shell. No cross-app data access.
- Editorial queue outputs source IDs, answer candidates, ambiguity issues and references but cannot create reviewer approval.

## Release blockers
350 genuinely independently approved P1 questions and 10 approved lessons, licensed/approved diagnostic audio, human evaluation provisions, accessibility/real-device testing, and full domain learning coverage. No machine-rated free German writing or CEFR guarantee.

See `docs/P1-completeness.md` for source-based inventory and gaps.

## M08 implementation-first
- Learner-supplied local audio, playback controls, original listening interpretation, timestamped ungraded follow-ups, resume/archive/progress, same productionEntries store; audio is never copied, cached, exported or synchronized.
- No approved audio, automatic transcription or objective listening score. M08 is not part of the seven graded modes and cannot certify a CEFR level.
