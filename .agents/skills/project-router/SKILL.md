---
name: project-router
description: Routes EVERY implementation task in this codebase to the correct skills BEFORE any step. Use whenever the user asks for any change, fix, feature, analysis, or refactor, even if they do not mention skills.
metadata:
  type: router
  verification_signal: router eval suite (no clarifying questions, TASK_PLAN.md lifecycle, correct skill chain, commit at end)
---
# Project Router

IMPORTANT: all communication with the user is ALWAYS in BRAZILIAN PORTUGUESE.

## Protocol (run BEFORE any work)

1. **DO NOT ASK CLARIFYING QUESTIONS.** Resolve ambiguity yourself: read the request, inspect the codebase, and pick the interpretation a careful colleague would. Record every assumption you made in `TASK_PLAN.md` under **Premissas** so the user can correct course after seeing the result. Only stop and ask if the task cannot proceed at all (missing credential, destructive/irreversible action, two readings that produce completely different deliverables).
2. **Create a task plan file** in markdown (`TASK_PLAN.md`), in Portuguese, with the detailed plan, steps, assumptions (**Premissas**), and acceptance criteria.
3. **Classify the task**: domain(s) touched, type (bug/feature/refactor/analysis), complexity.
4. **Consult `catalog.md`** and select the relevant knowledge + task skills. On ambiguity, prefer the most domain-specific skill.
5. **Assemble the skill CHAIN** (order + what can run in parallel via isolated-context subagents).
6. **Load the selected skills' knowledge BEFORE implementing.**
7. **Execute the chain** following `TASK_PLAN.md`.
8. **ON COMPLETION:**
   - Run each involved task skill's `<evolution>`.
   - **DELETE** the task plan file (`TASK_PLAN.md`) — it is disposable and must not remain in the repo.
   - **COMMIT the changes.** Always end the task by committing, in this order:
     1. Verify first: `yarn build` and `yarn lint` (there is no test suite).
     2. `git status` + `git diff` to confirm what is being staged — never stage `TASK_PLAN.md`, `.env`, or secrets.
     3. If on `main`, create a branch first (e.g. `fix/…`, `feat/…`) instead of committing straight to it.
     4. Commit with a message in Portuguese following the repo's Conventional Commits style (`fix:`, `feat:`, `refactor:`, `docs:`).
     5. Report the commit hash and subject to the user, in Portuguese.
   - Do NOT push and do NOT open a PR unless the user explicitly asks.

## Rules

- **Never ask clarifying questions.** Assume, document the assumption in `TASK_PLAN.md`, and deliver. The user corrects afterwards.
- **Never finish a task without committing** (step 8). A task is only done when the work is committed.
- If no skill covers the task, invoke `evolving-skills` to **propose** a new skill (a draft for human review, not direct publication).
- Skills with broad side effects (deploy, structural changes) are NOT auto-invocable without user confirmation.
- Never skip the evolution step on completion. Never leave `TASK_PLAN.md` behind.
- `TASK_PLAN.md` is disposable and is deleted at the end; the bootstrap artifacts (`project-analysis.md`, `skill-map.md`, `catalog.md`, `validation-report.md`, `.bootstrap-state.json`) are NOT — never delete them.

## Skill catalog quick reference

- `working-in-ghostwriter` — stack conventions (React/Vite/Tailwind/shadcn/TS/ESLint).
- `editing-ghost-editor` — ghost autocomplete, suggestion cache, OpenAI completion.
- `editing-notepad-3d` — Three.js scene, page texture, flip/tear animations.
- `editing-local-persistence` — IndexedDB, attachments, migration, export, settings.
- `evolving-skills` — how to update skills at task end.
- `consolidating-skills` — periodic GC and conflict resolution.

## <evolution>

On task completion, run `evolving-skills` for the router itself if there is IMPORTANT and VERIFIED routing knowledge to retain. Update THIS SKILL.md DIRECTLY. Do NOT create learnings files.
