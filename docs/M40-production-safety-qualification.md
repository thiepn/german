# M40 — Production safety qualification (NO-GO)

## Verified starting state
- Same open draft PR #3, starting SHA `662000e288c22dbfa8392f22fd443057df0c1fa2`; main `f163bae160b14200fea3ce4b8494d6979a2b9143`; 61 ahead, 0 behind; exact-head Actions #41813798751 SUCCESS.
- All new work is non-publishing, non-migratory, and retains the M35 feature freeze, DEMO_ONLY rights holds, original item/source IDs, CAS, IndexedDB v4 eight-store schema, backup v3.

## Identified and reproduced release safety problems
1. The M39 approved-only import selector covers objective M01–M07 content, but many G01–G13 studios still statically import full `.demo.json` original source packs. A manifest claim alone cannot make those studios release-safe.
2. `public/sw.js` had a hard-coded `sprachgefuehl-shell-0.1` cache identifier. The worker file could remain identical after a Vite asset rebuild, so an existing registration might not install a new worker and refresh the shell.
3. Future activation of v2 source proposals is unsafe without version-qualified persistence identity. In particular, the existing production entry ID `relative:SG-G02R-002` is based on stable source ID only; silently replacing that source with v2 would make historical v1 entries collide or lose exact source resolution. **No M40 v2 activation, ID migration or archive rewrite.**
4. Valid source provenance and rights/CEFR review have not been established by humans; no release artifact can be considered qualified.

## M40 minimal safeguards
- `scripts/content/releaseBoundary.mjs` conservatively inventories **direct fixture imports** across `src` and FAILS if `APPROVED_ONLY` is requested while any `*.demo.json` source remains. The check is used by Vite itself (not merely the npm script). Its coverage is deliberately conservative/static; it does not prove the complete bundle has no unapproved material.
- `verifyNoDemoLeakage` explicitly scans the output artifact text for `DEMO_ONLY`, `AI_DRAFT`, `ORIGINAL_DRAFT` and demo-pack identifiers and rejects their presence. These are **negative release checks**, not publication or proof of originality. Ordinary preview intentionally contains DEMO_ONLY material.
- `npm run check:release` now requires all existing approval checks PLUS an approved-only build and artifact check. **Current 0-approval manifest must fail**; do not change thresholds to obtain a green release.
- `scripts/offline/stamp-worker.mjs` produces a deterministic SW cache revision from the built index, assets, manifest, icon, approved-only data pack and template. The script changes only `dist/sw.js`, never data stores. Existing worker install precaches a complete shell before activation; activation removes old shell caches only after installing its own assets. No unconditional cache deletion/migration is authorized.
- New Node tests use intentionally malicious fake source and artifact outputs to prove fail-closed behavior; SW revision stamping is proven deterministic with actual file-byte modifications.
- New browser coverage: the existing full Chromium desktop/mobile chain plus a targeted real browser SW legacy-cache replacement/offline reload; separate real Playwright Firefox/WebKit engines exercise desktop/mobile learning, v1 attempt persistence and all eight IndexedDB stores.

## Versioned source and backup durability
- Staged original-grammar correction `SG-G02R-002`, reversed-key fix `SG-G06-002` and ambiguous M05 proposals remain **four unreviewed version-2 objects only**, not active fixture or released source.
- Explicit signed legacy backup v1 six-store, v2 seven-store and current v3 eight-store tests preserve v1 item versions and historical first drafts/revisions, reject tampered source versions and do not invent records absent from older formats. Existing CAS, backup import merge, historical archive, multitab and original source tests remain part of CI.
- The new SW build fingerprint and cache eviction tests do NOT prove safe rollback under every offline/multiple-old-tabs scenario. Physical iOS/Android and human accessibility testing remain untested.

## Human gates and GO/NO-GO
- **Technical qualification** is determined only by the latest final SHA and its actual CI results; never cite an earlier commit's green run as current-head evidence.
- **Content editorial/rights:** 0 independently approved P1/350, approved lessons 0/10, pilot holdouts 0/50, Diagnostic A 0/72, G10 cleared audio absent, and 26 private-alpha sources unsigned. CEFR author tags and originality assertions are not independently verified.
- **Release: NO_GO**, **private alpha: NO_GO**, **editorial approval: NO_GO**, **publishing permission: absent**.
- There is NO merge, deployment, signing, tagging, live migration, DNS update, native device approval or release flag.

## M41 only if M40 technical CI is fully green
Focus on real independent editorial approval of the 26-source packet, precise accepted-alternatives adjudication, content ownership/rights evidence, and actual C1/C2 learner calibration. In parallel, prepare a version-aware source loader preserving historical entries, qualified approved-only content for every shipped G01–G13 studio, reversible offline cache upgrades, and independent physical-device/accessibility validation. Do not reopen feature expansion or alter learner data; M41 continuation requires explicit next task.


## M40 reproduced offline-upgrade defect (post-qualification finding)
- The real changed-script SW update on Chromium returned cached index.html (HTTP 200), and the actual build's two hashed JS/CSS files were present in Cache Storage; nevertheless their offline subresource requests failed with `net::ERR_ABORTED` after a worker update. Reproduced by focused Actions #41823201400, not a simulated or assumed failure.
- A minimal static-shell fix changes Cache API matching ONLY for immutable hashed `/assets/*.js` and `/assets/*.css` to use `ignoreVary:true`. Other same-origin requests remain strictly matched to avoid accidentally returning a different authenticated/variant response. The existing cache namespace, install/activate semantics and IndexedDB are unchanged.
- **Qualification required:** independently rerun the focused real Chromium offline-upgrade job and the full exact-head Chromium/Firefox/WebKit suites. No PASS claim until all finish. Different Vary headers are a plausible cause, not independently proven without response-level header inspection.
