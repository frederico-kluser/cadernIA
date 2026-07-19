/**
 * Marca do app (GhostWriter). O logo vive em `public/`, então a URL precisa
 * passar por `BASE_URL` — o `vite.config.ts` usa `base: './'` e um caminho
 * absoluto quebraria o build servido de subpasta.
 */
export const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`
