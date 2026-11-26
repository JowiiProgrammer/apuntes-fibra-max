import { Lock } from 'lucide-react'
import { useState } from 'react'
import { useApuntes } from '../store'

/** Pide la contraseña de edición. Solo quien la tiene puede guardar cambios para todos. */
export function PasswordDialog() {
  const { askPassword, cancelPassword, login } = useApuntes()
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!askPassword) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pw || busy) return
    setBusy(true)
    setError('')
    const err = await login(pw)
    setBusy(false)
    if (err) setError(err)
    else setPw('')
  }

  return (
    <div className="pw-scrim" data-search-skip onClick={cancelPassword}>
      <form className="pw-dialog" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <p className="pw-dialog__title"><Lock size={16} /> Modo edición</p>
        <p className="muted small">Los cambios se guardan para todos. Escribe la contraseña de edición.</p>
        <input
          className="input"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Contraseña"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {error && <p className="pw-dialog__error">{error}</p>}
        <div className="pw-dialog__actions">
          <button type="button" className="btn btn--sm btn--ghost" onClick={cancelPassword}>Cancelar</button>
          <button type="submit" className="btn btn--sm" disabled={busy || !pw}>{busy ? 'Comprobando…' : 'Entrar'}</button>
        </div>
      </form>
    </div>
  )
}
