// Integração com a API da OpenAI: validação de chave, autocomplete e Whisper.

export interface AttachmentContext {
  name: string
  content: string
}

export interface CompletionRequest {
  apiKey: string
  model: string
  beforeCursor: string
  afterCursor: string
  attachments: AttachmentContext[]
  signal?: AbortSignal
}

const MAX_BEFORE = 6000
const MAX_AFTER = 2000
const MAX_ATTACH_TOTAL = 8000

function isReasoningModel(model: string): boolean {
  return /^o\d/.test(model)
}

interface ChatOptions {
  apiKey: string
  model: string
  messages: Array<{ role: 'system' | 'user'; content: string }>
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: 'json_object' }
  signal?: AbortSignal
}

async function chatCompletion({
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  responseFormat,
  signal,
}: ChatOptions): Promise<string> {
  const reasoning = isReasoningModel(model)
  const body: Record<string, unknown> = {
    model,
    messages,
  }
  if (reasoning) {
    if (maxTokens) body.max_completion_tokens = maxTokens
  } else {
    if (temperature !== undefined) body.temperature = temperature
    if (maxTokens) body.max_tokens = maxTokens
  }
  if (responseFormat) body.response_format = responseFormat

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? `Erro HTTP ${res.status} na requisição à OpenAI.`)
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

export async function validateApiKey(
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.ok) return { ok: true }
    if (res.status === 401) return { ok: false, error: 'Chave inválida ou revogada.' }
    if (res.status === 429)
      return { ok: false, error: 'Limite de requisições atingido. Tente novamente.' }
    const data = await res.json().catch(() => null)
    return { ok: false, error: data?.error?.message ?? `Erro HTTP ${res.status}` }
  } catch {
    return { ok: false, error: 'Falha de rede ao contatar a OpenAI.' }
  }
}

function buildSystemPrompt(): string {
  return [
    'Você é o motor de autocompletar de um bloco de notas, no estilo "ghost text" do VS Code / GitHub Copilot.',
    'Regras obrigatórias:',
    '- Continue o texto EXATAMENTE a partir da posição do cursor ([CURSOR]).',
    '- Retorne APENAS a continuação: sem explicações, sem aspas envolventes, sem repetir o texto já escrito.',
    '- A continuação deve ser curta (no máximo ~2 frases ou poucas linhas) e seguir o idioma, o estilo e a formatação do usuário.',
    '- Se existir texto depois do cursor, a continuação deve conectar-se de forma coerente com ele (complete a palavra/frase quebrada, não a repita).',
    '- Use os arquivos anexados somente como contexto (termos, nomes, estilo); nunca os reproduza por inteiro.',
    '- Se o documento for Markdown, respeite a sintaxe Markdown.',
    '- Se não houver continuação razoável, retorne uma string vazia.',
  ].join('\n')
}

function buildUserPrompt(req: CompletionRequest): string {
  const before = req.beforeCursor.slice(-MAX_BEFORE)
  const after = req.afterCursor.slice(0, MAX_AFTER)

  let attachBlock = ''
  if (req.attachments.length > 0) {
    let budget = MAX_ATTACH_TOTAL
    const parts: string[] = []
    for (const a of req.attachments) {
      if (budget <= 0) break
      const slice = a.content.slice(0, budget)
      budget -= slice.length
      parts.push(`--- arquivo anexado: ${a.name} ---\n${slice}`)
    }
    attachBlock = `<contexto_de_arquivos_anexados>\n${parts.join('\n\n')}\n</contexto_de_arquivos_anexados>\n\n`
  }

  return (
    attachBlock +
    `<texto_antes_do_cursor>\n${before}\n</texto_antes_do_cursor>\n` +
    `[CURSOR]\n` +
    `<texto_depois_do_cursor>\n${after}\n</texto_depois_do_cursor>\n\n` +
    'Escreva somente a continuação a partir de [CURSOR]:'
  )
}

