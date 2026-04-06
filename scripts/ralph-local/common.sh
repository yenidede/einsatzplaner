#!/bin/bash
set -eo pipefail

RALPH_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RALPH_REPO_ROOT="$(cd "$RALPH_SCRIPT_DIR/../.." && pwd)"
RALPH_PLAN_DIR="$RALPH_REPO_ROOT/plans/ralph"
RALPH_PROGRESS_FILE="$RALPH_PLAN_DIR/progress.md"
RALPH_PROMPT_TEMPLATE="$RALPH_SCRIPT_DIR/prompt.md"
RALPH_ENV_FILE="${RALPH_ENV_FILE:-$RALPH_REPO_ROOT/.ralph-local.env}"

load_env() {
  if [ -f "$RALPH_ENV_FILE" ]; then
    # shellcheck disable=SC1090
    source "$RALPH_ENV_FILE"
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Fehler: Befehl '$1' wurde nicht gefunden."
    exit 1
  fi
}

current_branch() {
  git -C "$RALPH_REPO_ROOT" branch --show-current
}

require_clean_worktree() {
  if [ "${RALPH_ALLOW_DIRTY:-0}" = "1" ]; then
    return
  fi

  if [ -n "$(git -C "$RALPH_REPO_ROOT" status --short)" ]; then
    echo "Fehler: Ralph erwartet einen sauberen Worktree."
    echo "Setzen Sie RALPH_ALLOW_DIRTY=1 nur bewusst fuer Sonderfaelle."
    exit 1
  fi
}

issue_list_json() {
  gh issue list \
    --state open \
    --label ralph \
    --limit "${RALPH_ISSUE_LIMIT:-50}" \
    --json number,title,body,labels,comments \
    --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'
}

recent_ralph_commits() {
  git -C "$RALPH_REPO_ROOT" log --oneline --grep="RALPH:" -10 2>/dev/null || true
}

render_prompt() {
  mkdir -p "$RALPH_PLAN_DIR"

  if [ ! -f "$RALPH_PROGRESS_FILE" ]; then
    cat > "$RALPH_PROGRESS_FILE" <<'EOF'
# Ralph Progress

Diese Datei ist die Uebergabe zwischen Ralph-Laeufen.

## Eintraege
EOF
  fi

  cat <<EOF
$(cat "$RALPH_PROMPT_TEMPLATE")

## Repository

- Pfad: $RALPH_REPO_ROOT
- Branch: $(current_branch)

## GitHub-Issues mit Label ralph

$(issue_list_json)

## Bisheriger Ralph-Progress

$(cat "$RALPH_PROGRESS_FILE")

## Letzte Ralph-Commits

$(recent_ralph_commits)
EOF
}

run_codex() {
  local prompt="$1"
  local model="${RALPH_MODEL:-gpt-5.4}"

  printf '%s\n' "$prompt" | \
    codex exec \
      --json \
      --dangerously-bypass-approvals-and-sandbox \
      --skip-git-repo-check \
      -C "$RALPH_REPO_ROOT" \
      -m "$model"
}
