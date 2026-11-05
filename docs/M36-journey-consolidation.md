# Sprachgefühl M36 — Lernweg-Konsolidierung (Draft)

## Problemnachweis (M35 HEAD `cc53d0e6c2f02b5c542a4184b867aa1056225d87`)

1. Die Bereiche **Heute** und **Lernen** pflegten jeweils selbstständig **30** identische G01–G13-Studioziele und voneinander abweichende Labels in langen JSX-Listen. Manuelle Erweiterungen hatten bereits zu zunehmend unübersichtlichen Seiten und anfälligen Pfadkopien geführt.
2. Die **Schreibspuren** konnten die Originalquellen zwar korrekt tief verlinken, **Heute** und die einzelnen Curriculum-Karten boten aber nach dem Speichern keinen quellengenauen Wiederaufnahmeknopf. Nutzer mussten erst `Fortschritt → Schreibspuren → Filter → Eintrag → Originalen Lernbereich` durchlaufen.
3. Der erste M36-Browserlauf reproduzierte eine Accessibility-/Selektor-Mehrdeutigkeit: Ein neuer Fortsetzen-Button erbte die Studiobezeichnung im zugänglichen Namen und kollidierte mit den bestehenden Schnelllinks. Abhilfe: explizite eindeutige zugängliche Bezeichnung `Fortsetzen: <Quelltitel>`, ohne die visuelle Beschreibung zu verstecken.
4. Der erste umfassende M36-Node-Lauf reproduzierte die irreführende Archivzuordnung von G02/G12-Quellen mit unverändertem Item-ID, aber nicht mehr verfügbarer Item-Version. Die Versionsauflösung zeigt für diese Fälle jetzt einen historischen Eintrag mit Hinweis auf fehlende Originalquelle; die Fortsetzen-Liste schließt diesen Eintrag aus, während die Schreibspur weiterhin archiviert bleibt.

## Implementierte Konsolidierung

- `src/domain/journey/catalog.ts` ist die **einzige** Quelle für 30 bestehende Studioziele, ihre 13 G01–G13-Domänen und die historisch nachgewiesenen Heute-/Curriculum-Beschriftungen. Keine neue Kompetenz, keine neue Rechte- oder Bewertungszuständigkeit.
- `src/domain/journey/continuation.ts` leitet direkt aus dem **vorhandenen Archiv** eine strikt schreibgeschützte, deterministisch sortierte Liste gespeicherter Arbeiten ab. Es werden ausschließlich `ProductionEntry`-Referenzen (Original-ID, Originalversion, `sourceId`, alle Revisionen) ohne Kopie oder neuen Index zurückgegeben.
- **Heute:** maximal drei tatsächlich gespeicherte eigene Arbeiten, mit originalem Dokumenttitel, Bereich und Fassungszahl; daneben unveränderte Schnelllinks, Curriculum und Archiv.
- **Lernen:** pro Domäne nur dann `Letzte Arbeit fortsetzen`, wenn tatsächlich eine eigene passende Arbeit vorhanden ist.
- **Fortschritt:** gleiche drei neuesten eigenen Arbeiten; derselbe schon bestehende Archive-Deep-Link (M04 geht nach `Trainieren`, alle anderen Quellen zum richtigen Studio unter `Lernen`).
- **Schreibspuren:** unveränderte Inhalts- und Versionsautorität; kein zusätzliches Datenmodell oder versehentliches Verschmelzen von mehreren Quellenversionen.

## Regression und Release-Holds

- Neue Node-Tests prüfen die 30/13 Katalogabbildungen, identische Objekt-/Stable-ID-Referenzen, Quellenversionen, Archiv-Sortierung, domänenspezifischen Rückweg, nicht vorhandene Quellen und unveränderte Lerntexte.
- Neue Chromium-Desktop-/Mobile-Prüfung: Original M04 + G12-Quelle speichern; Wiederaufnahme von Heute, domänenspezifischem Curriculum und Fortschritt; Deep-Link über Schreibspuren; Reload; weiterhin vorhandene ursprüngliche Studioziele.
- Bestehende M01–M35-Regressionen laufen im selben CI-Job. Nur nach erfolgreichem **exaktem HEAD** ist M36 qualifiziert.
- Acht IndexedDB-v4-Stores, transaktionale `productionEntries`-CAS, Backup v3 und historische IDs sind unverändert. Keine Änderungen an Kursinhalt, `DEMO_ONLY`, `AI_DRAFT`, `ORIGINAL_DRAFT`, Genehmigung, Diagnostik, M35-Feature-Freeze oder `thiepn/artikelwerk`.

## Nächster Bereich M37

Unabhängige redaktionelle Sprach- und Rechteprüfungen, mehrdeutige Antwortoptionen, Human-CEFR- und Bewertungsgrundlagen; keine automatisch erfundene inhaltliche Freigabe und keine neue App-Funktion. Veröffentlichungs-GO bleibt gesperrt.
