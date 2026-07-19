# AGENTS.md — cadernIA

## Commands

All commands run from the project root:

- install: `yarn install`
- build: `yarn build`   # runs `tsc -b && vite build`
- test: not available; verify with `yarn build` and `yarn lint`
- lint: `yarn lint`     # runs `eslint .`
- dev: `yarn dev`       # Vite dev server on port 3000

## Rules (non-obvious; tooling-enforced conventions are left to the tooling)

- **Always route through `.agents/skills/project-router`** before any implementation work. Catalog: `.agents/skills/catalog.md`.
- **Ask clarifying questions in Brazilian Portuguese** when using the router; create `TASK_PLAN.md` in Portuguese and delete it at task end.
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
