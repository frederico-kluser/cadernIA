#!/usr/bin/env bash
# Minimal eval suite for editing-notepad-3d.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SKILL="$ROOT/editing-notepad-3d/SKILL.md"

fail() { echo "FAIL: $1" >&2; exit 1; }

# Routing: skill must mention key files and contracts.
grep -q "NotepadScene.tsx" "$SKILL" || fail "missing NotepadScene.tsx reference"
grep -q "PageTexture.tsx" "$SKILL" || fail "missing PageTexture.tsx reference"
grep -q "onLayout" "$SKILL" || fail "missing onLayout reference"
grep -q "Notepad.tsx" "$SKILL" || fail "missing Notepad.tsx reference"
grep -q "1.05 s" "$SKILL" || fail "missing flip timing reference"

echo "PASS: editing-notepad-3d eval"
