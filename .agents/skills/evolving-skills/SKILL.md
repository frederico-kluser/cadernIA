---
name: evolving-skills
description: Decides whether to update an existing skill, propose a new skill, or discard a learning. Use at the end of every task and whenever no existing skill covers a new area.
metadata:
  type: meta
  verification_signal: skill linter + regression evals on affected skills
---
# evolving-skills

## When to use

- At the end of every task, for each involved task skill.
- When the router cannot find a skill for a new domain or workflow.

## Injected knowledge

### Decision tree

1. **Is the information important?** Important = non-obvious, not inferable by the model, non-volatile, and it CHANGES how future tasks in this area should be done. If not, discard.
2. **Is it externally verified?** Accept only: green test/build/lint/type-check/eval, entailment against the cited source, or explicit user confirmation. If not, discard.
3. **Does it fit an existing skill?** Update that skill directly via the memory pipeline.
4. **Is it a new area?** Produce a draft SKILL.md per the skill template and leave it for human review. Do **not** publish directly.
5. **Conflict detection**: if the new information contradicts the skill, REPLACE the old passage; do not append a competing rule.

### Update rules

- Edit/replace the relevant passage; do not append indiscriminately.
- Include the validity condition/scope and provenance `path/file:line@short_hash`.
- Keep the skill body under 500 lines; move long material to `references/*.md`.
- No dates/changelogs in the skill file.
- High-impact changes (broad behavior change) remain a diff/PR for human approval; do not auto-merge.

## Procedure

1. Review the task outcome and any build/lint/test/eval results.
2. For each affected task skill, run the five-step memory pipeline:
   - Importance gate
   - External verification gate
   - Conflict detection
   - Gating + lean direct update
   - Git commit
3. If a new skill is needed, write a draft in `.agents/skills/_drafts/<name>/SKILL.md` and report it.
4. Run `scripts/lint-skill.sh` on the updated skill.
5. Run the skill's regression eval suite.

## References

- `references/memory-pipeline.md` — full five-step pipeline.
- `references/skill-template.md` — SKILL.md template and authoring rules.

## <evolution>

On task completion, run the <memory_pipeline>: if there is IMPORTANT and VERIFIED information to retain about skill evolution itself, update THIS SKILL.md DIRECTLY. Do NOT create learnings files.
