import { forwardRef, useImperativeHandle, useRef } from 'react'

export interface PageTextureHandle {
  /** renderiza o conteúdo off-screen e devolve um data URL PNG */
  snapshot: () => Promise<string>
}

interface PageTextureProps {
  width: number
  height: number
  /** 'edit' = editor real; 'mirror' = espelho estático do conteúdo */
  variant: 'edit' | 'mirror'
  children: React.ReactNode
}

/**
 * Palco off-screen com o mesmo layout da folha. É fotografado via SVG
 * foreignObject para virar textura da página 3D.
 */
const PageTexture = forwardRef<PageTextureHandle, PageTextureProps>(
  function PageTexture({ width, height, variant, children }, ref) {
    const hostRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      async snapshot() {
        const node = hostRef.current
        if (!node) throw new Error('palco não montado')

        // coleta o CSS da página (estilos + fonts)
        let css = ''
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + '\n'
          } catch {
            /* folhas cross-origin (Google Fonts) — importar pela URL */
            if (sheet.href) css += `@import url("${sheet.href}");\n`
          }
        }

        const html = new XMLSerializer().serializeToString(node)
        const svg =
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
          `<foreignObject width="100%" height="100%">` +
          `<div xmlns="http://www.w3.org/1999/xhtml"><style>${css}</style>${html}</div>` +
          `</foreignObject></svg>`

        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('falha ao rasterizar a página'))
          img.src = url
        })
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0)
        return canvas.toDataURL('image/png')
      },
    }))

    return (
      <div
        style={{
          position: 'fixed',
          left: -10000,
          top: 0,
          width,
          height,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
        }}
        aria-hidden
      >
        <div
          ref={hostRef}
          className={`page-sheet ${variant === 'mirror' ? 'sheet-mirror' : 'sheet-edit'}`}
          style={{ width, height }}
        >
          {children}
        </div>
      </div>
    )
  },
)

export default PageTexture
