# Sprachgefühl M35 — V1.0-Feature-Grenze (Draft)

**Status:** `FROZEN_AFTER_M35_DRAFT_NOT_RELEASE_APPROVED` — die V1.0-Produktfunktionen sind als Implementierungsumfang abgegrenzt, **nicht** redaktionell, diagnostisch oder produktiv freigegeben.

## Verifizierter G01–G13-Abgleich

| Fachbereich | Bereits implementierte Lernerfahrung | Offener Qualitäts-/Produktionsnachweis |
| --- | --- | --- |
| G01 Artikel/Genus/Referenz | M01, M16 Referenz, M33 Deixis | unabhängige Sprachprüfung |
| G02 Kasus/Flexion | M02, M13 Kasus, M34 Relativanschluss | echte Alternativantworten |
| G03 Rektion/Präposition | M03, M14 Valenz, M31 PP-Anbindung | redaktionelle Kalibrierung |
| G04 Syntax/Informationsstruktur | M04, M15, M21, M30, M32 | unabhängige Schreibbewertung |
| G05 Modus/Tempus/Diathese | M12 Modus und Zeitfolge | prüfbare Beurteilung freier Sätze |
| G06 Wortschatz/Semantik | M06, M18, M28 | semantische Alternativen prüfen |
| G07 Kollokation/Phraseologie | M05, M17 | lexikalische Rechte und Variation |
| G08 Stil/Register/Pragmatik | M07, M19, M29 | angemessene Alternativen / Kontext |
| G09 Lesen/Textkompetenz | Lesestudien, M20, M25, M27 | unabhängige Quellenredaktion |
| G10 Hören/Hörpragmatik | M08 eigene lokale Audiodateien und Zeitmarken | Rechte für freigegebenes Audio, keine Hördiagnostik |
| G11 Schreiben/Überarbeiten | Schreibstudio, M11, M22, M24 | qualifizierte Beurteilung, kein Auto-CEFR |
| G12 Sprechen/Interaktion | M10 Dialog, M23 Repair, **M35 lokale mündliche Sprechprobe** | keine Sprachbewertung, keine Speicherung der Audioaufnahme |
| G13 Mediation/Transfer | M09, M26 quellengebundene Vermittlung | fachliche und editorische Qualifikation |

Die ausschließlich schriftlichen G12-Interaktionsstudios deckten bisher keine tatsächlich gesprochene, anhörbare Probe ab. M35 schließt **diese** Lücke: vier fiktive vollständige dreiteilige C1–C2-Gesprächsquellen (12 Originalzitate), freiwillige ausschließlich lokale Mikrofonaufnahme und Sofortwiedergabe, schriftliche eigenständige Antwort, eigene kritische Reflexion, Quellenbegründung und Grenzen sowie vollständiger adressatenbezogener Bericht mit substantieller Revision. Audio wird weder gespeichert, exportiert, synchronisiert noch hochgeladen. Der Modus `MIC` protokolliert nur eine **Lernhandlung**, keine gemessene Sprechleistung; bei Verweigerung/Fehlen eines Mikrofons ist `TEXT` möglich. Keine automatische sprachliche oder CEFR-Einstufung.

## Abgeschlossener Funktionsumfang / Änderungsregeln

1. **Feature Freeze nach M35:** Keine neuen G01–G13-Kompetenzstudios, Score-, Review-, Diagnose-, Storage- oder Account-Engines in V1.0, solange nicht eine konkrete schwere Lücke unabhängig nachgewiesen und ausdrücklich autorisiert wird.
2. **M36 – Konsolidierung:** Navigation, Lernübergänge, adaptive Übungen, Fehlerrückführung, verständliche Statusangaben, Archivquellen und mobile UX über alle vorhandenen Studien optimieren; nur belegte Probleme ändern.
3. **M37–M39 – redaktionelle und diagnostische Freigabe:** Rechte, Alternativeingaben, deutsche Sprachrichtigkeit und C1/C2-Tauglichkeit qualifizieren; die 350 P1-Übungen, zehn Lektionen, 50 Holdout- und 72 Diagnostic-A-Items sowie lizenzierte Höraufnahmen nicht künstlich freigeben.
4. **M40–M41 – unabhängige Qualität:** Accessibility, echte Firefox/WebKit/Android/iOS-Geräte, Offline-/Service-Worker-Upgrade, Quota- und Multi-Tab-Recovery, reale Lernersitzungen und qualitative Erkenntnisse prüfen.
5. **M42 – Release-GO/NO_GO:** Nur nach realen menschlichen und technischen Gates; Merge, Deployment und Veröffentlichung erfordern eine gesonderte ausdrückliche Autorisierung.

## Daten- und Rights-Grenzen

- Acht bestehende IndexedDB-v4-Stores, transaktionale Production-CAS, Backup v3 mit v1/v2-Leseweg, historische IDs, bestehende Punkte-/Diagnostikzuständigkeit und Artikelwerk-Isolation bleiben erhalten.
- Alle M35-Originalquellen sind `AI_DRAFT`, `ORIGINAL_DRAFT`, `DEMO_ONLY`, `reviewedBy=null`, `editorialApproval=false`. Neu: vier Quellendossiers und zwölf unabhängige redaktionelle Anker in der nichtfreigegebenen Prüfliste.
- Objektive Demo-Aufgaben bleiben **202**. Freigegeben bleiben **0/350** P1-Items, **0/50** Holdout-Items, **0/72** Diagnostic-A-Items und **0/10** Lektionen.
- Keine Speicherung echter Sprache, keine automatischen Noten, keine Migration, kein Merge, keine redaktionelle Entscheidung, keine Veröffentlichung oder Deployment.
