// Buscador en página: recorre el texto visible de los apuntes y resalta las
// coincidencias con la CSS Custom Highlight API (no modifica el DOM, así que
// no se pelea con React). Ignora tildes y mayúsculas: "matricula" encuentra "Matrícula".

export interface SearchHit {
  range: Range
  sectionId: string
  sectionTitle: string
  snippet: { before: string; match: string; after: string }
}

const normalizeChar = (ch: string) => ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export const normalize = (text: string) => Array.from(text, normalizeChar).join('')

/** Texto normalizado + mapa de cada carácter normalizado a su índice original. */
function normalizeWithMap(text: string) {
  let out = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const n = normalizeChar(text[i])
    out += n
    for (let k = 0; k < n.length; k++) map.push(i)
  }
  return { out, map }
}

export const highlightSupported = () => typeof CSS !== 'undefined' && 'highlights' in CSS

export function findHits(root: HTMLElement, query: string): SearchHit[] {
  const q = normalize(query.trim())
  if (q.length < 2) return []

  const hits: SearchHit[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const el = node.parentElement
      // data-search-skip: controles de edición, botones, etc.
      if (!el || el.closest('[data-search-skip]')) return NodeFilter.FILTER_REJECT
      return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    },
  })

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? ''
    const { out, map } = normalizeWithMap(text)
    let from = 0
    for (let pos = out.indexOf(q, from); pos !== -1; pos = out.indexOf(q, from)) {
      const start = map[pos]
      const end = map[pos + q.length - 1] + 1
      const range = document.createRange()
      range.setStart(node, start)
      range.setEnd(node, end)

      const sectionEl = node.parentElement?.closest<HTMLElement>('[data-section-id]')
      hits.push({
        range,
        sectionId: sectionEl?.dataset.sectionId ?? '',
        sectionTitle: sectionEl?.dataset.sectionTitle ?? '',
        snippet: {
          before: text.slice(Math.max(0, start - 40), start),
          match: text.slice(start, end),
          after: text.slice(end, end + 50),
        },
      })
      from = pos + q.length
    }
  }
  return hits
}

export function paintHighlights(hits: SearchHit[], current: number) {
  if (!highlightSupported()) return
  CSS.highlights.set('search-hit', new Highlight(...hits.map((h) => h.range)))
  const cur = hits[current]
  if (cur) CSS.highlights.set('search-current', new Highlight(cur.range))
  else CSS.highlights.delete('search-current')
}

export function clearHighlights() {
  if (!highlightSupported()) return
  CSS.highlights.delete('search-hit')
  CSS.highlights.delete('search-current')
}

export function scrollToHit(hit: SearchHit) {
  const el = hit.range.startContainer.parentElement
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
