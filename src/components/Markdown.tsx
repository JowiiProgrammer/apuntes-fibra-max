import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// react-markdown no ejecuta HTML crudo, así que el contenido editado es seguro de renderizar.
export function Markdown({ md }: { md: string }) {
  if (!md.trim()) return null
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
    </div>
  )
}
