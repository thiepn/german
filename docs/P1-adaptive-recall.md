# SG-01 adaptive review 0.2 — development gate

- sg-recall-0.2 remains a deterministic heuristic, not FSRS-6, a scientifically calibrated retention probability or any CEFR grade.
- The schedule uses observed elapsed time since the last review, the previous interval, difficulty and lapse history. Cards from sg-recall-0.1 are not migrated in place; only a new retrieval advances them.
- Review first attempt, event and next card must be written in one IndexedDB readwrite transaction and compared to the previously read card. A conflicting tab's attempt is rejected entirely; historical IDs are never reassigned.
- Grade mapping: correct=Good, partially correct=Hard, incorrect=Again. An ungradeable item must not advance a review.
- Observed delay evidence counts only reviews linked to a first attempt made at least 24 hours after an earlier attempt for the same item version. A sample percentage is hidden until at least five delayed reviews, three items and two dates.
- Outstanding blockers: no independent German linguistic approvals; limited empirical tuning; retention is not validated across months; physical devices and accessibility not qualified.
- No new store, IndexedDB migration, backup container migration, cloud or account added.
