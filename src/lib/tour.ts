/**
 * Motor de instrução ancorada.
 *
 * O modelo segue o TipKit da Apple, e não o tour modal clássico:
 *
 * - cada passo é ancorado ao controle real que ele descreve;
 * - um passo se aposenta quando o usuário EXECUTA a ação ensinada
 *   (`actionPerformed`) ou fecha a dica (`tipClosed`) — nunca porque um índice
 *   avançou;
 * - a sequência é ordenada: um passo só aparece quando todos os anteriores foram
 *   invalidados;
 * - executar a ação avança a sequência exatamente como fechar.
 *
 * Consequência prática: quem já descobriu o Tab sozinho nunca é ensinado a usar
 * o Tab.
 */

export type TourStepId =
  | 'escrever'
  | 'aceitar'
  | 'pedir-sugestao'
  | 'editar-ia'
  | 'ditar'
  | 'paginas'
  | 'ajuda'

/** Por que um passo deixou de ser exibível. Os dois primeiros são do usuário. */
export type InvalidationReason = 'actionPerformed' | 'tipClosed' | 'skipped'

export type Platform = 'desktop' | 'touch' | 'both'

export interface TourStep {
  id: TourStepId
  /** valor do atributo `data-tour` no elemento âncora */
  anchor: string
  title: string
  /** Corpo no desktop (ponteiro + teclado). */
  body: string
  /** Corpo no toque, quando a instrução muda de fato. */
  bodyTouch?: string
  /** Onde o passo faz sentido. Evita ensinar Tab em tela de toque. */
  platform?: Platform
  /**
   * Rótulo da ação que conclui o passo. Quando presente, o passo é
   * "faça isto", não "leia isto": ele se conclui sozinho ao ser executado.
   */
  action?: string
  actionTouch?: string
  /** Tecla mostrada como <kbd>. */
  keys?: string[]
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'escrever',
    anchor: 'editor',
    title: 'Escreva uma linha',
    body: 'A IA lê o que você escreveu e propõe a continuação em cinza, sozinha. Não precisa pedir.',
    action: 'Digite algo na folha',
    placement: 'bottom',
  },
  {
    id: 'aceitar',
    anchor: 'editor',
    title: 'Aceite o que aparecer em cinza',
    body: 'Aquele texto apagado à frente do cursor é a sugestão. Tab incorpora, Esc descarta.',
    bodyTouch:
      'Aquele texto apagado à frente do cursor é a sugestão. O botão ✓ da barra flutuante incorpora.',
    action: 'Pressione Tab numa sugestão',
    actionTouch: 'Toque em ✓ numa sugestão',
    keys: ['Tab'],
    placement: 'bottom',
  },
  {
    id: 'pedir-sugestao',
    anchor: 'ask-suggestion',
    title: 'Ou comece do zero',
    body: 'Diga o que você precisa — "um e-mail cobrando o orçamento" — e a IA escreve o texto inteiro. Serve para quando a folha está em branco.',
    action: 'Peça uma sugestão',
    placement: 'bottom',
  },
  {
    id: 'editar-ia',
    anchor: 'ai-edit',
    title: 'E reescreva o que já existe',
    body: 'A outra ponta: em vez de escrever do zero, muda o que já está na folha. "Deixe mais formal", "resuma". Selecione antes para mexer só num trecho.',
    action: 'Abra o editor com IA',
    placement: 'bottom',
  },
  {
    id: 'ditar',
    anchor: 'mic',
    title: 'Escreva falando',
    body: 'Grava sua voz e transcreve no cursor. Também entende ordens: "apague a última frase".',
    action: 'Ative o microfone',
    placement: 'bottom',
  },
  {
    id: 'paginas',
    anchor: 'new-page',
    title: 'Uma folha por assunto',
    body: 'Cada folha guarda o próprio texto e os próprios anexos de contexto. Tudo fica salvo no navegador.',
    action: 'Crie uma folha',
    placement: 'bottom',
  },
  {
    id: 'ajuda',
    anchor: 'help',
    title: 'Está tudo aqui',
    body: 'Este menu reabre o tutorial e lista os atalhos de teclado. Bom proveito.',
    placement: 'bottom',
  },
]

// ---------------------------------------------------------------------------
// Persistência
// ---------------------------------------------------------------------------

/** Estado por passo. A chave legada continua sendo lida na migração. */
const LS_TOUR = 'noteghost_tour_v1'
const LS_LEGACY_SEEN = 'noteghost_tutorial_seen'

export interface TourState {
  /** Passo -> motivo pelo qual foi aposentado. */
  done: Partial<Record<TourStepId, InvalidationReason>>
  /** O usuário dispensou o tour inteiro. Não reabrir sozinho. */
  dismissed: boolean
}

const EMPTY: TourState = { done: {}, dismissed: false }

export function loadTourState(): TourState {
  try {
    const raw = localStorage.getItem(LS_TOUR)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TourState>
      return {
        done: parsed.done ?? {},
        dismissed: parsed.dismissed ?? false,
      }
    }
  } catch {
    // storage corrompido ou indisponível: cai na migração
  }

  // Migração: quem já viu o tutorial antigo não é abordado de novo.
  // A HIG é explícita — se o usuário pulou, "don't present it again on
  // subsequent launches".
  if (localStorage.getItem(LS_LEGACY_SEEN) === '1') {
    return { done: {}, dismissed: true }
  }
  return EMPTY
}

export function saveTourState(state: TourState) {
  try {
    localStorage.setItem(LS_TOUR, JSON.stringify(state))
  } catch {
    // modo privado / cota estourada: o tour só perde a memória
  }
}

/** Passos que fazem sentido neste dispositivo. */
export function stepsForPlatform(isTouch: boolean): TourStep[] {
  return TOUR_STEPS.filter((s) => {
    const p = s.platform ?? 'both'
    return p === 'both' || (isTouch ? p === 'touch' : p === 'desktop')
  })
}

/** Primeiro passo ainda não invalidado — a semântica de grupo ordenado. */
export function nextPendingIndex(steps: TourStep[], state: TourState): number {
  return steps.findIndex((s) => !state.done[s.id])
}
