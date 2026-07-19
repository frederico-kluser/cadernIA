import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'

export interface GhostEditorHandle {
  insertAtCursor: (text: string) => void
  setCursor: (pos: number) => void
  focus: () => void
  getSelection: () => { start: number; end: number }
}

interface GhostEditorProps {
  value: string
  cursor: number
  onChange: (value: string, cursorPos: number) => void
  onCursorChange: (pos: number) => void
  suggestion: string | null
  onAcceptSuggestion: () => void
  onDismissSuggestion: () => void
  onManualTrigger: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  fontSize: number
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** HTML de espelho estático (usado na página que vira durante o flip). */
export function staticMirrorHtml(text: string): string {
  return text ? escapeHtml(text) + '&#8203;' : ''
}

const PLACEHOLDER =
  'Comece a escrever… o autocomplete fantasma aparece sozinho. Tab aceita, Esc dispensa.'

const GhostEditor = forwardRef<GhostEditorHandle, GhostEditorProps>(
  function GhostEditor(
    {
      value,
      cursor,
      onChange,
      onCursorChange,
      suggestion,
      onAcceptSuggestion,
      onDismissSuggestion,
      onManualTrigger,
      onUndo,
      onRedo,
      canUndo,
      canRedo,
      fontSize,
    },
    ref,
  ) {
    const taRef = useRef<HTMLTextAreaElement>(null)
    const mirrorRef = useRef<HTMLDivElement>(null)
    const pendingSelection = useRef<number | null>(null)
    const acceptCooldownRef = useRef(false)

    useImperativeHandle(ref, () => ({
      insertAtCursor(text: string) {
        const ta = taRef.current
        if (!ta) return
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const next = value.slice(0, start) + text + value.slice(end)
        pendingSelection.current = start + text.length
        onChange(next, start + text.length)
      },
      setCursor(pos: number) {
        pendingSelection.current = pos
        const ta = taRef.current
        if (ta) {
          ta.selectionStart = pos
          ta.selectionEnd = pos
        }
      },
      focus() {
        taRef.current?.focus()
      },
      getSelection() {
        const ta = taRef.current
        return ta
          ? { start: ta.selectionStart, end: ta.selectionEnd }
          : { start: 0, end: 0 }
      },
    }))

    const mirrorHtml = useMemo(() => {
      if (value.length === 0) {
        return `<span style="color: var(--dracula-comment)">${escapeHtml(PLACEHOLDER)}</span>`
      }
      const pos = Math.min(cursor, value.length)
      const before = escapeHtml(value.slice(0, pos))
      const after = escapeHtml(value.slice(pos))
      const ghost = suggestion
        ? `<span class="ghost-suggestion">${escapeHtml(suggestion)}</span>`
        : ''
      // \u200B final garante a altura quando o texto termina em quebra de linha
      return before + ghost + after + '&#8203;'
    }, [value, cursor, suggestion])

    const syncScroll = () => {
      const ta = taRef.current
      const mirror = mirrorRef.current
      if (ta && mirror) {
        mirror.scrollTop = ta.scrollTop
        mirror.scrollLeft = ta.scrollLeft
      }
    }

    const applyPendingSelection = () => {
      if (pendingSelection.current != null) {
        const ta = taRef.current
        if (ta) {
          ta.selectionStart = pendingSelection.current
          ta.selectionEnd = pendingSelection.current
        }
        pendingSelection.current = null
      }
    }

    return (
      <div
        className="ghost-editor-wrap"
        style={{
          ['--editor-font-size' as string]: `${fontSize}px`,
          ['--editor-lh' as string]: `${fontSize * 1.65}px`,
        }}
      >
        <div
          ref={mirrorRef}
          className="ghost-editor-mirror"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: mirrorHtml }}
        />
        <textarea
          ref={taRef}
          className="ghost-editor-input"
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Editor de notas"
          onChange={(e) => {
            onChange(e.target.value, e.target.selectionStart)
            requestAnimationFrame(applyPendingSelection)
          }}
          onSelect={(e) => {
            onCursorChange(e.currentTarget.selectionStart)
          }}
          onScroll={syncScroll}
          onKeyDown={(e) => {
            if (e.repeat) return

            if (e.key === 'Tab') {
              e.preventDefault()
              if (suggestion) {
                if (acceptCooldownRef.current) return
                acceptCooldownRef.current = true
                window.setTimeout(() => {
                  acceptCooldownRef.current = false
                }, 120)
                onAcceptSuggestion()
              } else {
                // Sem sugestão: Tab insere dois espaços, como num editor de código
                const ta = e.currentTarget
                const start = ta.selectionStart
                const next = value.slice(0, start) + '  ' + value.slice(ta.selectionEnd)
                pendingSelection.current = start + 2
                onChange(next, start + 2)
              }
              return
            }
            if (e.key === 'Escape' && suggestion) {
              e.preventDefault()
              e.stopPropagation()
              onDismissSuggestion()
              return
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === ' ' || e.key === 'Enter')) {
              e.preventDefault()
              onManualTrigger()
              return
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
              if (e.shiftKey) {
                if (canRedo) {
                  e.preventDefault()
                  onRedo?.()
                }
              } else if (canUndo) {
                e.preventDefault()
                onUndo?.()
              }
              return
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
              if (canRedo) {
                e.preventDefault()
                onRedo?.()
              }
              return
            }
          }}
        />
      </div>
    )
  },
)

export default GhostEditor
