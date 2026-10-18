# P1 G08 contextual pragmatics and G09 reading-to-writing transfer

## Implementation status
- Eight original fictional G08 pragmatic decision cases (C1/C2 authoring targets). Each case contains three contextual options, an unreviewed preferred draft option, effect explanations, an immutable initial decision with learner rationale, optional free rewrite and persisted revision history.
- Four G09 audience- and register-specific reading transfer briefs tied to the four existing G09 studies. Each unlocks only after all three source-based interpretation questions are saved. A learner writes an immutable audience-specific first response and may append revised versions without changing earlier text.
- Today, Curriculum and Progress link to these workflows. No duplicate M01–M05 graders, schedulers or backup engines.

## Storage preservation and privacy
Existing `sprachgefuehl-learning-v1` IndexedDB **schema v4** and original eight object stores remain. No migration; new records are distinguished inside `productionEntries` by `kind:'PRAGMATIC_STUDY'` and `kind:'READING_TRANSFER'`, with unique prefixed IDs. Existing writing counts filter these records out. Original decisions, source IDs, and revision metadata cannot silently change on the update path. The existing owner JSON backup **format v3** includes the records; signed older v1/v2 backups remain eligible. Files include learner text in plaintext; no cloud transfer or telemetry.

## Rights and editorial limits
- All eight G08 and four G09 prompts remain `DEMO_ONLY`; 0 independent approvals. A contextual preference is not the unique universally correct choice. Rationales are authored drafts, not objective scores.
- The Council of Europe CEFR Companion volume (2020) motivates the G08 coverage of sociolinguistic appropriateness, register flexibility and pragmatic competence; it **does not certify** exercises or learners. IDS grammis supplies descriptive background for connectors. No protected examples are republished and there are no official examination claims.
- Editorial queue has **226** individual nonapproved dossiers: 178 objective items, 20 M04 writing prompts, four G09 texts, twelve reading questions, eight pragmatic situations and four audience-specific transfer briefs.
- `content/manifest.json` explicitly includes each new authoring source. Validation requires stable IDs, no reviewer, sound text/option schema, complete cross-reading associations and original-rights metadata. Read-only review dossiers include context alternatives and editorial concerns; a reviewer remains a separate human.
- The 350 approved P1 exercise goal, 50 approved P1 holdout items and 72 Diagnostic-A items remain at zero. Neither G08 nor G09 adds any auto-graded exercise or content approval.

## Acceptance priorities
Run content/editorial checks, unit suite, strict TypeScript and Vite build; Chromium desktop/mobile must prove choice+reason immutability, independent initial vs revised texts, reading prerequisite, reload, source context and backup/restore. Physical Android/iOS, external editorial correctness, authentic rights-cleared listening, calibrated self-assessment and full accessibility audits are NOT_TESTED.
