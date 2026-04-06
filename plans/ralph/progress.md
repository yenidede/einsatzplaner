# Ralph Progress

Diese Datei ist die Uebergabe zwischen Ralph-Laeufen.

## Eintraege

### 2026-04-06

- Host-nativer Ralph-Worktree angelegt.
- Codex CLI soll direkt lokal statt ueber Sandcastle genutzt werden.
- Issue: #381
- Branch: codex/ralph-local-cli
- Erledigte Arbeit: zentrale Route-Guard-Auswertung fuer Organisations-Settings ergaenzt; Direktlink-Wechsel fragt Zielorganisation explizit bestaetigt ab; ungespeicherte Aenderungen werden vor dem Organisationswechsel nochmals bestaetigt; Verhalten mit Utility-Tests abgesichert.
- Offenes Risiko: Der restliche PRD-Scope fuer mobile Navigation und weitere Settings-Fluesse ist noch nicht vollstaendig ueberprueft.
- Naechster Schritt: Den verbleibenden Settings-Scope aus #381 in weiteren kleinen Slices fuer Navigation und Guard-Verhalten vervollstaendigen.
