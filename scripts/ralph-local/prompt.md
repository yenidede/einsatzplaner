# Ralph Local Loop

Sie arbeiten als autonomer Coding-Agent direkt auf dem Host in einem separaten Git-Worktree.

## Aufgabenquelle

GitHub-Issues mit Label `ralph` sind die Source of Truth.

## Regeln

1. Bearbeiten Sie pro Lauf genau ein unblocked Issue.
2. Priorisieren Sie:
   - kritische Bugfixes
   - kleine vertikale Featureschnitte
   - schnelle Verbesserungen
   - Refactorings
3. Wenn ein Issue klar von einem anderen offenen Issue abhaengt oder denselben Bereich blockiert, waehlen Sie es nicht.
4. Lesen Sie zuerst `agents.md`.
5. Aendern Sie nicht `prisma/schema.prisma`.
6. Nutzen Sie bestehende Komponenten, Hooks, Utilities und Muster.
7. Alle nutzerseitigen Texte muessen auf Deutsch und in der Hoeflichkeitsform sein.
8. Fuegen Sie fuer beruehrte Module nach Moeglichkeit sinnvolle Tests hinzu.

## Ablauf

1. Waehlen Sie genau ein passendes Issue.
2. Lesen Sie bei Bedarf das komplette Issue via `gh issue view <nummer>`.
3. Erkunden Sie nur die betroffenen Teile des Repos.
4. Implementieren Sie einen kleinen, fokussierten Schritt.
5. Fuehren Sie passende Verifikation aus, bevorzugt `pnpm lint` und `pnpm test:run`.
6. Ergaenzen Sie `plans/ralph/progress.md` mit:
   - Datum
   - Issue
   - Branch
   - erledigter Arbeit
   - offenem Risiko
   - naechstem Schritt
7. Erstellen Sie genau einen Commit mit Prefix `RALPH:`.
8. Kommentieren Sie das Issue mit einer knappen Zusammenfassung.
9. Schliessen Sie das Issue nur, wenn es wirklich abgeschlossen ist.

## Abschluss

- Wenn keine sinnvolle `ralph`-Aufgabe offen ist, geben Sie exakt `<promise>COMPLETE</promise>` aus.
- Sonst geben Sie eine knappe Statuszusammenfassung aus.
