import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { IconField, PasswordField } from '../components/AuthFields'
import { EnterTransition } from '../components/EnterTransition'
import { LoadingScreen } from '../components/LoadingScreen'
import { LogoMark } from '../components/Logo'
import { MailIcon } from '../components/icons'
import { useAutoFocusHeading } from '../hooks/useAutoFocusHeading'
import { SUPABASE_CONFIG_ERROR } from '../lib/supabaseClient'
import { describeAuthError } from './authErrors'
import { touchLastActive } from './profileActivity'
import { SignUpWizard } from './SignUpWizard'
import { isValidEmail, maskEmail } from './validation'
import { isReturningDevice, markReturningDevice, pickWelcomeCopy } from './welcomeMessages'
import { getSession, onAuthStateChange, requestPasswordReset, signIn, updatePassword } from './supabaseAuth'

interface Props {
  children: ReactNode
}

type Mode = 'signIn' | 'signUp' | 'resetPassword' | 'setNewPassword'

/** Si la verificación de sesión no responde en este tiempo, no dejamos a la persona mirando una pantalla muda. */
const SESSION_CHECK_TIMEOUT_MS = 15_000
const RESET_RESEND_COOLDOWN_S = 30

/** `/?signup=1` (viene del CTA de la demo pública en `/producto`) arranca directo en modo registro. */
function initialModeFromUrl(): Mode {
  return new URLSearchParams(window.location.search).get('signup') ? 'signUp' : 'signIn'
}

type LinkError = 'expired' | 'invalid' | null

/** Supabase vuelve con `#error=...&error_code=otp_expired` cuando el enlace de recuperación venció o ya se usó. */
function readLinkErrorFromUrl(): LinkError {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  const params = new URLSearchParams(hash)
  const code = params.get('error_code')
  if (!params.get('error')) return null
  return code === 'otp_expired' ? 'expired' : 'invalid'
}

