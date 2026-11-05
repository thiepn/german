# Sprachgefühl M39 — release-integrity and independent evidence (NOT APPROVED)

## Scope and evidence
- Verified baseline: PR #3 `cb9a267bad74172550c1e6972c43f92b89653321`, main `f163bae160b14200fea3ce4b8494d6979a2b9143`, exact-head Actions `41761204195` SUCCESS.
- M38: 26 cases across 12 domains, 13 original author-labelled C1 and 13 C2. No G10; no rights-cleared audio.
- M39 adds a SHA-256 fingerprint to each exact v1 source/task, domain-specific human grammar and alternative-answer prompts, and four proposed v2 source fingerprints. These fingerprints show identity only and are neither linguistic approval nor proof of third-party originality.
- Run `npm run audit:m38` for the entire original source paragraphs; run `npm run audit:m39` for the review supplement.
- All cases remain DEMO_ONLY / NOT_REVIEWED; no reviewer has signed. The rights record is only an author assertion. Official CEFR calibration against external descriptors, independent C1/C2 learner work and genuine human scoring remains absent.

## Reproduced content defects and risks
- SG-G02R-002:r1: source v1 uses the grammatically incorrect `das substantivierte Finanzierung`; staged v2 fixes the explanation without changing the historical source.
- SG-G06-002:d1 and d3: v1 author-preferred option B conflicts with source context and explanation; staged v2 proposes A for both. d3 is not in the 26-sample packet and still requires independent human review.
- SG-M05-036: bare v1 sentence supports multiple grammatical verbs; staged v2 constrains the completeness-check context but remains subject to independent review of all answer variants.
- SG-M05-037: v1 `aufzeigen`/ `versprechen` is ambiguous; staged v2 specifies non-binding intent, but real communicative uses of `versprechen` may still be contextually disputed. No automatic approval.
- SG-G07-003:d1: review if the second choice about ongoing deliberation can be partly true in the full paragraph despite no final Beschluss.
- G12 oral cases: intentionally ungraded; listening to a self-recording is not human-rated speaking.
- G13 invented administrative deadlines and fake individual identifiers: keep all fictional facts clearly fictional and separate from actual legal or privacy guidance.

## Demo versus approved-only technical path
- Before M39, `registry.ts` imported six demo JSON files, while `package.mjs` wrote `dist/data/approved.v1.json` that the runtime never consumed; `check:release` would have invoked the ordinary demo build after validating counts.
- M39 moves the same immutable 202 v1 DEMO_ONLY objective items to `objectiveContent.demo.ts` and adds separate `objectiveContent.approved.ts`. Node/desktop demo import remains the same and does not activate staged v2 content.
- Vite compile-time `SG_CONTENT_CHANNEL=APPROVED_ONLY` aliases the objective loader to approved-only. `resolveContentChannel` refuses release unless an explicitly qualified complete release manifest, >=350 reviewed exercises and independent item-version approval ledger, >=10 approved lessons and an explicit G01–G13 studios qualification exists.
- `npm run check:release` now requires the explicit approved-only build channel, plus a separately gated package release. Current manifest is DEMO_ONLY, so this command MUST FAIL. A normal `npm run build` still produces only a DEMO build and is NOT publishable.
- IMPORTANT: This alias only addresses M01–M07 objective content. G01–G13 non-objective studios still import unapproved draft fixtures. The explicit `releaseStudiosQualified` hold is intentionally absent in the current manifest; future work must provide real approved-only content across all shipped paths before marking any such flag. The status string alone does not establish independent review.
- M39 does NOT change service-worker cache, domain data model, scheduling, historical source IDs, IndexedDB v4 eight stores, transactional CAS, backup v3, review/event identity, Articlewerk isolation, or old source versions. No automatic migration or live writes.

## Review acceptance and next M40
A named qualified independent German editor must review the entire original source of each candidate and v2 proposal, identify all grammatically and semantically plausible options, sign against stable source/task version and fingerprint, independently establish rights/originality evidence, and qualify CEFR bands with actual learners. No auto-signoffs. All release gates remain NO_GO until genuine human and technical checks pass.
M40 should validate release artifacts, full G01–G13 approved-only sourcing, historical v1→v2 archive safety, real Firefox/WebKit/Android/iOS, offline SW upgrades and storage recovery; do not ship or merge without explicit authorization.
