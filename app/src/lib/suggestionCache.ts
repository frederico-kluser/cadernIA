// Memória local de sugestões de autocomplete.
// Se o usuário digita algo diferente e apaga até voltar ao ponto em que
// uma sugestão existia, o contexto (prefixo + início do sufixo) volta a ser
// idêntico e a sugestão é recuperada da memória sem nova chamada à API.

const STORAGE_KEY = 'noteghost_suggestion_cache_v1'
const MAX_ENTRIES = 120
const MAX_VALUE_LEN = 600

type CacheMap = Record<string, string>

function load(): CacheMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CacheMap) : {}
  } catch {
    return {}
  }
}

function save(map: CacheMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* armazenamento cheio — ignorar */
  }
}

function hash(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
  }
  return (h >>> 0).toString(36)
}

export function cacheKey(beforeCursor: string, afterCursor: string): string {
  const ctx = beforeCursor.slice(-400) + '⟨CURSOR⟩' + afterCursor.slice(0, 60)
  return hash(ctx)
}

export function getCached(beforeCursor: string, afterCursor: string): string | null {
  const map = load()
  return map[cacheKey(beforeCursor, afterCursor)] ?? null
}

export function setCached(beforeCursor: string, afterCursor: string, suggestion: string) {
  if (!suggestion || suggestion.length > MAX_VALUE_LEN) return
  const map = load()
  const keys = Object.keys(map)
  if (keys.length >= MAX_ENTRIES) {
    // remove as entradas mais antigas (objeto preserva ordem de inserção)
    for (const k of keys.slice(0, keys.length - MAX_ENTRIES + 1)) delete map[k]
  }
  map[cacheKey(beforeCursor, afterCursor)] = suggestion
  save(map)
}

export function invalidate(beforeCursor: string, afterCursor: string) {
  const map = load()
  const key = cacheKey(beforeCursor, afterCursor)
  if (key in map) {
    delete map[key]
    save(map)
  }
}
