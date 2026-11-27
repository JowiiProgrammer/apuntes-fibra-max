import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import seed from './content/apuntes.json'
import { checkPassword, fetchLatest, RemoteError, saveRemote } from './remote'
import type { Apuntes, Block, BlockType, PriceTable, Section } from './types'

// Los apuntes se guardan para todos en Supabase (ver remote.ts). Se muestra siempre la versión
// con el número más alto entre la publicada en el código y la guardada en Supabase.
// En "Modo edición" (solo con contraseña) cada cambio se guarda solo a los pocos segundos.
const bundled = seed as Apuntes
const PW_KEY = 'apuntes-fibramax:pw'
const SAVE_DELAY = 1500

// Restos del guardado antiguo en el navegador: ya no se usan.
try { localStorage.removeItem('apuntes-fibramax:v1') } catch { /* sin almacenamiento */ }

const readPw = () => { try { return sessionStorage.getItem(PW_KEY) } catch { return null } }
const writePw = (pw: string | null) => {
  try {
    if (pw) sessionStorage.setItem(PW_KEY, pw)
    else sessionStorage.removeItem(PW_KEY)
  } catch { /* sin almacenamiento: habrá que volver a escribirla */ }
}

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

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
    case 'download': return { id, type, title: '', href: '', note: '' }
  }
}

interface Ctx {
  data: Apuntes
  editMode: boolean
  /** Activar pide la contraseña si aún no se ha puesto en esta pestaña. */
  setEditMode: (v: boolean) => void
  /** Hay que mostrar el diálogo de contraseña. */
  askPassword: boolean
  cancelPassword: () => void
  /** Comprueba la contraseña y, si es buena, entra en Modo edición. Devuelve el error o null. */
  login: (password: string) => Promise<string | null>
  saveState: SaveState
  saveMessage: string
  retrySave: () => void
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
}

const ApuntesContext = createContext<Ctx | null>(null)

export function ApuntesProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Apuntes>(bundled)
  const [editMode, setEditModeState] = useState(false)
  const [askPassword, setAskPassword] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  // Ref con el estado actual para que las mutaciones no dependan de closures viejos.
  const dataRef = useRef(data)
  const dirtyRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)
  const savingRef = useRef(false)

  // Al abrir, trae la última versión guardada para todos (si es más nueva que la del código).
  useEffect(() => {
    let alive = true
    fetchLatest()
      .then((remote) => {
        if (!alive || !remote || dirtyRef.current) return
        if (remote.version >= dataRef.current.version) {
          dataRef.current = remote
          setData(remote)
        }
      })
      .catch(() => { /* sin conexión: se queda la versión del código */ })
    return () => { alive = false }
  }, [])

  const save = useCallback(async () => {
    window.clearTimeout(timerRef.current)
    const pw = readPw()
    if (!dirtyRef.current) return
    if (!pw) {
      setSaveState('error')
      setSaveMessage('Falta la contraseña: sal y vuelve a entrar en Modo edición.')
      return
    }
    if (savingRef.current) {
      // Ya hay un guardado en marcha: se repite al terminar.
      timerRef.current = window.setTimeout(() => void save(), 400)
      return
    }
    savingRef.current = true
    dirtyRef.current = false
    const payload = { ...dataRef.current, version: dataRef.current.version + 1 }
    setSaveState('saving')
    try {
      await saveRemote(pw, payload)
      // La versión guardada pasa a ser la actual (sin perder cambios hechos mientras se guardaba).
      dataRef.current = { ...dataRef.current, version: payload.version }
      setData(dataRef.current)
      setSaveState(dirtyRef.current ? 'pending' : 'saved')
      setSaveMessage('')
    } catch (e) {
      dirtyRef.current = true
      setSaveState('error')
      if (e instanceof RemoteError && e.status === 401) {
        writePw(null)
        setSaveMessage('la contraseña no es correcta. Sal de Modo edición y vuelve a entrar con la buena; tus cambios siguen aquí.')
      } else {
        setSaveMessage(e instanceof RemoteError ? e.message : 'No se pudo guardar')
      }
    } finally {
      savingRef.current = false
    }
  }, [])

  const commit = useCallback((next: Apuntes) => {
    dataRef.current = next
    setData(next)
    dirtyRef.current = true
    setSaveState('pending')
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => void save(), SAVE_DELAY)
  }, [save])

  // Avisa antes de cerrar si queda algo sin guardar.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || savingRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  const setEditMode = useCallback((v: boolean) => {
    if (!v) {
      if (dirtyRef.current) void save()
      setEditModeState(false)
      return
    }
    if (readPw()) setEditModeState(true)
    else setAskPassword(true)
  }, [save])

  const login = useCallback(async (password: string) => {
    try {
      await checkPassword(password)
      writePw(password)
      setAskPassword(false)
      setEditModeState(true)
      return null
    } catch (e) {
      return e instanceof RemoteError ? e.message : 'No se pudo comprobar la contraseña'
    }
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
    askPassword,
    cancelPassword: () => setAskPassword(false),
    login,
    saveState,
    saveMessage,
    retrySave: () => { dirtyRef.current = true; void save() },
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
    // Al importar, se conserva el número de versión actual para que el guardado sea la más nueva.
    replaceAll: (next) => commit({ ...next, version: Math.max(next.version, dataRef.current.version) }),
  }), [data, editMode, setEditMode, askPassword, login, saveState, saveMessage, save, mutate, commit])

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
