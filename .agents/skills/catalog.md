# cadernIA Skill Catalog

> Source of truth: `.agents/skills/` (symlinked from `.claude/skills/`).
> Always route through `project-router` before any implementation work.

## Router

- [`project-router`](project-router/SKILL.md) — Routes every task to the correct skills; never asks clarifying questions (assumes and documents in `TASK_PLAN.md`); always commits at task end.

## Knowledge

- [`working-in-cadernia`](working-in-cadernia/SKILL.md) — Stack conventions: React 19, Vite, Tailwind, shadcn/ui, TypeScript strictness, ESLint, path aliases, build commands.

## Task skills

- [`editing-ghost-editor`](editing-ghost-editor/SKILL.md) — Ghost autocomplete, suggestion cache, OpenAI completion flow, Tab/Esc/manual triggers.
- [`editing-notepad-3d`](editing-notepad-3d/SKILL.md) — Three.js scene, page texture rasterization, flip/tear animations, editor overlay positioning.
- [`editing-local-persistence`](editing-local-persistence/SKILL.md) — IndexedDB schema, project/attachment CRUD, migration, export, `localStorage` settings.

## Meta skills

- [`evolving-skills`](evolving-skills/SKILL.md) — Direct SKILL.md update pipeline; proposes new skills for review; discards unverified learnings.
- [`consolidating-skills`](consolidating-skills/SKILL.md) — Periodic GC: deduplicate, resolve conflicts, revalidate provenance, enforce token budgets.

## Scripts

- `scripts/lint-skill.sh <SKILL.md>` — deterministic skill linter.
- `scripts/eval-all.sh` — runs linter + all domain eval suites.
- `scripts/gate-stop.sh` — bootstrap Stop gate.
- `scripts/gate-skill-write.sh` — SKILL.md write gate.
- `scripts/security-guardrail.sh` — dangerous action guardrail.
- `scripts/update-bootstrap-state.sh` — update `.bootstrap-state.json`.
