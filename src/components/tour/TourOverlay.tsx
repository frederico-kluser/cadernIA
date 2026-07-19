import { useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import type { TourStep } from '@/lib/tour'

interface TourOverlayProps {
  step: TourStep
  index: number
  total: number
  isTouch: boolean
  justDone: boolean
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

/** Folga ao redor do alvo, para o recorte não encostar no controle. */
const PAD = 6

/**
 * Teto de altura do recorte.
 *
 * Sem isto, um alvo alto — a folha inteira, 796 px — empurra o popover para
 * fora da janela: o Radix tenta posicionar abaixo, colide, inverte para cima e
 * o cartão sai pelo topo. Um recorte dessa altura também cobriria a tela toda,
 * anulando o escurecimento. Destacar a faixa de cima resolve os dois, e é
 * onde a ação acontece de qualquer forma.
 */
const MAX_SPOT_H = 220

function readRect(anchor: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null

  let top = r.top - PAD
  let left = r.left - PAD
  let width = r.width + PAD * 2
  let height = Math.min(r.height + PAD * 2, MAX_SPOT_H)

  // Mantém o recorte dentro da janela, senão o popover ancora no que não se vê.
  if (top < 0) {
    height += top
    top = 0
  }
  if (left < 0) {
    width += left
    left = 0
  }
  height = Math.max(0, Math.min(height, window.innerHeight - top))
  width = Math.max(0, Math.min(width, window.innerWidth - left))
  if (height === 0 || width === 0) return null

  return { top, left, width, height }
}

export default function TourOverlay({
  step,
  index,
  total,
  isTouch,
  justDone,
  onNext,
  onBack,
  onSkip,
}: TourOverlayProps) {
  const [rect, setRect] = useState<Rect | null>(() => readRect(step.anchor))

  const sync = useCallback(() => {
    setRect(readRect(step.anchor))
  }, [step.anchor])

  useEffect(() => {
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    const ro = new ResizeObserver(sync)
    ro.observe(document.body)
    // O alvo pode montar depois do passo (troca de modo, folha entrando).
    const retry = window.setInterval(sync, 400)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
      ro.disconnect()
      window.clearInterval(retry)
    }
  }, [sync])

  const body = isTouch && step.bodyTouch ? step.bodyTouch : step.body
  const action = isTouch && step.actionTouch ? step.actionTouch : step.action
  const isLast = index === total - 1

  const card = (
    <div className="w-[min(90vw,20rem)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6272a4]">
          Passo {index + 1} de {total}
        </span>
        <button
          onClick={onSkip}
          aria-label="Fechar tutorial"
          className="-mr-1 rounded p-1 text-[#6272a4] transition-colors hover:bg-[#44475a] hover:text-[#f8f8f2]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <h3 className="text-sm font-bold text-[#bd93f9]">{step.title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#f8f8f2]/80">{body}</p>

      {action && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-md border px-2.5 py-2 text-[12px] transition-colors ${
            justDone
              ? 'border-[#50fa7b]/40 bg-[#50fa7b]/10 text-[#50fa7b]'
              : 'border-[#44475a] bg-[#21222c] text-[#8be9fd]'
          }`}
        >
          {justDone ? (
            <>
              <Check className="h-3.5 w-3.5 flex-none" />
              <span className="font-semibold">Feito.</span>
            </>
          ) : (
            <>
              <span className="flex-none text-[#6272a4]">▸</span>
              <span className="flex-1">{action}</span>
              {step.keys && !isTouch && (
                <span className="flex flex-none gap-1">
                  {step.keys.map((k) => (
                    <Kbd
                      key={k}
                      className="border border-[#6272a4]/40 bg-[#282a36] text-[#f8f8f2]"
                    >
                      {k}
                    </Kbd>
                  ))}
                </span>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between gap-2">
        <button
          onClick={onSkip}
          className="rounded px-1.5 py-1 text-[12px] text-[#6272a4] transition-colors hover:text-[#f8f8f2]"
        >
          Pular tutorial
        </button>
        <div className="flex items-center gap-1.5">
          {index > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-7 px-2.5 text-[12px] text-[#6272a4] hover:bg-[#44475a] hover:text-[#f8f8f2]"
            >
              Voltar
            </Button>
          )}
          <Button
            size="sm"
            onClick={onNext}
            className="h-7 bg-[#bd93f9] px-3 text-[12px] font-semibold text-[#282a36] hover:bg-[#bd93f9]/85"
          >
            {isLast ? 'Concluir' : action ? 'Pular este passo' : 'Próximo'}
          </Button>
        </div>
      </div>
    </div>
  )

  // Sem âncora na tela: vira um cartão centrado, sem recorte.
  if (!rect) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/55">
        <div className="pointer-events-auto rounded-xl border border-[#44475a] bg-[#282a36] p-4 shadow-2xl shadow-black/60">
          {card}
        </div>
      </div>
    )
  }

  return (
    <>
      {/*
        O recorte não captura ponteiro: o usuário precisa conseguir clicar no
        controle destacado — é o passo se concluindo. O escurecimento é só
        orientação visual.
      */}
      <div
        className="pointer-events-none fixed z-[55] rounded-lg ring-2 ring-[#bd93f9] transition-all duration-200"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow: '0 0 0 9999px rgba(10, 10, 16, 0.62)',
        }}
      />
      <Popover open modal={false}>
        <PopoverAnchor asChild>
          <div
            className="pointer-events-none fixed z-[55]"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          side={step.placement ?? 'bottom'}
          align="center"
          sideOffset={10}
          collisionPadding={12}
          // O foco fica onde está: o usuário vai digitar, apertar Tab, falar.
          onOpenAutoFocus={(e) => e.preventDefault()}
          // Clicar fora É a ação ensinada — não pode fechar a dica.
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="z-[60] w-auto border-[#44475a] bg-[#282a36] p-4 shadow-2xl shadow-black/60"
        >
          {card}
        </PopoverContent>
      </Popover>
    </>
  )
}
