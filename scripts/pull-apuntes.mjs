// Descarga la última versión guardada en Supabase a src/content/apuntes.json.
// Ejecutar SIEMPRE antes de editar el JSON por código: así no se pierden los cambios
// hechos desde el Modo edición de la web.   →   npm run pull
import { readFileSync, writeFileSync } from 'node:fs'

const API = 'https://ouovnmtgwhcpbqpmzing.supabase.co/functions/v1/apuntes'
const FILE = new URL('../src/content/apuntes.json', import.meta.url)

const r = await fetch(API, { cache: 'no-store' })
if (!r.ok) throw new Error(`No se pudo descargar (${r.status})`)
const { data } = await r.json()
const local = JSON.parse(readFileSync(FILE, 'utf8'))

if (data.version < local.version) {
  console.log(`El archivo local (v${local.version}) es más nuevo que Supabase (v${data.version}): no se toca.`)
} else {
  const crlf = readFileSync(FILE, 'utf8').includes('\r\n')
  let out = JSON.stringify(data, null, 2) + '\n'
  if (crlf) out = out.replace(/\n/g, '\r\n')
  writeFileSync(FILE, out)
  console.log(`apuntes.json actualizado a la v${data.version} de Supabase (antes v${local.version}).`)
}
