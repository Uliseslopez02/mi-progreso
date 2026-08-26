/** Consignas fijas para `Reflection`. Compartidas entre Momento Mori y una
 * futura reflexión diaria — ver `Reflection` en types.ts. */
export const REFLECTION_PROMPTS = [
  '¿Qué hice hoy que realmente valió la pena?',
  'Si este día fuera importante, ¿qué recordaría de él?',
] as const

/** Consignas fijas de la Revisión mensual guiada (Informes) — distintas de
 * REFLECTION_PROMPTS para poder filtrar `data.reflections` por pertenencia a
 * uno u otro conjunto sin agregar un campo nuevo al schema. */
export const MONTHLY_REVIEW_PROMPTS = [
  '¿Qué salió bien?',
  '¿Qué fue lo más difícil?',
  '¿Qué hábito querés mejorar?',
  '¿Qué objetivo priorizar?',
  '¿Qué cambiar el mes que viene?',
] as const

/** Consigna de la respuesta de prioridades — no es una pregunta reflexiva
 * sobre el mes que pasó, es texto libre orientado a futuro; se guarda igual
 * como Reflection para reusar el mismo mecanismo de persistencia/listado. */
export const PRIORITIES_PROMPT = 'Prioridades del próximo mes'

/** Todas las consignas de la Revisión mensual, para filtrar `data.reflections`
 * y separarlas de las de Momento Mori. */
export const ALL_MONTHLY_REVIEW_PROMPTS: readonly string[] = [...MONTHLY_REVIEW_PROMPTS, PRIORITIES_PROMPT]
