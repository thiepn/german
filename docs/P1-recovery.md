# P1 user-owned recovery — draft qualification

This batch extends the existing SG-01 branch without replacing M01–M05, the diagnostic authority gate, existing identifiers, or IndexedDB version 2.

## What exists
- JSON backup includes attempts, review cards/events, settings, active draft and diagnostic sessions.
- SHA-256 integrity, format version, file-size bound, structural validation, human-confirmed import.
- Import is merge-only with a single atomic IndexedDB write transaction: conflicting historical record IDs abort; existing settings/draft take precedence; no clearing or forced overwrites.
- Browser export and import paths, and unit tests for corruption/duplicates.

## Remaining constraints
- JSON is not encrypted; store downloaded backup securely.
- Distinct-item grading and real reviewed content still require independent editorial signoff.
- No cloud storage, credentials, accounts, production writes, or Artikelwerk changes.
- Full-device physical Android/IOS browser, quota exhaustion, and multi-tab stress remain NOT_TESTED until independently executed.
- No FSRS upgrade or migration is implied by this recovery feature.