/** Pantalla de acceso que envuelve toda la app: login, registro y recuperación de contraseña con Supabase Auth. */
export function AuthGate({ children }: Props) {
  const [checking, setChecking] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [mode, setMode] = useState<Mode>(initialModeFromUrl)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [entering, setEntering] = useState(false)
  const [welcome] = useState(() => pickWelcomeCopy(isReturningDevice()))
  const [linkError, setLinkError] = useState<LinkError>(() => readLinkErrorFromUrl())
  const activityTouched = useRef(false)
  // Una sola pantalla con h1 está montada por vez (configError/linkError/resetSent/mode son
  // returns tempranos mutuamente excluyentes), así que esta clave combinada alcanza para mover
  // el foco al encabezado correcto en cada transición.
  const headingRef = useAutoFocusHeading<HTMLHeadingElement>(`${configError}|${linkError}|${mode}|${resetSent}`)

  useEffect(() => {
    // Sólo se lee una vez: si hay un error de enlace en la URL, se limpia para
    // que un refresh no lo vuelva a mostrar ni quede visible en la barra.
    if (linkError) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        if (event === 'SIGNED_OUT') setEntering(false)
        setSession(nextSession)
      })
    } catch (err) {
      if (err instanceof Error && err.message === SUPABASE_CONFIG_ERROR) setConfigError(err.message)
      return undefined
    }
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  // Transición breve de continuidad tras un login exitoso — nunca bloquea de verdad.
  useEffect(() => {
    if (!entering) return
    const timer = window.setTimeout(() => setEntering(false), 900)
    return () => window.clearTimeout(timer)
  }, [entering])

  // Una sola vez por sesión de pestaña, apenas hay una sesión válida: no en
  // cada evento de onAuthStateChange (el refresh de token también dispara
  // ese callback, y no hace falta un update por cada uno).
  useEffect(() => {
    if (!session || activityTouched.current) return
    activityTouched.current = true
    touchLastActive()
  }, [session])

  if (checking) {
    return <LoadingScreen message="Verificando tu sesión…" />
  }

  if (configError) {
    return (
      <div className="auth-screen">
        <div className="card auth-card">
          <p className="hero__eyebrow">Mi Progreso</p>
          <h1 className="card__title" ref={headingRef} tabIndex={-1}>
            Falta configurar Supabase
          </h1>
          <p className="card__hint">
            Creá <code>.env.local</code> con <code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> (mirá <code>.env.example</code>) y reiniciá el servidor.
          </p>
        </div>
      </div>
    )
  }

  if (linkError) {
    return (
      <div className="auth-screen">
        <div className="card auth-card">
          <div className="auth-card__brand">
            <LogoMark size={30} />
            <p className="hero__eyebrow">Mi Progreso</p>
          </div>
          <h1 className="card__title" ref={headingRef} tabIndex={-1}>
            {linkError === 'expired' ? 'Este enlace ya venció.' : 'Este enlace no es válido.'}
          </h1>
          <p className="card__hint auth-card__subtitle">
            {linkError === 'expired'
              ? 'Por seguridad, los enlaces para restablecer tu contraseña duran un tiempo limitado.'
              : 'Puede que ya se haya usado, o que el link esté incompleto.'}
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setLinkError(null)
              setMode('resetPassword')
            }}
          >
            Pedir un enlace nuevo
          </button>
          <div className="auth-card__links auth-card__links--center">
            <button type="button" className="btn btn--ghost" onClick={() => setLinkError(null)}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  // En signUp, el wizard maneja su propia sesión inmediata (ver SignUpWizard):
  // no la interceptamos acá para que pueda mostrar su propia pantalla de cierre.
  if (session && mode !== 'setNewPassword' && mode !== 'signUp') {
    if (entering) return <EnterTransition message={`${welcome.title}.`} />
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
    setTouched({})
    setSubmitAttempted(false)
    setResetSent(false)
    setResendCooldown(0)
  }

  if (mode === 'signUp') {
    return (
      <SignUpWizard
        onSwitchToSignIn={() => switchMode('signIn')}
        onGoToReset={() => switchMode('resetPassword')}
        onEnterApp={() => switchMode('signIn')}
      />
    )
  }

  const emailError = !email.trim()
    ? 'Ingresá tu email.'
    : !isValidEmail(email)
      ? 'Ingresá un email válido.'
      : undefined
  const passwordError = mode === 'signIn' && !password ? 'Ingresá tu contraseña.' : undefined
  const showEmailError = (touched.email || submitAttempted) && emailError
  const showPasswordError = (touched.password || submitAttempted) && passwordError

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault()
    resetFeedback()
    setSubmitAttempted(true)
    if (emailError || passwordError) return

    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      markReturningDevice()
      setEntering(true)
    } catch (err) {
      setError(describeAuthError('signIn', err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetRequest = async (event: FormEvent) => {
    event.preventDefault()
    resetFeedback()
    setSubmitAttempted(true)
    if (emailError) return

    setSubmitting(true)
    try {
      await requestPasswordReset(email.trim())
      setResetSent(true)
      setResendCooldown(RESET_RESEND_COOLDOWN_S)
    } catch (err) {
      setError(describeAuthError('resetPassword', err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    resetFeedback()
    setSubmitting(true)
    try {
      await requestPasswordReset(email.trim())
      setResendCooldown(RESET_RESEND_COOLDOWN_S)
      setInfo('Reenviado.')
    } catch (err) {
      setError(describeAuthError('resetPassword', err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetNewPassword = async (event: FormEvent) => {
    event.preventDefault()
    resetFeedback()
    setSubmitAttempted(true)
    if (!password) {
      setError('Ingresá una contraseña.')
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      setInfo('Contraseña actualizada.')
      setPassword('')
    } catch (err) {
      setError(describeAuthError('setNewPassword', err))
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'resetPassword') {
    if (resetSent) {
      return (
        <div className="auth-screen">
          <div className="card auth-card">
            <div className="auth-card__brand">
              <LogoMark size={30} />
              <p className="hero__eyebrow">Mi Progreso</p>
            </div>
            <h1 className="card__title" ref={headingRef} tabIndex={-1}>
              Revisá tu correo.
            </h1>
            <p className="card__hint auth-card__subtitle" role="status">
              Si existe una cuenta asociada a <strong>{maskEmail(email)}</strong>, te enviamos instrucciones para
              restablecer tu contraseña.
            </p>
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
            <div className="auth-card__links">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={submitting || resendCooldown > 0}
                onClick={() => void handleResend()}
              >
                {resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : 'Reenviar'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setResetSent(false)}>
                Cambiar email
              </button>
            </div>
            <div className="auth-card__links auth-card__links--center">
              <button type="button" className="btn btn--ghost" onClick={() => switchMode('signIn')}>
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="auth-screen">
        <form className="card auth-card" onSubmit={(e) => void handleResetRequest(e)} noValidate>
          <div className="auth-card__brand">
            <LogoMark size={30} />
            <p className="hero__eyebrow">Mi Progreso</p>
          </div>
          <h1 className="card__title" ref={headingRef} tabIndex={-1}>
            ¿No recordás tu contraseña?
          </h1>
          <p className="card__hint auth-card__subtitle">No pasa nada. Te ayudamos a volver.</p>
          <IconField
            id="reset-email"
            label="Email"
            type="email"
            icon={<MailIcon />}
            autoComplete="email"
            value={email}
            disabled={submitting}
            valid={isValidEmail(email)}
            onChange={(v) => {
              setEmail(v)
              resetFeedback()
            }}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={showEmailError || undefined}
          />
          {error && (
            <p className="auth-card__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar enlace'}
          </button>
          <div className="auth-card__links auth-card__links--center">
            <button type="button" className="btn btn--ghost" onClick={() => switchMode('signIn')}>
              Volver al inicio
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (mode === 'setNewPassword') {
    return (
      <div className="auth-screen">
        <form className="card auth-card" onSubmit={(e) => void handleSetNewPassword(e)} noValidate>
          <div className="auth-card__brand">
            <LogoMark size={30} />
            <p className="hero__eyebrow">Mi Progreso</p>
          </div>
          <h1 className="card__title" ref={headingRef} tabIndex={-1}>
            Elegí una contraseña nueva
          </h1>
          <p className="card__hint auth-card__subtitle">Ya casi. Elegí una contraseña segura para tu cuenta.</p>
          <PasswordField
            id="auth-new-password"
            label="Contraseña nueva"
            autoComplete="new-password"
            value={password}
            disabled={submitting}
            onChange={(v) => {
              setPassword(v)
              resetFeedback()
            }}
            showRequirements
          />
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
            {submitting ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    )
  }

  // signIn
  return (
    <div className="auth-screen">
      <form className="card auth-card" onSubmit={(e) => void handleSignIn(e)} noValidate>
        <div className="auth-card__brand">
          <LogoMark size={30} />
          <p className="hero__eyebrow">Mi Progreso</p>
        </div>
        <h1 className="card__title" ref={headingRef} tabIndex={-1}>
          {welcome.title}
        </h1>
        <p className="card__hint auth-card__subtitle">{welcome.subtitle}</p>

        <IconField
          id="auth-email"
          label="Email"
          type="email"
          icon={<MailIcon />}
          autoComplete="email"
          value={email}
          disabled={submitting}
          valid={isValidEmail(email)}
          onChange={(v) => {
            setEmail(v)
            resetFeedback()
          }}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={showEmailError || undefined}
        />
        <PasswordField
          id="auth-password"
          label="Contraseña"
          autoComplete="current-password"
          value={password}
          disabled={submitting}
          onChange={(v) => {
            setPassword(v)
            resetFeedback()
          }}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={showPasswordError || undefined}
        />

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
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>

        <div className="auth-card__links">
          <button type="button" className="btn btn--ghost" onClick={() => switchMode('signUp')}>
            Crear cuenta
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => switchMode('resetPassword')}>
            Olvidé mi contraseña
          </button>
        </div>
        <div className="auth-card__links auth-card__links--center">
          <a className="btn btn--ghost" href="/producto">
            Ver qué podés hacer →
          </a>
        </div>
      </form>
    </div>
  )
}
