import { ImagePlus, Megaphone, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { uid, useApuntes } from '../store'
import type { Novedad } from '../types'
import { Field } from './editors'
import { RichField } from './RichField'
import { fileToDataUrl } from './Screenshot'
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
const todayIso = () => new Date().toISOString().slice(0, 10)

/** Botón flotante siempre visible con los avisos para recepción. En Modo edición se pueden
 *  añadir, cambiar y borrar novedades (se guardan para todos como el resto de apuntes). */
export function Novedades() {
  const { data, editMode, mutate } = useApuntes()
  const items = useMemo(() => data.novedades ?? [], [data.novedades])
  const sorted = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)), [items])
  const [seen, setSeen] = useState<Set<string>>(readSeen)
  const [open, setOpen] = useState(false)
  const unread = sorted.filter((n) => !seen.has(n.id)).length

  useEffect(() => {
    if (!open || editMode) return
    const ids = sorted.map((n) => n.id)
    saveSeen(ids)
    setSeen(new Set(ids))
  }, [open, editMode, sorted])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const update = (id: string, patch: Partial<Novedad>) => mutate((d) => {
    const n = d.novedades?.find((x) => x.id === id)
    if (n) Object.assign(n, patch)
  })
  const add = () => mutate((d) => {
    d.novedades = [...(d.novedades ?? []), { id: uid('nov'), date: todayIso(), title: 'Nueva novedad', md: '' }]
  })
  const remove = (id: string) => {
    if (!confirm('¿Borrar esta novedad?')) return
    mutate((d) => { d.novedades = (d.novedades ?? []).filter((x) => x.id !== id) })
  }

  if (sorted.length === 0 && !editMode) return null

  return (
    <div className="novedades" data-search-skip>
      {open && (
        <div className={`novedades__panel ${editMode ? 'is-editing' : ''}`} role="dialog" aria-label="Novedades">
          <div className="novedades__head">
            <span><Megaphone size={16} /> Novedades</span>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar novedades"><X size={18} /></button>
          </div>
          <div className="novedades__list">
            {editMode && (
              <button className="btn btn--sm novedades__add" onClick={add}><Plus size={14} /> Añadir novedad</button>
            )}
            {sorted.length === 0 && <p className="muted small">Todavía no hay novedades.</p>}
            {sorted.map((n) => editMode ? (
              <article key={n.id} className="novedades__item novedades__item--edit">
                <div className="field-row">
                  <input
                    className="input"
                    type="date"
                    value={n.date}
                    onChange={(e) => e.target.value && update(n.id, { date: e.target.value })}
                    aria-label="Fecha"
                  />
                  <span className="grow" />
                  <button className="icon-btn icon-btn--danger" title="Borrar novedad" onClick={() => remove(n.id)}><Trash2 size={14} /></button>
                </div>
                <Field value={n.title} placeholder="Título" onCommit={(title) => update(n.id, { title })} />
                <RichField value={n.md} placeholder="Texto de la novedad" onCommit={(md) => update(n.id, { md })} />
                {n.image && <img className="novedades__img" src={n.image} alt="" />}
                <div className="field-row">
                  <label className="btn btn--sm btn--ghost">
                    <ImagePlus size={14} /> {n.image ? 'Cambiar imagen' : 'Añadir imagen'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (!f) return
                        try {
                          update(n.id, { image: await fileToDataUrl(f, 1000) })
                        } catch {
                          alert('No se ha podido leer la imagen.')
                        }
                      }}
                    />
                  </label>
                  {n.image && (
                    <button className="btn btn--sm btn--ghost" onClick={() => confirm('¿Quitar la imagen?') && update(n.id, { image: undefined })}>
                      <Trash2 size={14} /> Quitar imagen
                    </button>
                  )}
                </div>
              </article>
            ) : (
              <article key={n.id} className="novedades__item">
                <p className="novedades__date">{fmt(n.date)}</p>
                <p className="novedades__title">{n.title}</p>
                <Markdown md={n.md} />
                {n.image && <img className="novedades__img" src={n.image} alt={n.title} loading="lazy" />}
              </article>
            ))}
          </div>
        </div>
      )}
      <button className={`novedades__btn ${unread && !editMode ? 'has-unread' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Megaphone size={18} />
        <span>Novedades</span>
        {unread > 0 && !editMode && <span className="novedades__badge">{unread}</span>}
      </button>
    </div>
  )
}
