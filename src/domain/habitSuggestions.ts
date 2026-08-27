import { supabase } from '../lib/supabaseClient'

export type HabitSuggestionResult =
  | { ok: true; suggestions: string[] }
  | { ok: false; error: string }

/**
 * Pide sugerencias de hábitos para una meta recién creada, vía la Edge
 * Function `/api/suggest-habits` (que a su vez llama a la API de Claude con
 * la clave del servidor). Manda el JWT de la sesión actual — el servidor lo
 * valida contra Supabase antes de gastar la cuota de Claude, para que nadie
 * pueda llamar el endpoint sin estar logueado. Nunca lanza: un fallo de red,
 * de sesión o del servicio devuelve `{ ok: false }`, para que el modal de
 * sugerencias pueda mostrar un mensaje y dejar seguir sin bloquear la
 * creación de la meta.
 */
export async function suggestHabits(goalName: string, categoryName?: string): Promise<HabitSuggestionResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return { ok: false, error: 'Necesitás una sesión activa para pedir sugerencias.' }

    const res = await fetch('/api/suggest-habits', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ goalName, categoryName }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      return { ok: false, error: body?.error ?? 'No se pudieron generar sugerencias.' }
    }
    const data = (await res.json()) as { suggestions?: unknown }
    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.filter((s): s is string => typeof s === 'string')
      : []
    return { ok: true, suggestions }
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servicio de sugerencias.' }
  }
}
