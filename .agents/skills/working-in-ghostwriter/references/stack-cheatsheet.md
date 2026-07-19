# Stack Cheatsheet — GhostWriter

## Versions

- Node.js 20
- React 19.2.0
- Vite 7.2.4
- TypeScript 5.9.3
- Tailwind CSS 3.4.19
- shadcn/ui New York, non-RSC, TSX, base color `slate`

## Commands

```bash
yarn install
yarn dev     # port 3000
yarn build   # tsc -b && vite build
yarn lint    # eslint .
```

## Path alias

- `@/*` → `./src/*` in both TS and Vite.

## Config files

- `vite.config.ts` — `base: './'`, port 3000, alias `@`, dev-only inspect plugin.
- `tailwind.config.js` — dark mode `class`, content scan.
- `eslint.config.js` — flat config, recommended TS/React Hooks/Refresh.
- `tsconfig.app.json` — strict, unused locals/parameters, verbatim module syntax.
