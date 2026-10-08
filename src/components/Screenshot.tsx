import { ArrowUpRight, Circle, Hash, ImagePlus, Maximize2, Square, Trash2, Undo2, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Annotation, Block } from '../types'

type ShotBlock = Extract<Block, { type: 'screenshot' }>
type Tool = 'circle' | 'box' | 'arrow' | 'marker'

const RED = '#e3202a'

/** Capa SVG con las anotaciones. Usa el tamaño natural de la imagen como viewBox
 *  para que círculos y flechas no se deformen al escalar. */
function Overlay({ annotations, size, draft }: { annotations: Annotation[]; size: { w: number; h: number }; draft?: Annotation | null }) {
  const { w, h } = size
  const px = (v: number) => (v / 100) * w
  const py = (v: number) => (v / 100) * h
  const stroke = Math.max(3, w * 0.004)
  const font = Math.max(14, w * 0.016)

  const label = (x: number, y: number, text?: string) =>
    text ? (
      <text x={x} y={y} className="anno-label" fontSize={font} strokeWidth={font * 0.35}>
        {text}
      </text>
    ) : null

  const render = (a: Annotation, key: string | number) => {
    switch (a.kind) {
      case 'circle':
        return (
          <g key={key}>
            <ellipse cx={px(a.x + a.w / 2)} cy={py(a.y + a.h / 2)} rx={px(Math.abs(a.w) / 2)} ry={py(Math.abs(a.h) / 2)} fill="none" stroke={RED} strokeWidth={stroke} />
            {label(px(a.x), py(a.y) - font * 0.4, a.label)}
          </g>
        )
      case 'box':
        return (
          <g key={key}>
            <rect x={px(Math.min(a.x, a.x + a.w))} y={py(Math.min(a.y, a.y + a.h))} width={px(Math.abs(a.w))} height={py(Math.abs(a.h))} rx={stroke * 2} fill="rgba(227,32,42,.08)" stroke={RED} strokeWidth={stroke} />
            {label(px(Math.min(a.x, a.x + a.w)), py(Math.min(a.y, a.y + a.h)) - font * 0.4, a.label)}
          </g>
        )
      case 'arrow':
        return (
          <g key={key}>
            <line x1={px(a.x1)} y1={py(a.y1)} x2={px(a.x2)} y2={py(a.y2)} stroke={RED} strokeWidth={stroke} strokeLinecap="round" markerEnd="url(#anno-arrowhead)" />
            {label(px(a.x1), py(a.y1) - font * 0.4, a.label)}
          </g>
        )
      case 'marker':
        return (
          <g key={key}>
            <circle cx={px(a.x)} cy={py(a.y)} r={font * 0.9} fill={RED} stroke="#fff" strokeWidth={stroke * 0.8} />
            <text x={px(a.x)} y={py(a.y)} className="anno-marker" fontSize={font * 1.05}>{a.n}</text>
          </g>
        )
    }
  }

  return (
    <svg className="shot__overlay" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <defs>
        <marker id="anno-arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={RED} />
        </marker>
      </defs>
      {annotations.map(render)}
      {draft && render(draft, 'draft')}
    </svg>
  )
}

function useNaturalSize(src: string) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    if (!src) return
    const img = new Image()
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = src
  }, [src])
  return src ? size : null
}

export function ScreenshotView({ block }: { block: ShotBlock }) {
  const size = useNaturalSize(block.src)
  const [open, setOpen] = useState(false)

  if (!block.src) return <div className="empty-note">Captura pendiente de subir.</div>

  return (
    <figure className="shot" style={size ? { maxWidth: size.w } : undefined}>
      <button className="shot__frame" onClick={() => setOpen(true)} title="Ampliar captura" data-search-skip>
        <img src={block.src} alt={block.alt} loading="lazy" />
        {size && <Overlay annotations={block.annotations} size={size} />}
        <span className="shot__zoom"><Maximize2 size={14} /></span>
      </button>
      {block.caption && <figcaption>{block.caption}</figcaption>}
      {open && (
        <div className="lightbox" role="dialog" aria-label={block.alt} onClick={() => setOpen(false)} data-search-skip>
          <button className="lightbox__close" aria-label="Cerrar"><X /></button>
          <div className="shot__frame shot__frame--big" onClick={(e) => e.stopPropagation()}>
            <img src={block.src} alt={block.alt} />
            {size && <Overlay annotations={block.annotations} size={size} />}
          </div>
        </div>
      )}
    </figure>
  )
}

