# M46 — Delayed source-writing retrieval and grounded repair

## Concrete learning value
M45's four steps indicated saved activity, not memory retention. M46 asks the learner to **reconstruct a previously authored source-based argument cold** at least 24 hours later, explicitly identify uncertainty, and only then uncover the earlier transfer and complete source paragraphs. The learner must submit a non-identical corrected version with a specific paragraph reference and explicit error explanation.

## Narrow version-safe launch
For the first vertical slice the planner supports six exact-source-validated writing families: G01 reference, G02 relative clauses, G03 PP attachment, G06 terminology, G07 phraseology and G13 disclosure/audience writing. Other studios remain untouched and functional; they are not silently mapped to a possibly newer or incorrect source. There is **no new studio**: this is a shared review step over existing original writing.

Fixed *practice reminders*, not FSRS/CEFR/stability estimates:
- Round 1: >= 24 hours after the latest source-written transfer or native rewrite.
- Round 2: >= 7 days after the previous grounded correction (and any newer native rewrite).
- Round 3: >= 21 days after the previous grounded correction (and any newer native rewrite).
- A saved cold recall always presents its pending correction before new due recalls. An exact baseline revision ID is pinned in the cold record and used at comparison time.
- Each historical entry can have up to three cold-recall + correction pairs, appended in \`productionEntries.revisions\`. Native \`TRANSFER\` / \`REWRITE\` markers remain unchanged, and no generic source study is retroactively marked approved.

## Technical contracts
- \`SG_DELAYED_RECALL:<round>\`: append-only unassisted reconstruction with explicit uncertainty and frozen baseline revision ID, **before** revealing prior text or source.
- \`SG_DELAYED_REPAIR:<round>\`: append-only materially different source-grounded rewritten statement with a real paragraph ID, correction rationale and a pointer back to the matching cold record. There is no automatic grading, answer verification, forced AI feedback or evidence of learning gains.
- Existing \`saveProductionEntry(entry,expectedRevisionCount)\` transactional CAS and immutable original text are reused. No IndexedDB version change, new ID scheme for first drafts, migrations, account/network dependency, or new object store.
- Backup v1/v2/v3 compatibility remains; new record text/reflection lengths stay within backup validation caps. Existing learner records, older revisions and inactive v2 study proposals remain unchanged.
- Today surfaces due/pending cold and source-correction stages. Progress counts *complete pairs*, not the validity/quality of answers. Open missions prevent the new shortcut from displacing the current objective session.
- Unknown source versions, missing source IDs, withdrawn/unsafe entries and missing native independent transfer are excluded. Only exact matching source fixtures may be shown in the correction stage.
- The M35 engine/data feature freeze and \`DEMO_ONLY\`, public-release and editorial gates remain intact; this is development of a learner workflow, not editorial qualification.

## Acceptance
- Pure tests prove 24-hour gate, independent text checks, frozen native baseline, exact source and paragraph validation, G13 audience marker, append-only IDs, 7/21-day sequencing, wrong-version exclusion and no fictitious proficiency grade.
- Real Chromium desktop/mobile run: original G01 analyses + transfer → clock advance → hidden-baseline recall → reveal source and original → reject identical correction → save grounded repair → Today/Progress/IndexedDB/reload verify exact ID/first text preserved.
- Full original Node, TypeScript/Vite, Chromium/Firefox/WebKit, multitab CAS, offline recovery and two-build A→B→A rollback must pass at exact HEAD. Report failures, no green claims on unfinished or earlier runs.
- No merge, deployment, publication, external review or formal calibration.
