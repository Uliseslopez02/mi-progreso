import { supabase } from '../lib/supabaseClient'

/**
 * Actualiza `profiles.last_active_at` una vez por sesión — fire-and-forget,
 * nunca bloquea ni se muestra en la UI. Vive fuera de `supabaseAuth.ts` a
 * propósito porque no es un método del SDK de Auth, es una escritura de
 * datos común y corriente (mismo cliente, misma RLS por dueño).
 */
export function touchLastActive(): void {
  supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .then(
      () => {},
      () => {},
    )
}
