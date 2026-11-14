# M52 — Draft source-topic integrity in adaptive training

## Independently reproduced classification defects in original DEMO_ONLY sources

Inspection of original authored prompts, topic metadata and their own explanations establishes 12 current v1 mismatches:
- SG-M04-006: unreal past conditional, not Indirekte Rede.
- SG-M04-012: nominalization, not Konjunktiv und Irrealität.
- SG-M04-013: participial adjective, not Nominalisierung.
- SG-M04-018: participial attribute, not Nominalisierung.
- SG-M04-024: concessive obwohl clause, not Partizipialattribute.
- SG-M04-029: temporal kaum-hatte sequence, not Konzessive Verbindung.
- SG-M05-001–006: six fixed collocations, none of them indirect speech, though all labelled Indirekte Rede.

M47–M51 inferred cross-exercise context from mode, skill and author topic. A source-label mismatch therefore conflated unrelated grammatical errors, delayed first attempts, and repeated-topic evidence.

## Production behavior
- Added a strict source-ID **negative** classification guard to src/domain/content/topicIntegrity.ts. Unflagged sources are NOT thereby editorially approved. All original source fixtures, versions, solutions and stable IDs remain intact.
- Exact-version current flagged sources remain individually trainable and their real due review cards remain eligible. But their errors are projected as separate source-only histories, not paired with other exercises. They do not create cross-item inferred success, delayed reconstruction sequences, exhausted-context comparisons or recommended novel daily-mission tasks.
- Genuine source-aligned Indirekte Rede first attempts SG-M04-001 through SG-M04-005 remain eligible for the existing delayed transfer/reconstruction workflow. Known mismatch SG-M04-006 is excluded from that inference without changing its original learner data.
- Error Archive exposes the exact mismatch explanation. Progress distinguishes observed comparable topic groups, historical versions and currently mislabeled DEMO_ONLY sources.
- Unverified broad topical categories such as Gesellschaft and Wortverbindungen im Kontext must not be treated as professionally validated shared linguistic misconceptions. This guard is a narrowly scoped correction, not linguistic approval, CEFR calibration or exhaustive answer-key verification.

## Qualification
New Node checks read the original live source fixture content, assert the 12 documented mismatches, verify kept old answers, coherent new source selection, no fictitious cross-context success, and genuine reviewed-card eligibility. New Chromium 1280/360 regression verifies exact-version feedback and original answer archival, an available correctly matched first new context, current source mismatch warnings, Progress and eight-store data persistence across reload.

Retain all prior M01–M51 real Chromium desktop/mobile, Firefox/WebKit, offline recovery, A-to-B-to-A rollback, editorial and TypeScript/Vite/Node tests. Report only exact-final-SHA terminal evidence. No new studios, source version changes, IndexedDB stores, CAS changes, backup v1/v2/v3 changes, human editorial approvals, merge, release, deployment or publication. DEMO_ONLY and fail-closed gates remain unchanged.
