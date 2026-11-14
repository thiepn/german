// Single source for native G01-G13 studio discovery in Today and Curriculum.
// Keep labels stable for existing learner links; no automatic scoring or editor approval.
export const STUDIO_LINKS = [
 {action:"onReading",domain:"G09",today:"Lesestudien öffnen",curriculum:"Lesestudien öffnen"},
 {action:"onPragmatics",domain:"G08",today:"Pragmatische Situationen",curriculum:"Pragmatische Situationen"},
 {action:"onListening",domain:"G10",today:"Hörschärfe · Eigene Audiodatei",curriculum:"Hörschärfe öffnen"},
 {action:"onMediation",domain:"G13",today:"Sprachmittlung · G13",curriculum:"Sprachmittlung öffnen"},
 {action:"onInteraction",domain:"G12",today:"Gesprächsstrategien · G12",curriculum:"Gesprächsstrategien öffnen"},
 {action:"onOral",domain:"G12",today:"Mündliche Stellungnahmen · G12",curriculum:"Mündliche Stellungnahmen erproben"},
 {action:"onEditorial",domain:"G11",today:"Textredaktion · G11",curriculum:"Textredaktion öffnen"},
 {action:"onModality",domain:"G05",today:"Modus und Tempus · G05",curriculum:"Modus und Aussageperspektive öffnen"},
 {action:"onCaseTracing",domain:"G02",today:"Kasus und Nominalgruppen · G02",curriculum:"Kasus im Text prüfen"},
 {action:"onValency",domain:"G03",today:"Rektion und Valenz · G03",curriculum:"Verbrahmen vergleichen"},
 {action:"onFocus",domain:"G04",today:"Informationsstruktur · G04",curriculum:"Informationsstruktur bearbeiten"},
 {action:"onReference",domain:"G01",today:"Referenz und Determination · G01",curriculum:"Referenz im Text prüfen"},
 {action:"onPhraseology",domain:"G07",today:"Phraseologie im Text · G07",curriculum:"Phraseologie im Zusammenhang"},
 {action:"onPolysemy",domain:"G06",today:"Mehrdeutigkeit im Fachtext · G06",curriculum:"Mehrdeutigkeit im Fachtext"},
 {action:"onStance",domain:"G08",today:"Haltung und Schlussfolgerung · G08",curriculum:"Haltung und Schlussfolgerung im Text"},
 {action:"onCrossSource",domain:"G09",today:"Quellenvergleich · G09",curriculum:"Quellen gegeneinander lesen"},
 {action:"onCompression",domain:"G04",today:"Satzverdichtung · G04",curriculum:"Satzverdichtung und Explikation"},
 {action:"onAttribution",domain:"G11",today:"Quellen korrekt einbinden · G11",curriculum:"Quellen korrekt einbinden"},
 {action:"onRepair",domain:"G12",today:"Missverständnisse klären · G12",curriculum:"Missverständnisse klären"},
 {action:"onArgument",domain:"G11",today:"Argumente begründen · G11",curriculum:"Argumente begründen und prüfen"},
 {action:"onNumeracy",domain:"G09",today:"Zahlen präzise ausdrücken · G09",curriculum:"Zahlen präzise ausdrücken"},
 {action:"onDisclosure",domain:"G13",today:"Informationen gezielt vermitteln · G13",curriculum:"Informationen gezielt vermitteln"},
 {action:"onChronology",domain:"G09",today:"Verfahrensfolgen präzise darstellen · G09",curriculum:"Verfahrensfolgen präzise darstellen"},
 {action:"onDefinition",domain:"G06",today:"Begriffe präzise abgrenzen · G06",curriculum:"Begriffe präzise abgrenzen"},
 {action:"onRegister",domain:"G08",today:"Verantwortung und Register · G08",curriculum:"Verantwortung und Register"},
 {action:"onScope",domain:"G04",today:"Fokuspartikeln und Negationsskopus · G04",curriculum:"Fokuspartikeln und Negationsskopus"},
 {action:"onAttachment",domain:"G03",today:"Präpositionalanbindung und Mehrdeutigkeit · G03",curriculum:"Präpositionalanbindung und Mehrdeutigkeit"},
 {action:"onRelation",domain:"G04",today:"Konnektoren und Relationslogik · G04",curriculum:"Konnektoren und Relationslogik"},
 {action:"onDeixis",domain:"G01",today:"Deiktische Zentren und Perspektivwechsel · G01",curriculum:"Deiktische Zentren und Perspektivwechsel"},
 {action:"onRelative",domain:"G02",today:"Relativanschluss und Kasusautonomie · G02",curriculum:"Relativanschluss und Kasusautonomie"},
] as const;
export type StudioLink = typeof STUDIO_LINKS[number];
export type StudioAction = StudioLink['action'];
export type LearningCallbacks = Record<StudioAction,()=>void>;
export function linksForDomain(domain:string): readonly StudioLink[]{return STUDIO_LINKS.filter(x=>x.domain===domain)}
