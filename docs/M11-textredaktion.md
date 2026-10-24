# M11 — G11 zusammenhängende Textredaktion

Four original fictional multi-paragraph editing dossiers, two C1 and two C2; explicit source paragraph IDs and editorial issue anchors. This is distinct from sentence-level M04, G09 source mediation, and G12 text interaction.

The learner first chooses a documented referent/coherence/evidential issue and saves an immutable editorial diagnosis. Further complete-document redrafts and reconsiderations append to the original production-entry record, with the issue ID and paragraph preserved in `decisionId`, stable source identity in `sourceId`, the revision stage in `questionId`, and explicit rationale and user-selected self-checks in each revision. Word-level diff is used only as change visualization, not grading. The initial diagnosis is not incorrectly compared to the first rewritten document in the general archive.

All records remain in the existing `productionEntries` store with the original transactional compare-and-swap writer, backup v3 and eight-store IndexedDB layout. No new scheduler, scoring, proficiency claim, publication approval, media or third-party copyrighted content.

Entry points: Today, Curriculum G11, Progress, searchable Writing Archive with source identity and historical return. Native tests cover identity, domain authorization, revision boundaries and backup-v3 payload; desktop/mobile Chromium covers all learner steps and reload. Documents remain `DEMO_ONLY` and unreviewed.
