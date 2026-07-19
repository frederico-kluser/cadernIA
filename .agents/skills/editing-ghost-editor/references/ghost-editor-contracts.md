# Ghost Editor Contracts

## Prompt template (`lib/openai.ts:39-77`)

```
Você é um assistente de escrita. ...
[CURSOR]
<texto_antes_do_cursor>{before}</texto_antes_do_cursor>
<texto_depois_do_cursor>{after}</texto_depois_do_cursor>
[optional <contexto_de_arquivos_anexados>]
```

## Context windows

- `MAX_BEFORE = 6000`
- `MAX_AFTER = 2000`
- `MAX_ATTACH_TOTAL = 8000`

## Completion params

- `temperature: 0.3`
- `max_tokens: 180`
- Non-streaming JSON response.

## Sanitization

- Remove leading code fences.
- Remove echoed `[CURSOR]` markers.
- Strip overlap if the suggestion repeats the last 4+ chars of `before`.

## Cache key

Hash of 400 chars before + 60 chars after cursor.
