import { BookOpen, ChevronDown, Pencil, X } from 'lucide-react'
import { useApuntes } from '../store'
import type { Section } from '../types'

interface Props {
  activeId: string
  num: Map<string, string>
  open: boolean
  onClose: () => void
}

function groupChapters(sections: Section[]) {
  const groups: { name: string; items: Section[] }[] = []
  for (const s of sections) {
    const name = s.group ?? ''
    const last = groups[groups.length - 1]
    if (last && last.name === name) last.items.push(s)
    else groups.push({ name, items: [s] })
  }
  return groups
}

/** Capítulo al que pertenece el apartado activo (para desplegarlo en el menú). */
function chapterOf(sections: Section[], id: string) {
  const contains = (s: Section): boolean => s.id === id || s.children.some(contains)
  return sections.find(contains)?.id
}

export function Sidebar({ activeId, num, open, onClose }: Props) {
  const { data, editMode, setEditMode, hasLocalChanges } = useApuntes()
  const activeChapter = chapterOf(data.sections, activeId)

  const link = (s: Section, depth: number) => (
    <a
      href={`#${s.id}`}
      className={`nav__link depth-${depth} ${s.id === activeId ? 'is-active' : ''}`}
      onClick={onClose}
    >
      <span className="nav__num">{num.get(s.id)}</span>
      <span className="nav__text">{s.title}</span>
      {depth === 0 && s.children.length > 0 && <ChevronDown size={14} className={`nav__chev ${s.id === activeChapter ? 'is-open' : ''}`} />}
    </a>
  )

  return (
    <>
      <aside className={`sidebar ${open ? 'is-open' : ''}`} data-search-skip>
        <div className="brand">
          <img className="brand__mark" src="/logo-fibra.png" alt="" width="26" height="46" />
          <div>
            <p className="brand__name">FIBRA <span>MAX</span></p>
            <p className="brand__sub">Apuntes de recepción</p>
          </div>
          <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Cerrar menú"><X size={18} /></button>
        </div>

        <nav className="nav">
          <a href="#inicio" className={`nav__link nav__home ${activeId === 'inicio' ? 'is-active' : ''}`} onClick={onClose}>
            <BookOpen size={15} /> <span className="nav__text">Índice</span>
          </a>
          {groupChapters(data.sections).map((g, gi) => (
            <div key={gi} className="nav__group">
              {g.name && <p className="nav__group-title">{g.name}</p>}
              {g.items.map((ch) => (
                <div key={ch.id}>
                  {link(ch, 0)}
                  {ch.id === activeChapter && ch.children.length > 0 && (
                    <div className="nav__children">{ch.children.map((c) => link(c, 1))}</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <button className={`edit-toggle ${editMode ? 'is-on' : ''}`} onClick={() => setEditMode(!editMode)}>
            <Pencil size={15} />
            <span>{editMode ? 'Salir de edición' : 'Modo edición'}</span>
          </button>
          {hasLocalChanges && <p className="sidebar__note">Hay cambios guardados en este navegador</p>}
        </div>
      </aside>
      {open && <div className="scrim" onClick={onClose} />}
    </>
  )
}
