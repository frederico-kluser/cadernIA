# Persistence Contracts

## IndexedDB

- DB: `noteghost_db`
- Store: `projects`
- Version: `1`
- Key path: `id`

## Project schema

```ts
interface Project {
  id: string;
  name: string;
  content: string;
  attachments: Attachment[];
  createdAt: number;
  updatedAt: number;
}

interface Attachment {
  id: string;
  name: string;
  content: string;
}
```

## CRUD helpers

- `dbGetAll()`
- `dbPut(project)`
- `dbDelete(id)`
- `newProject(name)`
- `downloadNote(project, ext)`

## Settings

- API key: `localStorage.getItem('noteghost_api_key')`
- Legacy note: `localStorage.getItem('noteghost_text')` migrated once if IDB is empty.

## Secure context

- `crypto.randomUUID()` requires `https` or `localhost`.
