// Cliente leve para a API REST do GitHub usado na importação de contexto.

export interface GitHubRepo {
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  private: boolean
}

export interface GitHubBranch {
  name: string
}

export interface GitHubTreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
}

export interface GitHubError {
  status: number
  message: string
}

const API_BASE = 'https://api.github.com'

function authHeaders(pat: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${pat}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function githubFetch<T>(
  pat: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(pat), ...init?.headers },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const message =
      typeof data?.message === 'string'
        ? data.message
        : `Erro HTTP ${res.status} na API do GitHub.`
    const err: GitHubError = { status: res.status, message }
    throw err
  }
  return res.json() as Promise<T>
}

export async function validateGitHubPat(pat: string): Promise<{
  ok: boolean
  user?: { login: string }
  error?: string
}> {
  try {
    const user = await githubFetch<{ login: string }>(pat, '/user')
    return { ok: true, user }
  } catch (e) {
    const err = e as GitHubError
    if (err.status === 401) return { ok: false, error: 'PAT inválido ou expirado.' }
    if (err.status === 403)
      return { ok: false, error: 'Sem permissão. Verifique os escopos do PAT.' }
    return { ok: false, error: err.message ?? 'Falha de rede ao contatar o GitHub.' }
  }
}

export async function fetchUserRepos(pat: string): Promise<GitHubRepo[]> {
  const list = await githubFetch<
    {
      full_name: string
      name: string
      owner: { login: string }
      default_branch: string
      private: boolean
    }[]
  >(pat, '/user/repos?sort=updated&per_page=100')
  return list.map((r) => ({
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
    defaultBranch: r.default_branch,
    private: r.private,
  }))
}

export async function fetchBranches(
  pat: string,
  owner: string,
  repo: string,
): Promise<GitHubBranch[]> {
  const list = await githubFetch<{ name: string }[]>(
    pat,
    `/repos/${owner}/${repo}/branches`,
  )
  return list.map((b) => ({ name: b.name }))
}

export async function fetchTree(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<GitHubTreeItem[]> {
  const data = await githubFetch<{
    tree: { path: string; type: 'blob' | 'tree'; sha: string; size?: number }[]
  }>(pat, `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`)
  return data.tree.map((t) => ({
    path: t.path,
    type: t.type,
    sha: t.sha,
    size: t.size,
  }))
}

export async function fetchFileContent(
  pat: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<string> {
  const data = await githubFetch<{ content: string; encoding: string }>(
    pat,
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
  )
  if (data.encoding === 'base64') {
    return atob(data.content)
  }
  return data.content
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  '.turbo',
  '.vercel',
  '.cache',
  '__pycache__',
])

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.mp3',
  '.mp4',
  '.webm',
  '.ogg',
  '.wav',
  '.mov',
  '.avi',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.eot',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.dat',
  '.db',
  '.sqlite',
])

export function isPathSelectable(path: string): boolean {
  const parts = path.split('/')
  if (parts.some((p) => IGNORED_DIRS.has(p))) return false
  const last = parts[parts.length - 1]
  if (last.startsWith('.')) return false
  const dot = last.lastIndexOf('.')
  if (dot >= 0) {
    const ext = last.slice(dot).toLowerCase()
    if (BINARY_EXTENSIONS.has(ext)) return false
  }
  return true
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return '?'
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}
