#!/usr/bin/env bash
# Minimal eval suite for project-router.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SKILL="$ROOT/project-router/SKILL.md"

fail() { echo "FAIL: $1" >&2; exit 1; }

# Must instruct Portuguese questions.
grep -qi "português\|portuguese" "$SKILL" || fail "missing Portuguese instruction"

# Must mention TASK_PLAN.md lifecycle.
grep -q "TASK_PLAN.md" "$SKILL" || fail "missing TASK_PLAN.md reference"
grep -q "DELETE" "$SKILL" || fail "missing TASK_PLAN.md delete instruction"

# Must list all skills.
grep -q "working-in-ghostwriter" "$SKILL" || fail "missing working-in-ghostwriter"
grep -q "editing-ghost-editor" "$SKILL" || fail "missing editing-ghost-editor"
grep -q "editing-notepad-3d" "$SKILL" || fail "missing editing-notepad-3d"
grep -q "editing-local-persistence" "$SKILL" || fail "missing editing-local-persistence"
grep -q "evolving-skills" "$SKILL" || fail "missing evolving-skills"
grep -q "consolidating-skills" "$SKILL" || fail "missing consolidating-skills"

echo "PASS: project-router eval"
