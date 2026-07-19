---
name: github-context
description: Guides changes to GitHub PAT storage, repository/branch selection, file tree navigation, and importing repository files as attachments/context. Use whenever the user touches lib/github.ts, GitHubContextDialog.tsx, or GitHub-related UI in Home.tsx.
metadata:
  type: task
  verification_signal: yarn lint && yarn build in project root
---
# github-context

## When to use

The user wants to add, change, or fix GitHub integration for selecting repository files as context for the AI autocomplete.

## Injected knowledge

### Architecture

- `lib/github.ts` is the thin REST API client: PAT validation, repo/branch listing, tree fetching, and file content download.
- `components/GitHubContextDialog.tsx` owns the three-step UI: PAT input, repo + branch selection, and tree-view file selection.
- `pages/Home.tsx` wires the dialog, stores the PAT in `localStorage`, and appends imported files to the active project's `attachments`.

### API endpoints

- `GET /user` — validate PAT and read authenticated user.
- `GET /user/repos?sort=updated&per_page=100` — list repositories.
- `GET /repos/{owner}/{repo}/branches` — list branches.
- `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1` — list file tree.
- `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` — download file content.

### Storage and security

- PAT key: `noteghost_github_pat` in `localStorage` (`pages/Home.tsx`).
- The PAT is never sent anywhere except directly to `api.github.com`.
- Required scope: `repo` for private repos, `public_repo` for public repos only.

### File selection rules

- Ignored directories: `node_modules`, `.git`, `dist`, `build`, `.next`, `out`, `coverage`, `.turbo`, `.vercel`, `.cache`, `__pycache__`.
- Ignored files: dotfiles and binary extensions (images, video, audio, fonts, archives, executables, etc.).
- Imported files are sliced to 50 000 chars per file and rejected if larger than 400 KB raw.
- Imported files become standard `Attachment[]` entries, so existing OpenAI context limits apply (`lib/openai.ts:17-19`).

### Gotchas

- GitHub tree API returns blobs and trees; `isPathSelectable` filters what appears in the UI.
- The tree view is built manually from the flat tree list because GitHub does not return a nested structure.
- Branch default is detected from the repo metadata and pre-selected when branches load.

## Procedure

1. Load `working-in-ghostwriter` first.
2. Identify the changed layer: API client, dialog UI, or Home.tsx integration.
3. Keep PAT handling local-only; do not introduce a backend proxy.
4. Preserve the existing attachment/context contracts in `lib/db.ts` and `lib/openai.ts`.
5. Run `yarn lint` and `yarn build` in the project root.

## References

- `references/github-context-contracts.md` (to be created if this skill is promoted).
