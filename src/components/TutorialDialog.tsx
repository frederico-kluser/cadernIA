import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TutorialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFinish: () => void
}

const STEPS = [
  {
    title: 'Bem-vindo ao CadernIA',
    description:
      'Seu bloco de notas com IA. Insira sua chave OpenAI para desbloquear o autocomplete, o ditado e o editor inteligente.',
  },
  {
    title: 'Escreva com o autocomplete fantasma',
    description:
      'Comece a escrever e a IA sugere continuações em cinza. No computador, pressione Tab para aceitar. No celular, use o botão flutuante.',
  },
  {
    title: 'Fale para escrever ou editar',
    description:
      'Toque no microfone para ditar texto. Você também pode dar comandos de voz como "apague a última frase" ou "troque X por Y".',
  },
  {
    title: 'Edite com IA',
    description:
      'Use o botão de varinha para pedir alterações no texto todo ou na seleção. Você vê uma prévia antes de aplicar.',
  },
  {
    title: 'Pronto para anotar',
    description:
      'Crie páginas, anexe arquivos de contexto, exporte em Markdown e ajuste o tamanho da fonte quando quiser.',
  },
]

export default function TutorialDialog({ open, onOpenChange, onFinish }: TutorialDialogProps) {
  const [step, setStep] = useState(0)

  const handleNext = () => {
    if (step >= STEPS.length - 1) {
      onFinish()
      setStep(0)
    } else {
      setStep((s) => s + 1)
    }
  }

  const handleSkip = () => {
    onFinish()
    setStep(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border-[#44475a] bg-[#282a36] text-[#f8f8f2] sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-[#bd93f9]">{STEPS[step].title}</DialogTitle>
          <DialogDescription className="text-[#6272a4]">
            {STEPS[step].description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${
                i === step ? 'bg-[#bd93f9]' : 'bg-[#44475a]'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-[#6272a4] hover:bg-[#44475a] hover:text-[#f8f8f2]"
          >
            Pular tutorial
          </Button>
          <Button
            onClick={handleNext}
            className="bg-[#bd93f9] font-semibold text-[#282a36] hover:bg-[#bd93f9]/85"
          >
            {step === STEPS.length - 1 ? 'Começar a usar' : 'Próximo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
