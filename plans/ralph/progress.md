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

### 2026-04-06 - Issue #388

- Datum: 2026-04-06
- Issue: #388 Expired-Screen fuer aktive abgelaufene Organisation
- Branch: codex/ralph-local-cli
- Erledigte Arbeit: Das Main-Layout leitet bei abgelaufener aktiver Organisation jetzt auf die neue Route `/subscription-expired` um; dort wird serverseitig Session, aktiver Organisationszugriff und die Rollenlage der angemeldeten Person geprueft, die Standard-Navigation ausgeblendet und je nach Rollenlage entweder nur der allgemeine Verwaltungs-Hinweis oder zusaetzlich `hello@davidkathrein.at` als sichtbarer Mailto-Kontakt angezeigt; dazu wurden gezielte Tests fuer Redirect-Regeln, helper-only vs. Nicht-nur-Helfer sowie die Navbar-Ausblendung ergaenzt.
- Offenes Risiko: Die Rueckkehr in eine alternative aktive Organisation erfolgt derzeit ueber den bestehenden Organisationswechsel; die erweiterte Switcher-UX fuer sichtbar deaktivierte abgelaufene Organisationen folgt erst im abhaengigen Issue #389.
- Naechster Schritt: Den Organisations-Switch fuer gemischte aktive und abgelaufene Organisationen mit deaktivierten Optionen und rollensensitiven Tooltips umsetzen.

### 2026-04-06 - Issue #390

- Datum: 2026-04-06
- Issue: #390 Trial-Hinweis im Hauptlayout fuer Nicht-nur-Helfer
- Branch: codex/ralph-local-cli
- Erledigte Arbeit: Einen globalen Trial-Hinweis im Main-Layout ergaenzt, der nur fuer aktive Trial-Organisationen und nur fuer Nutzer:innen mit mindestens einer Nicht-Helfer-Rolle angezeigt wird; die Tageslogik fuer `endet heute`, `endet morgen` und mehrtaegige Restlaufzeit in eine eigene Organisations-Utility ausgelagert und mit Layout- sowie Unit-Tests abgesichert.
- Offenes Risiko: `pnpm lint` ist weiterhin nur wegen bereits vorhandener Repo-Warnungen nicht sauber nullwarnungsfrei; aus diesem Slice sind keine neuen Lint-Fehler entstanden.
- Naechster Schritt: Den Organisations-Switch fuer gemischte aktive und abgelaufene Organisationen mit deaktivierten Optionen und rollensensitiven Tooltips in Issue #389 umsetzen.

### 2026-04-06 - Issue #389

- Datum: 2026-04-06
- Issue: #389 Org-Switch mit abgelaufenen Organisationen und Tooltips
- Branch: codex/ralph-local-cli
- Erledigte Arbeit: Den Navbar-Organisationswechsel fuer gemischte aktive und abgelaufene Organisationen erweitert; abgelaufene Organisationen bleiben jetzt sichtbar, werden deaktiviert und erhalten rollensensitive Hinweistexte passend zur Expired-Experience, waehrend der Wechsel von `/subscription-expired` in eine aktive Organisation direkt wieder in die Hauptansicht fuehrt; dazu wurden gezielte Tests fuer Disabled-State, Hinweisvarianten und Rueckkehr-Verhalten ergaenzt.
- Offenes Risiko: `pnpm lint` bleibt weiterhin nur wegen bereits vorhandener Repo-Warnungen ohne Nullwarnungsstand; in diesem Slice sind keine neuen Lint-Fehler entstanden.
- Naechster Schritt: Den naechsten unblocked Ralph-Issue auswaehlen; die aktuell offenen Signup-/Provisioning-Issues bleiben weiterhin von #391/#392/#393 abhaengig.

### 2026-04-06 - Issue #392

- Datum: 2026-04-06
- Issue: #392 Signup-Schritt 2 mit Moduswechsel fuer neue, bestehende und eingeloggte Nutzer
- Branch: codex/ralph-local-cli
- Erledigte Arbeit: Den Self-Serve-Signup um einen serverseitig aufgeloesten zweiten Schritt erweitert; nach der Organisationspruefung wird jetzt zwischen neuer E-Mail, bestehendem Konto und bereits angemeldeter Person unterschieden, der Kontoschritt entsprechend als Registrierungsformular, Passwort-Only-Anmeldung oder uebersprungener Schritt dargestellt und der Organisations-Draft ueber die Wechsel hinweg erhalten; dazu wurden gezielte Unit- und Flow-Tests fuer Modusauflosung, Draft-Erhalt und bestehende Kontoanmeldung ergaenzt.
- Offenes Risiko: Fuer neue Konten endet der Flow derzeit noch in einer bewusst sichtbaren Fortsetzungsstufe, weil das echte Pending-Signup mit E-Mail-Bestaetigung erst in Issue #393 und das eigentliche Provisioning erst in Issue #394 folgt; das Issue bleibt deshalb vorerst offen.
- Naechster Schritt: Auf diesem Moduswechsel in Issue #393 die Pending-Signup-/E-Mail-Bestaetigungsstrecke aufbauen und danach in #394 die echte Organisationsfinalisierung anschliessen.

### 2026-04-06 - Issue #391

- Datum: 2026-04-06
- Issue: #391 Self-Serve Signup Schritt 1 mit Organisationspruefung
- Branch: codex/ralph-local-cli
- Erledigte Arbeit: Die serverseitige Organisations-Namenspruefung auf strukturierte Blocker erweitert; bestehende Organisationen und kuenftige aktive Fremd-Reservations koennen jetzt denselben Verfuegbarkeitspfad und dieselbe abgestimmte Nicht-Verfuegbar-Meldung nutzen, und gezielte Tests decken sowohl den bestehenden Organisationskonflikt als auch den vorbereiteten Reservation-Blocker ab.
- Offenes Risiko: Die echte Pruefung gegen aktive Fremd-Reservations bleibt weiterhin datenmodellbedingt offen, weil im aktuellen Prisma-Schema noch kein Pending-Signup-/Reservation-Modell existiert; der neue Hook bereitet nur den serverseitigen Integrationspunkt dafuer vor.
- Naechster Schritt: In Issue #393 das Pending-Signup-/Reservation-Modell einfuehren und den vorbereiteten Reservation-Blocker an die reale Datenquelle anbinden.
