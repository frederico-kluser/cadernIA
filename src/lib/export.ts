import { toPng } from 'html-to-image'
import type { Project } from '@/lib/db'

export function sanitizeFileName(name: string): string {
  return name.trim().replace(/[^\w\dà-úÀ-Ú _-]+/gi, '') || 'nota'
}

export async function downloadNoteImage(node: HTMLElement, project: Project) {
  const safe = sanitizeFileName(project.name)
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#282a36',
  })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${safe}.png`
  a.click()
}

export function downloadNote(project: Project, format: 'md' | 'txt') {
  const safe = sanitizeFileName(project.name)
  const blob = new Blob([project.content], {
    type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${safe}.${format}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
