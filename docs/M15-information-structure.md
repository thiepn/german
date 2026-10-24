# M15 — G04 Informationsstruktur und Diskursfokus

Six independent originally authored C1–C2 source cases, each with three sustained paragraphs and three **literal source-anchored contextual sentence contrasts**: 18 contrasts across 18 discourse-focus families. G04 now explicitly trains Vorfeld placement, object topicalization, given–new progression, Mittelfeld information weighting, Nachfeld conditions and concessions, contrastive focus, scope of *nur*, *auch*, *erst* and the logical distinction between *nicht alle*, *keine* and *nicht X, sondern Y*. The source cases are fictional, original teaching drafts, neither licensed third-party publications nor editorially approved text.

## Learner journey

Each anchored contrast supplies a prior discourse context, two **full German alternative formulations**, and a precise context question. The learner selects an interpretation, writes a **third, independent** reformulation of the source sentence and explicitly argues for their chosen theme/focus/scope. Copying the source or either supplied alternative is rejected; submissions are not automatically graded. After saving the author's draft comparison and its explanation become available, with independent editorial status made clear. Three such analyses unlock a distinct source-linked multi-sentence transfer; optional further revisions preserve the full original history and compare only adjacent free-written text drafts, not unrelated contrast answers.

## Architecture and safety

Uses established `productionEntries` store via the original transactional CAS writer. Immutable first answer `focus:<unitId>`, version/source IDs and `decisionId=c1|A/B|p1` record choice plus first authored reformulation and rationale; later `CONTRAST:cN` revisions store choice (selfChecks), source paragraph, writing and rationale; `TRANSFER` and `REWRITE` are append-only and never overwrite the first answer. Existing eight IndexedDB stores, backup v3, grading, FSRS/review, diagnostic, M04 slot-based scoring, Artikelwerk and learner IDs remain untouched. Standalone G04 studio is accessible through Today, Curriculum, Progress and the filtered Writing Archive, not by creating a second grader or fake CEFR mastery.

All material remains `DEMO_ONLY`, `ORIGINAL_DRAFT`, `editorialApproval:false` and is registered in the existing independent editorial inventory as six source records and 18 task records (24 human-review dossiers). Content/source validators verify stable IDs, literal source matches, original rights, complete competing alternatives, explanations and breadth. The app's release gate remains unchanged.

Qualification includes Node domain and backup-integrity tests, original pinned TypeScript/Vite, a genuine Chromium desktop/mobile source→choice→independent rewrite→explanation→independent text→rewrite→Archive→return→reload journey and adversarial stale-tab CAS, plus all M09–M14 and visual/copy regressions.
