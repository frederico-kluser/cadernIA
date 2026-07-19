#!/usr/bin/env bash
# Minimal eval suite for editing-local-persistence.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SKILL="$ROOT/editing-local-persistence/SKILL.md"

fail() { echo "FAIL: $1" >&2; exit 1; }

# Routing: skill must mention key files and contracts.
grep -q "lib/db.ts" "$SKILL" || fail "missing lib/db.ts reference"
grep -q "noteghost_db" "$SKILL" || fail "missing DB name reference"
grep -q "crypto.randomUUID" "$SKILL" || fail "missing crypto.randomUUID reference"
grep -q "noteghost_api_key" "$SKILL" || fail "missing API key storage reference"
grep -q "noteghost_text" "$SKILL" || fail "missing legacy migration reference"

echo "PASS: editing-local-persistence eval"
