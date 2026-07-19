// Persistência local em IndexedDB: cada "página" do bloco é um projeto
// com suas próprias notas e seus próprios arquivos de contexto.

export interface Attachment {
  id: string
  name: string
  content: string
}

export interface Project {
  id: string
  name: string
  content: string
  attachments: Attachment[]
  createdAt: number
  updatedAt: number
}

const DB_NAME = 'noteghost_db'
const STORE = 'projects'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function dbGetAll(): Promise<Project[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll()
    req.onsuccess = () => {
      const list = (req.result as Project[]).sort((a, b) => a.createdAt - b.createdAt)
      resolve(list)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function dbPut(p: Project): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(p)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function dbDelete(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export function newProject(name: string, content = ''): Project {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    content,
    attachments: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function downloadNote(project: Project, format: 'md' | 'txt') {
  const safe = project.name.trim().replace(/[^\w\dà-úÀ-Ú _-]+/gi, '') || 'nota'
  const blob = new Blob([project.content], {
    type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${safe}.${format}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
