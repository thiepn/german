# Sprachgefühl editorial and rights authority (draft)

**No independent editorial signoff has been performed.** Training corpus: 178 objective drafts and 20 ungraded writing prompts. Ten micro-lessons remain DEMO_ONLY. Neither lexical references nor tests count as human review.

## Source/reference distinction
Six links in `content/editorial/lexical-anchors.json` point to genuine Duden lexical entries. The entries attest only to the existence and meaning of the specified established word combinations. The actual exercises, model rewrites, distractors and CEFR tags are newly authored unreviewed material. They require independent linguist review; no dictionary example sentences are reproduced.

## Human review packet
`npm run check:editorial` checks the complete manifest-defined authoring queue and reports counts. Use `node scripts/editorial/reviewQueue.mjs --markdown --id SG-M05-050` to inspect an item; `--mode M04` to filter. The script is strictly read-only: it emits a checklist but never creates an approval artifact or alters the ledger.

Independent review should test all plausible answers (including alternatives), gender/case/valency, idiomaticity, register, genuine ambiguity, semantic and epistemic fidelity in revisions, original rights, and suitability for B2+–C2. Reviewer identity must differ from author identity. Approvals require explicit authenticated records in `content/editorial/approval-ledger.json` and independently checked item versions in `content/approved/approved.json`; an edited item version needs a fresh review.

## Required release and diagnostic gates
P1: 350 reviewed items, 10 approved lessons, real source/rights attestations. Separate P1 diagnostic pilot: 50 approved unseen holdout items. Full Diagnostic A: 72 approved tasks, clear assessment rubric, rights-cleared authentic audio and human evaluation of subjective answers. Automated structure tests and a dictionary URL are NOT substitutes for any of these.

No generated demo content is labeled REVIEWED. `npm run check:release` deliberately blocks unapproved publication. Real content remain unranked and no official CEFR exam outcomes are inferred.
