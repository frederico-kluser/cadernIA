---
name: editing-local-persistence
description: Guides changes to IndexedDB storage, project/attachment schema, migrations, export, and localStorage settings. Use whenever the user touches lib/db.ts, attachment handling, API key storage, or legacy migration.
metadata:
  type: task
  verification_signal: npm run build in app/ + local-persistence eval suite
---
# editing-local-persistence

## When to use

The user wants to change how notes, attachments, settings, or the API key are stored locally: IndexedDB schema, CRUD helpers, migration, export, or `localStorage` usage.

## Injected knowledge

### IndexedDB contract (`lib/db.ts`)

- DB name: `noteghost_db`; store: `projects`; version: `1` (`lib/db.ts:19-24`).
- Key path: `id`. No auto-increment; IDs come from `crypto.randomUUID()` (`lib/db.ts:68`).
- Schema:
  ```ts
  Project { id, name, content, attachments: Attachment[], createdAt, updatedAt }
  Attachment { id, name, content }
  ```
  (`lib/db.ts:4-17`)
- `onupgradeneeded` only creates the store if missing; there is **no schema upgrade path** beyond v1 (`lib/db.ts:25-29`).
- CRUD helpers: `dbGetAll`, `dbPut`, `dbDelete` (`lib/db.ts:35-63`).
- Export: `downloadNote` writes `project.content` to a `.md` or `.txt` blob (`lib/db.ts:77-86`).

### Attachment contract

- Attachments are embedded inside each `Project` (`lib/db.ts:14`).
- File picker limit: 400 KB per file (`pages/Home.tsx:496`).
- Read limit: first 50 000 chars (`pages/Home.tsx:501`).
- OpenAI context cap: 8000 chars total, consumed in input order (`lib/openai.ts:19,58-67`).
- `AttachmentsPanel.tsx` displays name and size in KB (`components/AttachmentsPanel.tsx:30-47`).

### API key and settings

- API key is stored in `localStorage` under `noteghost_api_key` (`pages/Home.tsx:90,244-247`).
- The key is validated against `https://api.openai.com/v1/models` at startup (`lib/openai.ts:25-36`, `pages/Home.tsx:235-242`).
- The app stays locked until validation passes (`components/LockScreen.tsx`).

### Legacy migration

- At first load, if IndexedDB is empty, the app imports the old `localStorage` key `noteghost_text` into a new project (`pages/Home.tsx:181-185`).
- This migration runs **only once**; if IndexedDB later has projects, legacy data is ignored.

### Gotchas

- `crypto.randomUUID()` requires secure context (`https` or `localhost`). On plain `http` it throws.
- If IndexedDB open fails, the app creates a transient in-memory project and shows a toast, meaning notes are not persisted (`pages/Home.tsx:191-197`).
- There is no error recovery if `dbPut` starts failing after initial load.

## Procedure

1. Load `working-in-cadernia` first.
2. Identify whether the change touches schema, CRUD, migration, export, attachments, or settings.
3. If changing the `Project`/`Attachment` shape, update `lib/db.ts` types, IndexedDB store handling, and all consumers.
4. If bumping the DB version, write an `onupgradeneeded` migration; do not break existing stores.
5. Run `npm run build` in `app/`.
6. Run the local-persistence eval suite (`scripts/eval-local-persistence.sh`).

## References

- `references/persistence-contracts.md` — full schema, CRUD signatures, migration rules.

## <evolution>

On task completion, run the <memory_pipeline>: if there is IMPORTANT and VERIFIED information to retain, update THIS SKILL.md DIRECTLY. Do NOT create learnings files. Do NOT self-merge anything that has not passed `npm run build` in `app/` and the local-persistence eval suite.
