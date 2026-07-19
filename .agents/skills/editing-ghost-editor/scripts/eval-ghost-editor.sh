#!/usr/bin/env bash
# Minimal eval suite for editing-ghost-editor.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SKILL="$ROOT/editing-ghost-editor/SKILL.md"

fail() { echo "FAIL: $1" >&2; exit 1; }

# Routing: skill must mention key files and contracts.
grep -q "GhostEditor.tsx" "$SKILL" || fail "missing GhostEditor.tsx reference"
grep -q "suggestionCache.ts" "$SKILL" || fail "missing suggestionCache.ts reference"
grep -q "fetchCompletion" "$SKILL" || fail "missing fetchCompletion reference"
grep -q "MAX_BEFORE" "$SKILL" || fail "missing MAX_BEFORE reference"
grep -q "dangerouslySetInnerHTML" "$SKILL" || fail "missing dangerouslySetInnerHTML gotcha"

echo "PASS: editing-ghost-editor eval"
