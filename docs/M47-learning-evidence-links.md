# M47 — Evidence-linked objective practice and source-writing recommendations (development only)

M46 already passed exact-head CI #42985657411. It accurately preserves source-based cold reconstruction and correction histories but does not inform the objective practice recommender. The old "chooseSession" only prioritizes due/unseen counts. M47 connects the existing **errorProjection**'s version-specific topic clusters, authentic due cards, the 12 source-capable G-domains, and M46's exact-source delayed writing counts without adding state or grading.

## Actual learning behavior
- Objective due cards for **current, non-withdrawn versions** take priority over optional suggestions; choose the earliest due timestamp. Otherwise, offer a **different untried authored task with the exact same mode, skill ID and topic** after an observed uncertain objective attempt. A new task must never be mistaken for a retake, a scheduled recall or proof of recovery.
- Multiple different failed exercises in a current-version cluster count as **repeated evidence** (not multiple retries of the same task). If no source work is actively resumable, Today recommends a source-writing studio in the same G-domain. Existing source work, exact item IDs and histories always take precedence. The domain association does **not** establish that the writing exercise is targeted to, or fixes, the objective misconception.
- The Error Archive itself remains the authority for actual incorrect attempts, historical versions, successful new contexts and immutable first answers. No independent new cluster scoring, AI diagnosis, grading or mastery estimates are created.
- M46 delayed native writing in the same G-domain is counted as **observed activity**: completed recall+repair pairs, pending corrections and due cold recalls, without interpreting quality. Cross-skill or cross-topic success is not inferred.
- Today identifies the actual reason for the chosen focus ("due card", "unused matching context", or ordinary fallback). Progress combines observed objective errors with separately observed source writing and offers the exact next unused context only when appropriate.
- If no fresh context exists, the UI says so by omission; no repeated item is silently labeled "new".
- G10 remains without a licensed audio corpus. Content still DEMO_ONLY, independent approvals 0. The M35 data-engine freeze remains: eight stores; CAS; backups v1/v2/v3; exact historical source identities, M38/M42/M43 inactive draft versions, offline recovery and A→B→A rollback unchanged.

## Verification
- Unit: single vs distinct failed tasks, current vs old versions, two fresh later correct tasks across distinct days, due priority, old source continuation, domain link, observed M46 pair counts.
- Browser: genuine Chromium 1280 and 360; first failed SG-M01-001 -> exact untried SG-M01-005 -> second uncertain first attempt -> next SG-M01-009, explanatory source link + Progress, no fabricated attempt on suggestion, reload persists unchanged data.
- Requalify on exact HEAD: content and editor structural gates, Node/TS/Vite, full Chromium M01–M46, independent Firefox/WebKit, genuine offline recovery and two-build A→B→A rollback. Failure requires reproducible focused repair.
- No merger, deployment, publication, external review or signoff.
