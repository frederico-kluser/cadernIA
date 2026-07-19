---
name: project-router
description: Routes EVERY implementation task in this codebase to the correct skills BEFORE any step. Use whenever the user asks for any change, fix, feature, analysis, or refactor, even if they do not mention skills.
metadata:
  type: router
  verification_signal: router eval suite (Portuguese questions, TASK_PLAN.md lifecycle, correct skill chain)
---
# Project Router

IMPORTANT: all questions and interactions with the user are ALWAYS in BRAZILIAN PORTUGUESE.

## Protocol (run BEFORE any work)

1. **ASK A LOT (in Portuguese).** Before anything, ask SEVERAL clarifying questions to refine the task: exact scope, expected inputs and outputs, constraints, edge cases, acceptance criteria, and what explicitly NOT to do. Do not advance while the task is underspecified; keep asking until ambiguity is gone.
2. **Create a task plan file** in markdown (`TASK_PLAN.md`), in Portuguese, with the detailed plan, steps, and acceptance criteria agreed with the user.
3. **Classify the task**: domain(s) touched, type (bug/feature/refactor/analysis), complexity.
4. **Consult `catalog.md`** and select the relevant knowledge + task skills. On ambiguity, prefer the most domain-specific skill.
5. **Assemble the skill CHAIN** (order + what can run in parallel via isolated-context subagents).
6. **Load the selected skills' knowledge BEFORE implementing.**
7. **Execute the chain** following `TASK_PLAN.md`.
8. **ON COMPLETION:**
   - Run each involved task skill's `<evolution>`.
   - **DELETE** the task plan file (`TASK_PLAN.md`) — it is disposable and must not remain in the repo.

## Rules

- If no skill covers the task, invoke `evolving-skills` to **propose** a new skill (a draft for human review, not direct publication).
- Skills with broad side effects (deploy, structural changes) are NOT auto-invocable without user confirmation.
- Never skip the evolution step on completion. Never leave `TASK_PLAN.md` behind.
- `TASK_PLAN.md` is disposable and is deleted at the end; the bootstrap artifacts (`project-analysis.md`, `skill-map.md`, `catalog.md`, `validation-report.md`, `.bootstrap-state.json`) are NOT — never delete them.

## Skill catalog quick reference

- `working-in-cadernia` — stack conventions (React/Vite/Tailwind/shadcn/TS/ESLint).
- `editing-ghost-editor` — ghost autocomplete, suggestion cache, OpenAI completion.
- `editing-notepad-3d` — Three.js scene, page texture, flip/tear animations.
- `editing-local-persistence` — IndexedDB, attachments, migration, export, settings.
- `evolving-skills` — how to update skills at task end.
- `consolidating-skills` — periodic GC and conflict resolution.

## <evolution>

On task completion, run `evolving-skills` for the router itself if there is IMPORTANT and VERIFIED routing knowledge to retain. Update THIS SKILL.md DIRECTLY. Do NOT create learnings files.
