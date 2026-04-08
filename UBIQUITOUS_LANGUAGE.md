# Ubiquitous Language

## Einsatzplanung

| Term                       | Definition                                                                                                                       | Aliases to avoid             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Einsatz**                | Ein geplanter Termin einer Organisation mit Zeitraum, Status und personeller Besetzung.                                          | Event, Termin, Buchung       |
| **Einsatzstatus**          | Der fachliche Zustand eines Einsatzes mit getrennten Anzeigen für Verwaltung und Helferansicht.                                  | Status, Phase                |
| **Einsatzkategorie**       | Ein frei definierbares Merkmal zur Einordnung eines Einsatzes innerhalb einer Organisation.                                      | Typ, Gruppe, Tag             |
| **Einsatzkommentar**       | Ein von einem Benutzer zu einem konkreten Einsatz erfasster Textbeitrag.                                                         | Notiz, Nachricht             |
| **Helferzuweisung**        | Die Zuordnung eines Benutzers zu einem konkreten Einsatz.                                                                        | Helfer, Teilnahme, Besetzung |
| **Benötigte Helferanzahl** | Die Soll-Anzahl an Helferzuweisungen für einen Einsatz.                                                                          | Plätze, Kapazität            |
| **Einsatzanforderung**     | Eine an einen Einsatz gebundene Anforderung an Personeneigenschaften inklusive Pflichtgrad und Mindestanzahl passender Personen. | Qualifikation, Filter        |

## Organisation und Personen

| Term                               | Definition                                                                                                                                 | Aliases to avoid                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| **Organisation**                   | Die fachliche Mandanteneinheit, in der Einsätze, Vorlagen, Rollen und Stammdaten verwaltet werden.                                         | Verein, Kunde, Mandant                |
| **Benutzer**                       | Eine authentifizierbare Person mit persönlichem Profil und Zugang zum System.                                                              | User, Konto, Login                    |
| **Mitgliedschaft**                 | Die Zugehörigkeit eines Benutzers zu einer Organisation über eine oder mehrere Rollen.                                                     | Teilnahme, Benutzer in Organisation   |
| **Rolle**                          | Eine Berechtigungs- und Verantwortlichkeitsklasse innerhalb einer Organisation.                                                            | Funktion, Recht                       |
| **Einladung**                      | Ein zeitlich begrenztes Angebot, einer Organisation mit einer oder mehreren Rollen beizutreten.                                            | Invite, Freischaltung                 |
| **Personeneigenschaft**            | Ein organisationsspezifisch definierter Profilbaustein, der für Benutzer gepflegt und in Einsätzen oder Vorlagen referenziert werden kann. | Benutzerfeld, Attribut, Qualifikation |
| **Wert einer Personeneigenschaft** | Der konkrete, einem Benutzer zugeordnete Wert einer Personeneigenschaft.                                                                   | Profilwert, Eigenschaftswert          |

## Vorlagen und Stammdaten

| Term                    | Definition                                                                                                           | Aliases to avoid                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Einsatzvorlage**      | Eine wiederverwendbare Voreinstellung für neue Einsätze mit Defaultwerten, Kategorien und Anforderungen.             | Template, Muster, Standard-Einsatz     |
| **Vorlagenanforderung** | Eine an eine Einsatzvorlage gebundene Personeneigenschafts-Anforderung, die in neue Einsätze übernommen werden kann. | Vorlagen-Qualifikation, Standardfilter |
| **Vorlagenkategorie**   | Die Zuordnung einer Einsatzkategorie zu einer Einsatzvorlage.                                                        | Standardkategorie                      |
| **Felddefinition**      | Die technische und fachliche Beschreibung eines Eingabefelds inklusive Datentyp und Validierungsregeln.              | Feld, Custom Field                     |
| **PDF-Vorlage**         | Eine organisationsbezogene Dokumentvorlage für einen bestimmten Dokumenttyp.                                         | Druckvorlage, Dokumenttemplate         |

## Integration und Nachvollziehbarkeit

