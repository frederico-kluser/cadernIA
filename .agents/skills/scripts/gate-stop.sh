#!/usr/bin/env bash
# Bootstrap Stop gate: blocks turn termination until every phase is done and passed.
set -euo pipefail

STATE_FILE=".agents/skills/.bootstrap-state.json"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "STOP GATE: missing $STATE_FILE" >&2
  exit 2
fi

STOP_ACTIVE=$(jq -r '.stop_hook_active // true' "$STATE_FILE")
if [[ "$STOP_ACTIVE" != "true" ]]; then
  echo "STOP GATE: stop_hook_active is false; allowing termination." >&2
  exit 0
fi

INCOMPLETE=$(jq -r '[.phases[] | select(.done != true or .gate_passed != true)] | length' "$STATE_FILE")
if [[ "$INCOMPLETE" -gt 0 ]]; then
  echo "STOP GATE: $INCOMPLETE phase(s) incomplete. Run validation and continue." >&2
  jq -r '.phases[] | select(.done != true or .gate_passed != true) | "  - Phase \(.id): \(.name) (done=\(.done), gate_passed=\(.gate_passed))"' "$STATE_FILE" >&2
  exit 2
fi

echo "STOP GATE: all phases complete and passed." >&2
exit 0
