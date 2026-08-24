import { useState } from 'react'
import type { FormEvent } from 'react'
import { FOCUS_OPTIONS, saveFocusIntent } from './focusIntent'
import { describeAuthError } from './authErrors'
import { signUp } from './supabaseAuth'
import { isValidEmail, passwordMeetsRequirements } from './validation'
import { IconField, PasswordField } from '../components/AuthFields'
import { ProgressPath } from '../components/ProgressPath'
import { MailIcon, UserIcon } from '../components/icons'
import { useAutoFocusHeading } from '../hooks/useAutoFocusHeading'

interface Props {
  onSwitchToSignIn: () => void
  onGoToReset: () => void
  /** Sólo se llama si Supabase entregó sesión inmediata (confirmación de email desactivada). */
  onEnterApp: () => void
}

type Step = 'welcome' | 'identity' | 'security' | 'intention' | 'creating' | 'done'

interface Fields {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

const STEP_INDEX: Record<Step, number> = { welcome: 0, identity: 0, security: 1, intention: 2, creating: 2, done: 2 }
const STEP_LABELS = ['Tu identidad', 'Seguridad', 'Tu enfoque']

function identityErrors(values: Fields) {
  const errors: Partial<Record<keyof Fields, string>> = {}
  if (!values.fullName.trim()) errors.fullName = 'Ingresá tu nombre.'
  if (!values.email.trim()) errors.email = 'Ingresá tu email.'
  else if (!isValidEmail(values.email)) errors.email = 'Ingresá un email válido.'
  return errors
}

function securityErrors(values: Fields) {
  const errors: Partial<Record<keyof Fields, string>> = {}
  if (!values.password) errors.password = 'Ingresá una contraseña.'
  else if (!passwordMeetsRequirements(values.password)) {
    errors.password = 'Tu contraseña necesita al menos 8 caracteres, con una letra y un número.'
  }
  if (!values.confirmPassword) errors.confirmPassword = 'Confirmá tu contraseña.'
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Las contraseñas no coinciden.'
  return errors
}

/** Registro progresivo en 4 pantallas — cada una se siente como un paso de "armar tu espacio", no un formulario largo. */
export function SignUpWizard({ onSwitchToSignIn, onGoToReset, onEnterApp }: Props) {
  const [step, setStep] = useState<Step>('welcome')
  const [fields, setFields] = useState<Fields>({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [focusId, setFocusId] = useState<string | null>(null)
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<'confirmEmail' | 'alreadyRegistered' | 'immediateSession' | null>(null)
  const headingRef = useAutoFocusHeading<HTMLHeadingElement>(`${step}:${outcome}`)

  const set = (patch: Partial<Fields>) => setFields((f) => ({ ...f, ...patch }))
  const markTouched = (field: keyof Fields) => () => setTouched((t) => ({ ...t, [field]: true }))

  const goIdentity = () => {
    setAttempted(false)
    setTouched({})
    setStep('identity')
  }

  const confirmIdentity = () => {
    setAttempted(true)
    if (Object.keys(identityErrors(fields)).length > 0) return
    setAttempted(false)
    setTouched({})
    setStep('security')
  }

  const confirmSecurity = () => {
    setAttempted(true)
    if (Object.keys(securityErrors(fields)).length > 0) return
    setStep('intention')
  }

  const finish = async (chosenFocusId: string | null) => {
    setError(null)
    setStep('creating')
    try {
      const { needsEmailConfirmation, alreadyRegistered } = await signUp(
        fields.email.trim(),
        fields.password,
        fields.fullName.trim(),
      )
      if (alreadyRegistered) {
        setOutcome('alreadyRegistered')
      } else {
        saveFocusIntent(chosenFocusId)
        setOutcome(needsEmailConfirmation ? 'confirmEmail' : 'immediateSession')
      }
      setStep('done')
    } catch (err) {
      setError(describeAuthError('signUp', err))
      setStep('intention')
    }
  }

  const iErrors = identityErrors(fields)
  const sErrors = securityErrors(fields)
  const shouldShow = (field: keyof Fields, errs: Partial<Record<keyof Fields, string>>) =>
    (touched[field] || attempted) && errs[field]

  const firstName = fields.fullName.trim().split(' ')[0]

  return (
    <div className="auth-screen">
      <div className="card auth-card signup-wizard">
        <div className="auth-card__brand">
          <span className="auth-card__mark" aria-hidden="true">
            MP
          </span>
          <p className="hero__eyebrow">Mi Progreso</p>
        </div>

        {step === 'welcome' && (
          <>
            <h1 className="card__title" ref={headingRef} tabIndex={-1}>
              Empecemos por vos.
            </h1>
            <p className="card__hint auth-card__subtitle">
              En menos de un minuto vas a tener tu propio espacio para avanzar.
            </p>
            <button type="button" className="btn btn--primary" onClick={goIdentity}>
              Empezar
            </button>
            <div className="auth-card__links auth-card__links--center">
              <button type="button" className="btn btn--ghost" onClick={onSwitchToSignIn}>
                ¿Ya tenés cuenta? Iniciar sesión
              </button>
            </div>
          </>
        )}

        {(step === 'identity' || step === 'security' || step === 'intention') && (
          <ProgressPath steps={3} activeIndex={STEP_INDEX[step]} labels={STEP_LABELS} size="sm" />
        )}

        {step === 'identity' && (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              confirmIdentity()
            }}
            noValidate
          >
            <h1 className="card__title" ref={headingRef} tabIndex={-1}>
              Tu identidad
            </h1>
            <p className="card__hint auth-card__subtitle">Así vamos a llamarte dentro de la app.</p>
            <IconField
              id="signup-name"
              label="Nombre"
              icon={<UserIcon />}
              autoComplete="name"
              value={fields.fullName}
              onChange={(v) => set({ fullName: v })}
              onBlur={markTouched('fullName')}
              error={shouldShow('fullName', iErrors) || undefined}
            />
            <IconField
              id="signup-email"
              label="Email"
              type="email"
              icon={<MailIcon />}
              autoComplete="email"
              value={fields.email}
              onChange={(v) => set({ email: v })}
              onBlur={markTouched('email')}
              error={shouldShow('email', iErrors) || undefined}
            />
            <div className="auth-card__links">
              <button type="submit" className="btn btn--primary">
                Continuar
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('welcome')}>
                Atrás
              </button>
            </div>
          </form>
        )}

        {step === 'security' && (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              confirmSecurity()
            }}
            noValidate
          >
            <h1 className="card__title" ref={headingRef} tabIndex={-1}>
              {firstName ? `Mucho gusto, ${firstName}.` : 'Protejamos tu cuenta.'}
            </h1>
            <p className="card__hint auth-card__subtitle">Elegí una contraseña segura para tu espacio.</p>
            <PasswordField
              id="signup-password"
              label="Contraseña"
              autoComplete="new-password"
              value={fields.password}
              onChange={(v) => set({ password: v })}
              onBlur={markTouched('password')}
              error={shouldShow('password', sErrors) || undefined}
              showRequirements
            />
            <PasswordField
              id="signup-confirm-password"
              label="Confirmar contraseña"
              autoComplete="new-password"
              value={fields.confirmPassword}
              onChange={(v) => set({ confirmPassword: v })}
              onBlur={markTouched('confirmPassword')}
              error={shouldShow('confirmPassword', sErrors) || undefined}
            />
            <div className="auth-card__links">
              <button type="submit" className="btn btn--primary">
                Continuar
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('identity')}>
                Atrás
              </button>
            </div>
          </form>
        )}

        {step === 'intention' && (
          <>
            <h1 className="card__title" ref={headingRef} tabIndex={-1}>
              ¿Qué te gustaría mejorar primero?
            </h1>
            <p className="card__hint auth-card__subtitle">Sirve para sugerirte cosas — nunca te limita.</p>
            {error && (
              <p className="auth-card__error" role="alert">
                {error}
              </p>
            )}
            <div className="onboarding-options">
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`onboarding-option${focusId === option.id ? ' onboarding-option--selected' : ''}`}
                  aria-pressed={focusId === option.id}
                  onClick={() => setFocusId(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="auth-card__links" style={{ marginTop: 4 }}>
              <button type="button" className="btn btn--primary" onClick={() => void finish(focusId)}>
                Crear mi cuenta
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('security')}>
                Atrás
              </button>
            </div>
            <div className="auth-card__links auth-card__links--center">
              <button type="button" className="btn btn--ghost" onClick={() => void finish(null)}>
                Prefiero configurarlo después
              </button>
            </div>
          </>
        )}

        {step === 'creating' && (
          <div className="signup-wizard__creating">
            <ProgressPath steps={5} indeterminate size="md" />
            <p className="loading-screen__message" role="status">
              Creando tu espacio…
            </p>
          </div>
        )}

        {step === 'done' && outcome === 'alreadyRegistered' && (
          <>
            <h1 className="card__title" ref={headingRef} tabIndex={-1}>
              Esa cuenta ya existe
            </h1>
            <p className="card__hint auth-card__subtitle">
              Ya hay una cuenta con ese email. Iniciá sesión o recuperá tu contraseña.
            </p>
            <div className="auth-card__links">
              <button type="button" className="btn btn--primary" onClick={onSwitchToSignIn}>
                Iniciar sesión
              </button>
              <button type="button" className="btn btn--ghost" onClick={onGoToReset}>
                Olvidé mi contraseña
              </button>
            </div>
          </>
        )}

        {step === 'done' && outcome === 'confirmEmail' && (
          <>
            <h1 className="card__title" ref={headingRef} tabIndex={-1}>
              {firstName ? `¡Listo, ${firstName}!` : '¡Listo!'}
            </h1>
            <p className="card__hint auth-card__subtitle">
              Este es tu punto de partida. Te enviamos un email para confirmar tu cuenta — confirmalo y volvé para
              entrar.
            </p>
            <button type="button" className="btn btn--primary" onClick={onSwitchToSignIn}>
              Ir a iniciar sesión
            </button>
          </>
        )}

        {step === 'done' && outcome === 'immediateSession' && (
          <>
            <h1 className="card__title" ref={headingRef} tabIndex={-1}>
              {firstName ? `¡Listo, ${firstName}!` : '¡Listo!'}
            </h1>
            <p className="card__hint auth-card__subtitle">Este es tu punto de partida.</p>
            <button type="button" className="btn btn--primary" onClick={onEnterApp}>
              Empezar a explorar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
