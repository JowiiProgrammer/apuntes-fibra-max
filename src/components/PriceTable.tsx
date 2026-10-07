import { MapPin, Plus, Trash2 } from 'lucide-react'
import { formatEuro, uid, useApuntes } from '../store'
import type { PriceRow, PriceTable as Table } from '../types'

// Vacío = pendiente (null). "-" o "no" = esa modalidad no existe (undefined → "—").
const parsePrice = (raw: string): number | null | undefined => {
  const clean = raw.replace(/[€\s]/g, '').replace(',', '.')
  if (!clean) return null
  if (/^(-|—|no)$/i.test(clean)) return undefined
  const n = Number(clean)
  return Number.isFinite(n) ? n : null
}

const centrosLabel = (c: string) => (/^todos$/i.test(c) ? 'Todos los centros' : c)

function RowMeta({ row }: { row: PriceRow }) {
  const hasCentro = row.centros && row.centros !== '—'
  if (!hasCentro && !row.matricula && !row.review && !row.note) return null
  return (
    <span className="price-meta">
      {hasCentro && <span className="tag"><MapPin size={11} /> {centrosLabel(row.centros!)}</span>}
      {row.matricula && <span className="tag tag--red">+ Matrícula</span>}
      {row.review && <span className="tag tag--amber">Pendiente revisar</span>}
      {row.note && <span className="price-note">{row.note}</span>}
    </span>
  )
}

export function PriceTableView({ tableId }: { tableId: string }) {
  const { data, editMode, updateTable } = useApuntes()
  const table = data.priceTables.find((t) => t.id === tableId)
  if (!table) return <div className="empty-note">Tabla de precios no encontrada ({tableId || 'sin elegir'}).</div>
  if (editMode) return <PriceTableEditor table={table} onChange={updateTable} />

  return (
    <div className="price-card">
      <div className="price-card__head">
        <span className="price-card__title">{table.title}</span>
        {table.updatedAt && <span className="muted small">Actualizado {fmtDate(table.updatedAt)}</span>}
      </div>
      <table className="price-table">
        <thead>
          <tr>
            <th>Modalidad</th>
            {table.columns.map((c) => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">
                <span className="price-label">{r.label}</span>
                <RowMeta row={r} />
              </th>
              {table.columns.map((c) => (
                <td key={c.key} data-label={c.label}>
                  <PriceCell value={r.values[c.key]} months={c.months} exists={c.key in r.values} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.footnote && <p className="price-card__foot">{table.footnote}</p>}
    </div>
  )
}

function PriceCell({ value, months, exists }: { value: number | null | undefined; months?: number; exists: boolean }) {
  if (!exists) return <span className="price-na">—</span>
  const v = formatEuro(value)
  if (!v) return <span className="pill pill--pending">Pendiente</span>
  return (
    <span className="price-val">
      {v}
      {months && months > 1 && value != null && <span className="price-equiv">{formatEuro(value / months)}/mes</span>}
    </span>
  )
}

function PriceTableEditor({ table, onChange }: { table: Table; onChange: (t: Table) => void }) {
  const set = (patch: Partial<Table>) => onChange({ ...table, ...patch })

  return (
    <div className="price-card is-editing" data-search-skip>
      <div className="price-card__head">
        <input className="input input--title" value={table.title} onChange={(e) => set({ title: e.target.value })} aria-label="Título de la tabla" />
        <span className="muted small">Precio vacío = pendiente · «-» = no existe. Tabla compartida: cambia en todos los apartados donde aparece.</span>
      </div>
      <div className="table-scroll">
        <table className="price-table">
          <thead>
            <tr>
              <th>Modalidad</th>
              {table.columns.map((c, ci) => {
                const setCol = (p: Partial<typeof c>) => set({ columns: table.columns.map((x, i) => (i === ci ? { ...x, ...p } : x)) })
                return (
                  <th key={c.key}>
                    <div className="col-head">
                      <input className="input input--sm" value={c.label} onChange={(e) => setCol({ label: e.target.value })} />
                      <input
                        className="input input--sm input--months"
                        inputMode="numeric"
                        title="Meses que cubre (para calcular €/mes)"
                        placeholder="meses"
                        value={c.months ?? ''}
                        onChange={(e) => setCol({ months: Number(e.target.value) || undefined })}
                      />
                      {table.columns.length > 1 && (
                        <button className="icon-btn" title="Quitar columna" onClick={() => set({ columns: table.columns.filter((_, i) => i !== ci) })}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </th>
                )
              })}
              <th>
                <button
                  className="icon-btn"
                  title="Añadir columna"
                  onClick={() => {
                    const key = uid('col')
                    set({
                      columns: [...table.columns, { key, label: 'Nueva' }],
                      rows: table.rows.map((r) => ({ ...r, values: { ...r.values, [key]: null } })),
                    })
                  }}
                >
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, ri) => {
              const setRow = (patch: Partial<PriceRow>) => set({ rows: table.rows.map((x, i) => (i === ri ? { ...x, ...patch } : x)) })
              return (
                <tr key={r.id}>
                  <th scope="row">
                    <div className="stack row-edit">
                      <input className="input input--sm" value={r.label} onChange={(e) => setRow({ label: e.target.value })} />
                      <div className="field-row">
                        <input className="input input--sm grow" placeholder="Centros" value={r.centros ?? ''} onChange={(e) => setRow({ centros: e.target.value || undefined })} />
                        <label className="check"><input type="checkbox" checked={!!r.matricula} onChange={(e) => setRow({ matricula: e.target.checked || undefined })} /> Matrícula</label>
                        <label className="check"><input type="checkbox" checked={!!r.review} onChange={(e) => setRow({ review: e.target.checked || undefined })} /> Revisar</label>
                      </div>
                      <input className="input input--sm input--note" placeholder="Nota (opcional)" value={r.note ?? ''} onChange={(e) => setRow({ note: e.target.value || undefined })} />
                    </div>
                  </th>
                  {table.columns.map((c) => (
                    <td key={c.key}>
                      <PriceInput
                        value={r.values[c.key]}
                        exists={c.key in r.values}
                        onChange={(v) => {
                          const values = { ...r.values }
                          if (v === undefined) delete values[c.key]
                          else values[c.key] = v
                          setRow({ values })
                        }}
                      />
                    </td>
                  ))}
                  <td>
                    <button className="icon-btn" title="Quitar fila" onClick={() => set({ rows: table.rows.filter((_, i) => i !== ri) })}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="row-actions">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => set({ rows: [...table.rows, { id: uid('fila'), label: 'Nueva modalidad', values: Object.fromEntries(table.columns.map((c) => [c.key, null])) }] })}
        >
          <Plus size={14} /> Añadir fila
        </button>
        <input className="input input--sm grow" placeholder="Nota al pie (opcional)" value={table.footnote ?? ''} onChange={(e) => set({ footnote: e.target.value || undefined })} />
      </div>
    </div>
  )
}

// Input de texto en vez de number: permite escribir "85,50" con coma decimal.
function PriceInput({ value, exists, onChange }: { value: number | null | undefined; exists: boolean; onChange: (v: number | null | undefined) => void }) {
  const shown = !exists ? '-' : value == null ? '' : String(value).replace('.', ',')
  return (
    <div className="price-input">
      <input
        key={shown}
        className="input input--sm"
        inputMode="decimal"
        placeholder="pendiente"
        defaultValue={shown}
        onBlur={(e) => onChange(parsePrice(e.target.value))}
      />
      <span>€</span>
    </div>
  )
}

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}
