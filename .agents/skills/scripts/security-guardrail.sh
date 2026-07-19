#!/usr/bin/env bash
# Security guardrail: block reads of secrets and dangerous Bash commands.
set -euo pipefail

TOOL_NAME="${1:-}"
TARGET="${2:-}"

if [[ -z "$TOOL_NAME" || -z "$TARGET" ]]; then
  echo "SECURITY GUARDRAIL: missing arguments" >&2
  exit 2
fi

if [[ "$TOOL_NAME" == "Read" ]]; then
  # Block reads of common secret/credential paths.
  case "$TARGET" in
    *.env|*.env.*|secrets/*|*.pem|*.key|id_rsa|id_ed25519|.ssh/*)
      echo "SECURITY GUARDRAIL: blocked read of $TARGET" >&2
      exit 2
      ;;
  esac
fi

if [[ "$TOOL_NAME" == "Bash" ]]; then
  # Block dangerous Bash patterns.
  DANGEROUS=("rm -rf /" "rm -rf ~" "rm -rf /*" ":(){ :|:& };:" "> /dev/sda" "mkfs." "dd if=/dev/zero" "git filter-branch" "git reset --hard" "git clean -fdx" "git push --force" "git push -f")
  for pattern in "${DANGEROUS[@]}"; do
    if [[ "$TARGET" == *"$pattern"* ]]; then
      echo "SECURITY GUARDRAIL: blocked dangerous command containing '$pattern'" >&2
      exit 2
    fi
  done
fi

echo "SECURITY GUARDRAIL: allowed $TOOL_NAME on $TARGET" >&2
exit 0
