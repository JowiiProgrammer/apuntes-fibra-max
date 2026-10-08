import { AlertTriangle, Check, Copy, Info, Lightbulb, MessageSquareQuote, MessageSquareText, OctagonAlert, PencilLine } from 'lucide-react'
import { useState } from 'react'
import type { Block, CalloutVariant } from '../types'
import { Markdown } from './Markdown'
import { PriceTableView } from './PriceTable'
import { ScreenshotView } from './Screenshot'

export const CALLOUTS: Record<CalloutVariant, { label: string; icon: typeof Info }> = {
  info: { label: 'Info', icon: Info },
  tip: { label: 'Consejo', icon: Lightbulb },
  warning: { label: 'Atención', icon: AlertTriangle },
  danger: { label: 'Importante', icon: OctagonAlert },
}

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      return <Markdown md={block.md} />

    case 'callout': {
      const { label, icon: Icon } = CALLOUTS[block.variant]
      return (
        <aside className={`callout callout--${block.variant}`}>
          <Icon size={18} className="callout__icon" />
          <div>
            <p className="callout__title">{block.title || label}</p>
            <Markdown md={block.md} />
          </div>
        </aside>
      )
    }

    case 'speech':
      return (
        <div className="speech">
          <div className="speech__tag"><MessageSquareQuote size={14} /> {block.title || 'Guion'}</div>
          <Markdown md={block.md} />
        </div>
      )

    case 'steps':
      return (
        <ol className="steps" style={{ counterReset: `step ${(block.start ?? 1) - 1}` }}>
          {block.items.map((s, i) => (
            <li key={i}>
              <p className="steps__title">{s.title}</p>
              <Markdown md={s.md} />
            </li>
          ))}
        </ol>
      )

    case 'checklist':
      return <Checklist title={block.title} items={block.items} />

    case 'prices':
      return <PriceTableView tableId={block.tableId} />

    case 'screenshot':
      return <ScreenshotView block={block} />

    case 'message':
      return <MessageBlock title={block.title} text={block.text} />

    case 'pending':
      return (
        <div className="pending">
          <PencilLine size={16} />
          <span>{block.note || 'Contenido pendiente de redactar.'}</span>
        </div>
      )
  }
}

// Los ticks son de uso puntual (repasar el turno): no se guardan.
function Checklist({ title, items }: { title?: string; items: string[] }) {
  const [done, setDone] = useState<Set<number>>(new Set())
  const real = items.filter((t) => t.trim())
  return (
    <div className="checklist">
      {title && <p className="checklist__title">{title}</p>}
      {real.length === 0 ? (
        <p className="muted small">Sin tareas todavía.</p>
      ) : (
        <ul>
          {real.map((t, i) => (
            <li key={i}>
              <label className={done.has(i) ? 'is-done' : ''}>
                <input
                  type="checkbox"
                  checked={done.has(i)}
                  onChange={() => setDone((prev) => {
                    const next = new Set(prev)
                    if (next.has(i)) next.delete(i)
                    else next.add(i)
                    return next
                  })}
                />
                <span>{t}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Copia al portapapeles; si el navegador lo bloquea, usa un textarea temporal. */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

// Los [huecos] entre corchetes se resaltan para que se vea qué hay que rellenar antes de enviar.
function MessageBlock({ title, text }: { title?: string; text: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    if (await copyText(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }
  return (
    <div className="msg">
      <div className="msg__head">
        <span className="msg__tag"><MessageSquareText size={14} /> {title || 'Mensaje'}</span>
        <button className="btn btn--sm btn--ghost" onClick={onCopy} data-search-skip>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="msg__body">
        {text.split(/(\[[^\]]+\])/g).map((part, i) =>
          /^\[[^\]]+\]$/.test(part) ? <span key={i} className="ph">{part}</span> : part,
        )}
      </p>
    </div>
  )
}
