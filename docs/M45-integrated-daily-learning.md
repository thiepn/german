# Development-first integrated C1–C2 daily cycle (draft, DEMO_ONLY)

## Scope and observed learner problem
Existing daily missions only plan M01–M07 objective answers. Thirty other G01–G13 studio links exist but are separate journeys, and source writing/revision progress is visible only in individual studios/Archive. There is no coherent step-by-step way to complete objective practice, source analysis, independent text and revision in one study cycle.

## Implementation
- **One read-only selector** (\`src/domain/journey/dailyCycle.ts\`) derives a four-stage learning path from the existing attempt, review-event and source-versioned \`productionEntries\` authority. No new IndexedDB object store, scheduler, grading, session identity or account integration.
- A learner begins the existing daily mission or genuinely due recall, follows a *single exact* G01–G13 source study, writes its independent transfer text after completing its original source tasks and then revises the same text. Both Today and Progress show the same observed completion state. Source steps can span multiple days; *today* applies only to objective attempts.
- Source choice first resumes today's saved source, then unfinished source writing/revision, then balances less-used existing studios. The first objective-domain evidence is a tie-break, not a fake diagnosis. Source continuation uses \`ArchiveRow\` / \`openArchived\` and never substitutes another source/version.
- The initial source-writing roster covers G01–G09 and G11–G13. G10 learner-owned audio remains available through Curriculum but is deliberately excluded from this written-transfer cycle; it is not a licensed audio corpus or evaluated listening diagnostic.
- G13 deliberately recognizes its actual \`AUDIENCE:<id>\` / \`REWRITE:<id>\` events rather than inventing \`TRANSFER\` events. Other included studios use existing \`TRANSFER\` / \`REWRITE\` markers. Incomplete source tasks do not automatically count as independent writing.
- An active/paused daily mission prevents entering the separate source workflow from the cycle, preserving mission continuity. Existing separate studio, Curriculum, writing, error-archive and review navigation remains.
- Actual repeated errors still live in the existing Error Archive, and delayed retrieval counts only real review events; no free-writing score, CEFR claim or independent rights approval is generated.
- The current source planner is intentionally **v1-only**, excluding inactive v2 draft versions and unknown historical source versions from automatic continuation. Any future activation requires explicit qualified version handling.

## Verification contract
- Pure tests: all available domain actions, local-day boundary, due/retrieval vs ordinary attempt, factual first source/transfer/rewrite progression, safe exact-source continuation, G13 audience markers, old-version hold and nonmutation.
- Genuine desktop/mobile Chromium: onboarding → objective attempt → source analysis → resume exact study → two remaining source anchors → independent transfer → substantive revised text → Today / Progress → reload. Existing complete CI covers Chromium and independent Firefox/WebKit, offline SW upgrade, two-build A→B→A rollback, backup 1/2/3, eight IndexedDB stores and CAS.
- Technical PASS is only established for a successful final exact-head CI run. The entire app, including these exercises, is still DEMO_ONLY, draft/unmerged, editorial/rights/alpha/release NO_GO. No deployment or publication.
