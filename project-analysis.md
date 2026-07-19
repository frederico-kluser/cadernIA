# cadernIA — Project Analysis

> Phase 1 artifact. Synthesizes repository docs, codebase structure, and the four isolated-context exploration reports.

## 1. Normative sources

The project is a React SPA in `app/`. The root `README.md` is the primary public document; `app/info.md` is an installation log, and `app/README.md` is the generic Vite template README.

### 1.1 Public project description

- **Product**: AI-powered notepad with ghost autocomplete (`README.md:1`).
- **Tech stack** (`README.md:15-22`):
  - React 19 + TypeScript + Vite 7
  - Tailwind CSS v3 + shadcn/ui
  - Three.js (React Three Fiber) for 3D notepad
  - OpenAI API — Chat Completions + Whisper
  - IndexedDB for local persistence
  - React Router 7, React Markdown, Recharts
- **Getting started** (`README.md:24-32`):
  ```bash
  cd app
  npm install
  npm run dev
  ```
  Dev server URL is `http://localhost:5173` in the README, but `vite.config.ts:11` sets port `3000`.
- **Project layout** (`README.md:36-50`):
  ```
  app/
  ├── src/
  │   ├── components/   # React components + shadcn/ui
  │   ├── hooks/        # Custom hooks
  │   ├── lib/          # Database, OpenAI client, utils
  │   ├── pages/        # Route pages
  │   └── App.tsx
  ├── index.html
  ├── vite.config.ts
  └── package.json
  ```

### 1.2 Tooling norms

