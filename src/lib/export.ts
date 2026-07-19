import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
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

export async function downloadNotePdf(node: HTMLElement, project: Project) {
  const safe = sanitizeFileName(project.name)
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: '#282a36',
    useCORS: true,
  })
  const imgData = canvas.toDataURL('image/png')

  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgProps = pdf.getImageProperties(imgData)
  const scaledHeight = (imgProps.height * pageWidth) / imgProps.width

  let heightLeft = scaledHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, pageWidth, scaledHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - scaledHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, scaledHeight)
    heightLeft -= pageHeight
  }

  pdf.save(`${safe}.pdf`)
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
