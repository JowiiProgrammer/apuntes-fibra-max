import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useApuntes } from '../store'
import type { Section } from '../types'
import { BlockView } from './blocks'
import { AddBlockMenu, BlockEditor, Field } from './editors'
import { fmtDate } from './PriceTable'

interface Props {
  section: Section
  depth: number
  num: Map<string, string>
  index: number
  siblings: number
}

export function SectionView({ section, depth, num, index, siblings }: Props) {
  const { editMode, mutate, moveSection, removeSection, addSection } = useApuntes()
  const n = num.get(section.id) ?? ''
  const isChapter = depth === 0
  const Heading = isChapter ? 'h2' : depth === 1 ? 'h3' : 'h4'
  const patch = (p: Partial<Section>) =>
    mutate((d) => {
      const walk = (list: Section[]): boolean => list.some((s) => (s.id === section.id ? (Object.assign(s, p), true) : walk(s.children)))
      walk(d.sections)
    }, section.id)

  return (
    <section
      id={section.id}
      className={isChapter ? 'chapter' : `subsection depth-${depth}`}
      data-section-id={section.id}
      data-section-title={`${n} ${section.title}`}
    >
      <header className={isChapter ? 'chapter__head' : 'subsection__head'}>
        <span className={isChapter ? 'chapter__num' : 'subsection__num'} data-search-skip>{n}</span>
        <div className="grow">
          {editMode ? (
            <div className="stack" data-search-skip>
              <Field className={isChapter ? 'input--h2' : 'input--h3'} value={section.title} aria-label="Título" onCommit={(title) => patch({ title })} />
              <Field value={section.lead ?? ''} placeholder="Entradilla (opcional)" onCommit={(lead) => patch({ lead: lead || undefined })} />
              {isChapter && <Field className="input--sm" value={section.group ?? ''} placeholder="Grupo en el menú (ej. Caja)" onCommit={(group) => patch({ group: group || undefined })} />}
            </div>
          ) : (
            <>
              <Heading className={isChapter ? 'chapter__title' : 'subsection__title'}>{section.title}</Heading>
              {section.lead && <p className="lead">{section.lead}</p>}
            </>
          )}
        </div>
        {editMode ? (
          <div className="section-tools" data-search-skip>
            <button className="icon-btn" title="Subir" disabled={index === 0} onClick={() => moveSection(section.id, -1)}><ArrowUp size={15} /></button>
            <button className="icon-btn" title="Bajar" disabled={index === siblings - 1} onClick={() => moveSection(section.id, 1)}><ArrowDown size={15} /></button>
            <button
              className="icon-btn icon-btn--danger"
              title="Borrar apartado"
              onClick={() => confirm(`¿Borrar «${section.title}» y todo su contenido?`) && removeSection(section.id)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ) : (
          section.updatedAt && isChapter && <span className="updated" data-search-skip>Actualizado {fmtDate(section.updatedAt)}</span>
        )}
      </header>

      {(section.blocks.length > 0 || editMode) && (
        <div className="blocks">
          {section.blocks.map((b, i) =>
            editMode ? (
              <BlockEditor key={b.id} sectionId={section.id} block={b} index={i} total={section.blocks.length} />
            ) : (
              <BlockView key={b.id} block={b} />
            ),
          )}
          {editMode && <AddBlockMenu sectionId={section.id} />}
        </div>
      )}

      {section.children.map((c, i) => (
        <SectionView key={c.id} section={c} depth={depth + 1} num={num} index={i} siblings={section.children.length} />
      ))}

      {editMode && depth < 2 && (
        <button className="btn btn--ghost btn--sm add-sub" data-search-skip onClick={() => addSection(section.id, 'Nuevo apartado')}>
          <Plus size={14} /> Añadir apartado dentro de «{section.title}»
        </button>
      )}
    </section>
  )
}
