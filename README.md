# Sprachgefühl — Advanced German Mastery

A generalized, local-first German C1–C2 learning application under active development.

**Status:** draft implementation, not released. No public hosting or data synchronization. The current exercises are **DEMO_ONLY**, not linguistically certified or independently approved.

## Learner experience (P1 draft)

- Entry profiles for B2+ → C1, C1 → C2, and C2+ refinement, with the common curriculum open to everyone.
- M01 Artikelblitz, M02 Kasus-Kette, M03 Präpositionsjagd, M04 Satzlabor (constrained sentence forms), M05 Kollokationsduell (contextual collocations).
- Today recommendations, curriculum navigation across 13 domains, answer feedback, contextual Error Archive, recall scheduling, and evidence-based Progress.
- Diagnostic A infrastructure: 72-item section blueprint, pause/resume, immutable responses and pending human assessment for open responses. **Not available to learners without independently approved full-form content and audio.**
- IndexedDB learner records, additive database upgrade to v2 preserving old attempts; offline application-shell caching.

The current content inventory consists of **104 unreviewed demo items (12+12+12+33+35)**, plus 10 unapproved micro-lesson drafts. Approved content: **0**. No C1/C2 outcome should be inferred from these practice items.

## Repository & safety

Canonical repository: `thiepn/german`. Do **not** migrate from `thiepn/artikelwerk` or reuse its data keys. Sprachgefühl database: `sprachgefuehl-learning-v1` (IndexedDB schema version 2). The database name intentionally stays unchanged during the additive schema upgrade. The app has no account system and no backup/restore release qualification; **do not clear site data**.

All M01–M05 demo content comes from draft assets under `content/fixtures/`. The approved-only build pack at `dist/data/approved.v1.json` does not include demos. Release packaging cannot be called ready until required independent editorial records are present.

## Build and qualification

Prerequisites: Node.js 22+, Chromium via Playwright.

```sh
npm install --no-package-lock --no-audit --no-fund
npm run check
npx playwright install chromium
npx vite preview --host 127.0.0.1 --port 4173
# in another terminal:
npm run test:browser
```

`npm run check:release` is intentionally **expected to fail** until 350 approved P1 items have genuine independently reviewed source/rights records. Its failure is a release protection, not a CI regression.

See [content policy](docs/editorial/P1-content-policy.md) and [P1 completeness](docs/P1-completeness.md).

## Non-goals and blockers

No public domain, deployment, import/migration of Artikelwerk, credentials, third-party paid APIs or production writes. No fabricated audio, C2 exam grading, AI writing judgment or editorial approval. Advanced writing, speaking, listening, mediation and the full 1,600-item corpus belong to future phases.
