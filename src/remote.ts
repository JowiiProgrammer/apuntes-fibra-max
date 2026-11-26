// Guardado compartido en Supabase (Edge Function `apuntes`, ver supabase/functions/apuntes).
// La URL es pública: leer es libre y para guardar hace falta la contraseña de edición.
import type { Apuntes } from './types'

export const API_URL = 'https://ouovnmtgwhcpbqpmzing.supabase.co/functions/v1/apuntes'
export const remoteEnabled = !API_URL.includes('PROJECT_REF')

export async function fetchLatest(): Promise<Apuntes | null> {
  if (!remoteEnabled) return null
  const r = await fetch(API_URL, { cache: 'no-store' })
  if (!r.ok) return null
  const body = (await r.json()) as { data?: Apuntes }
  return body.data?.sections ? body.data : null
}

export class RemoteError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function post(payload: object) {
  if (!remoteEnabled) throw new RemoteError('El guardado compartido aún no está configurado', 0)
  let r: Response
  try {
    r = await fetch(API_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
  } catch {
    throw new RemoteError('Sin conexión con el servidor', 0)
  }
  const body = (await r.json().catch(() => ({}))) as { error?: string }
  if (!r.ok) throw new RemoteError(body.error || `Error ${r.status}`, r.status)
  return body
}

export const checkPassword = (password: string) => post({ password })
export const saveRemote = (password: string, data: Apuntes) => post({ password, data })
