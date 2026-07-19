#!/usr/bin/env bash
# SKILL.md write gate: allow only when a validation artifact exists for the target skill.
set -euo pipefail

# Arguments supplied by the hook runner: tool name, path, etc.
TOOL_NAME="${1:-}"
TARGET_PATH="${2:-}"

if [[ -z "$TARGET_PATH" ]]; then
  echo "SKILL WRITE GATE: no target path supplied" >&2
  exit 2
fi

# Resolve the skill directory from the target path.
SKILL_DIR=$(dirname "$TARGET_PATH")
VALIDATION_FILE="$SKILL_DIR/.validation.json"

if [[ ! -f "$VALIDATION_FILE" ]]; then
  echo "SKILL WRITE GATE: no validation artifact for $TARGET_PATH" >&2
  exit 2
fi

# Validation artifact must be fresh (within last 60 minutes) and green.
NOW=$(date +%s)
STAMP=$(jq -r '.validated_at // 0' "$VALIDATION_FILE")
RESULT=$(jq -r '.result // "fail"' "$VALIDATION_FILE")
AGE=$((NOW - STAMP))

if [[ "$RESULT" != "pass" ]]; then
  echo "SKILL WRITE GATE: validation result is '$RESULT' for $TARGET_PATH" >&2
  exit 2
fi

if [[ "$AGE" -gt 3600 ]]; then
  echo "SKILL WRITE GATE: validation is stale (${AGE}s > 3600s) for $TARGET_PATH" >&2
  exit 2
fi

echo "SKILL WRITE GATE: fresh green validation for $TARGET_PATH" >&2
exit 0
