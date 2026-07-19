import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

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
  const pageRef = useRef<HTMLDivElement>(null)
  const lastHeightRef = useRef<number>(0)
  const [leavingHeight, setLeavingHeight] = useState<number | null>(null)

  // guarda a altura da página atual enquanto não estiver animando
  useLayoutEffect(() => {
    if (!leaving && pageRef.current) {
      lastHeightRef.current = pageRef.current.offsetHeight
    }
  })

  // ao iniciar a animação, congela a altura da página que está saindo
  useLayoutEffect(() => {
    if (leaving) {
      setLeavingHeight(lastHeightRef.current)
    } else {
      setLeavingHeight(null)
    }
  }, [leaving])

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
    ...(leavingHeight != null
      ? { ['--leaving-height' as string]: `${leavingHeight}px` }
      : {}),
  }

  return (
    <div className="page-perspective" style={vars}>
      <div
        className={`page-stack ${busy ? 'busy' : ''}`}
        style={
          leavingHeight != null ? { minHeight: `${leavingHeight}px` } : undefined
        }
      >
        {/* folha atual (sempre visível) */}
        <div className="page-current" ref={pageRef}>
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
