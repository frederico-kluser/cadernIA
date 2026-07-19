import { Fragment } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup as CommandGroupUI,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import {
  GROUP_LABEL,
  shortcutKeys,
  type Command,
  type CommandGroup,
} from '@/lib/commands'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: Command[]
}

const ORDER: CommandGroup[] = ['escrita', 'pagina', 'contexto', 'exibicao', 'app']

export default function CommandPalette({
  open,
  onOpenChange,
  commands,
}: CommandPaletteProps) {
  const visible = commands.filter((c) => !c.hiddenInPalette && !c.disabled)

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Paleta de comandos"
      description="Busque qualquer ação pelo nome"
      showCloseButton={false}
      className="max-w-lg border-[#44475a] bg-[#282a36] p-0 text-[#f8f8f2]"
    >
      <CommandInput
        placeholder="O que você quer fazer?"
        className="text-[#f8f8f2] placeholder:text-[#6272a4]"
      />
      <CommandList className="max-h-[22rem]">
        <CommandEmpty className="py-8 text-center text-sm text-[#6272a4]">
          Nada com esse nome.
        </CommandEmpty>

        {ORDER.map((group) => {
          const items = visible.filter((c) => c.group === group)
          if (items.length === 0) return null
          return (
            <Fragment key={group}>
              <CommandGroupUI
                heading={GROUP_LABEL[group]}
                className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[#6272a4]"
              >
                {items.map((c) => {
                  const Icon = c.icon
                  return (
                    <CommandItem
                      key={c.id}
                      // O valor buscável inclui a dica: procurar por "formal"
                      // encontra "Reescrever com IA".
                      value={`${c.label} ${c.hint ?? ''}`}
                      onSelect={() => {
                        onOpenChange(false)
                        c.run()
                      }}
                      className="cursor-pointer gap-3 rounded-md data-[selected=true]:bg-[#44475a] data-[selected=true]:text-[#f8f8f2]"
                    >
                      <Icon
                        className="h-4 w-4 flex-none"
                        style={{ color: c.danger ? '#ff5555' : (c.tone ?? '#6272a4') }}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[13px] text-[#f8f8f2]">
                          {c.label}
                        </span>
                        {c.hint && (
                          <span className="truncate text-[11px] text-[#6272a4]">
                            {c.hint}
                          </span>
                        )}
                      </span>
                      {c.shortcut && (
                        <span className="flex flex-none gap-1">
                          {shortcutKeys(c.shortcut).map((k) => (
                            <Kbd
                              key={k}
                              className="border border-[#6272a4]/40 bg-[#21222c] text-[#8be9fd]"
                            >
                              {k}
                            </Kbd>
                          ))}
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroupUI>
            </Fragment>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
