#!/bin/bash
set -eo pipefail

SESSION_NAME="${RALPH_TMUX_SESSION:-ralph-local}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ITERATIONS="${1:-25}"

if ! command -v tmux >/dev/null 2>&1; then
  echo "Fehler: tmux ist nicht installiert."
  exit 1
fi

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Fehler: Die tmux-Session '$SESSION_NAME' existiert bereits."
  exit 1
fi

tmux new-session -d -s "$SESSION_NAME" "cd '$REPO_ROOT' && bash ./scripts/ralph-local/run-loop.sh '$ITERATIONS' | tee -a ./plans/ralph/tmux.log"

echo "Ralph wurde in tmux gestartet."
echo "Session: $SESSION_NAME"
echo "Anzeigen: tmux attach -t $SESSION_NAME"
