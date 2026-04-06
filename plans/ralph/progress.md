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
