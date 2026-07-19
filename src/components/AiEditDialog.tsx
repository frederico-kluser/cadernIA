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

interface AiEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialInstruction?: string
  hasSelection: boolean
  preview: string | null
  loading: boolean
  onGenerate: (instruction: string, onlySelection: boolean) => void
  onApply: () => void
}

export default function AiEditDialog({
  open,
  onOpenChange,
  initialInstruction = '',
  hasSelection,
  preview,
  loading,
  onGenerate,
  onApply,
}: AiEditDialogProps) {
  const [instruction, setInstruction] = useState(initialInstruction)
  const [onlySelection, setOnlySelection] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setInstruction(initialInstruction)
      setOnlySelection(hasSelection)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open, initialInstruction, hasSelection])

  const canApply = Boolean(preview && !loading)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#44475a] bg-[#282a36] text-[#f8f8f2] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#bd93f9]">Editar com IA</DialogTitle>
          <DialogDescription className="text-[#6272a4]">
            Descreva o que você quer alterar no texto. Você vê uma prévia antes de aplicar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Textarea
            ref={textareaRef}
            placeholder="Ex.: resuma o texto, corrija a ortografia, traduza para inglês..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="min-h-[80px] resize-none border-[#44475a] bg-[#21222c] text-[#f8f8f2] placeholder:text-[#6272a4] focus-visible:ring-[#bd93f9]"
          />

          {hasSelection && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#f8f8f2]">
              <input
                type="checkbox"
                checked={onlySelection}
                onChange={(e) => setOnlySelection(e.target.checked)}
                className="h-4 w-4 accent-[#bd93f9]"
              />
              Aplicar apenas na seleção
            </label>
          )}

          <Button
            onClick={() => onGenerate(instruction, onlySelection)}
            disabled={!instruction.trim() || loading}
            className="w-full bg-[#8be9fd] font-semibold text-[#282a36] hover:bg-[#8be9fd]/85 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando prévia…
              </>
            ) : (
              'Gerar prévia'
            )}
          </Button>

          {preview && (
            <div className="grid gap-1">
              <span className="text-xs font-semibold text-[#6272a4]">Prévia</span>
              <div className="max-h-[200px] overflow-auto rounded-md border border-[#44475a] bg-[#21222c] p-3 text-sm whitespace-pre-wrap text-[#f8f8f2]">
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
            onClick={onApply}
            disabled={!canApply}
            className="bg-[#50fa7b] font-semibold text-[#282a36] hover:bg-[#50fa7b]/85 disabled:opacity-50"
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
