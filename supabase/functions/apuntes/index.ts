// Edge Function `apuntes`: lectura pública de la última versión y guardado protegido por contraseña.
//
//   GET  → { version, data } de la última versión (404 si aún no hay ninguna).
//   POST { password }               → comprueba la contraseña (para entrar en Modo edición).
//   POST { password, data }         → guarda una versión nueva.
//
// Secretos (Supabase → Edge Functions → Secrets):
//   EDIT_PASSWORD             contraseña de edición (solo la sabe Joel).
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY los pone Supabase automáticamente.
// Se despliega con verify_jwt = false: la lectura es pública y la escritura la protege la contraseña.

const ALLOWED_ORIGINS = [
  'https://apuntes-fibra-max.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]
const MAX_BYTES = 15 * 1024 * 1024 // las capturas van dentro del JSON como data URL

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Se lee en cada petición: si se cambia el secreto, la función usa la nueva sin reiniciar.
const editPassword = () => Deno.env.get('EDIT_PASSWORD') ?? ''

function cors(origin: string | null): Record<string, string> {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/apuntes-fibra-[a-z0-9-]+\.vercel\.app$/.test(origin))
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
  }
}

function json(body: unknown, status: number, origin: string | null, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin), ...extra },
  })
}

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

/** Comparación en tiempo constante (se comparan los hash, de longitud fija). */
async function passwordOk(given: unknown): Promise<boolean> {
  const expected = editPassword()
  if (typeof given !== 'string' || !expected) return false
  const [a, b] = await Promise.all([sha256(given.trim()), sha256(expected.trim())])
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

function looksLikeApuntes(d: unknown): d is { version: number; sections: unknown[]; priceTables: unknown[] } {
  if (!d || typeof d !== 'object') return false
  const o = d as Record<string, unknown>
  return Number.isInteger(o.version) && Array.isArray(o.sections) && Array.isArray(o.priceTables)
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Servidor sin configurar' }, 500, origin)

  if (req.method === 'GET') {
    const r = await rest('apuntes_versiones?select=version,data,created_at&order=version.desc,id.desc&limit=1')
    if (!r.ok) return json({ error: 'No se pudo leer' }, 502, origin)
    const rows = (await r.json()) as { version: number; data: unknown; created_at: string }[]
    if (!rows.length) return json({ error: 'Sin versiones' }, 404, origin)
    return json(rows[0], 200, origin, { 'cache-control': 'no-store' })
  }

  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405, origin)

  const len = Number(req.headers.get('content-length') ?? '0')
  if (len > MAX_BYTES) return json({ error: 'Demasiado grande' }, 413, origin)

  let body: { password?: unknown; data?: unknown }
  try {
    const text = await req.text()
    if (text.length > MAX_BYTES) return json({ error: 'Demasiado grande' }, 413, origin)
    body = JSON.parse(text)
  } catch {
    return json({ error: 'JSON no válido' }, 400, origin)
  }

  if (!editPassword()) return json({ error: 'Falta configurar la contraseña de edición' }, 503, origin)
  if (!(await passwordOk(body.password))) {
    // Pequeña espera para frenar intentos de adivinar la contraseña.
    await new Promise((r) => setTimeout(r, 1500))
    return json({ error: 'Contraseña incorrecta' }, 401, origin)
  }

  // Solo comprobar la contraseña (entrar en Modo edición).
  if (body.data === undefined) return json({ ok: true }, 200, origin)

  if (!looksLikeApuntes(body.data)) return json({ error: 'Formato de apuntes no válido' }, 400, origin)

  const r = await rest('apuntes_versiones', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ version: body.data.version, data: body.data }),
  })
  if (!r.ok) return json({ error: 'No se pudo guardar' }, 502, origin)
  const [row] = (await r.json()) as { id: number; version: number; created_at: string }[]
  return json({ ok: true, version: row.version, savedAt: row.created_at }, 200, origin)
})
