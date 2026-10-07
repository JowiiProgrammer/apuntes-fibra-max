import { Plus, Trash2 } from 'lucide-react'
import { formatEuro, uid, useApuntes } from '../store'
import type { PriceTable as Table } from '../types'

const parsePrice = (raw: string): number | null => {
  const clean = raw.replace(/[€\s]/g, '').replace(',', '.')
  if (!clean) return null
  const n = Number(clean)
  return Number.isFinite(n) ? n : null
}

export function PriceTableView({ tableId }: { tableId: string }) {
  const { data, editMode, updateTable } = useApuntes()
  const table = data.priceTables.find((t) => t.id === tableId)
  if (!table) return <div className="empty-note">Tabla de precios no encontrada ({tableId || 'sin elegir'}).</div>
  if (editMode) return <PriceTableEditor table={table} onChange={updateTable} />

  const single = table.columns.length === 1
  return (
    <div className="price-card">
      <div className="price-card__head">
        <span className="price-card__title">{table.title}</span>
        {table.updatedAt && <span className="muted small">Actualizado {fmtDate(table.updatedAt)}</span>}
      </div>
      <table className={`price-table ${single ? 'is-single' : ''}`}>
        {!single && (
          <thead>
            <tr>
              <th />
              {table.columns.map((c) => <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">
                {r.label}
                {r.note && <span className="price-note">{r.note}</span>}
              </th>
              {table.columns.map((c) => {
                const v = formatEuro(r.values[c.key])
                return (
                  <td key={c.key} data-label={c.label}>
                    {v ?? <span className="pill pill--pending">Pendiente</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {table.footnote && <p className="price-card__foot">{table.footnote}</p>}
    </div>
  )
}

function PriceTableEditor({ table, onChange }: { table: Table; onChange: (t: Table) => void }) {
  const set = (patch: Partial<Table>) => onChange({ ...table, ...patch })

  return (
    <div className="price-card is-editing" data-search-skip>
      <div className="price-card__head">
        <input className="input input--title" value={table.title} onChange={(e) => set({ title: e.target.value })} aria-label="Título de la tabla" />
        <span className="muted small">Tabla compartida: si aparece en varios apartados, cambia en todos.</span>
      </div>
      <div className="table-scroll">
        <table className="price-table">
          <thead>
            <tr>
              <th>Concepto</th>
              {table.columns.map((c, ci) => (
                <th key={c.key}>
                  <div className="col-head">
                    <input
                      className="input input--sm"
                      value={c.label}
                      onChange={(e) => set({ columns: table.columns.map((x, i) => (i === ci ? { ...x, label: e.target.value } : x)) })}
                    />
                    {table.columns.length > 1 && (
                      <button className="icon-btn" title="Quitar columna" onClick={() => set({ columns: table.columns.filter((_, i) => i !== ci) })}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
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
              const setRow = (patch: Partial<typeof r>) => set({ rows: table.rows.map((x, i) => (i === ri ? { ...x, ...patch } : x)) })
              return (
                <tr key={r.id}>
                  <th scope="row">
                    <input className="input input--sm" value={r.label} onChange={(e) => setRow({ label: e.target.value })} />
                    <input className="input input--sm input--note" placeholder="Nota (opcional)" value={r.note ?? ''} onChange={(e) => setRow({ note: e.target.value || undefined })} />
                  </th>
                  {table.columns.map((c) => (
                    <td key={c.key}>
                      <PriceInput value={r.values[c.key]} onChange={(v) => setRow({ values: { ...r.values, [c.key]: v } })} />
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
          onClick={() => set({ rows: [...table.rows, { id: uid('fila'), label: 'Nuevo concepto', values: Object.fromEntries(table.columns.map((c) => [c.key, null])) }] })}
        >
          <Plus size={14} /> Añadir fila
        </button>
        <input className="input input--sm grow" placeholder="Nota al pie (opcional)" value={table.footnote ?? ''} onChange={(e) => set({ footnote: e.target.value || undefined })} />
      </div>
    </div>
  )
}

// Input de texto en vez de number: permite escribir "85,50" con coma decimal.
function PriceInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="price-input">
      <input
        className="input input--sm"
        inputMode="decimal"
        placeholder="—"
        defaultValue={value == null ? '' : String(value).replace('.', ',')}
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
