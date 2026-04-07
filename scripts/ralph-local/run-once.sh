#!/bin/bash
set -eo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

require_command codex
require_command gh
require_command git

load_env
require_clean_worktree

PROMPT="$(render_prompt)"
RESULT="$(run_codex "$PROMPT")"

printf '%s\n' "$RESULT"
