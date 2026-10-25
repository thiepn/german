# P1 Writing Archive — retained learner evidence

## What was implemented
**Schreibspuren** is a read-only archival view over the existing \`productionEntries\` store. It draws on M04 Satzlabor first drafts and revisions, G08 pragmatic decisions and rewrites, G09 reading interpretations and paragraph-grounded answers, and G09 audience-specific reading-transfer drafts.

Learners can search their own original text, every saved revision, contextual prompt titles, recorded self-review reflections and explicitly checked criteria. Filters narrow by original feature owner, revised vs first-only state and recent activity. Results are chronological, with native IDs and source versions visible. Historical entries whose source manuscript has been retired remain readable with their original IDs and a clear missing-source warning.

The archive shows immutable first texts, appended revised texts, saved reasoning and selected evidence paragraphs, plus a reversible word-based comparison of adjacent versions using the **existing** revision-diff algorithm. It reports only observed actions (number of drafts, saved versions, reflection records, marked self-checks and active calendar days), never infers correctness, improvement or CEFR level. The same original writers remain responsible for any subsequent revisions, and archive source links open the appropriate original studio at the corresponding prompt/scenario/reading unit.

## Ownership and persistence
No new IndexedDB object store, backup payload version, event ID system, scheduler or history writer. Original \`productionEntries\` data is queried using the existing read-only \`loadProductionEntries()\`. Existing IndexedDB name/version \`sprachgefuehl-learning-v1\` / **v4** and signed owner backup **v3** with v1/v2 import remain unchanged. The archive is local only, does not send queries elsewhere or attempt to evaluate writing.

## Regression evidence
Unit tests verify mixed-category projection, search across revisions, filter inclusion/exclusion, date ordering, historical fallback, read-only counts and original-to-revision pairs. Chromium desktop/mobile tests exercise genuine M04 writing, saved revisions, search, source navigation and reload continuity. All existing original suites are retained in the same PR.

## Known limits
- No per-record destructive editing, deleting or merging; immutable attempts and other source-owned records are not rewritten.
- No grammar corrections, semantic comparison, editorial approval or C2 certification.
- Text search is client-side in loaded local records; large-corpus virtualization/performance and low-storage handling need later real-device qualification.
- Archive version comparisons are mechanical word diffs, not language-quality judgments.
- Review/qualification of underlying DEMO_ONLY authored exercise materials remains at zero.
