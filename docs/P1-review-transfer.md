# P1 review-to-new-context transfer

- Following an atomic retrieval review, a separate task from the exact authored mode and skill is offered only if unattempted and current; a different authored topic is preferred.
- No alternative task is fabricated if the corpus cannot support one. A source exercise that changed version or is withdrawn will not trigger transfer.
- The existing immutable attempt store records the first contextual answer with a session ID prefixed review-transfer:, derived from the original review session ID. No additional scheduler event or new data store is added.
- A persistent UI in the Review Queue shows the latest reviewed cards and documented context applications after reload.
- Progress displays observed correct first transfer answers without mastery, CEFR or FSRS certification. All content remains DEMO_ONLY until independent approval.
- The original versioned cards, first answers, eight IndexedDB stores, portable backup v3 and legacy v1/v2 import are unchanged.
- Qualify browser desktop/mobile, duplicate review prevention, offline access, and export/restore before release.