// Reduce la imagen para que quepa en el almacenamiento del navegador.
async function fileToDataUrl(file: File, maxW = 1600): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('No se pudo leer la imagen'))
      i.src = url
    })
    const scale = Math.min(1, maxW / img.naturalWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

const TOOLS: { id: Tool; label: string; icon: typeof Circle }[] = [
  { id: 'circle', label: 'Círculo', icon: Circle },
  { id: 'box', label: 'Recuadro', icon: Square },
  { id: 'arrow', label: 'Flecha', icon: ArrowUpRight },
  { id: 'marker', label: 'Número', icon: Hash },
]

export function ScreenshotEditor({ block, onChange }: { block: ShotBlock; onChange: (b: ShotBlock) => void }) {
  const size = useNaturalSize(block.src)
  const [tool, setTool] = useState<Tool>('circle')
  const [draft, setDraft] = useState<Annotation | null>(null)
  const [error, setError] = useState('')
  const start = useRef<{ x: number; y: number } | null>(null)
  const frame = useRef<HTMLDivElement>(null)

  const set = (patch: Partial<ShotBlock>) => onChange({ ...block, ...patch })

  const pct = (e: PointerEvent) => {
    const r = frame.current!.getBoundingClientRect()
    const clamp = (v: number) => Math.min(100, Math.max(0, v))
    return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) }
  }

  const shapeFrom = (a: { x: number; y: number }, b: { x: number; y: number }): Annotation => {
    if (tool === 'arrow') return { kind: 'arrow', x1: a.x, y1: a.y, x2: b.x, y2: b.y }
    if (tool === 'marker') return { kind: 'marker', x: b.x, y: b.y, n: block.annotations.filter((x) => x.kind === 'marker').length + 1 }
    return { kind: tool, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
  }

  const onDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = pct(e)
  }
  const onMove = (e: PointerEvent) => {
    if (start.current && tool !== 'marker') setDraft(shapeFrom(start.current, pct(e)))
  }
  const onUp = (e: PointerEvent) => {
    if (!start.current) return
    const end = pct(e)
    const a = shapeFrom(start.current, end)
    const moved = Math.hypot(end.x - start.current.x, end.y - start.current.y)
    start.current = null
    setDraft(null)
    // Evita crear formas por un clic accidental (salvo los números, que van con un clic).
    if (tool === 'marker' || moved > 1.5) set({ annotations: [...block.annotations, a] })
  }

  return (
    <div className="shot-editor" data-search-skip>
      <div className="field-row">
        <label className="btn btn--ghost btn--sm">
          <ImagePlus size={14} /> Subir captura
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                setError('')
                set({ src: await fileToDataUrl(file), annotations: [] })
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al cargar la imagen')
              }
            }}
          />
        </label>
        <input className="input input--sm grow" placeholder="…o ruta, ej. /capturas/altas-1.png" value={block.src.startsWith('data:') ? '' : block.src} onChange={(e) => set({ src: e.target.value })} />
      </div>
      {error && <p className="error small">{error}</p>}

      {block.src && (
        <>
          <div className="toolbar">
            {TOOLS.map((t) => (
              <button key={t.id} className={`chip ${tool === t.id ? 'is-active' : ''}`} onClick={() => setTool(t.id)}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
            <span className="grow" />
            <button className="chip" disabled={!block.annotations.length} onClick={() => set({ annotations: block.annotations.slice(0, -1) })}>
              <Undo2 size={14} /> Deshacer
            </button>
          </div>
          <p className="muted small">{tool === 'marker' ? 'Haz clic donde quieras colocar el número.' : 'Arrastra sobre la imagen para dibujar.'}</p>
          <div ref={frame} className="shot__frame is-drawing" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
            <img src={block.src} alt={block.alt} draggable={false} />
            {size && <Overlay annotations={block.annotations} size={size} draft={draft} />}
          </div>

          {block.annotations.length > 0 && (
            <ul className="anno-list">
              {block.annotations.map((a, i) => (
                <li key={i}>
                  <span className="pill">{a.kind === 'marker' ? `Nº ${a.n}` : TOOLS.find((t) => t.id === a.kind)?.label}</span>
                  {a.kind !== 'marker' && (
                    <input
                      className="input input--sm grow"
                      placeholder="Texto junto a la forma (opcional)"
                      value={a.label ?? ''}
                      onChange={(e) => set({ annotations: block.annotations.map((x, j) => (j === i ? { ...x, label: e.target.value || undefined } as Annotation : x)) })}
                    />
                  )}
                  <button className="icon-btn" title="Borrar" onClick={() => set({ annotations: block.annotations.filter((_, j) => j !== i) })}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="field-grid">
        <input className="input input--sm" placeholder="Pie de foto (qué se ve / qué hay que pulsar)" value={block.caption ?? ''} onChange={(e) => set({ caption: e.target.value })} />
        <input className="input input--sm" placeholder="Texto alternativo" value={block.alt} onChange={(e) => set({ alt: e.target.value })} />
      </div>
    </div>
  )
}
