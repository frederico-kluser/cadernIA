#!/usr/bin/env bash
# Minimal eval suite for editing-notepad-3d.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SKILL="$ROOT/editing-notepad-3d/SKILL.md"

fail() { echo "FAIL: $1" >&2; exit 1; }

# Routing: skill must mention key files and contracts.
grep -q "PageSheet.tsx" "$SKILL" || fail "missing PageSheet.tsx reference"
grep -q "Home.tsx" "$SKILL" || fail "missing Home.tsx reference"
grep -q "index.css" "$SKILL" || fail "missing index.css reference"
grep -q "GhostEditor.tsx" "$SKILL" || fail "missing GhostEditor.tsx reference"
grep -q "0.85 s" "$SKILL" || fail "missing flip timing reference"
grep -q "0.7 s" "$SKILL" || fail "missing tear timing reference"
grep -q "background-position" "$SKILL" || fail "missing background-position reference"
grep -q "\-\-editor-lh" "$SKILL" || fail "missing --editor-lh reference"

echo "PASS: editing-notepad-3d eval"
