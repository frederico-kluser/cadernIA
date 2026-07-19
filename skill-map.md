# GhostWriter — Skill Map

> Phase 2 artifact. Proposes the minimal skill library before generating any SKILL.md.

## 1. Design rationale

The catalog is intentionally small. Routing degrades with too many skills, and most project knowledge can be grouped into one stack skill plus three domain task skills. The router is the single mandatory entry point. Two meta-skills handle skill evolution and consolidation.

## 2. Skill catalog

### 2.1 Router (1)

| Name | Type | Triggers | Verification signal |
|---|---|---|---|
| `project-router` | router | Every implementation task in the repo, even if the user does not mention skills. | Router eval suite (must ask Portuguese questions, create/delete TASK_PLAN.md, select the right skill chain). |

### 2.2 Knowledge (1)

| Name | Type | Triggers | Verification signal |
|---|---|---|---|
| `working-in-cadernia` | knowledge | Any task touching the React/Vite/Tailwind/shadcn stack, build, lint, or file layout. | `yarn lint` and `yarn build` in the project root. |

### 2.3 Task skills (3)

| Name | Type | Triggers | Verification signal |
|---|---|---|---|
| `editing-ghost-editor` | task | Changes to ghost autocomplete, suggestion cache, OpenAI completion prompt, `Tab`/`Esc` behavior, or `GhostEditor.tsx`. | `yarn build` in project root + ghost-editor eval suite. |
| `editing-notepad-3d` | task | Changes to `NotepadScene.tsx`, `PageTexture.tsx`, flip/tear animations, or the editor overlay positioning. | `yarn build` in project root + notepad-3d eval suite. |
| `editing-local-persistence` | task | Changes to IndexedDB schema, project/attachment CRUD, migration, export, or `localStorage` settings. | `yarn build` in project root + local-persistence eval suite. |

### 2.4 Meta skills (2)

| Name | Type | Triggers | Verification signal |
|---|---|---|---|
| `evolving-skills` | meta | End of every task; or when no skill covers a new area. | Skill linter + regression evals on affected skills. |
| `consolidating-skills` | meta | Periodic scheduled GC; or when skills grow beyond token budgets / contain contradictions. | Skill linter + full regression suite + second-opinion review. |

## 3. Dependency / composition graph

```
project-router
├── working-in-cadernia          (load first for any project change)
├── editing-ghost-editor         (depends on working-in-cadernia)
├── editing-notepad-3d           (depends on working-in-cadernia)
├── editing-local-persistence    (depends on working-in-cadernia)
├── evolving-skills              (invoked at task end; can propose new skills)
└── consolidating-skills         (scheduled; reads/writes all skills)
```

- Every task skill ends with an `<evolution>` step that calls the memory pipeline; that pipeline is itself encoded in `evolving-skills`.
- `consolidating-skills` may invoke `evolving-skills` to promote resolved conflicts.

## 4. Granularity justification

- **One stack skill** (`working-in-cadernia`) covers React 19, Vite, Tailwind, shadcn, TypeScript strictness, ESLint, and path aliases. Splitting these would create tiny, overlapping skills and force the router to guess between them.
- **Three domain task skills** map directly to the three high-risk, high-complexity areas discovered in Phase 1. They are large enough to carry meaningful procedural memory and small enough to avoid a catch-all "frontend" skill.
- **No separate skills for** markdown preview, voice, API key dialog, or lock screen at launch. These are either simple consumers of the domain skills or unlikely to change independently. The router can load `working-in-cadernia` plus the relevant domain skill for them.
- **Two meta skills** keep evolution and GC separate: evolution is per-task and fast; consolidation is periodic and heavy.

## 5. Verification signal selection

- The project has **no tests**. Therefore skill updates rely on `yarn build` (TypeScript + Vite) and `yarn lint` (ESLint) as the primary external signals.
- Each task skill carries a small **eval suite** (routing cases + behavior cases) to guard against regressions that build/lint cannot catch.
- Meta skills rely on the **skill linter** (frontmatter, naming, token budget) and the **regression suite**.

## 6. Excluded from the initial catalog

- `editing-markdown-preview`, `editing-voice`, `editing-api-key`: deferred until they become independently complex or frequently modified.
- A dedicated "testing" skill: no test framework exists yet; adding one is a separate task.
- Language/i18n skill: the app UI is mixed Portuguese/English but has no formal i18n system.
