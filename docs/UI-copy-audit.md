# UI copy cleanup — Sprachgefühl draft PR #1

## Scope
- Native shell/navigation: removed tagline, duplicate prototype notice and ornamental top-level footer.
- Onboarding: concise track options, diagnostic distinction and local-data caution retained.
- Today: removed motivational headline/subtitle and four static pseudo-mission rows. Actual mission progress, due counts, recommendation and actions remain.
- Curriculum and training: removed redundant per-card descriptions and generic helper copy; retained labels, exercise content, available/disabled modes and explicit demo state in relevant contexts.
- Practice, feedback, errors and review: kept model explanations, original attempts, timestamps and warnings necessary to avoid misleading proficiency claims. Removed generic coaching copy and repeated grading disclaimers.
- Diagnostic A/P1: retained essential gate counts, missing rights/review prerequisites and user-facing inaccessibility state.
- Writing, reading, transfer, pragmatics, listening: kept original learning prompts, rationale, source citations, ungraded/rights disclosure, privacy and media-identity consent; removed recurring descriptions around saved content.
- Progress and archive: kept actionable data, filters, original text, revisions, evidence and date context; removed repeated self-congratulatory/quality disclaimers.
- Data backup: retained privacy warnings, conflict behavior, integrity and original-audio recovery instructions.
- Typography/layout: small/supporting classes, tags, kickers, banners, metadata and metrics use 14px; compact mobile navigation labels use 13px at 360px, 12px at <=350px. Removed styling for deleted mission steps.

## Test scope
Chromium captures rendered pages and checks main headings, horizontal overflow, panel bounds and computed supporting-text sizes at 1280px and 360px. It covers onboarding, Today, diagnostic, writing, reading, pragmatics, listening, data, curriculum, training, reviews, errors, progress and archive. Existing interaction, offline, backup, multi-tab, review and desktop/mobile tests run unchanged apart from the offline assertion targeting the retained navigation rather than deleted metadata.

## Boundaries
No domain models, content fixtures, grading, database writers, storage schema, saved user entries, source rights or CEFR gates changed. No production deploy. Screenshot bytes are inspected programmatically for existence and layout; this is not a manual pixel-level design review.
