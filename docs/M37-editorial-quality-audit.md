# Sprachgefühl M37 — redaktionelles Risiko-Audit / private Alpha

**Referenz:** Draft PR #3, nach erfolgreich qualifiziertem M36-HEAD `289de115e4ccc246af5c508ffe4abe7013a7447b`. M37 erweitert **keine** G01–G13-Kompetenz und schreibt **keinen** historischen Quellentext um.

## Umfang und tatsächlich geleistete Prüfung

- Inventar: **682** ausschließlich `DEMO_ONLY`, nicht redaktionell freigegebene Editorial-Kandidaten (202 objektive Demo-Items, 20 M04-Schreibimpulse und weitere original entworfene Quellen/Übungen). 0 authentifizierte freigegebene Items, 0 genehmigte Lektionen.
- Ein reproduzierbarer **26-Aufgaben-Paketvorschlag** unter `content/editorial/m37-alpha-candidates.json`: 13 C1 + 13 C2; je zwei aus G01–G09 außer G10 und G11–G13, dazu zwei zusätzliche lexikalische G07-Risikofälle. **G10 ist ausdrücklich ausgeschlossen**, weil keine freigegebene, verwendbare, rechtegeklärte Audio-Aufgabenbasis verfügbar ist. Der Vorschlag enthält 26 echte vorhandene, exakt versionierte Source-/Paragraph-/Zitat-IDs; **keine** erfundenen Einheiten.
- `npm run check:editorial` prüft die bekannte Warteschlange und zusätzlich `scripts/editorial/m37Audit.mjs`: 26 zitierte Anker genau einmal im angegebenen Absatz, Quellversionen, zwei echte unterschiedliche Alternativen bzw. bewusst unbewertete G12-Sprechaufgabe, gültige Autor-Entwurfs-/Rechtekennzeichnung, C1/C2-Auswahl und unveränderte Freigabesperren.
- **Diese Checks sind technische / quellenstrukturelle Reproduzierbarkeit, kein unabhängiges Lektorat.** Weder deutsche Sprachrichtigkeit in allen 26 Übungen noch zulässige Umformulierungen, CEFR-Niveau, Nicht-Plagiat oder Lehrwirksamkeit sind dadurch bewiesen. Keine Noten und keine Freigaben erzeugt; `editorialGate=NO_GO`, `privateAlphaGate=NO_GO`, `releaseGate=NO_GO`.

## Reproduzierte inhaltliche Risiken (ausdrücklich NICHT freigegeben)

| ID | Einstufung | Quellennachweis / Problem | Handlungsgrenze |
| --- | --- | --- | --- |
| `SG-G02R-002:r1` | **HIGH, grammatischer Modellfehler** | Der Modelltext enthält **„das substantivierte Finanzierung“**. Das Substantiv ist feminin: **die Finanzierung**. Vergleich: [Duden-Deklination](https://www.duden.de/deklination/substantive/Finanzierung). | Eine korrigierte, unabhängig geprüfte **neue Quellversion** erforderlich; alte Quelle/Version nicht stillschweigend überschreiben. Der Fall bleibt in der Alpha-Risikostichprobe ausdrücklich **BLOCKED**, nicht linguistisch PASS. |
| `SG-M05-037` | **HIGH, nicht eindeutig lösbare Multiple Choice** | „Die Geschäftsführung möchte den Beschäftigten eine Perspektive ___.“ Sowohl **aufzeigen** als auch **versprechen** ist grammatisch möglich. Ohne weitere Kontextbedingung sind unterschiedliche Aussagen korrekt bildbar. | Aus Alpha ausgeschlossen; prüfbare Zielbedeutung und alle akzeptablen Alternativen von einer unabhängigen Sprachredaktion festlegen lassen. |
| `SG-M05-036` | MEDIUM, Mehrdeutigkeitsrisiko | „Die Behörde muss den Antrag sorgfältig ___.“ Gewünscht: **prüfen**. In passendem Kontext kann aber auch **sorgfältig ablehnen** eine grammatische Handlung sein. | Separat redaktionell prüfen und gegebenenfalls mit begrenzendem Kontext neu versionieren. |

Die bloße syntaktische Plausibilität eines Distraktors begründet noch nicht, dass er die beabsichtigte Bedeutung erfüllt. Eine Multiple-Choice-Aufgabe ohne diesen Kontext darf jedoch nicht als eindeutig bewertet werden. Die **M37-Risikoprüfung ersetzt keine Prüfung durch eine zweite qualifizierte Person**. Es wurde keine unabhängige Prüfung der tatsächlichen Originalität gegen fremde Volltexte durchgeführt: `ORIGINAL_DRAFT` ist eine Urheber-/Provenienzbehauptung der Quelle, noch kein externer Rechtebeleg.

## Private-Alpha-Qualifikationsverfahren für M38

1. Zwei verschiedene Rollen benennen: Quellautor und unabhängig identifizierte deutschsprachige Fachredaktion; separate Freigabeinstanz, falls Berechtigungen noch unklar.
2. Alle 26 Quellen **komplett** lesen; das **ganze** Quellendossier, nicht nur den Zitatsatz, auf Satzbedeutung, echte richtige / alternative Lesarten, Genus, Kasus, Rektion, idiomatische Natürlichkeit und angemessenes Register prüfen.
3. Für jede Aufgabe Version und Originalzitat abgleichen, bewusste Bedeutungs-/Begrenzungskorrekturen dokumentieren und klar trennen zwischen mechanischem Check, fachlichem Urteil und unabhängiger Unterschrift. Neue korrigierte Aufgaben bekommen eine **neue Quellversion**. Lernhistorie und alte originale Eingaben dürfen nicht überschrieben werden.
4. CEFR-Niveaus anhand unabhängiger Referenzmaterialien und mehrerer tatsächlicher fortgeschrittener Lernender **kalibrieren**, nicht anhand der im Demo-JSON stehenden `band`-Etiketten bestätigen.
5. Nicht belegte Originalitäts- oder Nutzungsrechte bleiben `HOLD`. Erst wenn ein Fall einzeln redaktionell/urheberrechtlich qualifiziert ist, darf er überhaupt als private Alpha aufgenommen werden.
6. G10 braucht **eigene** rechtsgeklärte Hörquellen und inhaltlich sinnvolle Hörfragen. Mikrofon- und lokale Audiodatei-Modi sind kein lizenzierter Assessment-Korpus.
7. Unverändert gesperrt bleiben die Ziele 350 freigegebene P1-Aufgaben, 10 Lektionen, 50 Holdout, 72 Diagnostic A und alle erforderlichen realen Tests.

## Daten- und Freigabegates

V1.0-Funktionsgrenze `FROZEN_AFTER_M35_DRAFT_NOT_RELEASE_APPROVED`; bestehende acht IndexedDB-v4-Stores, produktive transaktionale CAS-Semantik, Backup v3, historische Stable IDs und Originalfassungen, Rechtehold `DEMO_ONLY`/`AI_DRAFT`/`ORIGINAL_DRAFT` unverändert. Keine Datenmigration, kein Merge, keine Veröffentlichung und kein Deployment.

**Technischer M37-CI-PASS (falls erreicht) bedeutet ausschließlich: QA-Artefakt/Code-/Browser-Regressionen funktionsfähig. Redaktionelles Freigabe-GO bleibt NO_GO.**
