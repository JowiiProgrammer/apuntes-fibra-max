import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useApuntes } from '../store'
import type { Block, BlockType, CalloutVariant } from '../types'
import { CALLOUTS } from './blocks'
import { PriceTableView } from './PriceTable'
import { RichField } from './RichField'
import { ScreenshotEditor } from './Screenshot'

export const BLOCK_LABELS: Record<BlockType, string> = {
  text: 'Texto',
  callout: 'Aviso',
  speech: 'Guion / speech',
  message: 'Mensaje',
  steps: 'Pasos',
  checklist: 'Checklist',
  prices: 'Tabla de precios',
  screenshot: 'Captura',
  pending: 'Pendiente',
  download: 'Descarga',
}

/** Campo que guarda al salir (blur) y no en cada tecla: evita reescribir todo el
 *  almacenamiento mientras se escribe. */
export function Field({ value, onCommit, multiline, className = '', ...rest }: {
  value: string
  onCommit: (v: string) => void
  multiline?: boolean
  className?: string
  placeholder?: string
  'aria-label'?: string
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  const commit = () => { if (local !== value) onCommit(local) }

  if (multiline) {
    return (
      <textarea
        className={`input textarea ${className}`}
        value={local}
        rows={Math.min(14, Math.max(3, local.split('\n').length + 1))}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        {...rest}
      />
    )
  }
  return (
    <input
      className={`input ${className}`}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      {...rest}
    />
  )
}

const MAX_DOC_BYTES = 4 * 1024 * 1024

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(new Error('No se pudo leer el archivo'))
    r.readAsDataURL(file)
  })
}

const MD_HINT = 'Escribe el texto. Para dar formato, selecciónalo y usa los botones de arriba.'

export function BlockEditor({ sectionId, block, index, total }: { sectionId: string; block: Block; index: number; total: number }) {
  const { updateBlock, removeBlock, moveBlock } = useApuntes()
  const save = (b: Block) => updateBlock(sectionId, b)

  return (
    <div className="block-editor" data-search-skip>
      <div className="block-editor__bar">
        <span className="pill">{BLOCK_LABELS[block.type]}</span>
        <span className="grow" />
        <button className="icon-btn" title="Subir" disabled={index === 0} onClick={() => moveBlock(sectionId, block.id, -1)}><ArrowUp size={14} /></button>
        <button className="icon-btn" title="Bajar" disabled={index === total - 1} onClick={() => moveBlock(sectionId, block.id, 1)}><ArrowDown size={14} /></button>
        <button className="icon-btn icon-btn--danger" title="Borrar bloque" onClick={() => confirm('¿Borrar este bloque?') && removeBlock(sectionId, block.id)}><Trash2 size={14} /></button>
      </div>
      <div className="block-editor__body">
        <BlockForm block={block} save={save} />
      </div>
    </div>
  )
}