/** Remove cercas de código e sobreposição com o texto já digitado. */
function sanitizeCompletion(raw: string, beforeCursor: string): string {
  let text = raw.replace(/\r\n/g, '\n')

  // Desembrulhar ``` fences caso o modelo teime em usá-las
  const fence = text.match(/^```[a-zA-Z]*\n([\s\S]*?)```\s*$/)
  if (fence) text = fence[1]

  // Remover eco do final do texto anterior (o modelo às vezes repete o rabinho)
  const maxOverlap = Math.min(60, beforeCursor.length, text.length - 1)
  for (let k = maxOverlap; k >= 4; k--) {
    if (text.startsWith(beforeCursor.slice(-k))) {
      text = text.slice(k)
      break
    }
  }

  return text
}

export async function fetchCompletion(req: CompletionRequest): Promise<string> {
  const text = await chatCompletion({
    apiKey: req.apiKey,
    model: req.model,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(req) },
    ],
    temperature: 0.3,
    maxTokens: 180,
    signal: req.signal,
  })
  return sanitizeCompletion(text, req.beforeCursor)
}

export interface ClassifyResult {
  type: 'transcription' | 'instruction'
  payload: string
}

export async function classifyUtterance(
  apiKey: string,
  model: string,
  transcript: string,
  context: string,
): Promise<ClassifyResult> {
  const system = [
    'Você é um classificador de comandos de voz para um app de notas.',
    'O usuário pode estar ditando texto literal OU dando uma instrução para editar o documento.',
    'Decida:',
    '- "transcription": se a frase deve ser inserida como texto no cursor.',
    '- "instruction": se a frase é um comando de edição (ex: apague a ultima frase, troque X por Y, reformule o paragrafo anterior).',
    'Para "transcription", o payload é o texto a ser transcrito.',
    'Para "instruction", o payload é a instrução de edição, mantida clara e curta.',
    'Responda APENAS com JSON no formato: {"type":"transcription|instruction","payload":"..."}',
  ].join('\n')

  const user = `Trecho atual do documento (contexto):\n${context.slice(-800)}\n\nFala do usuário:\n${transcript}\n\nClassifique:`

  const raw = await chatCompletion({
    apiKey,
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0,
    maxTokens: 120,
    responseFormat: { type: 'json_object' },
  })

  try {
    const parsed = JSON.parse(raw) as Partial<ClassifyResult>
    if (
      (parsed.type === 'transcription' || parsed.type === 'instruction') &&
      typeof parsed.payload === 'string'
    ) {
      return { type: parsed.type, payload: parsed.payload }
    }
  } catch {
    // fall back to transcription
  }
  return { type: 'transcription', payload: transcript }
}

export interface ApplyInstructionRequest {
  apiKey: string
  model: string
  instruction: string
  fullText: string
  selectedText?: string
}

export async function applyInstruction(req: ApplyInstructionRequest): Promise<string> {
  const reasoning = isReasoningModel(req.model)
  const maxTokens = reasoning ? 4096 : 4096

  let system: string
  let user: string

  if (req.selectedText) {
    system = [
      'Você é um editor de texto. O usuário selecionou um trecho e deu uma instrução.',
      'Aplique a instrução APENAS no trecho selecionado.',
      'Retorne APENAS o trecho modificado, sem explicações, sem cercas de código, sem comentários.',
    ].join('\n')
    user = `Trecho selecionado:\n${req.selectedText}\n\nInstrução:\n${req.instruction}\n\nTrecho modificado:`
  } else {
    system = [
      'Você é um editor de texto. O usuário deu uma instrução sobre o documento inteiro.',
      'Aplique a instrução e retorne o TEXTO COMPLETO resultante.',
      'Não inclua explicações, cercas de código ou comentários.',
    ].join('\n')
    user = `Texto atual:\n${req.fullText}\n\nInstrução:\n${req.instruction}\n\nTexto resultante:`
  }

  return chatCompletion({
    apiKey: req.apiKey,
    model: req.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
    maxTokens,
  })
}

export async function transcribeAudio(apiKey: string, blob: Blob): Promise<string> {
  const mime = blob.type || 'audio/webm'
  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm'
  const form = new FormData()
  form.append('file', blob, `gravacao.${ext}`)
  form.append('model', 'whisper-1')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? `Erro HTTP ${res.status} na transcrição.`)
  }
  const data = await res.json()
  return (data.text ?? '').trim()
}
