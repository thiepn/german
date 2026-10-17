# SG-01 / P1 implementation status — 18 October 2026

## Qualified implementation (draft PR #1)

- Five working draft modes: M01 Artikelblitz, M02 Kasus-Kette, M03 Präpositionsjagd, M04 Satzlabor, M05 Kollokationsduell.
- 104 original demo items: M01 12, M02 12, M03 12, M04 33, M05 35. All `DEMO_ONLY`, editorial approval count **zero**.
- Ten original draft lessons, all `DEMO_ONLY`.
- Responsive Momentum Precision-inspired Today, curriculum, practice, feedback, error archive, review loop, progress and entry-profile flows.
- Local IndexedDB database `sprachgefuehl-learning-v1` schema version 2; additive diagnostic store leaves original schema v1 data intact.
- Diagnostic A authored blueprint of 72 items/13 domains, pause/resume/response capture and human-assessment hold. No reviewed items are currently eligible, so public diagnostic is disabled.
- Approved-only pack builder, editorial provenance and independent-review release gate (requires 350 approved P1 items).
- Offline application shell and draft review scheduler (`sg-recall-0.1`, not certified FSRS).
- Source-level tests and Chromium desktop/mobile acceptance under `.github/workflows/sg01.yml`.

## Still missing, not eligible for release

- 0 / 350 independently approved P1 exercises and no independently approved lesson. More demo drafts are not equivalent to editorially qualified content.
- 0 / 72 diagnostic-A approved items; real rights-cleared listening audio and manual assessment capacity missing.
- No complete reading/listening/writing/speaking/mediation learning studios.
- No privacy-reviewed export/restore with verified round trip, secure multi-device continuity or synchronized accounts.
- No full production-grade FSRS implementation or external calibration of mastery/CEFR levels.
- No original full Momentum Precision design artwork recovered, no physical Android device validation.
- No deployment, DNS change, merging or production data modifications.

## Authority boundaries

`thiepn/artikelwerk` stays separate and intact. `thiepn/german/main` contains only the initial bootstrap README. Every app change resides on the same draft PR #1. Correctness claims are limited to exact-head automated test evidence; no external pedagogical or linguistic certification has occurred.
