export interface WelcomeCopy {
  title: string
  subtitle: string
}

/** Para quien ya usó la app en este dispositivo — no revela nada personal, sólo cambia el tono. */
const RETURNING_MESSAGES: WelcomeCopy[] = [
  { title: 'Bienvenido de nuevo', subtitle: 'Tu próximo pequeño paso también cuenta.' },
  { title: 'Qué bueno verte de nuevo', subtitle: 'Seguimos desde donde lo dejaste.' },
  { title: 'Otra vez por acá', subtitle: 'Un día más también es parte del progreso.' },
  { title: 'Bienvenido de nuevo', subtitle: 'Cada vuelta cuenta, aunque sea chiquita.' },
]

const FIRST_TIME_MESSAGES: WelcomeCopy[] = [
  { title: 'Bienvenido a Mi Progreso', subtitle: 'Construí, un paso a la vez.' },
]

const RETURNING_FLAG_KEY = 'mi-progreso:returning'

/** true si este dispositivo ya vio un login exitoso antes — nada sensible, sólo un flag local. */
export function isReturningDevice(): boolean {
  try {
    return window.localStorage.getItem(RETURNING_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export function markReturningDevice(): void {
  try {
    window.localStorage.setItem(RETURNING_FLAG_KEY, '1')
  } catch {
    // localStorage puede no estar disponible (modo privado); no es crítico.
  }
}

/** Elección estable durante el día (no cambia en cada render, pero varía de un día a otro). */
export function pickWelcomeCopy(returning: boolean): WelcomeCopy {
  const pool = returning ? RETURNING_MESSAGES : FIRST_TIME_MESSAGES
  const dayIndex = new Date().getDate() % pool.length
  return pool[dayIndex]
}
