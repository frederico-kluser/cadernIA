# Notepad 3D Pipeline

## Scene graph

- `NotepadScene.tsx` manages the Three.js canvas, camera, lights, desk, cover, paper stack, and helical rings.
- `PageTexture.tsx` creates a rasterized texture from the note content DOM.
- `Notepad.tsx` is a CSS-only alternative not currently used by `Home`.

## Texture rasterization

1. Clone note content DOM off-screen.
2. Inline all CSS rules.
3. Serialize to SVG `foreignObject`.
4. Draw SVG to canvas and export PNG.

## Overlay positioning

- `NotepadScene` projects the 3D page corners to screen coordinates.
- `onLayout(screenPoints)` is called in `pages/Home.tsx:854-862`.
- The editor overlay is absolutely positioned over the WebGL canvas.

## Animation timing

- Flip: 1.05 s
- Tear: 1.1 s
- Cleanup timeout in `Home`: 1200 ms
