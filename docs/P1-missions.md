# SG-01 finite local daily missions

Deterministic bounded mission: 4/6/8/12/14 distinct fixed-version questions for configured 10/20/30/45/60 minute preference. The minute setting is a **budget preference**, never a stopwatch or fabricated completion metric. Order: overdue recall, recent errors, new tasks, advanced transfer, then fallback.

One local learner database, additive IndexedDB v4 missions store, and backup v3 (imports v1/v2 with empty mission lists). Each first attempt stays immutable. A mission advances ONLY after the saved attempt is verified in an atomic transaction. A persisted incomplete task remains stable across reloads, exits and visits to other training.

Demo tasks remain DEMO_ONLY. No real CEFR diagnosis or artificial mastery from mission completion. Real content review remains necessary before release.
