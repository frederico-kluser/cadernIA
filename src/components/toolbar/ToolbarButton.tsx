import { forwardRef, type ReactNode } from 'react'
import { Kbd } from '@/components/ui/kbd'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { shortcutKeys, type Shortcut } from '@/lib/commands'

interface ToolbarButtonProps {
  /**
   * Nome acessível. SEMPRE definido, independente de haver rótulo visível ou
   * tooltip — o nome não pode depender de o tooltip ter sido renderizado.
   */
  label: string
  icon: ReactNode
  onClick: () => void
  /**
   * Texto visível ao lado do ícone. Reservado para ações sem símbolo
   * estabelecido (a exceção que a HIG abre com "except for actions like edit").
   * Quando presente, o nome acessível PRECISA começar por ele — WCAG 2.5.3
   * Label in Name, nível A: o nome deve conter o texto visível.
   */
  showLabel?: boolean
  /** Frase de apoio no tooltip. Teto recomendado de 60–75 caracteres. */
  hint?: string
  shortcut?: Shortcut
  disabled?: boolean
  active?: boolean
  tone?: string
  badge?: ReactNode
  className?: string
  'data-tour'?: string
}

/**
 * Botão da barra de ferramentas.
 *
 * Substitui o `title=` nativo por tooltip do Radix. A troca não é gratuita:
 * `title=` é explicitamente ISENTO do WCAG 1.4.13, e o tooltip customizado
 * entra no escopo do critério, criando três obrigações de nível AA —
 * dispensável, focalizável e persistente. O Radix atende as três de fábrica
 * (Esc fecha, o ponteiro pode entrar no tooltip, não há timer de auto-ocultar);
 * o que não se pode fazer é regredir isso.
 *
 * O motivo da troca não é conformidade — `title=` passaria numa auditoria
 * estrita, via técnica H65 — e sim que o `title=` nativo falha para toque,
 * teclado e leitores de tela (MDN), e que o rótulo revelado só no hover é
 * exatamente o padrão que a NN/g desaconselha.
 */
const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton(
    {
      label,
      icon,
      onClick,
      showLabel,
      hint,
      shortcut,
      disabled,
      active,
      tone,
      badge,
      className,
      ...rest
    },
    ref,
  ) {
    const btn = (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active === undefined ? undefined : active}
        data-tour={rest['data-tour']}
        className={`relative flex h-9 flex-none items-center gap-1.5 rounded-lg px-2 text-sm transition-colors disabled:pointer-events-none disabled:opacity-30 ${
          showLabel ? 'min-w-9' : 'w-9 justify-center'
        } ${
          active
            ? 'bg-[#bd93f9] text-[#282a36]'
            : 'text-[#f8f8f2] hover:bg-[#44475a]'
        } ${className ?? ''}`}
        style={!active && tone ? { color: tone } : undefined}
      >
        {icon}
        {showLabel && (
          <span className="whitespace-nowrap pr-0.5 text-[13px]">{label}</span>
        )}
        {badge}
      </button>
    )

    return (
      // 350 ms é escolha de projeto, não citação: a HIG atual não publica
      // atraso nenhum para help tags (busca por "delay"/"second" na página
      // volta zero). O padrão do shadcn aqui é 0, que dispara tooltip em
      // qualquer passagem de mouse pela barra.
      <Tooltip delayDuration={350}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          className="border border-[#44475a] bg-[#21222c] text-[#f8f8f2]"
        >
          <span className="flex items-center gap-2">
            <span className="flex flex-col">
              <span className="text-[12px] font-semibold">{label}</span>
              {hint && (
                <span className="text-[11px] text-[#6272a4]">{hint}</span>
              )}
            </span>
            {shortcut && (
              <span className="flex flex-none gap-1">
                {shortcutKeys(shortcut).map((k) => (
                  <Kbd
                    key={k}
                    className="border border-[#6272a4]/40 bg-[#282a36] text-[#8be9fd]"
                  >
                    {k}
                  </Kbd>
                ))}
              </span>
            )}
          </span>
        </TooltipContent>
      </Tooltip>
    )
  },
)

export default ToolbarButton
