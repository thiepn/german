# M38 — Private-alpha qualification preparation (NOT APPROVED)

## Verified starting point
- Base: draft PR #3, HEAD 80629346c0d71baca5efbb92e3dfda58f3ea65f2; main f163bae160b14200fea3ce4b8494d6979a2b9143; 56 ahead / 0 behind.
- CI baseline: Actions 41244243056, successful at the exact starting HEAD, including Node/content/editorial, TypeScript, Vite and Chromium desktop/mobile.
- V1 feature freeze remains. No merge, deployment, migration, language-editor approval or publication was authorized.

## Reproduced source defects and versioned proposed remedies
1. SG-G02R-002:r1 (C2, G02): feminine noun die Finanzierung is incorrectly introduced as das substantivierte Finanzierung in the v1 explanation. The staged v2 corrects the model only; v1 is preserved verbatim.
2. SG-G06-002:d1 (C1, G06): technical backup is option A, but v1 author-preferred ID is B. The v2 draft changes only that key.
3. SG-G06-002:d3 (C1, G06): formal registration of inventory notes is option A, but v1 author-preferred ID is B. The v2 draft changes only that key.
4. SG-M05-036 (C1, G07): v1 prompt permits semantically possible alternative verbs; staged v2 adds the explicit on-completeness checking construction and refreshes explanation.
5. SG-M05-037 (C1, G07): v1 prompt permits both promising and showing a perspective; staged v2 specifies an explicitly nonbinding communicative intent and refreshes explanation.

Staged drafts and exact v1 snapshots are in content/editorial/m38-versioned-drafts.json. All remain DEMO_ONLY, ORIGINAL_DRAFT and NOT_REVIEWED.
The active JSON fixtures and runtime retain historical v1. A proposed v2 does not constitute a qualified, published or activated correction; do not silently rewrite v1.
If future review approves a v2, implement version-aware lookup and separate persistent entry keys, archive fallback and migration-free CAS, backup v3 and multi-tab regressions before any activation.

## The 26-case reviewer packet
Run:
```bash
npm run check:editorial
node scripts/editorial/m38Qualification.mjs --markdown > m38-independent-review.md
```
The generated, read-only Markdown includes all three original paragraphs, exact quote, all currently authored choices, stored preferred answer, explanatory text, author-provided rights claims and explicit BLANK human review fields per sample. Full independent review must cover the complete case, not just the quotation, and identify additional plausible alternatives. Any `preferredId` in the packet is an unverified author draft, not an endorsed correct answer.

Independent reviewer requirements:
- Named qualified German editor independent of source author; document evidence of authority and independence.
- Review all source paragraphs, gender/case/valency, idiom, register, speaker and referent scope, legitimate alternatives, distractors, free-response limits and corrected meanings.
- Record originality and rights evidence; `ORIGINAL_DRAFT` is a self-description, not a clearance or external plagiarism check.
- Calibrate proposed C1/C2 bands against external CEFR descriptors and actual advanced learners; do not self-certify level or proficiency.
- Log date, exact source ID/version, reviewer, findings, accepted alternatives, requested v3 revisions or rejection, approval reference and signatures outside this generated packet.
- Do not mutate approval-ledger.json, approved.json, diagnostic holdouts or production flags without genuine authenticated editorial authority.
- G10 remains excluded: no approved, rights-cleared bundled audio corpus.

## Production-content separation audit
- Runtime: src/domain/content/registry.ts statically imports six DEMO_ONLY objective fixtures; App.tsx uses those allItems for sessions. No accepted runtime path to approved-only content was found.
- Build: scripts/content/package.mjs writes dist/data/approved.v1.json using content/approved/approved.json; this output is not read by the current runtime.
- Gate: scripts/content/validate.mjs --release blocks fewer than 350 approved items, and check:release still must FAIL with zero approvals. This must not be bypassed.

Minimal future integration plan (NOT implemented in M38):
1. Define an immutable versioned content manifest and a build-mode distinction: DEMO internal testing versus RELEASE independently approved only; strict fail-closed packaging.
2. Wire release runtime to the bundled approved-only artifact (not to DEMO fixtures). On release builds, reject DEMO_ONLY content in source graph, HTML, JS and offline cache; verify source IDs, editorial ledger/rights evidence and withdrawal constraints.
3. Preserve identity as (item ID, source version) in attempts, review cards, archive and continuing drafts; never silently reinterpret v1 answers as v2. Use stable v1 mapping or non-destructive retained lookup for old entries and a separate v2 session identity.
4. Regression-test historical backup v1/v2/v3 imports, all eight IndexedDB stores, CAS, multi-tab/offline upgrade, old sessions, and original source history before changing active content.
5. Keep G10, Diagnostic A and pilot holdout gated until separately reviewed. Verify release artifact no longer exposes unqualified exercises and that service-worker upgrades clear old demo bundles safely.
6. Only after successful release checks, human QA, rights review and explicit authorization: merge, deploy, verify rollback, and publish.

## QA and authority boundaries
- M38 script is strictly read-only, rejects historical/v2 drift and fake editorial statuses, and renders a complete human review checklist.
- No new skill, UI, scoring/storage/account engine, data migration or changes to production CI release thresholds.
- PASS of Node/TS/Chromium tests does NOT establish linguistic correctness, learning outcomes, originality or human signoff.
- Private alpha NO_GO, editorial NO_GO and full release NO_GO until all required human gates pass.

## M39 scope
Prioritize external reviewer feedback on the exact 26-case packet, versioned linguistic corrections and acceptable alternative answers. Never fabricate independent approvals or CEFR grades. Only then consider release-target-specific course content, assessment, authentic audio and the isolated approved-content pipeline. Preserve eight stores, CAS, backup v3, source IDs, V1 freeze and draft PR #3.
