#!/usr/bin/env bash
# Update the bootstrap state file for a given phase.
set -euo pipefail

PHASE_ID="${1:-}"
DONE="${2:-}"
GATE_PASSED="${3:-}"
UPDATED_BY="${4:-}"

STATE_FILE=".agents/skills/.bootstrap-state.json"
TMP_FILE=$(mktemp)

trap 'rm -f "$TMP_FILE"' EXIT

jq --argjson id "$PHASE_ID" \
   --argjson done "$DONE" \
   --argjson gate "$GATE_PASSED" \
   --arg by "$UPDATED_BY" '
  .phases |= map(if .id == $id then .done = $done | .gate_passed = $gate else . end) |
  .updated_by = $by
' "$STATE_FILE" > "$TMP_FILE"

mv "$TMP_FILE" "$STATE_FILE"
echo "Bootstrap state updated: phase $PHASE_ID done=$DONE gate_passed=$GATE_PASSED by=$UPDATED_BY"
