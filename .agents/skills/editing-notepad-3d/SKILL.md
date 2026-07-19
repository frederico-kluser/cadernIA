---
name: editing-notepad-3d
description: Guides changes to the CSS-only notebook page, full-page sheet layout, and page-slide/tear animations. Use whenever the user touches PageSheet.tsx, the page CSS in index.css, or the sheet animation flow in Home.tsx.
metadata:
  type: task
  verification_signal: yarn build in project root
---
# editing-notepad-3d

## When to use

The user wants to change the notebook page visual, the full-page sheet layout, the page-slide/tear animation, or how the editor is layered inside the sheet.

## Injected knowledge

### Architecture

- `PageSheet.tsx` is the single source of truth for the page UI. It renders the current page and, during navigation, an animated leaving page on top of it (`components/PageSheet.tsx`).
- The page is CSS-only: no WebGL, no Three.js, no off-screen texture rasterization. The old `NotepadScene.tsx`, `PageTexture.tsx`, and `Notepad.tsx` components were removed.
- The sheet lives inside `.stage-wrap`, which is the scroll container (`overflow-y: auto`). The page itself is a flow-layout element that grows vertically with the note content (`src/index.css`).
- `.page-current` uses `position: relative`, `display: flex; flex-direction: column`, and `min-height: 100%` so it always fills at least the viewport but expands as the editor/preview content grows (`src/index.css`).
- `.page-header` is `position: sticky; top: 0` with a solid page-gradient background, so it stays visible while the content scrolls underneath (`src/index.css`).
- The editor (`.ghost-editor-wrap`) is a CSS Grid with the mirror in flow and the textarea overlaying it. The textarea height is set to its `scrollHeight` via `useLayoutEffect` so the editor grows with the text and has no internal scroll (`GhostEditor.tsx`).
- The ruled-line background is applied to the mirror with default `background-attachment` (scroll), so it moves with the mirror as `.stage-wrap` scrolls. The baseline offset `calc(var(--editor-lh) / 2 + var(--editor-font-size) * 0.334)` must be preserved (`src/index.css`).
- `Home.tsx` builds the page header as a memoized React node and passes it to `PageSheet` along with the current note content. On navigation it captures the old header and a static HTML mirror of the old content and hands them to `PageSheet` as the `leaving` animation payload (`pages/Home.tsx`).

### Key flow

- `Home.startPageTransition` captures the current page header (`pageHeader`) and a static HTML mirror (`staticMirrorHtml(active.content)`), sets the new `activeId`, and stores the leaving info in `leaving` state (`pages/Home.tsx`).
- `PageSheet` renders the current page and, during navigation, an animated leaving page on top of it. The leaving page is a single `.page-leave-content` layer; the incoming page gets `.page-current.entering.{next,prev}` and slides in from the opposite side (`components/PageSheet.tsx`).
- The leaving layer fires `onAnimationEnd` to clear state, but `Home.tsx` also clears it via `setTimeout` as a fallback.

### Timing constants

- `src/index.css`: `slide-in-right`, `slide-in-left`, `slide-out-right`, and `slide-out-left` animations run for **0.45 s**; `tear-out` runs for **0.7 s**.
- `pages/Home.tsx`: cleanup timeout is **450 ms** for slide and **700 ms** for tear. Keep these in sync with the CSS durations.

### Gotchas

- `pageHeader` is memoized with `useMemo` and must be declared **before** `startPageTransition` to satisfy the React hooks immutability lint rule (`react-hooks/immutability`).
- The leaving page content reuses `.ghost-editor-mirror` styling, so it inherits the ruled-line background.
- **Text-to-rule alignment**: the ruled line must hit the text baseline, not the bottom of the line box. Place the rule at the top of each `line-height` period (`repeating-linear-gradient` rule from `0` to `1px`) and offset it with `background-position: 0 calc(var(--editor-lh) / 2 + var(--editor-font-size) * 0.334)`. The factor `0.334` comes from Fira Code's metrics (`unitsPerEm=2000`, `sTypoAscender=1980`, `sTypoDescender=-644`) and places the rule exactly on the baseline. Keep `--editor-lh` unrounded to avoid drift across many lines (`src/index.css`, `src/components/GhostEditor.tsx`, `src/components/PageSheet.tsx`).
- **`padding-top` do editor = `(k + 0.5) * lh + 0.375 * fs`**: a baseline da
  linha *n* fica em `padding-top + lh/2 + fs*0.334 + n*lh` e as réguas em
  `lh/2 + fs*0.334 + k*lh`, logo `baseline − régua(k) = padding-top − k*lh`.
  O termo `(k + 0.5) * lh` centra a **baseline** entre duas réguas; como o
  corpo das minúsculas fica acima da baseline, isso deixa o texto opticamente
  alto, e o `+ 0.375 * fs` desce até o corpo ficar centralizado. Hoje é
  `calc(var(--editor-lh, 28px) / 2 + var(--editor-font-size, 17px) * 0.375)`
  (`k = 0`) em `src/index.css`. **Ambos os termos são relativos à fonte —
  nunca use px fixo**: o commit `14ba0e3` fixou `padding-top: 24px`, que só
  acertava em `fs = 24` (o máximo do controle) e desalinhava em 13–23.
- **Mirror e textarea compartilham o mesmo `padding`**: `.ghost-editor-mirror` e
  `.ghost-editor-input` são declarados juntos em `src/index.css`. Sobrescrever o
  padding de apenas um dos dois separa o cursor do texto visível — foi o que o
  `padding-top: 24px` do `14ba0e3` causou (mirror em 24px, textarea em
  `3.5*lh` = 168px). Qualquer ajuste de padding vai na regra compartilhada.
- **Flow-layout pages and slide/tear height**: because `.page-current` grows with content, `PageSheet` captures the leaving page's height in a ref (`lastHeightRef`) while idle and applies it as `--leaving-height` / `min-height` during the animation. This prevents the leaving layer from collapsing if the incoming page is shorter (`src/components/PageSheet.tsx`).
- **No internal editor scroll**: `.ghost-editor-input` uses `overflow: hidden` and its height is synchronized to `scrollHeight` after every value change. The scroll container is `.stage-wrap`, not the editor (`src/components/GhostEditor.tsx`).
- **Markdown preview also flows**: `.md-preview` uses `flex: 1`, `min-height: 100%`, and the same ruled-line background so it grows with rendered Markdown inside the page (`src/index.css`).
- `crypto.randomUUID()` is used for project/attachment IDs and requires secure context.

## Procedure

1. Load `working-in-ghostwriter` first.
2. Determine whether the change affects the sheet layout (CSS), the animation (CSS keyframes), or the page-transition trigger flow (`Home.tsx`).
3. If changing animation timing, update both the CSS keyframe duration and the cleanup timeout in `Home.tsx`.
4. Verify the sheet still fills the stage and the editor remains usable on mobile and desktop.
5. Run `yarn build` in the project root.

## References

- `src/components/PageSheet.tsx` — page component and leaving-page animation layer.
- `src/index.css` — `.page-perspective`, `.page-stack`, `.page-current`, `.page-leaving`, and keyframe animations.
- `src/pages/Home.tsx` — `startPageTransition`, `pageHeader` memoization, and `PageSheet` usage.

## <evolution>

On task completion, run the <memory_pipeline>: if there is IMPORTANT and VERIFIED information to retain, update THIS SKILL.md DIRECTLY. Do NOT create learnings files. Do NOT self-merge anything that has not passed `yarn build` in the project root.
