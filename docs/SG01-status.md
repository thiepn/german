# SG-01 · Implementation status (draft only)

Base: empty `thiepn/german`, minimal main initialization commit `b4f9c21f7a0b1a78f197d428bee1eeb1aaee9879`.
Branch: `feature/sg01-core-learning-foundation`.

## Present
- React + TypeScript + Vite foundation; Momentum Precision-inspired typography-first shell.
- Modes M01 Artikelblitz, M02 Kasus-Kette, M03 Präpositionsjagd with linked objective, joint-slot evaluation.
- Generalized three-track manual onboarding, Today, 13-domain catalog (10 domains unavailable), error archive, review queue, progress.
- Local IndexedDB attempt/review/draft stores; offline service worker shell registration.
- 36 **DEMO_ONLY** fixtures and 10 **DEMO_ONLY** lesson draft documents.
- Deterministic early recall scheduler `sg-recall-0.1`; not validated FSRS-6. No independent C2 evaluation.

## Not done / blocked
- 0/240 independently approved SG-01 items; 0/10 approved lessons. Do not claim content complete.
- No diagnostic A, no audio rights-cleared content, M04+ outside batch, full exporter/restorer outside batch.
- No published hosting origin; no live deployment or actual user data imported.
- No precise original Momentum Precision mockups or tokens recovered; this is a principled approximation.
- Offline install/cache and in-device IndexedDB recovery need browser qualification. Any test result must be supported by actual logs.
- TS/Vite compilation not assumed without npm deps and tests. Check these exact sources before merge.
- Must not access/edit Artikelwerk storage. No migration; `sprachgefuehl-learning-v1` has its own database name.

## Completion rule
Only count an exercise if item status REVIEWED has independent editorial and source/rights validation and it is published by the editorial pack builder. Current demo fixture is explicitly not an approved pack.
