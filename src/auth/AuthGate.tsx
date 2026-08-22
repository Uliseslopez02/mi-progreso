import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { IconField, PasswordField } from '../components/AuthFields'
import { LoadingScreen } from '../components/LoadingScreen'
import { MailIcon, UserIcon } from '../components/icons'
import { SUPABASE_CONFIG_ERROR } from '../lib/supabaseClient'
import { describeAuthError } from './authErrors'
import { isValidEmail, passwordMeetsRequirements } from './validation'
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

/** Si la verificación de sesión no responde en este tiempo, no dejamos a la persona mirando una pantalla muda. */
const SESSION_CHECK_TIMEOUT_MS = 15_000

const COPY: Record<Mode, { title: string; subtitle: string; submitLabel: string; submittingLabel: string }> = {
  signIn: {
    title: 'Bienvenido de nuevo',
    subtitle: 'Continuá construyendo la vida que querés.',
    submitLabel: 'Entrar',
    submittingLabel: 'Entrando…',
  },
  signUp: {
    title: 'Creá tu cuenta',
    subtitle: 'Empezá a organizar tu vida y construir mejores hábitos.',
    submitLabel: 'Crear mi cuenta',
    submittingLabel: 'Creando tu cuenta…',
  },
  resetPassword: {
    title: 'Recuperar contraseña',
    subtitle: 'Te mandamos instrucciones para elegir una nueva.',
    submitLabel: 'Enviar instrucciones',
    submittingLabel: 'Enviando…',
  },
  setNewPassword: {
    title: 'Elegí una contraseña nueva',
    subtitle: 'Ya casi. Elegí una contraseña segura para tu cuenta.',
    submitLabel: 'Guardar contraseña',
    submittingLabel: 'Guardando…',
  },
}

interface FieldValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

function computeFieldErrors(mode: Mode, values: FieldValues): Partial<Record<keyof FieldValues, string>> {
  const errors: Partial<Record<keyof FieldValues, string>> = {}

  if (mode === 'signUp' && !values.fullName.trim()) {
    errors.fullName = 'Ingresá tu nombre.'
  }

  if (mode === 'signIn' || mode === 'signUp' || mode === 'resetPassword') {
    if (!values.email.trim()) errors.email = 'Ingresá tu email.'
    else if (!isValidEmail(values.email)) errors.email = 'Ingresá un email válido.'
  }

  if (mode === 'signIn' && !values.password) {
    errors.password = 'Ingresá tu contraseña.'
  }

  if (mode === 'signUp' || mode === 'setNewPassword') {
    if (!values.password) errors.password = 'Ingresá una contraseña.'
    else if (!passwordMeetsRequirements(values.password)) errors.password = 'La contraseña no cumple los requisitos.'

    if (!values.confirmPassword) errors.confirmPassword = 'Confirmá tu contraseña.'
    else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Las contraseñas no coinciden.'
  }

  return errors
}

