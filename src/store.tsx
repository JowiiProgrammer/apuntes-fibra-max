import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import seed from './content/apuntes.json'
import type { Apuntes, Block, BlockType, PriceTable, Section } from './types'

// Por ahora los cambios hechos en "Modo edición" se guardan en este navegador
// (localStorage). La capa está aislada aquí para poder cambiarla por una base
// de datos compartida sin tocar los componentes.
const STORAGE_KEY = 'apuntes-fibramax:v1'
const bundled = seed as Apuntes

interface Stored {
  baseVersion: number
  data: Apuntes
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Stored
    return parsed?.data?.sections ? parsed : null
  } catch {
    return null
  }
}

function saveStored(data: Apuntes): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseVersion: bundled.version, data } satisfies Stored))
    return true
  } catch {
    // Suele ser cuota llena por capturas pesadas: avisamos en la UI.
    return false
  }
}

function clearStored() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* sin almacenamiento disponible: no hay nada que borrar */
  }
}

export const uid = (prefix = 'b') => `${prefix}-${Math.random().toString(36).slice(2, 9)}`
const today = () => new Date().toISOString().slice(0, 10)

export function findSection(sections: Section[], id: string): Section | undefined {
  for (const s of sections) {
    if (s.id === id) return s
    const hit = findSection(s.children, id)
    if (hit) return hit
  }
}

/** Devuelve la lista que contiene la sección (para mover/borrar) y su índice. */
function findParentList(sections: Section[], id: string): [Section[], number] | undefined {
  const i = sections.findIndex((s) => s.id === id)
  if (i >= 0) return [sections, i]
  for (const s of sections) {
    const hit = findParentList(s.children, id)
    if (hit) return hit
  }
}

export function newBlock(type: BlockType): Block {
  const id = uid(type)
  switch (type) {
    case 'text': return { id, type, md: '' }
    case 'callout': return { id, type, variant: 'info', title: '', md: '' }
    case 'speech': return { id, type, title: 'Guion', md: '' }
    case 'steps': return { id, type, items: [{ title: 'Paso 1', md: '' }] }
    case 'checklist': return { id, type, title: '', items: [''] }
    case 'prices': return { id, type, tableId: '' }
    case 'screenshot': return { id, type, src: '', alt: '', caption: '', annotations: [] }
    case 'message': return { id, type, title: 'Mensaje', text: '' }
    case 'pending': return { id, type, note: '' }
  }
}

interface Ctx {
  data: Apuntes
  editMode: boolean
  setEditMode: (v: boolean) => void
  hasLocalChanges: boolean
  /** La versión publicada es más nueva que la que había cuando se editó en local. */
  outdatedBase: boolean
  saveError: boolean
  mutate: (fn: (draft: Apuntes) => void, touchSectionId?: string) => void
  addSection: (parentId: string | null, title: string, group?: string) => string
  removeSection: (id: string) => void
  moveSection: (id: string, dir: -1 | 1) => void
  addBlock: (sectionId: string, type: BlockType) => void
  updateBlock: (sectionId: string, block: Block) => void
  removeBlock: (sectionId: string, blockId: string) => void
  moveBlock: (sectionId: string, blockId: string, dir: -1 | 1) => void
  updateTable: (table: PriceTable) => void
  addTable: (title: string) => string
  replaceAll: (data: Apuntes) => void
  resetLocal: () => void
}

const ApuntesContext = createContext<Ctx | null>(null)

