# Sprachgefühl UI follow-up after zero-filler cleanup

## Demonstrated from exact-head source
- Page-title 12px top margin persisted on views whose eyebrow/subtitle was removed. Align first-child titles with the main content edge, including Today.
- Mobile navigation reserved a 3px top border only for the active tab, allowing inconsistent tab geometry. Reserve the same border in all five tabs and keep at least 44px interaction height.
- Exercise feedback displayed both "Zur Übersicht" and "Training verlassen" for the same exit callback. Display the latter only before feedback.
- Archive filter fields had their own 12px vertical margins inside a grid with 12px gap, doubling row separation. Use grid gap alone.
- Custom writing review checkbox labels had no minimum 44px target.
- Listening speed control had no explicit flex/min-width behavior within the 2-column small-screen controls.
- Reading source link list ended with stray visible punctuation after the last citation.

## Visual acceptance
Genuine Playwright Chromium screenshot and computed-geometry checks at 320, 360, 768 and 1280px in light mode, plus 360px dark mode. Tests cover onboarding, Today, Curriculum, reading, audio player, writing revisions, graded exercise and archive. Existing zero-filler UI suite remains intact.

## Protected boundaries
No grading, missions, diagnostic gating, review, content semantics, source rights, learner records, IndexedDB schema, backup format, storage writers, login or deployment changes. Technical browser screenshot bytes are inspected in CI; manual human evaluation of screenshots and physical Android acceptance remain not tested.
