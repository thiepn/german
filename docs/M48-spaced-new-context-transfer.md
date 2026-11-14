# M48 — Real spaced independent new-context transfer (development only)

## What the M45–M47 audit found
- M47's suggestions could exhaust several same-topic first encounters in the same session immediately after a correct first unseen context. It offered no enforced time-separated opportunity for later transfer.
- \`buildErrorClusters\` previously called a topic "reapplied" if **any** two later correct responses to different items fell on different UTC calendar days; it could count multiple same-item reviews or two responses five minutes apart on opposite sides of midnight. These are inadequate evidence of *independent delayed application*.
- A current-version objective error topic is still just the author's mode, skill ID and topic grouping, **not** verified common error causality.
- M46's free-writing revision remains ungraded; it cannot validate an objective misconception.

## Implemented vertical slice
- The existing error projection identifies only **unhinted, first-ever, correct answers** to distinct never-failed current-version authored exercises in the same mode, skill and topic, after the last observed error. Reviews of failed items, same-item retries, hinted responses, withdrawn/changed-version sources and prior failed items do not count.
- A topic is described as "in new contexts reapplied" only after at least **two different correct first answers separated by a full elapsed 24 hours** after the latest observed failure. Correct performance is documented, not equated with a retention probability or C2 proficiency.
- After the **first** new-context correct answer, the recommender **reserves** remaining matching authored contexts until the 24-hour threshold, while real due review cards remain available normally; other topics remain trainable. After the threshold, the next exact same-topic unseen context becomes eligible. If no source-context exists, show that limit honestly rather than pretending to test transfer.
- No new scheduler or local persistence: this is a **read-only projection** of existing original \`Attempt\` records and reviewed item versions. Today, Progress and the existing Error Archive explain the waiting interval and distinguish novel correct first attempts from normal due review attempts.
- M45 continues exact original source work before switching studies. M47's domain-based source suggestion remains a related deepening opportunity, not an inferred diagnosis. M46's source-writing records remain untouched.

## Boundaries, tests, and approval
- No extra IndexedDB store, no schema migration, new session/state, CAS writer, altered backups, new UI studio, CEFR model, AI feedback or editorial human review.
- Pure tests cover immediate same-item correct review excluded, first answer held until 24h, actual elapsed time across midnight, two distinct first correct answers >=24h apart, new failures resetting observation, hints, wrong versions, first-attempt semantics and historical content.
- Real Chromium desktop + mobile: wrong item -> correct immediate review -> first correct different item -> same-topic hold -> isolated fixture time backdating without mocking browser timers -> second correct different item -> versioned Progress and Error Archive -> reload; verify actual attempted IDs and no invented attempts.
- Full existing Node/content/TS/Vite, Chromium M01–M47, Firefox/WebKit, offline recovery, A→B→A rollback required at **exact final HEAD**. No merge, deployment, publication or licensing bypass. DEMO_ONLY and zero authorizations remain.