/** Pantalla de acceso que envuelve toda la app: login, registro y recuperación de contraseña con Supabase Auth. */
export function AuthGate({ children }: Props) {
  const [checking, setChecking] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [mode, setMode] = useState<Mode>('signIn')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState<Partial<Record<keyof FieldValues, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  useEffect(() => {
    // Si getSession() nunca resuelve (red caída, backend caído), no dejamos
    // la pantalla de "Verificando sesión" trabada para siempre: a los 15s
    // asumimos que no hay sesión válida y mostramos el login.
    const timeoutId = window.setTimeout(() => setChecking(false), SESSION_CHECK_TIMEOUT_MS)

    getSession()
      .then(setSession)
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === SUPABASE_CONFIG_ERROR) setConfigError(err.message)
      })
      .finally(() => {
        window.clearTimeout(timeoutId)
        setChecking(false)
      })

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
    return <LoadingScreen message="Verificando tu sesión…" />
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
    setConfirmPassword('')
    setTouched({})
    setSubmitAttempted(false)
  }

  const values: FieldValues = { fullName, email, password, confirmPassword }
  const fieldErrors = computeFieldErrors(mode, values)
  const shouldShow = (field: keyof FieldValues) => Boolean(touched[field] || submitAttempted)
  const markTouched = (field: keyof FieldValues) => () => setTouched((t) => ({ ...t, [field]: true }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    resetFeedback()
    setSubmitAttempted(true)
    if (Object.keys(fieldErrors).length > 0) return

    setSubmitting(true)
    try {
      if (mode === 'signIn') {
        await signIn(email.trim(), password)
      } else if (mode === 'signUp') {
        const { needsEmailConfirmation, alreadyRegistered } = await signUp(
          email.trim(),
          password,
          fullName.trim(),
        )
        if (alreadyRegistered) {
          setError('Ya existe una cuenta con este email. Iniciá sesión o recuperá tu contraseña.')
        } else if (needsEmailConfirmation) {
          setMode('signIn')
          setTouched({})
          setSubmitAttempted(false)
          setPassword('')
          setConfirmPassword('')
          setInfo('Te enviamos un email para confirmar tu cuenta. Confirmalo y después iniciá sesión.')
        }
      } else if (mode === 'resetPassword') {
        await requestPasswordReset(email.trim())
        setInfo('Si existe una cuenta asociada a este email, te enviamos instrucciones para restablecer tu contraseña.')
      } else if (mode === 'setNewPassword') {
        await updatePassword(password)
        setInfo('Contraseña actualizada.')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setError(describeAuthError(mode, err))
    } finally {
      setSubmitting(false)
    }
  }

  const copy = COPY[mode]

  return (
    <div className="auth-screen">
      <form className="card auth-card" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="auth-card__brand">
          <span className="auth-card__mark" aria-hidden="true">
            MP
          </span>
          <p className="hero__eyebrow">Mi Progreso</p>
        </div>
        <h1 className="card__title">{copy.title}</h1>
        <p className="card__hint auth-card__subtitle">{copy.subtitle}</p>

        {mode === 'signUp' && (
          <IconField
            id="auth-name"
            label="Nombre"
            icon={<UserIcon />}
            autoComplete="name"
            value={fullName}
            disabled={submitting}
            onChange={(v) => {
              setFullName(v)
              resetFeedback()
            }}
            onBlur={markTouched('fullName')}
            error={shouldShow('fullName') ? fieldErrors.fullName : undefined}
          />
        )}

        {(mode === 'signIn' || mode === 'signUp' || mode === 'resetPassword') && (
          <IconField
            id="auth-email"
            label="Email"
            type="email"
            icon={<MailIcon />}
            autoComplete="email"
            value={email}
            disabled={submitting}
            onChange={(v) => {
              setEmail(v)
              resetFeedback()
            }}
            onBlur={markTouched('email')}
            error={shouldShow('email') ? fieldErrors.email : undefined}
          />
        )}

        {mode !== 'resetPassword' && (
          <PasswordField
            id="auth-password"
            label={mode === 'setNewPassword' ? 'Contraseña nueva' : 'Contraseña'}
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            value={password}
            disabled={submitting}
            onChange={(v) => {
              setPassword(v)
              resetFeedback()
            }}
            onBlur={markTouched('password')}
            error={shouldShow('password') ? fieldErrors.password : undefined}
            showRequirements={mode === 'signUp' || mode === 'setNewPassword'}
          />
        )}

        {(mode === 'signUp' || mode === 'setNewPassword') && (
          <PasswordField
            id="auth-confirm-password"
            label="Confirmar contraseña"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={submitting}
            onChange={(v) => {
              setConfirmPassword(v)
              resetFeedback()
            }}
            onBlur={markTouched('confirmPassword')}
            error={shouldShow('confirmPassword') ? fieldErrors.confirmPassword : undefined}
          />
        )}

        {error && (
          <p className="auth-card__error" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="auth-card__info" role="status">
            {info}
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? copy.submittingLabel : copy.submitLabel}
        </button>

        {mode === 'signIn' && (
          <div className="auth-card__links">
            <button type="button" className="btn btn--ghost" onClick={() => switchMode('signUp')}>
              Crear cuenta
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => switchMode('resetPassword')}>
              Olvidé mi contraseña
            </button>
          </div>
        )}
        {mode === 'signUp' && (
          <div className="auth-card__links auth-card__links--center">
            <button type="button" className="btn btn--ghost" onClick={() => switchMode('signIn')}>
              ¿Ya tenés cuenta? Iniciar sesión
            </button>
          </div>
        )}
        {mode === 'resetPassword' && (
          <div className="auth-card__links auth-card__links--center">
            <button type="button" className="btn btn--ghost" onClick={() => switchMode('signIn')}>
              Volver a iniciar sesión
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