function BlockForm({ block, save }: { block: Block; save: (b: Block) => void }) {
  const { data, addTable } = useApuntes()

  switch (block.type) {
    case 'text':
      return <RichField value={block.md} placeholder={MD_HINT} onCommit={(md) => save({ ...block, md })} />

    case 'callout':
      return (
        <>
          <div className="field-row">
            {(Object.keys(CALLOUTS) as CalloutVariant[]).map((v) => (
              <button key={v} className={`chip chip--${v} ${block.variant === v ? 'is-active' : ''}`} onClick={() => save({ ...block, variant: v })}>
                {CALLOUTS[v].label}
              </button>
            ))}
          </div>
          <Field value={block.title ?? ''} placeholder="Título (opcional)" onCommit={(title) => save({ ...block, title })} />
          <RichField value={block.md} placeholder={MD_HINT} onCommit={(md) => save({ ...block, md })} />
        </>
      )

    case 'speech':
      return (
        <>
          <Field value={block.title ?? ''} placeholder="Título (ej. Cómo arrancar)" onCommit={(title) => save({ ...block, title })} />
          <RichField value={block.md} placeholder="Lo que se le dice al cliente, tal cual." onCommit={(md) => save({ ...block, md })} />
        </>
      )

    case 'steps':
      return (
        <>
          <label className="check">
            Empieza en el paso nº
            <input
              className="input input--sm input--months"
              inputMode="numeric"
              value={block.start ?? 1}
              onChange={(e) => save({ ...block, start: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          {block.items.map((s, i) => (
            <div key={i} className="sub-item">
              <span className="sub-item__n">{i + 1}</span>
              <div className="grow stack">
                <Field value={s.title} placeholder="Título del paso" onCommit={(title) => save({ ...block, items: block.items.map((x, j) => (j === i ? { ...x, title } : x)) })} />
                <RichField value={s.md} placeholder="Detalle del paso" onCommit={(md) => save({ ...block, items: block.items.map((x, j) => (j === i ? { ...x, md } : x)) })} />
              </div>
              <button className="icon-btn" title="Quitar paso" onClick={() => save({ ...block, items: block.items.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
            </div>
          ))}
          <AddButton onClick={() => save({ ...block, items: [...block.items, { title: `Paso ${block.items.length + 1}`, md: '' }] })}>Añadir paso</AddButton>
        </>
      )

    case 'checklist':
      return (
        <>
          <Field value={block.title ?? ''} placeholder="Título (opcional)" onCommit={(title) => save({ ...block, title })} />
          {block.items.map((t, i) => (
            <div key={i} className="field-row">
              <Field className="grow" value={t} placeholder="Tarea" onCommit={(v) => save({ ...block, items: block.items.map((x, j) => (j === i ? v : x)) })} />
              <button className="icon-btn" title="Quitar" onClick={() => save({ ...block, items: block.items.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
            </div>
          ))}
          <AddButton onClick={() => save({ ...block, items: [...block.items, ''] })}>Añadir tarea</AddButton>
        </>
      )

    case 'prices':
      return (
        <>
        <div className="field-row">
          <select className="input grow" value={block.tableId} onChange={(e) => save({ ...block, tableId: e.target.value })}>
            <option value="">Elige una tabla…</option>
            {data.priceTables.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button className="btn btn--ghost btn--sm" onClick={() => save({ ...block, tableId: addTable('Nueva tabla') })}>
            <Plus size={14} /> Nueva tabla
          </button>
        </div>
        {block.tableId && <PriceTableView tableId={block.tableId} />}
        </>
      )

    case 'screenshot':
      return <ScreenshotEditor block={block} onChange={save} />

    case 'message':
      return (
        <>
          <Field value={block.title ?? ''} placeholder="Título (ej. Primer mensaje)" onCommit={(title) => save({ ...block, title })} />
          <Field multiline value={block.text} placeholder="Texto tal cual se envía. Los [huecos] entre corchetes se resaltan." onCommit={(text) => save({ ...block, text })} />
        </>
      )

    case 'download':
      return (
        <>
          <Field value={block.title} placeholder="Nombre del documento" onCommit={(title) => save({ ...block, title })} />
          <div className="field-row">
            <label className="btn btn--sm btn--ghost">
              <Upload size={14} /> {block.href ? 'Cambiar archivo' : 'Subir archivo'}
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  if (f.size > MAX_DOC_BYTES) { alert('El archivo es demasiado grande (máximo 4 MB).'); return }
                  const href = await readAsDataUrl(f)
                  save({ ...block, href, fileName: f.name, title: block.title || f.name.replace(/\.[^.]+$/, '') })
                }}
              />
            </label>
            <span className="muted small grow">{block.fileName || (block.href ? block.href.split('/').pop() : 'Sin archivo')}</span>
          </div>
          <p className="muted small">Solo plantillas en blanco: la web es pública, nada con datos personales.</p>
          <Field value={block.note ?? ''} placeholder="Nota (opcional)" onCommit={(note) => save({ ...block, note })} />
        </>
      )

    case 'pending':
      return <Field value={block.note ?? ''} placeholder="Nota: qué falta por redactar (opcional)" onCommit={(note) => save({ ...block, note })} />
  }
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button className="btn btn--ghost btn--sm" onClick={onClick}><Plus size={14} /> {children}</button>
}

const ADDABLE: BlockType[] = ['text', 'steps', 'screenshot', 'callout', 'speech', 'message', 'checklist', 'prices', 'download', 'pending']

export function AddBlockMenu({ sectionId }: { sectionId: string }) {
  const { addBlock } = useApuntes()
  return (
    <div className="add-block" data-search-skip>
      <span className="muted small">Añadir:</span>
      {ADDABLE.map((t) => (
        <button key={t} className="chip" onClick={() => addBlock(sectionId, t)}>
          <Plus size={12} /> {BLOCK_LABELS[t]}
        </button>
      ))}
    </div>
  )
}