export function ApuntesProvider({ children }: { children: ReactNode }) {
  const [stored] = useState(loadStored)
  const [data, setData] = useState<Apuntes>(stored?.data ?? bundled)
  const [hasLocalChanges, setHasLocalChanges] = useState(!!stored)
  const [saveError, setSaveError] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const outdatedBase = !!stored && stored.baseVersion < bundled.version

  // Ref con el estado actual para que las mutaciones no dependan de closures viejos.
  const dataRef = useRef(data)

  const commit = useCallback((next: Apuntes) => {
    dataRef.current = next
    setData(next)
    setHasLocalChanges(true)
    setSaveError(!saveStored(next))
  }, [])

  const mutate = useCallback<Ctx['mutate']>((fn, touchSectionId) => {
    const draft = structuredClone(dataRef.current)
    fn(draft)
    if (touchSectionId) {
      const s = findSection(draft.sections, touchSectionId)
      if (s) s.updatedAt = today()
    }
    commit(draft)
  }, [commit])

  const value = useMemo<Ctx>(() => ({
    data,
    editMode,
    setEditMode,
    hasLocalChanges,
    outdatedBase,
    saveError,
    mutate,
    addSection: (parentId, title, group) => {
      const id = uid('sec')
      mutate((d) => {
        const section: Section = { id, title, blocks: [newBlock('pending')], children: [], updatedAt: today() }
        if (!parentId) {
          d.sections.push({ ...section, group })
          return
        }
        findSection(d.sections, parentId)?.children.push(section)
      })
      return id
    },
    removeSection: (id) => mutate((d) => {
      const hit = findParentList(d.sections, id)
      if (hit) hit[0].splice(hit[1], 1)
    }),
    moveSection: (id, dir) => mutate((d) => {
      const hit = findParentList(d.sections, id)
      if (!hit) return
      const [list, i] = hit
      const j = i + dir
      if (j < 0 || j >= list.length) return
      ;[list[i], list[j]] = [list[j], list[i]]
    }),
    addBlock: (sectionId, type) => mutate((d) => {
      findSection(d.sections, sectionId)?.blocks.push(newBlock(type))
    }, sectionId),
    updateBlock: (sectionId, block) => mutate((d) => {
      const s = findSection(d.sections, sectionId)
      if (!s) return
      const i = s.blocks.findIndex((b) => b.id === block.id)
      if (i >= 0) s.blocks[i] = block
    }, sectionId),
    removeBlock: (sectionId, blockId) => mutate((d) => {
      const s = findSection(d.sections, sectionId)
      if (s) s.blocks = s.blocks.filter((b) => b.id !== blockId)
    }, sectionId),
    moveBlock: (sectionId, blockId, dir) => mutate((d) => {
      const s = findSection(d.sections, sectionId)
      if (!s) return
      const i = s.blocks.findIndex((b) => b.id === blockId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= s.blocks.length) return
      ;[s.blocks[i], s.blocks[j]] = [s.blocks[j], s.blocks[i]]
    }, sectionId),
    updateTable: (table) => mutate((d) => {
      const i = d.priceTables.findIndex((t) => t.id === table.id)
      if (i >= 0) d.priceTables[i] = { ...table, updatedAt: today() }
    }),
    addTable: (title) => {
      const id = uid('tabla')
      mutate((d) => {
        d.priceTables.push({
          id, title, columns: [{ key: 'precio', label: 'Precio' }],
          rows: [{ id: uid('fila'), label: 'Concepto', values: { precio: null } }],
          updatedAt: today(),
        })
      })
      return id
    },
    replaceAll: commit,
    resetLocal: () => {
      clearStored()
      dataRef.current = bundled
      setData(bundled)
      setHasLocalChanges(false)
      setSaveError(false)
    },
  }), [data, editMode, hasLocalChanges, outdatedBase, saveError, mutate, commit])

  return <ApuntesContext.Provider value={value}>{children}</ApuntesContext.Provider>
}

export function useApuntes() {
  const ctx = useContext(ApuntesContext)
  if (!ctx) throw new Error('useApuntes debe usarse dentro de <ApuntesProvider>')
  return ctx
}

/** Numeración tipo "01", "1.2" calculada a partir del orden actual. */
export function numbering(sections: Section[]): Map<string, string> {
  const map = new Map<string, string>()
  const walk = (list: Section[], prefix: string, depth: number) => {
    list.forEach((s, i) => {
      const n = depth === 0 ? String(i + 1).padStart(2, '0') : `${prefix}.${i + 1}`
      map.set(s.id, n)
      walk(s.children, depth === 0 ? String(i + 1) : n, depth + 1)
    })
  }
  walk(sections, '', 0)
  return map
}

export function formatEuro(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return null
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
