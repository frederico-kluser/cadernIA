#!/usr/bin/env bash
# Deterministic skill linter: validates frontmatter, naming, and body constraints.
set -euo pipefail

SKILL_PATH="${1:-}"
if [[ -z "$SKILL_PATH" ]]; then
  echo "Usage: lint-skill.sh <path/to/SKILL.md>" >&2
  exit 2
fi

if [[ ! -f "$SKILL_PATH" ]]; then
  echo "FAIL: $SKILL_PATH not found" >&2
  exit 2
fi

ERRORS=0

# Extract frontmatter block.
FRONT=$(sed -n '/^---$/,/^---$/p' "$SKILL_PATH" | sed '1d;$d')

NAME=$(echo "$FRONT" | grep -E '^name:' | sed 's/^name: *//' | tr -d '"' | head -n1)
DESCRIPTION=$(echo "$FRONT" | grep -E '^description:' | sed 's/^description: *//' | tr -d '"' | head -n1)
TYPE=$(echo "$FRONT" | grep -E '^  type:' | sed 's/^  type: *//' | tr -d '"' | head -n1)
VERIF=$(echo "$FRONT" | grep -E '^  verification_signal:' | sed 's/^  verification_signal: *//' | tr -d '"' | head -n1)

# 1. Name rules: lowercase letters/numbers/hyphens, gerund form, <= 64 chars.
if [[ -z "$NAME" ]]; then
  echo "FAIL: missing name" >&2; ERRORS=$((ERRORS+1))
elif [[ ${#NAME} -gt 64 ]]; then
  echo "FAIL: name too long (${#NAME} > 64): $NAME" >&2; ERRORS=$((ERRORS+1))
elif [[ "$NAME" =~ [^a-z0-9-] ]]; then
  echo "FAIL: name contains invalid chars: $NAME" >&2; ERRORS=$((ERRORS+1))
fi

# 2. Description rules: third person, <= 1024 chars, present.
if [[ -z "$DESCRIPTION" ]]; then
  echo "FAIL: missing description" >&2; ERRORS=$((ERRORS+1))
elif [[ ${#DESCRIPTION} -gt 1024 ]]; then
  echo "FAIL: description too long (${#DESCRIPTION} > 1024)" >&2; ERRORS=$((ERRORS+1))
fi

# 3. Metadata rules.
if [[ -z "$TYPE" ]]; then
  echo "FAIL: missing metadata.type" >&2; ERRORS=$((ERRORS+1))
elif [[ ! "$TYPE" =~ ^(knowledge|task|router|meta)$ ]]; then
  echo "FAIL: invalid metadata.type: $TYPE" >&2; ERRORS=$((ERRORS+1))
fi

if [[ -z "$VERIF" ]]; then
  echo "FAIL: missing metadata.verification_signal" >&2; ERRORS=$((ERRORS+1))
fi

# 4. Body constraints: < 500 lines.
BODY_LINES=$(sed -n '/^# /,$p' "$SKILL_PATH" | wc -l)
if [[ "$BODY_LINES" -gt 500 ]]; then
  echo "FAIL: body too long ($BODY_LINES > 500 lines)" >&2; ERRORS=$((ERRORS+1))
fi

# 5. Task skills must contain an <evolution> section.
if [[ "$TYPE" == "task" ]] && ! grep -q '<evolution>' "$SKILL_PATH"; then
  echo "FAIL: task skill missing <evolution> section" >&2; ERRORS=$((ERRORS+1))
fi

# 6. Router must contain Portuguese question instructions and TASK_PLAN.md lifecycle.
if [[ "$NAME" == "project-router" ]]; then
  if ! grep -qi 'português\|portuguese' "$SKILL_PATH"; then
    echo "FAIL: project-router must mention Portuguese" >&2; ERRORS=$((ERRORS+1))
  fi
  if ! grep -q 'TASK_PLAN.md' "$SKILL_PATH"; then
    echo "FAIL: project-router must mention TASK_PLAN.md" >&2; ERRORS=$((ERRORS+1))
  fi
fi

if [[ "$ERRORS" -gt 0 ]]; then
  echo "FAIL: $ERRORS lint error(s) in $SKILL_PATH" >&2
  exit 2
fi

echo "PASS: $SKILL_PATH"
exit 0
