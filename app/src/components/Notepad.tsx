import type { ReactNode } from 'react'

export interface FlipState {
  /** HTML do espelho com o conteúdo da página que está virando */
  html: string
  title: string
}

export interface TearState {
  /** HTML do espelho com o conteúdo da página que está sendo arrancada */
  html: string
  title: string
}

interface NotepadProps {
  children: ReactNode
  header: ReactNode
  fontSize: number
  flip: FlipState | null
  tear: TearState | null
  onFlipEnd: () => void
  onTearEnd: () => void
}

const RINGS = 14

export default function Notepad({
  children,
  header,
  fontSize,
  flip,
  tear,
  onFlipEnd,
  onTearEnd,
}: NotepadProps) {
  const lh = Math.round(fontSize * 1.65)
  const vars = {
    ['--editor-font-size' as string]: `${fontSize}px`,
    ['--editor-lh' as string]: `${lh}px`,
  }

  return (
    <div className="notepad-perspective">
      <div className={`notepad ${flip || tear ? 'busy' : ''}`} style={vars}>
        <div className="notepad-back" aria-hidden />

        {/* página atual */}
        <div className="page">
          <div className="holes" aria-hidden>
            {Array.from({ length: RINGS }).map((_, i) => (
              <span key={i} className="hole" />
            ))}
          </div>
          <div className="page-header">{header}</div>
          <div className="page-body">{children}</div>
        </div>

        {/* página virando para trás */}
        {flip && (
          <div className="flip-page" onAnimationEnd={onFlipEnd}>
            <div className="flip-face flip-front">
              <div className="page-header flip-header">
                <span className="page-name-static">{flip.title}</span>
              </div>
              <div
                className="ghost-editor-mirror flip-mirror"
                aria-hidden
                dangerouslySetInnerHTML={{ __html: flip.html }}
              />
            </div>
            <div className="flip-face flip-back" aria-hidden />
          </div>
        )}

        {/* página sendo arrancada */}
        {tear && (
          <div className="tear-page" onAnimationEnd={onTearEnd}>
            <div className="tear-face">
              <div className="page-header flip-header">
                <span className="page-name-static">{tear.title}</span>
              </div>
              <div
                className="ghost-editor-mirror tear-mirror"
                aria-hidden
                dangerouslySetInnerHTML={{ __html: tear.html }}
              />
            </div>
          </div>
        )}

        {/* espiral de argolas metálicas por cima de tudo */}
        <div className="rings" aria-hidden>
          {Array.from({ length: RINGS }).map((_, i) => (
            <span key={i} className="ring" />
          ))}
        </div>
      </div>
    </div>
  )
}
