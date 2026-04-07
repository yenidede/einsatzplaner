# Ralph Local CLI Setup

Dieser Worktree ist fuer einen stabileren Ralph-Betrieb mit der **lokalen Codex CLI auf dem Host** gedacht.

## Warum dieser Ansatz?

Die Subscription-basierte Codex-Anmeldung ist lokal in `~/.codex` am stabilsten. Containerisierte Varianten ueber Sandcastle waren bisher stoeranfaellig, vor allem bei WebSocket- und Auth-Zustaenden.

Darum nutzt dieser Ansatz:

- einen separaten Worktree
- die lokale `codex exec`-CLI direkt auf dem Host
- GitHub-Issues mit Label `ralph` als Source of Truth
- `tmux` fuer Hintergrundbetrieb

## Schnellstart

```bash
cp .ralph-local.env.example .ralph-local.env
pnpm ralph:doctor
pnpm ralph
```

Fuer Hintergrundbetrieb:

```bash
pnpm ralph:tmux
```

## Wichtige Dateien

- [scripts/ralph-local/run-once.sh](/Users/davidkathrein/local-dev/einsatzplaner-ralph-local/scripts/ralph-local/run-once.sh)
  Fuehrt genau einen Ralph-Lauf aus.
- [scripts/ralph-local/run-loop.sh](/Users/davidkathrein/local-dev/einsatzplaner-ralph-local/scripts/ralph-local/run-loop.sh)
  Fuehrt mehrere Iterationen hintereinander aus.
- [scripts/ralph-local/tmux-start.sh](/Users/davidkathrein/local-dev/einsatzplaner-ralph-local/scripts/ralph-local/tmux-start.sh)
  Startet Ralph in `tmux`.
- [scripts/ralph-local/prompt.md](/Users/davidkathrein/local-dev/einsatzplaner-ralph-local/scripts/ralph-local/prompt.md)
  Enthält die Arbeitsregeln fuer Ralph.
- [plans/ralph/progress.md](/Users/davidkathrein/local-dev/einsatzplaner-ralph-local/plans/ralph/progress.md)
  Loggt die Uebergabe zwischen Ralph-Laeufen.

## Optionen fuer autonomen Hintergrundbetrieb

1. `tmux`
   Am einfachsten und fuer lokale Nutzung meist ausreichend. Ralph laeuft weiter, auch wenn Sie das Terminal schliessen.

2. `launchd`
   Sinnvoll, wenn Ralph automatisch beim Login oder periodisch gestartet werden soll. Das ist stabiler als ein dauerhaft offenes Terminal, aber mehr Betriebsaufwand.

3. `cron`
   Nur fuer einfache periodische Einzelstarts geeignet. Fuer interaktive CLI-Tools und laengere Prozesse meist die schwaechste Option.

## Empfehlung

Fuer Ihre aktuelle Lage ist dies die beste Reihenfolge:

1. Host-native Codex CLI im separaten Worktree
2. `tmux` fuer den Hintergrundbetrieb
3. Optional spaeter `launchd`, falls Sie echten Daemon-Betrieb wollen

## Grenzen

- Ralph laeuft hier ohne Container-Sandbox.
- Er hat damit Host-Zugriff in diesem Worktree-Kontext.
- Das ist stabiler fuer Ihre Subscription-Auth, aber sicherheitlich offener als Sandcastle.
