const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

export const MIN_PASSWORD_LENGTH = 8

export interface PasswordRequirement {
  label: string
  met: boolean
}

/** Requisitos que mostramos en vivo durante el registro. */
export function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: `Al menos ${MIN_PASSWORD_LENGTH} caracteres`, met: password.length >= MIN_PASSWORD_LENGTH },
    { label: 'Una letra y un número', met: /[a-zA-Z]/.test(password) && /[0-9]/.test(password) },
  ]
}

export function passwordMeetsRequirements(password: string): boolean {
  return passwordRequirements(password).every((r) => r.met)
}

export type PasswordStrength = 0 | 1 | 2 | 3

/** Escala simple 0–3 sólo para el indicador visual, no bloquea nada por sí sola. */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return 0
  let score = 0
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  return Math.min(score, 3) as PasswordStrength
}

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  0: 'Muy débil',
  1: 'Débil',
  2: 'Buena',
  3: 'Fuerte',
}
