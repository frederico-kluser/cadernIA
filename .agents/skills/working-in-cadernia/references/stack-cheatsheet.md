# Stack Cheatsheet — cadernIA

## Versions

- Node.js 20
- React 19.2.0
- Vite 7.2.4
- TypeScript 5.9.3
- Tailwind CSS 3.4.19
- shadcn/ui New York, non-RSC, TSX, base color `slate`

## Commands

```bash
cd app
npm run dev     # port 3000
npm run build   # tsc -b && vite build
npm run lint    # eslint .
```

## Path alias

- `@/*` → `./src/*` in both TS and Vite.

## Config files

- `app/vite.config.ts` — `base: './'`, port 3000, alias `@`.
- `app/tailwind.config.js` — dark mode `class`, content scan.
- `app/eslint.config.js` — flat config, recommended TS/React Hooks/Refresh.
- `app/tsconfig.app.json` — strict, unused locals/parameters, verbatim module syntax.
