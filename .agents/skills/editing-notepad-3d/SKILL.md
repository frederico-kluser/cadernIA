---
name: editing-notepad-3d
description: Guides changes to the Three.js notepad scene, page texture rendering, and flip/tear animations. Use whenever the user touches NotepadScene.tsx, PageTexture.tsx, Notepad.tsx, or the editor overlay positioning.
metadata:
  type: task
  verification_signal: yarn build in project root + notepad-3d eval suite
---
# editing-notepad-3d

## When to use

The user wants to change the 3D notebook visual, page-flip animation, page texture rasterization, or the DOM overlay that sits on top of the WebGL canvas.

## Injected knowledge

### Architecture

- `NotepadScene.tsx` builds the Three.js scene (desk, cover, paper stack, helical rings) and runs `flip`/`tear` animations (`components/NotepadScene.tsx`).
- `PageTexture.tsx` renders an off-screen DOM clone via SVG `foreignObject` → canvas PNG so the animated page shows the real note content as texture (`components/PageTexture.tsx`).
- `Notepad.tsx` is a CSS-only flip/tear implementation that appears **unused** in `Home.tsx`; `Home` uses the WebGL pipeline instead.
- The interactive editor is a DOM overlay absolutely positioned on top of the WebGL canvas. `NotepadScene.tsx:349-371` projects the 3D page corners to screen coordinates and notifies `Home` via `onLayout`, which positions the overlay at `pages/Home.tsx:854-862`.

### Key flow

- `Home.startFlip` snapshots the current page texture, increments an animation sequence, sets the new `activeId`, and clears editor state (`pages/Home.tsx`).
- The actual 3D animation is triggered by the `anim` prop change in `NotepadScene.tsx:452`.
- `PageTexture` rasterization can fail for cross-origin fonts/CSS; it serializes CSS rules and falls back to `@import` (`components/PageTexture.tsx:31-37`).

### Timing constants

- `Home.tsx:397` hard-codes a 1200 ms cleanup timeout.
- `NotepadScene.tsx:460` uses 1.05 s for flip and 1.1 s for tear.
- These durations can drift; keep them in sync when changing animation timing.

### Gotchas

- `Notepad.tsx` is likely dead code; prefer `NotepadScene` + `PageTexture` for changes that affect the live UI.
- The overlay must be repositioned whenever the 3D page moves. Changes to camera, paper dimensions, or page transform require checking `onLayout` coordinates.
- `crypto.randomUUID()` is used for project/attachment IDs and requires secure context.

## Procedure

1. Load `working-in-cadernia` first.
2. Determine whether the change affects the scene, the texture, the animation, or the overlay.
3. If changing animation timing, update all three locations (CSS/timeout, `NotepadScene` durations, and the cleanup timeout).
4. Verify the overlay still aligns after page flip by checking `onLayout` values.
5. Run `yarn build` in the project root.
6. Run the notepad-3d eval suite (`scripts/eval-notepad-3d.sh`).

## References

- `references/notepad-3d-pipeline.md` — scene graph, texture rasterization, overlay coordinate flow.

## <evolution>

On task completion, run the <memory_pipeline>: if there is IMPORTANT and VERIFIED information to retain, update THIS SKILL.md DIRECTLY. Do NOT create learnings files. Do NOT self-merge anything that has not passed `yarn build` in the project root and the notepad-3d eval suite.
