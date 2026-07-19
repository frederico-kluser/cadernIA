---
name: working-in-cadernia
description: Injects the cadernIA stack conventions before any React/Vite/Tailwind/shadcn task. Use whenever the user touches app/src, app/package.json, vite.config.ts, tailwind.config.js, eslint.config.js, tsconfig files, or any build/lint/config change.
metadata:
  type: knowledge
  verification_signal: npm run lint && npm run build in app/
---
# working-in-cadernia

## When to use

Any task inside the `app/` Vite React SPA: adding or editing components, hooks, lib files, styles, configs, dependencies, or build/lint setup.

## Injected knowledge

### Commands

Run from `app/` (`README.md:27-29`):

- `npm run dev` — Vite dev server on port **3000** (`vite.config.ts:11`), not 5173 as the README states.
- `npm run build` — `tsc -b && vite build` (`package.json:8`). This is the primary correctness signal.
- `npm run lint` — `eslint .` (`package.json:9`).

### Tooling-enforced conventions (do not restate as prose)

These are already guaranteed by config; point to the file rather than re-describing:

- TypeScript strict + path alias `@/*` → `./src/*` — `app/tsconfig.app.json:12-31`.
- `verbatimModuleSyntax: true` forces `import type` / `export type` — `app/tsconfig.app.json:20`.
- Unused locals/parameters are rejected — `app/tsconfig.app.json:27-28`.
- ESLint flat config targets `**/*.{ts,tsx}` and ignores `dist/` — `app/eslint.config.js:8-22`.
- Tailwind dark mode `class` and content scan — `app/tailwind.config.js:3-4`.
- Vite `base: './'` and alias `@` → `./src` — `app/vite.config.ts:8,14-16`.

### Project conventions (not enforced by tooling)

- **Default exports for pages/feature components**, named exports for utilities and shadcn primitives (`App.tsx:4`, `pages/Home.tsx:99`, `components/ui/button.tsx:62`).
- **Import ordering** (conventional only): React hooks, third-party libs, `@/` aliases last. Large `lucide-react` imports are grouped.
- **Styling mix**: Tailwind for layout/spacing; plain CSS in `index.css` for the notebook page, ghost editor layering, and 3D-stage textures.
- **Dynamic CSS custom properties** need a type assertion because React's style type is strict: `style={{ ['--editor-lh' as string]: ... }}` (`components/GhostEditor.tsx:121`).
- **Inline handlers often cast `void`** to silence floating promises: `onClick={() => void requestCompletion(true)}` (`pages/Home.tsx:721`).
- **shadcn/ui New York style, non-RSC, TSX**, base color `slate` — `components.json:3-5`.

### Stack gotchas

- `vite.config.ts:8` sets `base: './'`, which produces relative asset paths in production. Deep-linking to client-side routes needs care.
- `kimi-plugin-inspect-react` is loaded unconditionally in `vite.config.ts:9`. Consider whether it should be dev-only.
- The README says dev URL is `http://localhost:5173`, but `vite.config.ts:11` sets port 3000.

## References

- `references/stack-cheatsheet.md` — dependency versions, alias, port, base path summary.

## <evolution>

On task completion, run the <memory_pipeline>: if there is IMPORTANT and VERIFIED information to retain, update THIS SKILL.md DIRECTLY. Do NOT create learnings files. Do NOT self-merge anything that has not passed `npm run lint` and `npm run build` in `app/`.
