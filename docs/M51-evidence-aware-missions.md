# M51 — Daily mission evidence consistency

## Source-level defect
M47/M48/ M50 recommended conserving never-attempted exercises for delayed new-context use. The primary Today mission planner independently selected all unseen tasks as filler, replayed seen tasks as EXPLORE, and classified arbitrary M04–M07 tasks as TRANSFER. It could therefore consume the only remaining future context within a single session or accelerate a review card whose due date had not arrived. The previous Today summary called reviewed responses first attempts.

## Implemented correction
- Review steps refer only to current-version, nonwithdrawn, genuinely due cards with a corresponding earlier version-matched attempt. Their real scheduler, review event, and CAS writer remain unchanged.
- Repair steps reuse only a recent uncertain answer that has no active card. A future card is not accelerated through an ordinary unscheduled attempt.
- Transfer steps select only a real unused current-version exercise in the same authored mode, skill and topic after an observed error. This does not establish semantic generalization or CEFR proficiency.
- Explore steps contain only never-attempted source IDs. One unseen item per exact authored group is permitted per newly planned mission; the M48 elapsed-24-hour reservation is honored.
- Mission length may be shorter than its nominal capacity when sources are exhausted. It is not padded with familiar items or invented questions.
- Fresh persisted learner attempts and cards are read before a new mission is planned; existing active or paused missions keep their original IDs, step order, versions, and transactional CAS.
- Paused mission drafts are no longer automatically restored as editable exercises before the learner explicitly resumes the mission. Otherwise the stale paused session could appear answerable but reject submission under CAS.
- Today refers to actual correct answers, not supposedly new first encounters when some responses were reviews.

## Verification contract
- Pure tests cover exactly held contexts, the 24-hour boundary, distinct author topics, real due review precedence, future card protection, historical version/withdrawn source refusal, short genuinely exhausted sessions and no input mutation.
- Genuine Chromium 1280/360 exercises a seeded prior failure, prior correct new-context response, genuinely due and future card, exact persisted mission selection, real reviewed attempt and review event, pause/resume through IndexedDB and reload, and original history preservation.
- Full inherited Chromium M01–M50, Firefox/WebKit, offline recovery, A-to-B-to-A rollback and source/editorial gates must pass at the final exact HEAD. M50's earlier browser qualification was blocked by GitHub runner apt/DNS; do not claim its success until the new actual M50 browser workflow passes.

## Preservation
No new studio, new authored key, fabricated grade, IndexedDB store, data migration or approved-source promotion. Preserve the existing eight stores, stable source/attempt IDs and versions, transactional CAS, v1/v2/v3 backups, offline recovery, DEMO_ONLY and the M35 fail-closed release boundary. PR stays draft/unmerged, not deployed, not published.