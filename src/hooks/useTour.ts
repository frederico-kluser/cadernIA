import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadTourState,
  nextPendingIndex,
  saveTourState,
  stepsForPlatform,
  type InvalidationReason,
  type TourState,
  type TourStepId,
} from '@/lib/tour'

/** Tempo que o passo fica marcado como concluído antes de avançar. */
const ADVANCE_DELAY_MS = 850

export function useTour(isTouch: boolean) {
  const [state, setState] = useState<TourState>(loadTourState)
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)
  const [justDone, setJustDone] = useState(false)

  const steps = useMemo(() => stepsForPlatform(isTouch), [isTouch])
  const stepsRef = useRef(steps)
  const indexRef = useRef(index)
  const activeRef = useRef(active)
  const advanceTimer = useRef<number | undefined>(undefined)

  // Espelho para os handlers: `recordAction` é chamado de fora do tour e
  // precisa do passo corrente sem virar dependência de todos os callbacks.
  useEffect(() => {
    stepsRef.current = steps
    indexRef.current = index
    activeRef.current = active
  })

  useEffect(() => {
    saveTourState(state)
  }, [state])

  useEffect(
    () => () => {
      window.clearTimeout(advanceTimer.current)
    },
    [],
  )

  const step = active ? (steps[index] ?? null) : null
  const remaining = steps.filter((s) => !state.done[s.id]).length

  const invalidate = useCallback((id: TourStepId, reason: InvalidationReason) => {
    setState((s) =>
      s.done[id] ? s : { ...s, done: { ...s.done, [id]: reason } },
    )
  }, [])

  const close = useCallback(() => {
    window.clearTimeout(advanceTimer.current)
    setActive(false)
    setJustDone(false)
  }, [])

  /** Avança invalidando o passo atual — "próximo" é um fechamento explícito. */
  const next = useCallback(() => {
    window.clearTimeout(advanceTimer.current)
    setJustDone(false)
    const list = stepsRef.current
    const i = indexRef.current
    const cur = list[i]
    if (cur) invalidate(cur.id, 'tipClosed')
    if (i >= list.length - 1) {
      setActive(false)
    } else {
      setIndex(i + 1)
    }
  }, [invalidate])

  /** Voltar reabre o passo anterior — ele volta a ser exibível. */
  const back = useCallback(() => {
    window.clearTimeout(advanceTimer.current)
    setJustDone(false)
    const i = indexRef.current
    if (i <= 0) return
    const prev = stepsRef.current[i - 1]
    setState((s) => {
      if (!prev || !s.done[prev.id]) return s
      const done = { ...s.done }
      delete done[prev.id]
      return { ...s, done }
    })
    setIndex(i - 1)
  }, [])

  /** Dispensa o tour inteiro. Não volta sozinho — só se for reaberto. */
  const skipAll = useCallback(() => {
    window.clearTimeout(advanceTimer.current)
    setActive(false)
    setJustDone(false)
    setState((s) => ({ ...s, dismissed: true }))
  }, [])

  /**
   * O usuário executou a ação ensinada. Vale mesmo com o tour fechado: quem
   * descobriu o recurso sozinho não precisa mais ser ensinado.
   */
  const recordAction = useCallback(
    (id: TourStepId) => {
      setState((s) => (s.done[id] ? s : { ...s, done: { ...s.done, [id]: 'actionPerformed' } }))

      const list = stepsRef.current
      const i = indexRef.current
      if (!activeRef.current || list[i]?.id !== id) return

      // Confirma visualmente antes de seguir.
      setJustDone(true)
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = window.setTimeout(() => {
        setJustDone(false)
        if (i >= list.length - 1) setActive(false)
        else setIndex(i + 1)
      }, ADVANCE_DELAY_MS)
    },
    [],
  )

  /** Reabertura manual: o usuário pediu, então roda tudo de novo. */
  const restart = useCallback(() => {
    window.clearTimeout(advanceTimer.current)
    setState({ done: {}, dismissed: false })
    setIndex(0)
    setJustDone(false)
    setActive(true)
  }, [])

  /** Primeira execução: retoma no primeiro passo pendente. */
  const autoStart = useCallback(() => {
    setState((s) => {
      if (s.dismissed) return s
      const i = nextPendingIndex(stepsRef.current, s)
      if (i < 0) return s
      setIndex(i)
      setActive(true)
      return s
    })
  }, [])

  return {
    active,
    step,
    index,
    total: steps.length,
    remaining,
    justDone,
    dismissed: state.dismissed,
    next,
    back,
    close,
    skipAll,
    restart,
    autoStart,
    recordAction,
  }
}

export type TourApi = ReturnType<typeof useTour>