| Term                    | Definition                                                                                       | Aliases to avoid                         |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **Kalenderabonnement**  | Ein persönlicher, tokenbasierter Kalenderzugang eines Benutzers für eine Organisation.           | Kalenderlink, iCal-Link                  |
| **Änderungsprotokoll**  | Die chronologische Erfassung fachlich relevanter Änderungen an einem Einsatz oder Benutzerbezug. | History, Audit Log                       |
| **Aktive Organisation** | Die aktuell im Benutzerkontext ausgewählte Organisation.                                         | Gewählte Organisation, aktueller Mandant |

## Beziehungen

- Eine **Organisation** hat viele **Einsätze**, **Einsatzvorlagen**, **Einsatzkategorien**, **Personeneigenschaften** und **Mitgliedschaften**.
- Ein **Benutzer** kann über mehrere **Mitgliedschaften** zu mehreren **Organisationen** gehören.
- Eine **Mitgliedschaft** verbindet genau einen **Benutzer** mit genau einer **Organisation** und mindestens einer **Rolle**.
- Ein **Einsatz** gehört genau zu einer **Organisation** und hat genau einen **Einsatzstatus**.
- Ein **Einsatz** kann aus genau einer **Einsatzvorlage** entstehen, aber auch ohne Vorlage erstellt werden.
- Ein **Einsatz** kann viele **Helferzuweisungen**, **Einsatzkategorien**, **Einsatzkommentare** und **Einsatzanforderungen** haben.
- Eine **Einsatzanforderung** verweist auf genau eine **Personeneigenschaft**.
- Eine **Einsatzvorlage** kann viele **Vorlagenkategorien** und **Vorlagenanforderungen** besitzen.
- Ein **Kalenderabonnement** gehört genau einem **Benutzer** in genau einer **Organisation**.

## Beispieldialog

> **Entwickler:** "Wenn ein **Benutzer** einer **Organisation** beitritt, ist er dann sofort einem **Einsatz** zugeordnet?"
>
> **Fachseite:** "Nein. Durch die **Einladung** entsteht nach Annahme zuerst eine **Mitgliedschaft** mit einer oder mehreren **Rollen**."
>
> **Entwickler:** "Und wann sprechen wir von einem **Helfer**?"
>
> **Fachseite:** "Im fachlichen Kern besser von einer **Helferzuweisung**. Erst wenn ein Mitglied einem konkreten **Einsatz** zugeordnet wird, ist diese Beziehung vorhanden."
>
> **Entwickler:** "Dann kommen die benötigten Qualifikationen über die **Einsatzanforderungen** aus der **Einsatzvorlage**?"
>
> **Fachseite:** "Genau. Die **Vorlagenanforderungen** werden in den neuen **Einsatz** übernommen und prüfen dort konkrete **Personeneigenschaften**."

## Markierte Ambiguitäten

- "`Helfer`" wird für mindestens drei Konzepte verwendet: eine Rolle, eine einer Organisation zugehörige Person und eine konkrete Zuordnung zu einem Einsatz. Empfehlung: Für die Beziehung immer **Helferzuweisung**, für die Berechtigung **Rolle**, für die Person **Benutzer** verwenden.
- "`User`", "`Benutzer`" und "`Mitglied`" werden vermischt. Empfehlung: **Benutzer** für die Person mit Login, **Mitgliedschaft** für die Zugehörigkeit zur Organisation.
- "`Kategorie`" und "`Typ`" liegen semantisch nahe, meinen hier aber nicht dasselbe. Empfehlung: **Einsatzkategorie** für fachliche Einordnung, **Felddefinition** für Feldmetadaten.
- "`Status`" ist zu allgemein. Empfehlung: Im fachlichen Kontext immer **Einsatzstatus** sagen.
- Die Organisation kann Anzeigenamen wie **Einsatz** oder **Helfer** umbenennen. Empfehlung: Diese Bezeichnungen als konfigurierbare UI-Terminologie behandeln, nicht als neue Domänenkonzepte.
