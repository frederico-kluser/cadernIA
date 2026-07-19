import type { ReactNode } from 'react'

export type LeaveDirection = 'next' | 'prev'
export type LeaveKind = 'flip' | 'tear'

export interface LeavingPage {
  header: ReactNode
  bodyHtml: string
  kind: LeaveKind
  direction: LeaveDirection
}

interface PageSheetProps {
  header: ReactNode
  children: ReactNode
  fontSize: number
  leaving: LeavingPage | null
  onLeavingEnd: () => void
}

const HOLES = 13

export default function PageSheet({
  header,
  children,
  fontSize,
  leaving,
  onLeavingEnd,
}: PageSheetProps) {
  const busy = Boolean(leaving)

  const renderHoles = () => (
    <div className="page-holes" aria-hidden>
      {Array.from({ length: HOLES }).map((_, i) => (
        <span key={i} className="page-hole" />
      ))}
    </div>
  )

  const lh = fontSize * 1.65
  const vars = {
    ['--editor-font-size' as string]: `${fontSize}px`,
    ['--editor-lh' as string]: `${lh}px`,
  }

  return (
    <div className="page-perspective" style={vars}>
      <div className={`page-stack ${busy ? 'busy' : ''}`}>
        {/* folha atual (sempre visível) */}
        <div className="page-current">
          {renderHoles()}
          <div className="page-header">{header}</div>
          <div className="page-body">{children}</div>
        </div>

        {/* folha saindo durante a animação */}
        {leaving && (
          <div
            className={`page-leaving ${leaving.kind} ${leaving.direction}`}
            onAnimationEnd={onLeavingEnd}
            aria-hidden
          >
            <div className="page-leave-front">
              {renderHoles()}
              <div className="page-header">{leaving.header}</div>
              <div
                className="page-leave-body ghost-editor-mirror"
                dangerouslySetInnerHTML={{ __html: leaving.bodyHtml }}
              />
            </div>
            <div className="page-leave-back">
              {renderHoles()}
              <div className="page-leave-body ghost-editor-mirror" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
