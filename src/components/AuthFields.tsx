import { useState } from 'react'
import type { ReactNode } from 'react'
import { EyeIcon, EyeOffIcon, LockIcon } from './icons'
import type { PasswordRequirement } from '../auth/validation'
import { PASSWORD_STRENGTH_LABELS, passwordRequirements, passwordStrength } from '../auth/validation'
import { CheckIcon, CircleIcon } from './icons'

interface IconFieldProps {
  id: string
  label: string
  type?: string
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  autoComplete?: string
  placeholder?: string
  error?: string
  disabled?: boolean
}

export function IconField({
  id,
  label,
  type = 'text',
  icon,
  value,
  onChange,
  onBlur,
  autoComplete,
  placeholder,
  error,
  disabled,
}: IconFieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className={`input-group${error ? ' input-group--error' : ''}`}>
        <span className="input-group__icon">{icon}</span>
        <input
          id={id}
          type={type}
          className="input input-group__field"
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  autoComplete: string
  error?: string
  disabled?: boolean
  showRequirements?: boolean
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  autoComplete,
  error,
  disabled,
  showRequirements,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const requirements: PasswordRequirement[] = showRequirements ? passwordRequirements(value) : []
  const strength = showRequirements ? passwordStrength(value) : 0

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className={`input-group${error ? ' input-group--error' : ''}`}>
        <span className="input-group__icon">
          <LockIcon />
        </span>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="input input-group__field"
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="input-group__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {showRequirements && value.length > 0 && (
        <div className="password-meter">
          <div className="password-meter__bar">
            <span className={`password-meter__fill password-meter__fill--${strength}`} />
          </div>
          <span className="password-meter__label">{PASSWORD_STRENGTH_LABELS[strength]}</span>
        </div>
      )}

      {showRequirements && (
        <ul className="password-requirements">
          {requirements.map((req) => (
            <li key={req.label} className={req.met ? 'password-requirements__item--met' : ''}>
              {req.met ? <CheckIcon size={13} /> : <CircleIcon size={13} />}
              {req.label}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
