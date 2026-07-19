/**
 * Registro único de comandos.
 *
 * Toda ação do app é declarada UMA vez aqui e renderizada em três lugares:
 * a barra de ferramentas, a paleta de comandos (Ctrl/Cmd+K) e o menu lateral.
 * Antes desta lista, a mesma ação existia duplicada com nomes diferentes em
 * cada superfície ("Arrancar" na toolbar, "Arrancar" no drawer, nada na busca),
 * que é boa parte do motivo de a barra parecer confusa.
 */

import type { LucideIcon } from 'lucide-react'

export type CommandGroup = 'pagina' | 'escrita' | 'contexto' | 'exibicao' | 'app'

export const GROUP_LABEL: Record<CommandGroup, string> = {
  pagina: 'Folha',
  escrita: 'Escrita com IA',
  contexto: 'Contexto',
  exibicao: 'Exibição',
  app: 'Aplicativo',
}

export interface Shortcut {
  /** Tecla em minúsculo, como `event.key.toLowerCase()`. */
  key: string
  /** Cmd no macOS, Ctrl no resto. */
  mod?: boolean
  shift?: boolean
  alt?: boolean
}

export interface Command {
  id: string
  /** Rótulo curto, começando por verbo. É o nome acessível do botão. */
  label: string
  /** Frase de apoio na paleta. Explica o que a ação faz, não o que ela é. */
  hint?: string
  group: CommandGroup
  icon: LucideIcon
  shortcut?: Shortcut
  run: () => void
  disabled?: boolean
  /** Estado ligado, para comandos que alternam. */
  active?: boolean
  /** Ação destrutiva: recebe tratamento visual próprio. */
  danger?: boolean
  /** Cor da paleta Dracula usada no ícone. */
  tone?: string
  /** Fica escondido da paleta (ex.: já é óbvio na tela). */
  hiddenInPalette?: boolean
}

// ---------------------------------------------------------------------------
// Atalhos
// ---------------------------------------------------------------------------

export const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const KEY_GLYPH: Record<string, string> = {
  arrowleft: '←',
  arrowright: '→',
  arrowup: '↑',
  arrowdown: '↓',
  enter: '↵',
  escape: 'Esc',
  ' ': 'Espaço',
}

/** Representação visual, tecla por tecla, para <kbd>. */
export function shortcutKeys(s: Shortcut): string[] {
  const out: string[] = []
  if (s.mod) out.push(IS_MAC ? '⌘' : 'Ctrl')
  if (s.shift) out.push(IS_MAC ? '⇧' : 'Shift')
  if (s.alt) out.push(IS_MAC ? '⌥' : 'Alt')
  const k = s.key.toLowerCase()
  out.push(KEY_GLYPH[k] ?? (k.length === 1 ? k.toUpperCase() : s.key))
  return out
}

export function formatShortcut(s: Shortcut): string {
  return shortcutKeys(s).join(IS_MAC ? '' : '+')
}

export function matchesShortcut(e: KeyboardEvent, s: Shortcut): boolean {
  const mod = IS_MAC ? e.metaKey : e.ctrlKey
  // O modificador oposto não pode estar pressionado: Ctrl+K no Mac não é ⌘K.
  const otherMod = IS_MAC ? e.ctrlKey : e.metaKey
  if (otherMod) return false
  if (Boolean(s.mod) !== mod) return false
  if (Boolean(s.shift) !== e.shiftKey) return false
  if (Boolean(s.alt) !== e.altKey) return false
  return e.key.toLowerCase() === s.key.toLowerCase()
}
