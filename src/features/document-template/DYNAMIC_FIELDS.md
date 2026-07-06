# Dynamische Felder: Datenquellen und Resolver

PDF und DOCX erhalten dieselben Werte aus `resolveDocumentTemplateFields`. Fehlende Standardwerte werden einheitlich als `—` formatiert. Die Seitenzahl wird erst im jeweiligen Exportkontext eingesetzt.

| Feldschlüssel | Gruppe | Typ | Prisma-Quelle / Relation | Auflösung | Fallback |
| --- | --- | --- | --- | --- | --- |
| `assignmentName` | Allgemein | Text | `einsatz.title` | unverändert | `—` |
| `assignmentDate` | Allgemein | Datum | `einsatz.start` | `dd.MM.yyyy` | `—` |
| `assignmentStartTime` | Allgemein | Uhrzeit | `einsatz.start` | `HH:mm Uhr` | `—` |
| `assignmentEndTime` | Allgemein | Uhrzeit | `einsatz.end` | `HH:mm Uhr` | `—` |
| `assignmentDuration` | Allgemein | Text | `einsatz.start`, `einsatz.end` | berechnete Stunden und Minuten | `—` |
| `assignmentStatus` | Allgemein | Text | `einsatz.einsatz_status.verwalter_text` | unverändert | `—` |
| `programName` | Einsatz / Führung | Text | `einsatz.einsatz_template.name` | unverändert | `—` |
| `categories` | Einsatz / Führung | Liste | `einsatz.einsatz_to_category[].einsatz_category.value` | kommasepariert | `—` |
| `participantCount` | Einsatz / Führung | Zahl | `einsatz.participant_count` | Dezimalzahl als Text | `—` |
| `pricePerPerson` | Einsatz / Führung | Betrag | `einsatz.price_per_person` | EUR gemäß `de-AT` | `—` |
| `totalPrice` | Einsatz / Führung | Betrag | `einsatz.total_price` | EUR gemäß `de-AT` | `—` |
| `note` | Einsatz / Führung | Rich Text | `einsatz.anmerkung` | gespeicherter Text | `—` |
| `responsiblePerson` (Label „Erstellt von“) | Personal | Person | `einsatz.user` über `created_by` | Vor- und Nachname des Erstellers | `—` |
| `helpers` | Personal | Liste | `einsatz.einsatz_helper[].user` | Namen kommasepariert | `—` |
| `organizationName` | Verwaltung | Text | `einsatz.organization.name` | unverändert | `—` |
| `organizationEmail` | Verwaltung | E-Mail | `einsatz.organization.email` | unverändert | `—` |
| `organizationPhone` | Verwaltung | Telefon | `einsatz.organization.phone` | unverändert | `—` |
| `organizationAddress` | Verwaltung | Text | erste `einsatz.organization.organization_address` | Straße, PLZ/Ort, Land | `—` |
| `pageNumber` | Verwaltung | Zahl | PDF-/DOCX-Paginierung | aktuelle Seitennummer | `1` in der Vorschau |

Nicht in der Bibliothek sichtbar sind heuristisch ermittelte Kontakt-/Ortsfelder, das redundante Feld `guides` und Logo-Medienfelder. `administrationName` und `administrationFunction` wurden vollständig aus den Felddefinitionen und Standardbausteinen entfernt, weil das aktuelle Modell dafür keinen gespeicherten Wert besitzt.

Eigene Felder stammen ausschließlich aus `template_field → field` der Einsatzvorlagen der aktuellen Organisation. Ihr Name wird unverändert aus `field.name` übernommen. Werte werden über `einsatz.einsatz_field` und `field_id` aufgelöst. Das Schema enthält für `field` derzeit kein Aktiv-/Gelöscht-Flag; gelöschte Relationen erscheinen deshalb automatisch nicht mehr, eine zusätzliche Aktivitätsfilterung ist nicht möglich.
