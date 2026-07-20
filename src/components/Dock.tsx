import { CheckCircle2, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const FONT_OPTIONS = [
  { id: 'fira-code', label: 'Fira Code' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono' },
  { id: 'cascadia-code', label: 'Cascadia Code' },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono' },
  { id: 'source-code-pro', label: 'Source Code Pro' },
  { id: 'ubuntu-mono', label: 'Ubuntu Mono' },
]

export const FONT_FAMILY_CSS: Record<string, string> = {
  'fira-code': "'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
  'jetbrains-mono': "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  'cascadia-code': "'Cascadia Code', ui-monospace, SFMono-Regular, Menlo, monospace",
  'ibm-plex-mono': "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  'source-code-pro': "'Source Code Pro', ui-monospace, SFMono-Regular, Menlo, monospace",
  'ubuntu-mono': "'Ubuntu Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
}

interface DockProps {
  fontSize: number
  onFontSizeChange: (size: number) => void
  fontFamily: string
  onFontFamilyChange: (family: string) => void
  hasSuggestion: boolean
  onAcceptSuggestion: () => void
  onDismissSuggestion: () => void
}

export default function Dock({
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
  hasSuggestion,
  onAcceptSuggestion,
  onDismissSuggestion,
}: DockProps) {
  return (
    <div className="dock">
      {/* Família da fonte */}
      <Select value={fontFamily} onValueChange={onFontFamilyChange}>
        <SelectTrigger className="h-7 w-[130px] border-[#44475a] bg-[#282a36] text-xs text-[#f1fa8c]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-[#44475a] bg-[#282a36] text-[#f8f8f2]">
          {FONT_OPTIONS.map((f) => (
            <SelectItem
              key={f.id}
              value={f.id}
              className="text-xs focus:bg-[#44475a] focus:text-[#f8f8f2]"
            >
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="dock-sep" />

      {/* Tamanho da fonte */}
      <button
        title="Diminuir fonte"
        onClick={() => onFontSizeChange(Math.max(13, fontSize - 1))}
        className="dock-btn"
      >
        A−
      </button>
      <span className="dock-size">{fontSize}</span>
      <button
        title="Aumentar fonte"
        onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
        className="dock-btn"
      >
        A+
      </button>

      <div className="dock-sep" />

      {/* Aceitar / dispensar sugestão */}
      <button
        title={hasSuggestion ? 'Aceitar sugestão (Tab)' : 'Nenhuma sugestão ativa'}
        onClick={() => {
          if (hasSuggestion) onAcceptSuggestion()
        }}
        disabled={!hasSuggestion}
        className="dock-btn dock-btn-accept"
      >
        <CheckCircle2 className="h-4 w-4" />
        <span className="hidden sm:inline">Aceitar</span>
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
        <span className="hidden sm:inline">Dispensar</span>
      </button>
    </div>
  )
}
