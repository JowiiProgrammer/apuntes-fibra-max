import { Check, Download, Menu, Plus, Printer, Redo2, RotateCcw, Undo2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Novedades } from './components/Novedades'
import { SearchBar } from './components/SearchBar'
import { SectionView } from './components/SectionView'
import { Sidebar } from './components/Sidebar'
import { numbering, useApuntes } from './store'
import { PasswordDialog } from './components/PasswordDialog'
import type { Apuntes, Section } from './types'

const flatten = (list: Section[]): Section[] => list.flatMap((s) => [s, ...flatten(s.children)])

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState('inicio')
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      // El activo es el último apartado cuyo inicio ya ha pasado bajo la barra superior.
      let current = 'inicio'
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 140) current = id
      }
      setActive(current)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [ids])
  return active
}

function download(data: Apuntes) {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'apuntes.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function App() {
  const { data, editMode, saveState, saveMessage, retrySave, replaceAll, addSection, undo, redo, canUndo, canRedo } = useApuntes()

  // Ctrl+Z / Ctrl+Y (o Ctrl+Mayús+Z) en Modo edición, cuando no se está escribiendo en un campo
  // (dentro de un campo, Ctrl+Z deshace lo que se está escribiendo, como siempre).
  useEffect(() => {
    if (!editMode) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const t = e.target
      if (t instanceof HTMLElement && t.closest('input, textarea, select, [contenteditable="true"]')) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editMode, undo, redo])
  const contentRef = useRef<HTMLElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const num = useMemo(() => numbering(data.sections), [data.sections])
  const all = useMemo(() => flatten(data.sections), [data.sections])
  const ids = useMemo(() => all.map((s) => s.id), [all])
  const activeId = useActiveSection(ids)
  // Referencia estable: si cambiara en cada render (p. ej. al hacer scroll) la búsqueda se reiniciaría.
  const contentVersion = useMemo(() => [data, editMode], [data, editMode])
  const pendingCount = all.filter((s) => s.blocks.some((b) => b.type === 'pending')).length

  const importFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Apuntes
      if (!Array.isArray(parsed.sections) || !Array.isArray(parsed.priceTables)) throw new Error('formato')
      replaceAll(parsed)
    } catch {
      alert('El archivo no es un apuntes.json válido.')
    }
  }

  return (
    <div className={`app ${editMode ? 'is-editing' : ''}`}>
      <Sidebar activeId={activeId} num={num} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="main">
        <div className="topbar" data-search-skip>
          <button className="icon-btn topbar__menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu size={20} /></button>
          <SearchBar contentRef={contentRef} contentVersion={contentVersion} />
          <button className="icon-btn topbar__print" onClick={() => window.print()} title="Imprimir / guardar PDF"><Printer size={18} /></button>
        </div>

        {editMode && (
          <div className="edit-banner" data-search-skip>
            <div>
              <strong>Modo edición.</strong> Cada cambio se guarda solo y lo ve todo el mundo.{' '}
              <span className={`save-state save-state--${saveState}`}>
                {saveState === 'pending' && 'Cambios sin guardar…'}
                {saveState === 'saving' && 'Guardando…'}
                {saveState === 'saved' && <><Check size={13} /> Guardado para todos</>}
                {saveState === 'error' && 'No se ha guardado'}
              </span>
            </div>
            <div className="edit-banner__actions">
              <button className="btn btn--sm" onClick={undo} disabled={!canUndo} title="Deshacer el último cambio (Ctrl+Z)"><Undo2 size={14} /> Deshacer</button>
              <button className="btn btn--sm btn--ghost" onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Y)"><Redo2 size={14} /> Rehacer</button>
              <button className="btn btn--sm btn--ghost" onClick={() => download(data)} title="Descarga una copia de seguridad"><Download size={14} /> Copia</button>
              <label className="btn btn--sm btn--ghost">
                <Upload size={14} /> Importar
                <input type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
              </label>
            </div>
          </div>
        )}
        {editMode && saveState === 'error' && (
          <div className="alert" data-search-skip>
            No se ha podido guardar: {saveMessage}{' '}
            <button className="btn btn--sm" onClick={retrySave}><RotateCcw size={14} /> Reintentar</button>
          </div>
        )}

        <main ref={contentRef} className="content">
          <section id="inicio" className="hero">
            <p className="eyebrow" data-search-skip>Recepción · Fibra Max</p>
            <h1>{data.title}</h1>
            <p className="hero__lead">
              Todo lo que hay que saber en recepción: cuotas, altas y bajas, caja, pedidos y tareas de cada turno.
              Usa el buscador (<kbd>Ctrl</kbd> + <kbd>K</kbd>) para encontrar cualquier palabra.
            </p>
            <div className="stats" data-search-skip>
              <div><strong>{data.sections.length}</strong><span>capítulos</span></div>
              <div><strong>{all.length - data.sections.length}</strong><span>apartados</span></div>
              <div><strong>{pendingCount}</strong><span>pendientes de redactar</span></div>
            </div>

            <div className="index-grid" data-search-skip>
              {data.sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="index-card">
                  <span className="index-card__num">{num.get(s.id)}</span>
                  <span className="index-card__body">
                    {s.group && <span className="index-card__group">{s.group}</span>}
                    <span className="index-card__title">{s.title}</span>
                    {s.children.length > 0 && <span className="index-card__meta">{s.children.length} {s.children.length === 1 ? 'apartado' : 'apartados'}</span>}
                  </span>
                </a>
              ))}
            </div>
          </section>

          {data.sections.map((s, i) => (
            <SectionView key={s.id} section={s} depth={0} num={num} index={i} siblings={data.sections.length} />
          ))}

          {editMode && (
            <button className="btn add-chapter" data-search-skip onClick={() => addSection(null, 'Nuevo capítulo', data.sections.at(-1)?.group)}>
              <Plus size={16} /> Añadir capítulo
            </button>
          )}

          <footer className="foot" data-search-skip>Fibra Max · Apuntes internos de recepción</footer>
        </main>
      </div>
      <Novedades />
      <PasswordDialog />
    </div>
  )
}
