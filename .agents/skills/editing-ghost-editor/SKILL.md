---
name: editing-ghost-editor
description: Guides changes to the AI ghost autocomplete, suggestion cache, and OpenAI completion flow. Use whenever the user touches GhostEditor.tsx, suggestionCache.ts, lib/openai.ts completions, or Tab/Esc/manual-trigger behavior.
metadata:
  type: task
  verification_signal: yarn build in project root + ghost-editor eval suite
---
# editing-ghost-editor

## When to use

The user wants to change how the AI inline suggestion works: prompt engineering, acceptance/dismissal keys, the transparent textarea mirror, debouncing, caching, or error handling.

## Injected knowledge

### Architecture

- `GhostEditor.tsx` is a transparent `<textarea>` with a synchronized `<div>` mirror that renders the suggestion as dimmed "ghost" text (`components/GhostEditor.tsx:14-41`).
- `Home.tsx` owns the completion orchestration: debounce, abort, cache lookup, OpenAI call, and ghost display (`pages/Home.tsx:296-330`).
- `lib/suggestionCache.ts` is a `localStorage` LRU keyed by a hash of 400 chars before + 60 chars after the cursor (`lib/suggestionCache.ts:7-8`).
- `lib/openai.ts` contains `fetchCompletion`, which is **non-streaming** (`lib/openai.ts:100-124`).

### Contracts and constants

- Context windows in `lib/openai.ts:17-19`:
  - `MAX_BEFORE = 6000` chars before cursor.
  - `MAX_AFTER = 2000` chars after cursor.
  - `MAX_ATTACH_TOTAL = 8000` chars total for attachments.
- Completion parameters: `temperature: 0.3`, `max_tokens: 180` (`lib/openapi.ts:112-113`).
- Cache: max 120 entries, values capped at 600 chars (`lib/suggestionCache.ts:7-8`).
- Sanitization strips overlaps of **4+** chars (`lib/openai.ts:88-94`).

### Key behaviors

- `Tab` accepts the suggestion; `Esc` dismisses; `Ctrl/Cmd+Space|Enter` triggers manually; otherwise two-space tab insertion (`components/GhostEditor.tsx:55-78`).
- Every new completion aborts the previous `AbortController` (`pages/Home.tsx:296-298`).
- After the API returns, a guard compares `cursorRef.current === pos && textRef.current === full` to avoid stale suggestions (`pages/Home.tsx:317`).
- Errors surface via `toast` (`pages/Home.tsx:325`). Aborted requests are ignored.

### Gotchas

- `dangerouslySetInnerHTML` renders user content + suggestion after a custom escape (`components/GhostEditor.tsx:26-32`). The escape list does not include `'`, which is usually safe but worth noting.
- Ghost text overlaps of 1–3 chars are left in; only 4+ char overlaps are removed (`lib/openai.ts:88-94`).
- `localStorage` full errors in the cache are silently swallowed (`lib/suggestionCache.ts:21-27`).

## Procedure

1. Load `working-in-cadernia` first.
2. Identify the layer being changed (editor UI, debounce logic, prompt, cache, or OpenAI client).
3. Keep the ref/state guard pattern when touching async completion handlers.
4. Run `yarn build` in the project root.
5. Run the ghost-editor eval suite (`scripts/eval-ghost-editor.sh`).

## References

- `references/ghost-editor-contracts.md` — prompt template, context windows, sanitization rules.

## <evolution>

On task completion, run the <memory_pipeline>: if there is IMPORTANT and VERIFIED information to retain, update THIS SKILL.md DIRECTLY. Do NOT create learnings files. Do NOT self-merge anything that has not passed `yarn build` in the project root and the ghost-editor eval suite.
