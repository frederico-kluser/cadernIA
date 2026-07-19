---
name: working-in-cadernia
description: Injects the cadernIA stack conventions before any React/Vite/Tailwind/shadcn task. Use whenever the user touches src/, package.json, vite.config.ts, tailwind.config.js, eslint.config.js, tsconfig files, or any build/lint/config change.
metadata:
  type: knowledge
  verification_signal: yarn lint && yarn build in project root
---
# working-in-cadernia

## When to use

Any task inside the Vite React SPA at the project root: adding or editing components, hooks, lib files, styles, configs, dependencies, or build/lint setup.

## Injected knowledge

### Commands

Run from the project root (`README.md:27-29`):

- `yarn dev` — Vite dev server on port **3000** (`vite.config.ts:11`).
- `yarn build` — `tsc -b && vite build` (`package.json:8`). This is the primary correctness signal.
- `yarn lint` — `eslint .` (`package.json:9`).

### Tooling-enforced conventions (do not restate as prose)

These are already guaranteed by config; point to the file rather than re-describing:

- TypeScript strict + path alias `@/*` → `./src/*` — `tsconfig.app.json:12-31`.
- `verbatimModuleSyntax: true` forces `import type` / `export type` — `tsconfig.app.json:20`.
- Unused locals/parameters are rejected — `tsconfig.app.json:27-28`.
- ESLint flat config targets `**/*.{ts,tsx}` and ignores `dist/` — `eslint.config.js:8-22`.
- Tailwind dark mode `class` and content scan — `tailwind.config.js:3-4`.
- Vite `base: './'` and alias `@` → `./src` — `vite.config.ts:8,14-16`.

### Project conventions (not enforced by tooling)

- **Default exports for pages/feature components**, named exports for utilities and shadcn primitives (`src/App.tsx:4`, `src/pages/Home.tsx:99`, `src/components/ui/button.tsx:62`).
- **Import ordering** (conventional only): React hooks, third-party libs, `@/` aliases last. Large `lucide-react` imports are grouped.
- **Styling mix**: Tailwind for layout/spacing; plain CSS in `src/index.css` for the notebook page, ghost editor layering, and 3D-stage textures.
- **Dynamic CSS custom properties** need a type assertion because React's style type is strict: `style={{ ['--editor-lh' as string]: ... }}` (`src/components/GhostEditor.tsx:121`).
- **Inline handlers often cast `void`** to silence floating promises: `onClick={() => void requestCompletion(true)}` (`src/pages/Home.tsx:721`).
- **shadcn/ui New York style, non-RSC, TSX**, base color `slate` — `components.json:3-5`.

### Stack gotchas

- `vite.config.ts:8` sets `base: './'`, which produces relative asset paths in production. Deep-linking to client-side routes needs care.
- **Use Yarn, never `npm install`**. The project uses Yarn 4 with `nodeLinker: node-modules` (`.yarnrc.yml`). Running `npm i` creates a conflicting `package-lock.json` and can desynchronize dependencies.
- **`kimi-plugin-inspect-react` is removed**. Version 1.0.3 calls `@babel/plugin-proposal-decorators` without the required `version` option, which throws `[plugin:vite-plugin-inspect-dom-simple] [BABEL] ... The decorators plugin requires a 'version' option`. If reintroduced, ensure the plugin passes `version: '2023-11'` or `version: 'legacy'` to the Babel decorators plugin.

## References

- `references/stack-cheatsheet.md` — dependency versions, alias, port, base path summary.

## <evolution>

On task completion, run the <memory_pipeline>: if there is IMPORTANT and VERIFIED information to retain, update THIS SKILL.md DIRECTLY. Do NOT create learnings files. Do NOT self-merge anything that has not passed `yarn lint` and `yarn build` in the project root.
