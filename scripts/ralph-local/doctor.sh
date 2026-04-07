#!/bin/bash
set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Repo: $REPO_ROOT"

for cmd in codex gh git tmux; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "[ok] $cmd: $(command -v "$cmd")"
  else
    echo "[missing] $cmd"
  fi
done

echo ""
echo "GitHub auth:"
gh auth status || true

echo ""
echo "Codex version:"
codex --version || true

echo ""
echo "Current branch:"
git -C "$REPO_ROOT" branch --show-current

echo ""
echo "Open Ralph issues:"
gh issue list --state open --label ralph --limit 10 || true
