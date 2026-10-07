import { Download, Menu, Plus, Printer, RotateCcw, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { SectionView } from './components/SectionView'
import { Sidebar } from './components/Sidebar'
import { numbering, useApuntes } from './store'
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
  const { data, editMode, hasLocalChanges, outdatedBase, saveError, replaceAll, resetLocal, addSection } = useApuntes()
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
              <strong>Modo edición.</strong> Los cambios se guardan automáticamente en este navegador.
              Para que lleguen a todos, exporta el archivo y súbelo al proyecto.
            </div>
            <div className="edit-banner__actions">
              <button className="btn btn--sm" onClick={() => download(data)}><Download size={14} /> Exportar</button>
              <label className="btn btn--sm btn--ghost">
                <Upload size={14} /> Importar
                <input type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
              </label>
              {hasLocalChanges && (
                <button className="btn btn--sm btn--ghost" onClick={() => confirm('¿Descartar todos los cambios locales y volver a la versión publicada?') && resetLocal()}>
                  <RotateCcw size={14} /> Descartar cambios
                </button>
              )}
            </div>
          </div>
        )}
        {saveError && <div className="alert" data-search-skip>No se pudo guardar: el almacenamiento del navegador está lleno (suele ser por capturas grandes). Exporta para no perder cambios.</div>}
        {outdatedBase && <div className="alert alert--info" data-search-skip>Hay una versión publicada más nueva que tus cambios locales. Exporta tus cambios y descártalos para ver la nueva.</div>}

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
                    {s.children.length > 0 && <span className="index-card__meta">{s.children.length} apartados</span>}
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
    </div>
  )
}
