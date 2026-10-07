import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { clearHighlights, findHits, highlightSupported, paintHighlights, scrollToHit, type SearchHit } from '../search'

interface Props {
  contentRef: RefObject<HTMLElement | null>
  /** Cambia cuando cambia el contenido, para rehacer la búsqueda. */
  contentVersion: unknown
}

export function SearchBar({ contentRef, contentVersion }: Props) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [current, setCurrent] = useState(0)
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)

  // Atajos: Ctrl/Cmd+K o "/" para buscar, como en la mayoría de webs de documentación.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]')
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Debounce corto: buscar en cada tecla en un documento largo se nota.
  useEffect(() => {
    const t = setTimeout(() => {
      const root = contentRef.current
      const next = root ? findHits(root, query) : []
      setHits(next)
      setCurrent(0)
      if (next.length) paintHighlights(next, 0)
      else clearHighlights()
    }, 120)
    return () => clearTimeout(t)
  }, [query, contentRef, contentVersion])

  useEffect(() => clearHighlights, [])

  const go = (i: number) => {
    if (!hits.length) return
    const idx = (i + hits.length) % hits.length
    setCurrent(idx)
    paintHighlights(hits, idx)
    scrollToHit(hits[idx])
  }

  const reset = () => {
    setQuery('')
    setOpen(false)
    clearHighlights()
  }

  const hasQuery = query.trim().length >= 2

  return (
    <div className="search" ref={box} data-search-skip>
      <div className="search__field">
        <Search size={16} className="search__icon" />
        <input
          ref={input}
          type="search"
          placeholder="Buscar en los apuntes…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              // Primer Enter tras escribir: salta a la coincidencia actual; los siguientes avanzan.
              go(open ? current : current + (e.shiftKey ? -1 : 1))
              setOpen(false)
            }
            if (e.key === 'Escape') reset()
          }}
          aria-label="Buscar en los apuntes"
        />
        {hasQuery && (
          <div className="search__nav">
            <span className="search__count">{hits.length ? `${current + 1}/${hits.length}` : '0'}</span>
            <button className="icon-btn" onClick={() => go(current - 1)} disabled={!hits.length} title="Anterior (Shift+Enter)"><ChevronUp size={16} /></button>
            <button className="icon-btn" onClick={() => go(current + 1)} disabled={!hits.length} title="Siguiente (Enter)"><ChevronDown size={16} /></button>
            <button className="icon-btn" onClick={reset} title="Limpiar (Esc)"><X size={16} /></button>
          </div>
        )}
        {!hasQuery && <kbd className="search__kbd">Ctrl K</kbd>}
      </div>

      {open && hasQuery && (
        <div className="search__results">
          {!hits.length ? (
            <p className="search__empty">Sin resultados para «{query}».</p>
          ) : (
            <>
              <p className="search__summary">
                {hits.length} {hits.length === 1 ? 'coincidencia' : 'coincidencias'} en {new Set(hits.map((h) => h.sectionId)).size} apartados
                {!highlightSupported() && ' · actualiza el navegador para ver el resaltado'}
              </p>
              <ul>
                {hits.slice(0, 60).map((h, i) => (
                  <li key={i}>
                    <button className={i === current ? 'is-current' : ''} onClick={() => { go(i); setOpen(false) }}>
                      <span className="search__section">{h.sectionTitle}</span>
                      <span className="search__snippet">
                        {h.snippet.before.length >= 40 && '…'}{h.snippet.before}<mark>{h.snippet.match}</mark>{h.snippet.after}…
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
