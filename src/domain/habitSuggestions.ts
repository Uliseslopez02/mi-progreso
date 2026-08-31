import { supabase } from '../lib/supabaseClient'

export interface SuggestedHabit {
  text: string
  /** 1-7 veces por semana (7 = todos los días). */
  timesPerWeek: number
}

export type HabitSuggestionResult =
  | { ok: true; suggestions: SuggestedHabit[] }
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
      ? data.suggestions
          .filter((s): s is { text: unknown; timesPerWeek: unknown } => !!s && typeof s === 'object')
          .filter((s) => typeof s.text === 'string' && s.text.trim().length > 0)
          .map((s) => ({
            text: s.text as string,
            timesPerWeek:
              typeof s.timesPerWeek === 'number' ? Math.min(7, Math.max(1, Math.round(s.timesPerWeek))) : 7,
          }))
      : []
    return { ok: true, suggestions }
  } catch {
    return { ok: false, error: 'No se pudo conectar con el servicio de sugerencias.' }
  }
}
