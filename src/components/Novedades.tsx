import { Megaphone, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Novedad } from '../types'
import { Markdown } from './Markdown'

const KEY = 'fm-novedades-vistas'

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveSeen(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* sin almacenamiento: simplemente se volverán a marcar como nuevas */
  }
}

const fmt = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

/** Botón flotante siempre visible con los avisos para recepción. Marca cuántos no se han leído. */
export function Novedades({ items }: { items: Novedad[] }) {
  const sorted = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)), [items])
  const [seen, setSeen] = useState<Set<string>>(readSeen)
  const [open, setOpen] = useState(false)
  const unread = sorted.filter((n) => !seen.has(n.id)).length

  useEffect(() => {
    if (!open) return
    const ids = sorted.map((n) => n.id)
    saveSeen(ids)
    setSeen(new Set(ids))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, sorted])

  if (sorted.length === 0) return null

  return (
    <div className="novedades" data-search-skip>
      {open && (
        <div className="novedades__panel" role="dialog" aria-label="Novedades">
          <div className="novedades__head">
            <span><Megaphone size={16} /> Novedades</span>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar novedades"><X size={18} /></button>
          </div>
          <div className="novedades__list">
            {sorted.map((n) => (
              <article key={n.id} className="novedades__item">
                <p className="novedades__date">{fmt(n.date)}</p>
                <p className="novedades__title">{n.title}</p>
                <Markdown md={n.md} />
              </article>
            ))}
          </div>
        </div>
      )}
      <button className={`novedades__btn ${unread ? 'has-unread' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Megaphone size={18} />
        <span>Novedades</span>
        {unread > 0 && <span className="novedades__badge">{unread}</span>}
      </button>
    </div>
  )
}
