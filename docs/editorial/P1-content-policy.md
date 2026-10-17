# Sprachgefühl P1 editorial and licensing policy
SG-01 fixture sets contain 104 DEMO_ONLY drafts (36 M01–M03, 33 M04, 35 M05). They are prototype assets and **not** CEFR-certified, independently reviewed, or externally licensed corpora.

## Authority separation
- Demo fixtures are imported solely by the draft UI and never appear in `dist/data/approved.v1.json`.
- Only items in `content/approved/approved.json` are eligible for approved packs.
- Approved items must carry independent editor approval in `content/editorial/approval-ledger.json` with version, source/rights checks, language verification, and a reference recorded outside the authoring process.
- An original draft and reviewer must be different humans; mechanical schema validation cannot prove a review was genuinely performed. Human editorial signoff remains a release requirement.
- No generated or placeholder entry may be counted toward the 350 reviewed P1 target. Current count is **zero**.
- Diagnostic A requires 72 independently reviewed, blueprint-matched items, with rights-cleared original audio and non-automated response review when applicable. None currently qualify.
- 13 curriculum domains are not CEFR certification labels. Exercise bands are design targets pending separate editorial calibration.

## Review protocol
1. Validate original writing and every alternative answer with a qualified German-language editor.
2. Check clause boundaries, valency, ambiguity, idiomaticity, register, punctuation, semantic equivalence and other plausible answers against authoritative sources.
3. Check license/source provenance and record any external text/audio permissions.
4. Record an independent review ledger entry and copy the immutable item/version to approved content.
5. Run `npm run check:content`, targeted tests and the explicit `npm run check:release` gate.
6. Any revision after approval must increment the item version and repeat review; historical attempts retain original item/version IDs.

## Known demo-specific limitations
M04 tests only constrained target forms—not unconstrained rewriting. M05 accepts the authored contextual collocation but may have other valid formulations. Both require editorial review of alternatives. Do not expose automatic correctness as a definitive judgement on advanced German until this is complete.
