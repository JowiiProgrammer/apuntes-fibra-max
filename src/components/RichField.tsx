import { Bold, Italic, Link2, List, ListOrdered, Unlink } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { numbering, useApuntes } from '../store'
import type { Section } from '../types'
import { Markdown } from './Markdown'

type Sel = { start: number; end: number }

const flatten = (list: Section[]): Section[] => list.flatMap((s) => [s, ...flatten(s.children)])

/** Envuelve (o quita) un marcador alrededor de la selección: **negrita**, *cursiva*. */
function toggleWrap(text: string, { start, end }: Sel, mark: string): [string, Sel] {
  const sel = text.slice(start, end)
  const before = text.slice(0, start)
  const after = text.slice(end)
  // Ya estaba envuelto por fuera → se quita.
  if (before.endsWith(mark) && after.startsWith(mark) && !(mark === '*' && before.endsWith('**') && !before.endsWith('***'))) {
    const nb = before.slice(0, -mark.length)
    return [nb + sel + after.slice(mark.length), { start: nb.length, end: nb.length + sel.length }]
  }
  // La selección incluye los marcadores → se quitan.
  if (sel.length >= mark.length * 2 && sel.startsWith(mark) && sel.endsWith(mark)) {
    const inner = sel.slice(mark.length, -mark.length)
    return [before + inner + after, { start, end: start + inner.length }]
  }
  // Sin selección: se pone un texto de ejemplo ya seleccionado para escribir encima.
  const body = sel || 'texto'
  // No se dejan espacios dentro de las marcas (Markdown no lo reconoce).
  const lead = body.match(/^\s*/)?.[0] ?? ''
  const trail = body.match(/\s*$/)?.[0] ?? ''
  const core = body.trim() || 'texto'
  const out = before + lead + mark + core + mark + trail + after
  const s = before.length + lead.length + mark.length
  return [out, { start: s, end: s + core.length }]
}

/** Pone o quita "- " o "1. " al principio de cada línea seleccionada. */
function toggleList(text: string, { start, end }: Sel, ordered: boolean): [string, Sel] {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const nextBreak = text.indexOf('\n', end)
  const lineEnd = nextBreak === -1 ? text.length : nextBreak
  const lines = text.slice(lineStart, lineEnd).split('\n')
  const re = ordered ? /^\d+\.\s/ : /^[-*]\s/
  const allOn = lines.every((l) => re.test(l) || !l.trim())
  const next = lines.map((l, i) => {
    const clean = l.replace(/^(\d+\.|[-*])\s/, '')
    if (allOn) return clean
    if (!l.trim()) return l
    return (ordered ? `${i + 1}. ` : '- ') + clean
  }).join('\n')
  const out = text.slice(0, lineStart) + next + text.slice(lineEnd)
  return [out, { start: lineStart, end: lineStart + next.length }]
}

function insertLink(text: string, { start, end }: Sel, href: string, fallback: string): [string, Sel] {
  const label = text.slice(start, end).trim() || fallback
  const md = `[${label}](${href})`
  return [text.slice(0, start) + md + text.slice(end), { start, end: start + md.length }]
}

/** Quita el formato de enlace de la selección: [texto](url) → texto. */
function removeLinks(text: string, { start, end }: Sel): [string, Sel] {
  const sel = text.slice(start, end)
  const clean = sel.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  return [text.slice(0, start) + clean + text.slice(end), { start, end: start + clean.length }]
}

/**
 * Campo de texto con barra de formato: se selecciona el texto y se pulsa Negrita, Cursiva,
 * lista o enlace (también Ctrl+B / Ctrl+I). Debajo se ve cómo quedará.
 */
