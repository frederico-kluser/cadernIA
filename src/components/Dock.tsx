import { CheckCircle2, X } from 'lucide-react'

interface DockProps {
  hasSuggestion: boolean
  onAcceptSuggestion: () => void
  onDismissSuggestion: () => void
}

/**
 * Barra inferior dedicada à sugestão do ghost. Os controles de fonte saíram
 * daqui para o menu (drawer no mobile, "Mais" no desktop): no mobile a dock
 * espremia quatro controles e o Aceitar — a ação principal, e a única sem
 * atalho no toque — ficava reduzido a um ícone.
 */
export default function Dock({
  hasSuggestion,
  onAcceptSuggestion,
  onDismissSuggestion,
}: DockProps) {
  return (
    <div className="dock">
      <span className="dock-status">
        {hasSuggestion ? 'Sugestão pronta' : 'Nenhuma sugestão ativa'}
      </span>

      <button
        title={hasSuggestion ? 'Aceitar sugestão (Tab)' : 'Nenhuma sugestão ativa'}
        onClick={() => {
          if (hasSuggestion) onAcceptSuggestion()
        }}
        disabled={!hasSuggestion}
        className="dock-btn dock-btn-accept"
      >
        <CheckCircle2 className="h-4 w-4" />
        Aceitar
      </button>
      <button
        title={hasSuggestion ? 'Dispensar sugestão (Esc)' : 'Nenhuma sugestão ativa'}
        onClick={() => {
          if (hasSuggestion) onDismissSuggestion()
        }}
        disabled={!hasSuggestion}
        className="dock-btn dock-btn-dismiss"
      >
        <X className="h-4 w-4" />
        Dispensar
      </button>
    </div>
  )
}
