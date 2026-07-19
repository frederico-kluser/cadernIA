# AGENTS.md — GhostWriter

## Commands

All commands run from the project root:

- install: `yarn install`
- build: `yarn build`   # runs `tsc -b && vite build`
- test: not available; verify with `yarn build` and `yarn lint`
- lint: `yarn lint`     # runs `eslint .`
- dev: `yarn dev`       # Vite dev server on port 3000

## Rules (non-obvious; tooling-enforced conventions are left to the tooling)

- **Always route through `.agents/skills/project-router`** before any implementation work. Catalog: `.agents/skills/catalog.md`.
- **Never ask clarifying questions in the router flow**: assume the most reasonable interpretation and record it under **Premissas** in `TASK_PLAN.md`. Communicate in Brazilian Portuguese; create `TASK_PLAN.md` in Portuguese and delete it at task end.
- **Always commit at the end of a router task** (after `yarn build` + `yarn lint`), branching off `main` first. Do not push or open a PR unless asked.
- **Keep the API key in `localStorage` only** (`noteghost_api_key`). Never commit it or move it to a server/env file.
- **Maintain secure-context compatibility**: `crypto.randomUUID()` is used for IDs and requires `https` or `localhost`.
- **Preserve the dual rendering stack**: the ghost editor is a DOM overlay on top of a WebGL canvas; changes to either must keep the overlay positioning in sync.
- **Do not silently expand attachment context budgets**: the existing caps are 400 KB file pick, 50 KB read per file, 8000 chars total OpenAI context.

## Skills

Every task goes through `.agents/skills/project-router`.
Skill catalog: `.agents/skills/catalog.md`.
Source of truth: `.agents/skills/` (symlinked from `.claude/skills/`).

## Security

- Never read or commit `.env`, `secrets/**`, `*.pem`, `*.key`, or SSH private keys.
- Never run destructive Bash (`rm -rf /`, history rewrites, force-push) without explicit user confirmation.
