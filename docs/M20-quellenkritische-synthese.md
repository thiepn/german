# M20 — G09 Quellenkritische Synthese

## Distinct learning objective
M20 combines **two independent original German documents** in every case. Existing G09 reading studies examine a single text's claims and supporting sentences; G13 mediation rewrites for an audience, while M19 considers stance within a source. Here, advanced learners **reconcile non-identical samples, measurement units, methods, competing findings and authority claims across separate written sources**, with both passages visible simultaneously.

Original fictional research dossiers: a shortened working week (company pilot versus employee survey); scholarship selection software (technical evaluation versus procedural review); renovated housing (building energy measurements versus residents' interviews); and archive digitization (scan-throughput report versus usability research). There are eight original documents of three paragraphs each (24 source paragraphs) and 12 paired, literally anchored comparisons. The source documents refer to no real experiments or institutions. Stable IDs `SG-G09X-001` to `SG-G09X-004`, version 1.

## Authentic source-to-writing progression
Three fixed, paired comparisons require independently rewritten *A* and *B* evidence, an interpretation choice and an explicit unsupported inference. All responses are retained without automatic scoring; original editorial preferred choices are not proficiency judgments. Completion unlocks independent cross-source synthesis and subsequent append-only revisions with word-diff. Each transfer has an explicit `A*|B*` anchor and comparison ID.

Uses existing transactional `saveProductionEntry` CAS, local productionEntries store, eight-store IndexedDB and portable backup v3. No learner identities, migrations, new grader or scheduler. First comparison immutable in original; later evidence and revisions use original `ProductionRevision` structure. Today, Curriculum, Progress, Archive and source return are connected.

All sources and 12 contrasts remain `DEMO_ONLY`, `AI_DRAFT`, `ORIGINAL_DRAFT`, `editorialApproval:false`, represented as 16 editorial dossiers, with independent substantive German/rights/methodology review required. No claims to official C2 assessment or source approval.

## Qualification
Validate all quoted spans against both source paragraphs; reject duplicate IDs, empty rights and formulaic invalid choices. Run full Node, TypeScript/Vite, editorial, and Chromium desktop/mobile M20 and M01–M19 regression suite. Verify backup and stale multi-tab CAS explicitly. No new PR, merge, migration, publish or deploy.
