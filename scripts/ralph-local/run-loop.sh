#!/bin/bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ITERATIONS="${1:-25}"
SLEEP_SECONDS="${RALPH_SLEEP_SECONDS:-15}"

for ((i=1; i<=ITERATIONS; i++)); do
  echo "Ralph Iteration $i"
  echo "--------------------------------"

  RESULT="$(bash "$SCRIPT_DIR/run-once.sh")"
  printf '%s\n' "$RESULT"

  if [[ "$RESULT" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "Ralph meldet Abschluss nach $i Iterationen."
    exit 0
  fi

  if [ "$i" -lt "$ITERATIONS" ]; then
    sleep "$SLEEP_SECONDS"
  fi
done

echo "Ralph hat das Iterationslimit erreicht."
