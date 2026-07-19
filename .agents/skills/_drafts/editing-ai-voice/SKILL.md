---
name: editing-ai-voice
description: Guides changes to voice dictation (Whisper), utterance classification, and AI edit-by-instruction. Use whenever the user touches voice recording, Whisper transcription, applyInstruction, classifyUtterance, or the "Editar com IA" modal.
metadata:
  type: task
  verification_signal: yarn build in project root
---
# editing-ai-voice

## When to use

The user wants to change how voice input is handled, how Whisper transcripts are interpreted as either literal text or edit instructions, or the "Edit with AI" modal that applies natural-language instructions to the note.

## Injected knowledge

### Architecture

- `lib/openai.ts` owns the two new helpers:
  - `classifyUtterance(apiKey, model, transcript, context)` sends the transcript to a chat model with a JSON prompt and returns `{ type: 'transcription' | 'instruction', payload: string }` (`lib/openai.ts:135`).
  - `applyInstruction({ apiKey, model, instruction, fullText, selectedText? })` asks the model to edit either the full document or the selected snippet and returns the replacement text (`lib/openai.ts:175`).
- `pages/Home.tsx` wires them together after `transcribeAudio`:
  - `transcription` payloads are inserted at the cursor via `editorRef.current?.insertAtCursor`.
  - `instruction` payloads are applied to the whole document and replace the active project content (`pages/Home.tsx:610`).
- `components/AiEditDialog.tsx` provides the UI for typed instructions: a textarea, a "selection only" checkbox, a preview pane, and Apply/Cancel buttons.
- `components/GhostEditor.tsx` exposes `getSelection()` on its imperative handle so the AI-edit feature can tell whether text is selected (`components/GhostEditor.tsx:15`).

### Contracts and constants

- `classifyUtterance` uses `response_format: { type: 'json_object' }` and a very low temperature (`0`).
- `applyInstruction` uses `temperature: 0.2` and up to `4096` output tokens.
- Restricted models — reasoning (`o1`, `o3`, `o4…`) **and the whole GPT-5 family** (`gpt-5.*`) — are detected by `isRestrictedModel` (`/^(o\d|gpt-5)/`): they reject `temperature` (only the default 1 is allowed) and require `max_completion_tokens` instead of `max_tokens`; the shared `chatCompletion` helper omits/swaps both automatically (`lib/openai.ts:22`). Sending `temperature` to a `gpt-5.*` model was what broke the voice flow right after Whisper transcription ("Unsupported value: 'temperature'…").

### Key behaviors

- Voice edits are applied automatically without an extra confirmation dialog, but a toast informs the user that a command was detected.
- The AI-edit modal always shows a preview before applying; the user must click **Aplicar**.
- If text is selected when the modal opens, the user can choose to apply the instruction only to the selection.

### Microphone UI/UX

- `recState` cycles through `'idle' | 'recording' | 'transcribing'` and drives both the desktop toolbar mic button and the mobile floating action button (`pages/Home.tsx:1359@9929bd1`, `pages/Home.tsx:1741@9929bd1`).
- Recording state uses `rec-pulse` plus `recording-ring` (a red expanding ring) for a clear visual cue; transcribing state uses `transcribing-pulse` together with the spinner (`src/index.css:782@9929bd1`).
- The recording-start toast is positioned at `top-center` so it never covers the mobile bottom FAB that stops the recording (`pages/Home.tsx:938@9929bd1`).

### Gotchas

- `classifyUtterance` falls back to `{ type: 'transcription', payload: transcript }` if the model returns malformed JSON.
- `applyInstruction` returns plain text; the caller is responsible for replacing either the selection or the full document.
- Keep the model-selector global in `Home.tsx` in sync with the restricted-model detection in `lib/openai.ts` (every `gpt-5*` or `o*` id added there is automatically restricted).

## Procedure

1. Load `working-in-ghostwriter` first.
2. Load `editing-ghost-editor` if ghost-autocomplete behavior is also changing.
3. Make changes in `lib/openai.ts` for backend behavior and in `components/AiEditDialog.tsx` / `pages/Home.tsx` for UI/flow.
4. Run `yarn build` in the project root.

## References

- `src/lib/openai.ts` — `classifyUtterance`, `applyInstruction`, and `chatCompletion`.
- `src/components/AiEditDialog.tsx` — instruction modal UI.
- `src/pages/Home.tsx` — voice recording stop handler and AI-edit integration.

## <evolution>

On task completion, run the <memory_pipeline>: if there is IMPORTANT and VERIFIED information to retain, update THIS SKILL.md DIRECTLY. Do NOT create learnings files. Do NOT self-merge anything that has not passed `yarn build` in the project root.
