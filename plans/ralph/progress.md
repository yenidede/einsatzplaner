# Ralph Progress

Diese Datei ist die Uebergabe zwischen Ralph-Laeufen.

## Eintraege

### 2026-04-06

- Host-nativer Ralph-Worktree angelegt.
- Codex CLI soll direkt lokal statt ueber Sandcastle genutzt werden.

### 2026-04-06 - Issue #387

- Datum: 2026-04-06
- Issue: #387 Organisations-Trial-Grundlage mit zentralem Layout-Gating
- Branch: codex/ralph-local-cli
- Erledigte Arbeit: Zentrale Trial-/Subscription-Access-Decision fuer Organisationen eingefuehrt, aktive Organisation serverseitig im Main-Layout geprueft und bei abgelaufenem Zugriff aus der normalen Main-App-Ansicht ausgeschleust; dazu gezielte Tests fuer Access-Entscheidung und Layout-Gating ergaenzt.
- Offenes Risiko: Die Sperransicht ist bewusst noch neutral und ohne die dedizierte `/subscription-expired`-Route sowie rollensensitive Inhalte; das folgt in den abhaengigen Issues.
- Naechster Schritt: Auf Basis dieses Gates die dedizierte Expired-Experience und den Org-Switch fuer abgelaufene Organisationen umsetzen.

### 2026-04-06 - Issue #391

- Datum: 2026-04-06
- Issue: #391 Self-Serve Signup Schritt 1 mit Organisationspruefung
- Branch: codex/ralph-local-cli
- Erledigte Arbeit: `/signup` vom Invite-Only-Platzhalter auf einen echten Self-Serve-Schritt-1-Flow umgestellt; Organisationsdatenformular, serverseitige Namenspruefung gegen bestehende Organisationen, abgestimmte Nicht-Verfuegbar-Meldung sowie ein kleiner Mehrschritt-Rahmen mit erhaltenen Organisationsdaten fuer den naechsten Flow-Schritt eingefuehrt; dazu gezielte Tests fuer Verfuegbarkeitspruefung und Draft-Erhalt ergaenzt.
- Offenes Risiko: Die in der PRD geforderte Pruefung gegen aktive fremde Pending-Reservations ist mit dem aktuellen Datenmodell noch nicht moeglich, weil dafuer derzeit kein Reservation-/Pending-Signup-Modell im Prisma-Schema vorhanden ist; der zweite Kontoschritt folgt ebenfalls erst in den abhaengigen Signup-Issues.
- Naechster Schritt: Pending-Signup-/Reservations-Grundlage schaffen und darauf aufbauend den adaptiven Kontoschritt vervollstaendigen.
