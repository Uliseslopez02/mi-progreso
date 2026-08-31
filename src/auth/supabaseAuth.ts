import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

/**
 * Envoltorio fino sobre supabase.auth. Existe para que los tests puedan
 * mockear este archivo chico en vez de todo el SDK.
 */

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange(callback)
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/**
 * Devuelve si hace falta confirmar el email antes de poder iniciar sesión, y
 * si el email ya tenía una cuenta. Supabase no tira error en ese último caso
 * (para no confirmar por error la existencia de una cuenta a quien no la
 * conoce de antes) — la señal es `identities` vacío en la respuesta.
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<{ needsEmailConfirmation: boolean; alreadyRegistered: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
  })
  if (error) throw error
  const alreadyRegistered = Boolean(data.user) && data.user!.identities?.length === 0
  return { needsEmailConfirmation: !data.session && !alreadyRegistered, alreadyRegistered }
}

/** Reenvía el email de confirmación de una cuenta recién creada que todavía no lo usó. */
export async function resendSignUpConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
  if (error) throw error
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}
