#!/usr/bin/env bash
# Run all skill eval suites.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Running skill linter on all skills..."
for skill in "$ROOT"/*/SKILL.md; do
  bash "$ROOT/scripts/lint-skill.sh" "$skill"
done

echo "Running domain eval suites..."
bash "$ROOT/editing-ghost-editor/scripts/eval-ghost-editor.sh"
bash "$ROOT/editing-notepad-3d/scripts/eval-notepad-3d.sh"
bash "$ROOT/editing-local-persistence/scripts/eval-local-persistence.sh"
bash "$ROOT/project-router/scripts/eval-router.sh"

echo "PASS: eval-all"