export function RichField({ value, onCommit, placeholder }: { value: string; onCommit: (v: string) => void; placeholder?: string }) {
  const { data } = useApuntes()
  const [local, setLocal] = useState(value)
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const lastSel = useRef<Sel>({ start: 0, end: 0 })
  useEffect(() => setLocal(value), [value])

  const sections = useMemo(() => {
    const num = numbering(data.sections)
    return flatten(data.sections).map((s) => ({ id: s.id, label: `${num.get(s.id)} ${s.title}`, title: s.title }))
  }, [data.sections])

  const currentSel = (): Sel => {
    const el = ref.current
    return el && document.activeElement === el ? { start: el.selectionStart, end: el.selectionEnd } : lastSel.current
  }

  // Selección a recolocar tras el cambio (se mantiene hasta que el valor guardado coincide,
  // porque el guardado vuelve a pintar el campo y React mandaría el cursor al final).
  const pendingSel = useRef<Sel | null>(null)
  useLayoutEffect(() => {
    const sel = pendingSel.current
    const el = ref.current
    if (!sel || !el) return
    el.focus()
    el.setSelectionRange(sel.start, sel.end)
    lastSel.current = sel
    if (value === local) pendingSel.current = null
  }, [local, value])

  const apply = (fn: (text: string, sel: Sel) => [string, Sel]) => {
    const [next, sel] = fn(local, currentSel())
    pendingSel.current = sel
    setLocal(next)
    if (next !== value) onCommit(next)
  }

  const commit = () => {
    const el = ref.current
    if (el) lastSel.current = { start: el.selectionStart, end: el.selectionEnd }
    if (local !== value) onCommit(local)
  }

  // onMouseDown + preventDefault: el textarea no pierde la selección al pulsar el botón.
  const btn = (title: string, icon: React.ReactNode, fn: (t: string, s: Sel) => [string, Sel]) => (
    <button type="button" className="rich__btn" title={title} aria-label={title} onMouseDown={(e) => { e.preventDefault(); apply(fn) }}>
      {icon}
    </button>
  )

  return (
    <div className={`rich ${focused ? 'is-focused' : ''}`}>
      <div className="rich__bar">
        {btn('Negrita (Ctrl+B)', <Bold size={15} />, (t, s) => toggleWrap(t, s, '**'))}
        {btn('Cursiva (Ctrl+I)', <Italic size={15} />, (t, s) => toggleWrap(t, s, '*'))}
        <span className="rich__sep" />
        {btn('Lista con puntos', <List size={15} />, (t, s) => toggleList(t, s, false))}
        {btn('Lista numerada', <ListOrdered size={15} />, (t, s) => toggleList(t, s, true))}
        <span className="rich__sep" />
        {btn('Enlace a una web', <Link2 size={15} />, (t, s) => {
          const url = prompt('Pega la dirección de la web (https://…)')?.trim()
          if (!url) return [t, s]
          return insertLink(t, s, /^https?:\/\//.test(url) ? url : `https://${url}`, 'enlace')
        })}
        <select
          className="rich__select"
          value=""
          title="Enlace a un apartado de los apuntes"
          onMouseDown={() => { const el = ref.current; if (el && document.activeElement === el) lastSel.current = { start: el.selectionStart, end: el.selectionEnd } }}
          onChange={(e) => {
            const s = sections.find((x) => x.id === e.target.value)
            if (s) apply((t, sel) => insertLink(t, sel, `#${s.id}`, s.title))
          }}
        >
          <option value="">Enlace a apartado…</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {btn('Quitar enlace', <Unlink size={15} />, removeLinks)}
      </div>
      <textarea
        ref={ref}
        className="input textarea rich__input"
        value={local}
        placeholder={placeholder}
        rows={Math.min(14, Math.max(3, local.split('\n').length + 1))}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commit() }}
        onSelect={(e) => { const el = e.currentTarget; lastSel.current = { start: el.selectionStart, end: el.selectionEnd } }}
        onKeyDown={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return
          const k = e.key.toLowerCase()
          if (k === 'b') { e.preventDefault(); apply((t, s) => toggleWrap(t, s, '**')) }
          if (k === 'i') { e.preventDefault(); apply((t, s) => toggleWrap(t, s, '*')) }
        }}
      />
      {local.trim() && (
        <div className="rich__preview">
          <span className="rich__preview-tag">Así se verá</span>
          <Markdown md={local} />
        </div>
      )}
    </div>
  )
}
