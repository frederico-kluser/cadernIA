---
name: editing-notepad-3d
description: Guides changes to the CSS-only notebook page, full-page sheet layout, and page-flip/tear animations. Use whenever the user touches PageSheet.tsx, the page CSS in index.css, or the sheet animation flow in Home.tsx.
metadata:
  type: task
  verification_signal: yarn build in project root
---
# editing-notepad-3d

## When to use

The user wants to change the notebook page visual, the full-page sheet layout, the page-flip/tear animation, or how the editor is layered inside the sheet.

## Injected knowledge

### Architecture

- `PageSheet.tsx` is the single source of truth for the page UI. It renders the current page and, during navigation, an animated leaving page on top of it (`components/PageSheet.tsx`).
- The page is CSS-only: no WebGL, no Three.js, no off-screen texture rasterization. The old `NotepadScene.tsx`, `PageTexture.tsx`, and `Notepad.tsx` components were removed.
- The sheet fills `stage-wrap` via `.page-perspective` / `.page-stack` (`src/index.css`). The editor is layered directly inside `.page-current`, not projected on top of a 3D canvas.
- `Home.tsx` builds the page header as a memoized React node and passes it to `PageSheet` along with the current note content. On navigation it captures the old header and a static HTML mirror of the old content and hands them to `PageSheet` as the `leaving` animation payload (`pages/Home.tsx`).

### Key flow

- `Home.startFlip` captures the current page header (`pageHeader`) and a static HTML mirror (`staticMirrorHtml(active.content)`), sets the new `activeId`, and stores the leaving info in `leaving` state (`pages/Home.tsx`).
- `PageSheet` renders `.page-leaving` with two faces: `.page-leave-front` (old content) and `.page-leave-back` (ruled blank page). CSS 3D transforms animate the flip (`components/PageSheet.tsx`).
- The leaving layer fires `onAnimationEnd` to clear state, but `Home.tsx` also clears it via `setTimeout` as a fallback.

### Timing constants

- `src/index.css`: `flip-next` and `flip-prev` animations run for **0.85 s**; `tear-out` runs for **0.7 s**.
- `pages/Home.tsx`: cleanup timeout is **900 ms** for flip and **700 ms** for tear. Keep these in sync with the CSS durations.

### Gotchas

- `pageHeader` is memoized with `useMemo` and must be declared **before** `startFlip` to satisfy the React hooks immutability lint rule (`react-hooks/immutability`).
- The leaving front face reuses `.ghost-editor-mirror` styling, so it inherits the ruled-line background. The back face uses a CSS ruled gradient.
- `crypto.randomUUID()` is used for project/attachment IDs and requires secure context.

## Procedure

1. Load `working-in-cadernia` first.
2. Determine whether the change affects the sheet layout (CSS), the animation (CSS keyframes), or the flip trigger flow (`Home.tsx`).
3. If changing animation timing, update both the CSS keyframe duration and the cleanup timeout in `Home.tsx`.
4. Verify the sheet still fills the stage and the editor remains usable on mobile and desktop.
5. Run `yarn build` in the project root.

## References

- `src/components/PageSheet.tsx` — page component and leaving-page animation layer.
- `src/index.css` — `.page-perspective`, `.page-stack`, `.page-current`, `.page-leaving`, and keyframe animations.
- `src/pages/Home.tsx` — `startFlip`, `pageHeader` memoization, and `PageSheet` usage.

## <evolution>

On task completion, run the <memory_pipeline>: if there is IMPORTANT and VERIFIED information to retain, update THIS SKILL.md DIRECTLY. Do NOT create learnings files. Do NOT self-merge anything that has not passed `yarn build` in the project root.
