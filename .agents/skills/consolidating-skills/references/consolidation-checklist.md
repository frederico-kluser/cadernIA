# Consolidation Checklist

## Pre-run

- [ ] Run `scripts/lint-skill.sh` on every skill.
- [ ] Run `scripts/eval-all.sh` and record baseline.

## Scan

- [ ] List all `.agents/skills/*/SKILL.md`.
- [ ] Count lines per body; flag > 500.

## Deduplicate

- [ ] Find identical or near-identical passages.
- [ ] Keep the passage with stronger provenance and narrower scope.

## Conflict resolution

- [ ] List contradictory rules.
- [ ] For each, compare external signals.
- [ ] If unclear, mark "to revalidate" and ask second opinion.

## Staleness

- [ ] For each `file:line@hash`, compare hash to current commit.
- [ ] If changed, revalidate or retire.

## Second-opinion prompt

> Review the proposed deletion/rewrite in SKILL.md. Flag only correctness or requirement gaps. Is the old passage still valid? Is the new passage better scoped and provenanced?

## Post-run

- [ ] Re-run lint and eval-all.
- [ ] Emit diff for human review.
