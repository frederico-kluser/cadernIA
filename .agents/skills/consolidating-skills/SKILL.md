---
name: consolidating-skills
description: Periodic garbage collection for the skill library: deduplicate, resolve conflicts, revalidate by provenance, and enforce token budgets. Use when skills grow too large, contain contradictions, or at scheduled intervals.
metadata:
  type: meta
  verification_signal: skill linter + full regression suite + second-opinion review
---
# consolidating-skills

## When to use

- Scheduled GC (e.g., weekly).
- When a skill exceeds ~500 lines or ~5k tokens.
- When two skills contain overlapping or contradictory guidance.
- When provenance hashes show a cited source has changed.

## Injected knowledge

### Consolidation steps

1. **Scan**: list all `.agents/skills/*/SKILL.md` files.
2. **Deduplicate**: identify redundant passages by pattern/key; keep the one with the best provenance and scope.
3. **Conflict resolution**: for contradictions, prefer the passage supported by the stronger external signal. If unclear, mark the passage "to revalidate" and ask for a second opinion.
4. **Staleness check**: for each provenance citation `path/file:line@hash`, compare the hash against the current file. If changed, mark "to revalidate" and either revalidate or retire.
5. **Budget enforcement**: if a skill body exceeds 500 lines, move long material to `references/*.md`.
6. **Regression gating**: run the full eval suite. Promote only if no correct→wrong flips occur.

### Safety rules

- Deletions require a second-opinion subagent review (consensus) and respect the reversibility guardrail.
- Emit a diff/PR for human review; do not silently delete skills.
- Never delete bootstrap artifacts (`project-analysis.md`, `skill-map.md`, `catalog.md`, `validation-report.md`, `.bootstrap-state.json`).

## Procedure

1. Run `scripts/lint-skill.sh` on every skill.
2. Run `scripts/eval-all.sh` (full regression suite).
3. Identify duplicates, conflicts, and stale provenance.
4. For each candidate deletion or broad rewrite, spawn a second-opinion subagent.
5. Apply only changes that pass lint and regression.
6. Commit with a descriptive message.

## References

- `references/consolidation-checklist.md` — detailed checklist and second-opinion prompt.

## <evolution>

On task completion, run the <memory_pipeline>: if there is IMPORTANT and VERIFIED information to retain about consolidation, update THIS SKILL.md DIRECTLY. Do NOT create learnings files.
