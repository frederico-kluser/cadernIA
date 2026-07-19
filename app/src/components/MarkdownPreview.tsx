import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface MarkdownPreviewProps {
  source: string
}

export default function MarkdownPreview({ source }: MarkdownPreviewProps) {
  return (
    <div className="md-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {source.trim() ? source : '*Nada para visualizar ainda… escreva algo em Markdown.*'}
      </ReactMarkdown>
    </div>
  )
}
