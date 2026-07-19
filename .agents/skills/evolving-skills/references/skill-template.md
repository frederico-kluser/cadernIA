# Skill Template

```yaml
---
name: <gerund-lowercase-hyphen>
description: <third person; what it does AND when to use; explicit triggers; slightly pushy>
metadata:
  type: <knowledge|task|router|meta>
  verification_signal: <which test/lint/build/type-check/eval validates updates>
---
# <Skill Name>

## When to use
<activation context>

## Injected knowledge
<minimal high-signal context; each item with scope and provenance file:line@hash>

## Procedure (task skills)
<action-verb steps>

## References
<links to references/*.md>

## <evolution>
On task completion, run the <memory_pipeline>.
```

## Authoring rules

- name: lowercase letters/numbers/hyphens, gerund, ≤ 64 chars.
- description: third person, ≤ 1024 chars, what + when, slightly pushy triggers.
- body < 500 lines; move long docs to `references/`.
- Every knowledge item: scope + provenance.
- No dates/changelogs in the skill file.
