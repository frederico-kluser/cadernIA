import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { validateApiKey } from '@/lib/openai'

export type KeyStatus = 'idle' | 'checking' | 'valid' | 'invalid'

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  status: KeyStatus
  statusMessage?: string
  onSave: (key: string) => void
  onValidate: (key: string) => Promise<boolean>
}

export default function ApiKeyDialog({
  open,
  onOpenChange,
  apiKey,
  status,
  statusMessage,
  onSave,
  onValidate,
}: ApiKeyDialogProps) {
  const [draft, setDraft] = useState(apiKey)

  useEffect(() => {
    if (open) setDraft(apiKey)
  }, [open, apiKey])

  const handleValidateAndSave = async () => {
    const key = draft.trim()
    if (!key) return
    const ok = await onValidate(key)
    if (ok) {
      onSave(key)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#44475a] bg-[#282a36] text-[#f8f8f2] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#bd93f9]">
            <KeyRound className="h-5 w-5" />
            Chave da OpenAI
          </DialogTitle>
          <DialogDescription className="text-[#6272a4]">
            Usada para o autocomplete e para a transcrição Whisper. A chave fica
            salva apenas no seu navegador (localStorage) e nunca sai da sua
            máquina além das chamadas diretas à API da OpenAI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="api-key" className="text-[#8be9fd]">
              sk-…
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Cole sua chave aqui"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleValidateAndSave()
              }}
              className="border-[#44475a] bg-[#21222c] font-mono text-[#f8f8f2] placeholder:text-[#6272a4]/60 focus-visible:ring-[#bd93f9]"
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            {status === 'checking' && (
              <span className="flex items-center gap-1.5 text-[#8be9fd]">
                <Loader2 className="h-4 w-4 animate-spin" /> Validando…
              </span>
            )}
            {status === 'valid' && (
              <span className="flex items-center gap-1.5 text-[#50fa7b]">
                <CheckCircle2 className="h-4 w-4" /> Chave válida
              </span>
            )}
            {status === 'invalid' && (
              <span className="flex items-center gap-1.5 text-[#ff5555]">
                <XCircle className="h-4 w-4" /> {statusMessage ?? 'Chave inválida'}
              </span>
            )}
            {status === 'idle' && (
              <span className="flex items-center gap-1.5 text-[#6272a4]">
                <ShieldCheck className="h-4 w-4" /> A chave será validada antes de salvar
              </span>
            )}
          </div>

          <Button
            onClick={handleValidateAndSave}
            disabled={!draft.trim() || status === 'checking'}
            className="w-full bg-[#bd93f9] font-semibold text-[#282a36] hover:bg-[#bd93f9]/85"
          >
            {status === 'checking' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Validar e salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { validateApiKey }
