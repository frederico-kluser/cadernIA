import { useState } from 'react'
import { CheckCircle2, Ghost, KeyRound, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { KeyStatus } from '@/components/ApiKeyDialog'

interface LockScreenProps {
  initialKey: string
  status: KeyStatus
  error?: string
  /** true enquanto a chave salva está sendo revalidada na abertura */
  checkingStored: boolean
  onSubmit: (key: string) => Promise<boolean>
}

export default function LockScreen({
  initialKey,
  status,
  error,
  checkingStored,
  onSubmit,
}: LockScreenProps) {
  const [draft, setDraft] = useState(initialKey)
  const checking = status === 'checking'

  return (
    <div className="lock-overlay">
      <div className="lock-card fade-in-up">
        <div className="lock-rings" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="ring" />
          ))}
        </div>

        <div className="mb-4 flex items-center gap-2.5">
          <Ghost className="h-8 w-8 text-[#bd93f9]" />
          <div>
            <h1 className="text-xl font-bold text-[#f8f8f2]">
              Cadern<span className="text-[#bd93f9]">IA</span>
            </h1>
            <p className="text-xs text-[#6272a4]">bloco de notas com autocomplete fantasma</p>
          </div>
        </div>

        {checkingStored ? (
          <div className="flex items-center gap-2 py-6 text-sm text-[#8be9fd]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Verificando sua chave salva…
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm leading-relaxed text-[#6272a4]">
              Este bloco usa sua chave da OpenAI para o autocomplete e a
              transcrição Whisper. Ela fica salva apenas neste navegador.
            </p>
            <div className="mb-2 flex items-center gap-2">
              <KeyRound className="h-4 w-4 shrink-0 text-[#bd93f9]" />
              <Input
                type="password"
                placeholder="sk-…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft.trim()) void onSubmit(draft.trim())
                }}
                className="border-[#44475a] bg-[#21222c] font-mono text-[#f8f8f2] placeholder:text-[#6272a4]/60 focus-visible:ring-[#bd93f9]"
              />
            </div>

            <div className="mb-3 flex min-h-6 items-center gap-2 text-sm">
              {checking && (
                <span className="flex items-center gap-1.5 text-[#8be9fd]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Validando…
                </span>
              )}
              {status === 'invalid' && (
                <span className="flex items-center gap-1.5 text-[#ff5555]">
                  <XCircle className="h-4 w-4" /> {error ?? 'Chave inválida'}
                </span>
              )}
              {status === 'idle' && (
                <span className="flex items-center gap-1.5 text-[#6272a4]">
                  <ShieldCheck className="h-4 w-4" /> Insira a chave para desbloquear o bloco
                </span>
              )}
            </div>

            <Button
              onClick={() => void onSubmit(draft.trim())}
              disabled={!draft.trim() || checking}
              className="w-full bg-[#bd93f9] font-semibold text-[#282a36] hover:bg-[#bd93f9]/85"
            >
              {checking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Validar e abrir o bloco
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
