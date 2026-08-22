export type AuthMode = 'signIn' | 'signUp' | 'resetPassword' | 'setNewPassword'

interface SupabaseLikeError {
  message?: string
  status?: number
}

function isNetworkError(err: SupabaseLikeError, raw: unknown): boolean {
  if (raw instanceof TypeError) return true
  const message = err.message ?? ''
  return /failed to fetch|network|load failed|NetworkError/i.test(message)
}

/**
 * Traduce errores de Supabase Auth a mensajes en español, específicos por
 * pantalla, sin exponer nunca el texto crudo del backend al usuario.
 */
export function describeAuthError(mode: AuthMode, raw: unknown): string {
  const err: SupabaseLikeError = raw && typeof raw === 'object' ? (raw as SupabaseLikeError) : {}
  const message = err.message ?? ''

  if (isNetworkError(err, raw)) {
    return 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.'
  }

  if (err.status === 429 || /rate limit/i.test(message)) {
    return 'Demasiados intentos. Esperá un momento e intentá de nuevo.'
  }

  if (mode === 'signIn') {
    if (/email not confirmed/i.test(message)) {
      return 'Todavía no confirmaste tu email. Revisá tu bandeja de entrada.'
    }
    // Supabase no distingue "no existe la cuenta" de "contraseña incorrecta" a
    // propósito (evita que alguien pueda usar el login para adivinar qué
    // emails están registrados) — el mensaje cubre ambos casos sin mentir.
    return 'Email o contraseña incorrectos.'
  }

  if (mode === 'signUp') {
    if (/already registered|user already exists/i.test(message)) {
      return 'Ya existe una cuenta con este email. Iniciá sesión o recuperá tu contraseña.'
    }
    if (/password/i.test(message)) {
      return 'La contraseña no cumple los requisitos mínimos.'
    }
    if (/email/i.test(message) && /invalid/i.test(message)) {
      return 'Ingresá un email válido.'
    }
    return 'No pudimos crear tu cuenta. Probá de nuevo en un momento.'
  }

  if (mode === 'resetPassword') {
    return 'No pudimos procesar el pedido. Probá de nuevo en un momento.'
  }

  // setNewPassword
  if (/password/i.test(message)) {
    return 'La contraseña no cumple los requisitos mínimos.'
  }
  return 'No pudimos actualizar tu contraseña. Probá de nuevo en un momento.'
}
