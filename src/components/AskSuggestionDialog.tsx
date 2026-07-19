import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface AskSuggestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: string | null
  loading: boolean
  onGenerate: (briefing: string) => void
  onInsert: () => void
}

export default function AskSuggestionDialog({
  open,
  onOpenChange,
  preview,
  loading,
  onGenerate,
  onInsert,
}: AskSuggestionDialogProps) {
  const [briefing, setBriefing] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setBriefing('')
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open])

  const canGenerate = Boolean(briefing.trim()) && !loading
  const canInsert = Boolean(preview?.trim()) && !loading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-[#44475a] bg-[#282a36] text-[#f8f8f2] sm:max-w-lg"
        // sem isso o Radix devolve o foco ao botão da toolbar e rouba o foco do editor
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[#bd93f9]">Pedir sugestão</DialogTitle>
          <DialogDescription className="text-[#6272a4]">
            Descreva o texto que você quer. A IA escreve considerando o que já está na
            página e os arquivos anexados, e insere no cursor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Textarea
            ref={textareaRef}
            maxLength={2000}
            placeholder="Ex.: escreva um parágrafo sobre energia solar no Brasil; faça uma introdução para este texto; liste 5 argumentos a favor..."
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canGenerate) {
                e.preventDefault()
                onGenerate(briefing)
              }
            }}
            className="min-h-[90px] resize-none border-[#44475a] bg-[#21222c] text-[#f8f8f2] placeholder:text-[#6272a4] focus-visible:ring-[#bd93f9]"
          />

          <Button
            onClick={() => onGenerate(briefing)}
            disabled={!canGenerate}
            className="w-full bg-[#8be9fd] font-semibold text-[#282a36] hover:bg-[#8be9fd]/85 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Escrevendo…
              </>
            ) : (
              'Gerar sugestão'
            )}
          </Button>

          {preview && (
            <div className="grid gap-1">
              <span className="text-xs font-semibold text-[#6272a4]">Sugestão</span>
              <div className="max-h-[240px] overflow-auto rounded-md border border-[#44475a] bg-[#21222c] p-3 text-sm whitespace-pre-wrap text-[#f8f8f2]">
                {preview}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[#6272a4] hover:bg-[#44475a] hover:text-[#f8f8f2]"
          >
            Cancelar
          </Button>
          <Button
            onClick={onInsert}
            disabled={!canInsert}
            className="bg-[#50fa7b] font-semibold text-[#282a36] hover:bg-[#50fa7b]/85 disabled:opacity-50"
          >
            Inserir no cursor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
