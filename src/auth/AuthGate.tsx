import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { SUPABASE_CONFIG_ERROR } from '../lib/supabaseClient'
import {
  getSession,
  onAuthStateChange,
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
} from './supabaseAuth'

interface Props {
  children: ReactNode
}

type Mode = 'signIn' | 'signUp' | 'resetPassword' | 'setNewPassword'

/** Pantalla de acceso que envuelve toda la app: login, registro y recuperación de contraseña con Supabase Auth. */
export function AuthGate({ children }: Props) {
  const [checking, setChecking] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === SUPABASE_CONFIG_ERROR) setConfigError(err.message)
      })
      .finally(() => setChecking(false))

    try {
      return onAuthStateChange((event, nextSession) => {
        if (event === 'PASSWORD_RECOVERY') setMode('setNewPassword')
        setSession(nextSession)
      })
    } catch (err) {
      if (err instanceof Error && err.message === SUPABASE_CONFIG_ERROR) setConfigError(err.message)
      return undefined
    }
  }, [])

  if (checking) {
    return <div className="loading">Verificando sesión…</div>
  }

  if (configError) {
    return (
      <div className="auth-screen">
        <div className="card auth-card">
          <p className="hero__eyebrow">Mi Progreso</p>
          <h1 className="card__title">Falta configurar Supabase</h1>
          <p className="card__hint">
            Creá <code>.env.local</code> con <code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> (mirá <code>.env.example</code>) y reiniciá el servidor.
          </p>
        </div>
      </div>
    )
  }

  if (session && mode !== 'setNewPassword') {
    return <>{children}</>
  }

  const resetFeedback = () => {
    setError(null)
    setInfo(null)
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    resetFeedback()
    setPassword('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    resetFeedback()
    setSubmitting(true)
    try {
      if (mode === 'signIn') {
        await signIn(email, password)
      } else if (mode === 'signUp') {
        const { needsEmailConfirmation } = await signUp(email, password)
        if (needsEmailConfirmation) {
          setInfo('Te enviamos un email para confirmar tu cuenta. Confirmalo y después iniciá sesión.')
          setMode('signIn')
          setPassword('')
        }
      } else if (mode === 'resetPassword') {
        await requestPasswordReset(email)
        setInfo('Si el email existe, te enviamos un link para restablecer tu contraseña.')
      } else if (mode === 'setNewPassword') {
        await updatePassword(password)
        setInfo('Contraseña actualizada.')
        setPassword('')
        setMode('signIn')
      }
    } catch {
      setError(
        mode === 'signIn'
          ? 'Usuario o contraseña incorrectos.'
          : 'Algo salió mal. Probá de nuevo en un momento.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const titles: Record<Mode, string> = {
    signIn: 'Iniciar sesión',
    signUp: 'Crear cuenta',
    resetPassword: 'Recuperar contraseña',
    setNewPassword: 'Elegí una contraseña nueva',
  }

  const submitLabels: Record<Mode, string> = {
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    resetPassword: 'Enviar link',
    setNewPassword: 'Guardar contraseña',
  }

  const needsEmail = mode === 'signIn' || mode === 'signUp' || mode === 'resetPassword'
  const needsPassword = mode !== 'resetPassword'
  const canSubmit = needsEmail ? Boolean(email) && (!needsPassword || Boolean(password)) : Boolean(password)

  return (
    <div className="auth-screen">
      <form className="card auth-card" onSubmit={(e) => void handleSubmit(e)}>
        <p className="hero__eyebrow">Mi Progreso</p>
        <h1 className="card__title">{titles[mode]}</h1>

        {needsEmail && (
          <div className="field">
            <label className="field__label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              className="input"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                resetFeedback()
              }}
            />
          </div>
        )}

        {needsPassword && (
          <div className="field">
            <label className="field__label" htmlFor="auth-password">
              {mode === 'setNewPassword' ? 'Contraseña nueva' : 'Contraseña'}
            </label>
            <input
              id="auth-password"
              type="password"
              className="input"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                resetFeedback()
              }}
            />
          </div>
        )}

        {error && (
          <p className="auth-card__error" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="card__hint" role="status" style={{ color: 'var(--accent)' }}>
            {info}
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={submitting || !canSubmit}>
          {submitting ? 'Un momento…' : submitLabels[mode]}
        </button>

        {mode === 'signIn' && (
          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button type="button" className="btn btn--ghost" onClick={() => switchMode('signUp')}>
              Crear cuenta
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => switchMode('resetPassword')}>
              Olvidé mi contraseña
            </button>
          </div>
        )}
        {mode !== 'signIn' && mode !== 'setNewPassword' && (
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn--ghost" onClick={() => switchMode('signIn')}>
              Volver a iniciar sesión
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
