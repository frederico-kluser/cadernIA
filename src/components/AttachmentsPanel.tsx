import { Paperclip, Plus, X } from 'lucide-react'
import type { Attachment } from '@/lib/db'

interface AttachmentsPanelProps {
  attachments: Attachment[]
  onRemove: (id: string) => void
  onAdd: () => void
}

/** Seletor customizado dos arquivos de contexto da página, com remoção fácil. */
export default function AttachmentsPanel({
  attachments,
  onRemove,
  onAdd,
}: AttachmentsPanelProps) {
  return (
    <div className="attach-panel">
      <div className="attach-title">
        <Paperclip className="h-3.5 w-3.5" />
        Contexto desta página ({attachments.length})
      </div>

      {attachments.length === 0 ? (
        <p className="attach-empty">
          Nenhum arquivo anexado. Anexe textos, códigos ou Markdown para a IA
          usar como contexto ao completar esta página.
        </p>
      ) : (
        <ul className="attach-list">
          {attachments.map((a) => (
            <li key={a.id} className="attach-item">
              <Paperclip className="h-3.5 w-3.5 flex-none text-[#ffb86c]" />
              <span className="attach-name" title={a.name}>
                {a.name}
              </span>
              <span className="attach-size">
                {(a.content.length / 1024).toFixed(1)} KB
              </span>
              <button
                className="attach-remove"
                title={`Remover ${a.name}`}
                onClick={() => onRemove(a.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="attach-add" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Anexar arquivo
      </button>
    </div>
  )
}
