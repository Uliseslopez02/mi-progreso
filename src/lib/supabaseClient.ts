import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_CONFIG_ERROR =
  'Supabase no está configurado: falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.local (ver .env.example).'

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error(SUPABASE_CONFIG_ERROR)
  client = createClient(url, anonKey)
  return client
}

/**
 * Cliente único de Supabase. Guarda y adjunta el JWT de sesión solo — por
 * eso ni el repositorio ni el resto de la app necesitan pasar un userId en
 * ningún lado: RLS + este cliente ya resuelven "para quién" es cada query.
 *
 * Envuelto en un Proxy para que, si faltan las variables de entorno, el
 * error recién aparezca al primer uso real (p. ej. dentro de un efecto de
 * AuthGate) en vez de romper la carga de todos los módulos que importan
 * este archivo — así la app puede mostrar un mensaje en vez de una pantalla
 * en blanco.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})
