# P1 user-owned recovery — draft qualification

This batch extends the existing SG-01 branch without replacing M01–M05, the diagnostic authority gate, existing identifiers, or IndexedDB version 3.

## What exists
- JSON backup includes attempts, review cards/events, settings, active draft and diagnostic sessions, and original/updated writing entries.
- SHA-256 integrity, format version, file-size bound, structural validation, human-confirmed import.
- Import is merge-only with a single atomic IndexedDB write transaction: conflicting historical record IDs abort; existing settings/draft take precedence; no clearing or forced overwrites.
- Browser export and import paths, and unit tests for corruption/duplicates.

## Remaining constraints
- JSON is not encrypted; store downloaded backup securely.
- Distinct-item grading and real reviewed content still require independent editorial signoff.
- No cloud storage, credentials, accounts, production writes, or Artikelwerk changes.
- Full-device physical Android/IOS browser, quota exhaustion, and multi-tab stress remain NOT_TESTED until independently executed.
- No FSRS upgrade or migration is implied by this recovery feature.

## Format transition
New exports are version 2 and contain seven stores including productionEntries. Independently valid, SHA-256-signed version-1 six-store backups are still accepted and introduce an empty writing-history store. Restore remains non-destructive; colliding existing original history IDs fail closed. Writing texts are plain JSON, not encrypted. Desktop/mobile Playwright verifies round trips; physical-device use remains unverified.