- **Build command** (`app/package.json:8`): `tsc -b && vite build`
- **Lint command** (`app/package.json:9`): `eslint .`
- **Dev command** (`app/package.json:7`): `vite`
- **TypeScript** (`app/tsconfig.app.json:26-31`):
  - `strict: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `erasableSyntaxOnly: true`
  - `noFallthroughCasesInSwitch: true`
  - `noUncheckedSideEffectImports: true`
  - `verbatimModuleSyntax: true`
  - Path alias `@/*` → `./src/*`
- **ESLint** (`app/eslint.config.js:8-22`):
  - Flat config
  - Extends `@eslint/js/recommended`, `typescript-eslint/recommended`, `react-hooks/recommended`, `react-refresh/vite`
  - Targets `**/*.{ts,tsx}`
  - Ignores `dist/`
  - **Not type-aware** (uses `recommended`, not `recommendedTypeChecked`)
- **Tailwind** (`app/tailwind.config.js:3-4`):
  - `darkMode: ["class"]`
  - Content: `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`
  - Theme extends shadcn CSS variables + custom border-radius scale
- **Vite** (`app/vite.config.ts:8-16`):
  - `base: './'`
  - Port `3000`
  - Alias `@/` → `./src`
  - Plugin `kimi-plugin-inspect-react` is loaded unconditionally

### 1.3 shadcn/ui configuration

- `app/components.json:3-5`: New York style, non-RSC, TSX, base color `slate`.
- Components live in `app/src/components/ui/` and wrap Radix primitives.
- `data-slot` attributes are used on every root element.

## 2. Annotated project map

### 2.1 Entry and routing

- `app/src/main.tsx`: boots React 19 with `BrowserRouter`.
- `app/src/App.tsx`: single route `/` rendering `Home`.
- `app/src/pages/Home.tsx`: central controller; owns all state, side effects, and wires every domain module together.

### 2.2 Domain modules

| Domain | Files | Key responsibility |
|---|---|---|
| Ghost editor | `components/GhostEditor.tsx` | Transparent `<textarea>` + mirror `<div>` for AI "ghost" suggestions; `Tab` accept, `Esc` dismiss, manual trigger, two-space tab insertion. Exposes an imperative `GhostEditorHandle`. |
| 3D notepad | `components/NotepadScene.tsx`, `components/PageTexture.tsx`, `components/Notepad.tsx` | Three.js scene with desk/cover/paper/helical rings; flip/tear animations. `PageTexture` rasterizes an off-screen DOM clone to a canvas texture. `Notepad.tsx` is a CSS-only variant that appears unused. |
| Attachments | `components/AttachmentsPanel.tsx`, `pages/Home.tsx:490-525`, `lib/db.ts:4-8` | Per-project text-file attachments stored inside the project record; fed into OpenAI completions. |
| Markdown preview | `components/MarkdownPreview.tsx` | `react-markdown` + `remark-gfm` + `rehype-highlight` rendering. |
| Voice / Whisper | `pages/Home.tsx:444-488`, `lib/openai.ts:128-146` | Microphone recording via `MediaRecorder`; sends blob to Whisper and inserts transcript at cursor. |
| API key & lock | `components/ApiKeyDialog.tsx`, `components/LockScreen.tsx`, `lib/openai.ts:21-37` | Key in `localStorage`; app locked until `/v1/models` validation passes. |
| Persistence | `lib/db.ts` | IndexedDB `noteghost_db` v1, store `projects`, key path `id`. `Project { id, name, content, attachments, createdAt, updatedAt }`. |

### 2.3 Infrastructure libraries

- `lib/openai.ts`: key validation, non-streaming chat completion, Whisper transcription. Context windowing: before cursor 6000 chars, after cursor 2000 chars, attachments total 8000 chars.
- `lib/suggestionCache.ts`: `localStorage` LRU-style cache keyed by hash of 400 chars before + 60 chars after cursor. Max 120 entries, values capped at 600 chars.
- `lib/utils.ts`: Tailwind `cn()` helper (`clsx` + `tailwind-merge`).
- `hooks/use-mobile.ts`: media-query hook for `768px` breakpoint. **Note**: `Home.tsx` re-implements the same check inline at line 150 instead of using this hook.

## 3. Candidate knowledge areas for skills

Based on the above map, the minimal high-value skill set is:

1. **project-router** (router) — mandatory single entry point.
2. **react-vite-cadernia** (knowledge) — stack-specific conventions: path alias, build commands, strict TS rules, ESLint flat config, Tailwind/shadcn theming, React 19 patterns.
3. **ghost-editor** (task) — how to modify the ghost autocomplete, suggestion cache, and OpenAI completion flow.
4. **notepad-3d** (task) — how to work with the Three.js scene, `PageTexture`, flip/tear animations, and the editor overlay positioning.
5. **local-persistence** (task) — IndexedDB project/attachment schema, migration rules, `crypto.randomUUID()` secure-context requirement, legacy `localStorage` migration.
6. **meta-skill-evolution** (meta) — how to update skills directly when information is important and verified.
7. **meta-skill-consolidate** (meta) — periodic GC, staleness checks, conflict resolution.

## 4. Tooling-guaranteed conventions (do not replicate in prose)

These conventions are already enforced by tooling; skills should **point to the check** rather than restate the rule:

- TypeScript strictness and path alias → `app/tsconfig.app.json:26-31`, `app/tsconfig.json:12-16`.
- ESLint rules for React Hooks and Refresh → `app/eslint.config.js:12-17`.
- `verbatimModuleSyntax` forcing `import type` → `app/tsconfig.app.json:20`.
- Unused locals/parameters rejected → `app/tsconfig.app.json:27-28`.
- Tailwind content scan and dark mode → `app/tailwind.config.js:3-4`.
- Vite base path and alias → `app/vite.config.ts:8,14-16`.
- shadcn/ui config (New York, TSX, non-RSC) → `app/components.json:3-5`.

## 5. Gaps and "not found"

- **No tests**: no Vitest, Jest, Playwright, or any test files. Verification must rely on `npm run build`, `npm run lint`, and manual checks.
- **No CI/CD**: no `.github/workflows/`, `.gitlab-ci.yml`, etc.
- **No formatter**: no Prettier config or script.
- **No type-aware ESLint**: `typescript-eslint/recommended` only.
- **No `.env`/Vite env usage** for the OpenAI key; key lives in `localStorage`.
- **No AGENTS.md or CLAUDE.md** existed before this run.

## 6. High-risk gotchas to encode

1. `crypto.randomUUID()` requires secure context (`https`/`localhost`).
2. `vite.config.ts:8` uses `base: './'`; dev URL in README (`5173`) conflicts with port `3000` in Vite config.
3. `Notepad.tsx` appears to be dead code; `Home` uses `NotepadScene` + `PageTexture`.
4. Attachment limits are inconsistent: 400 KB file pick, 50 KB read, 8000 chars total context.
5. Ghost text sanitization only strips overlaps of 4+ chars.
6. Suggestion cache silently swallows `localStorage` full errors.
7. `dangerouslySetInnerHTML` is used in `GhostEditor` and `Notepad` after a custom escape.
8. `kimi-plugin-inspect-react` is loaded unconditionally in Vite config.

## 7. Provenance notes

- All line citations above refer to the current HEAD (`c528bf6`) unless otherwise noted.
- File hashes are stable for this commit; future skill updates must re-verify provenance against the then-current commit.
