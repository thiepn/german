# Sprachgefühl — Advanced German Learning

Generalized German B2+→C1, C1→C2 and C2+ refinement platform. **Draft only, not deployed.** All available authored exercises are `DEMO_ONLY` and **none has received independent language-editor approval**.

## Native learner experience

- M01 Artikelblitz, M02 Kasus-Kette, M03 Präpositionsjagd, M04 Satzlabor, M05 Kollokationsduell, M06 Wortgefühl, M07 Stilwechsel with shared deterministic grading and persistent Error Archive.
- Momentum Precision-inspired responsive Today, five-mode practice, finite resumable daily mission, 13-domain curriculum overview, spaced review and evidence-oriented Progress.
- G08 pragmatic situation lab: eight ungraded decision-and-justification scenarios with effect comparison and immutable optional rewrites; no automatic C1/C2 award.
- G09 audience-directed written transfer: four separate briefs unlock only after all evidence questions are recorded. Writing remains ungraded.
- G09 advanced reading: four original fiktive C1–C2 texts, twelve evidence-referenced interpretation questions, persistent reading notes and direct M04/M05 transfer (no automatic scores).
- M04 writing studio: 20 original draft prompts; immutable first draft; structured self-check lens, guided revisions, word-level comparison, saved revision history and priority for unfinished work. Free writing has **no automatic correctness score**.
- M06 Wortgefühl and M07 Stilwechsel: constrained semantic and register choices; no automatic assessment of free production.
- M05 contextual collocations with alternatives; 12 further dictionary-linked drafts. Dictionary anchors attest lexical expressions only, not the pedagogical correctness of newly written example sentences or distractors.
- Diagnostic A (72-item plan) and a separate 50-item P1 holdout diagnostic pilot are blocked until actual independent approvals exist. No fake CEFR certification.
- User-owned local IndexedDB (database `sprachgefuehl-learning-v1`, additive schema **v4**) and JSON backup with SHA-256 integrity, merge-only recovery and format **v3**. Legacy format v1/v2 files remain readable. Missions, writing versions and attempts retain native IDs. Exports contain personal text in plaintext.

## Content authority

- **202 objective DEMO_ONLY items** distributed across M01–M05, plus **20 ungraded DEMO_ONLY writing prompts** and 10 draft micro-lessons.
- **0/350** independently approved P1 exercises; **0/50** approved P1 holdout items; **0/72** approved Diagnostic A items.
- `content/manifest.json` is the authoring source list. `scripts/editorial/reviewQueue.mjs` dynamically discovers all declared candidates and prints review dossiers; it never authorizes content.
- `content/editorial/lexical-anchors.json` records six Duden headword pages as lexical reference points only; no external example paragraphs were copied.
- `scripts/content/validate.mjs` enforces fixture structure and editorial release gates; approved-only pack excludes all demos.
- Never import, rename or overwrite `thiepn/artikelwerk` browser records.

## Development checks

Node.js 22+ with Chromium installed via Playwright.

```sh
npm install --no-package-lock --no-audit --no-fund
npm run check
npm run check:editorial
npm run check:release  # expected FAIL until editorial approval
npx playwright install chromium
npx vite preview --host 127.0.0.1 --port 4173
# another terminal
npm run test:browser
```

No deployment, DNS configuration, credentials, paid APIs, migrations of other apps or production data writes. PR #1 remains a draft; see `docs/P1-completeness.md` and `docs/editorial/P1-content-policy.md`.

## M08 Hörschärfe — learner-owned audio

Choose a local audio recording you are permitted to use, replay at adjustable speed, seek and save a first interpretation plus time-anchored notes. Only those authored texts and their timestamps are stored in original IndexedDB v4 `productionEntries` and backup v3; audio, filename and transcripts are never stored, uploaded or backed up. No CEFR level or automatic listening grade is assigned. Re-select the original file after refresh. All four scaffolds remain unreviewed DEMO_ONLY material.
