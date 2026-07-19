import { useEffect, useRef } from 'react'
import { matchesShortcut, type Command } from '@/lib/commands'

/**
 * Atalhos de janela para os comandos declarados.
 *
 * Antes disto, TODO atalho do app vivia dentro do `onKeyDown` do textarea e
 * morria assim que o foco saía dele — nenhuma ação da barra de ferramentas
 * tinha atalho nenhum.
 *
 * Os atalhos locais do editor (Tab, Esc, Ctrl+Espaço, Ctrl+Z/Y) continuam onde
 * estão: eles dependem da seleção e do cursor, e são tratados antes de chegar
 * aqui. Nenhum comando global usa essas combinações.
 */
export function useGlobalShortcuts(commands: Command[], enabled = true) {
  const ref = useRef(commands)
  useEffect(() => {
    ref.current = commands
  })

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      for (const c of ref.current) {
        if (!c.shortcut || c.disabled) continue
        if (matchesShortcut(e, c.shortcut)) {
          e.preventDefault()
          c.run()
          return
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
