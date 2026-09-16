/**
 * Lógica compartida para redactar con IA el título/cuerpo de UNA notificación
 * ya elegida por el motor de reglas (`src/domain/notificationEngine.ts`).
 * La usan `api/notification-message.ts` (Edge, llamada on-demand desde el
 * cliente) y `api/send-notifications.ts` (Node, cron de push) — mismo prompt,
 * mismo parseo, para que el tono nunca diverja entre los dos caminos.
 *
 * Nombre con `_lib` a propósito: Vercel no convierte en ruta pública ningún
 * archivo/carpeta de `api/` que empiece con `_`.
 */
const MODEL = 'claude-haiku-4-5-20251001'

export interface PhraseContext {
  trend?: string
  activityLevel?: string
  todayPercent?: number
  todayGoalsCompleted?: number
  todayGoalsTotal?: number
  weekAverage?: number
  weekDelta?: number | null
  currentStreak?: number
  bestStreakEver?: number
  isNewBestStreak?: boolean
  lowActivityDays7?: number
}

export interface PhraseResult {
  title: string
  body: string
}

function extractJsonObjectText(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced) return fenced[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

/**
 * Dos familias de notificación, mismo prompt base pero distinta licencia de
 * tono: las de estadística/acción (logro, racha, objetivo, recordatorio) son
 * directas y quirúrgicas — el dato ES el mensaje, no necesitan calidez extra.
 * Las motivacionales (positiva, "volver a entrar", resumen semanal) son las
 * que acompañan cuando no hay un número puntual que festejar o resolver, así
 * que ahí sí hay lugar para un emoji con criterio y un poco más de calidez,
 * sin perder la voz (nunca "cheerleader").
 */
const MOTIVATIONAL_TYPES = new Set(['motivation_positive', 'motivation_comeback', 'recap_weekly'])

function buildPrompt(type: string, context: PhraseContext, fallbackTitle: string, fallbackBody: string): string {
  const isMotivational = MOTIVATIONAL_TYPES.has(type)
  const emojiRule = isMotivational
    ? 'Podés sumar como máximo 1 emoji, sólo si refuerza genuinamente el sentimiento del mensaje (nunca decorativo ni al final "porque sí").'
    : 'Sin emojis en el cuerpo salvo que la plantilla ya tuviera uno — acá el dato es el mensaje.'
  const toneNote = isMotivational
    ? 'Esta es una notificación motivacional (no hay un logro puntual ni una acción urgente que resolver): tenés algo más de licencia para la calidez humana, siempre y cuando siga siendo específica y no genérica.'
    : 'Esta es una notificación de estadística/acción: priorizá precisión y claridad sobre calidez — el número y la acción concreta van primero.'

  const contextSummary = JSON.stringify({
    tipo: type,
    tendencia: context.trend,
    nivelActividad: context.activityLevel,
    cumplimientoHoy: context.todayPercent,
    objetivosHoy: `${context.todayGoalsCompleted ?? 0}/${context.todayGoalsTotal ?? 0}`,
    promedioSemana: context.weekAverage,
    deltaSemana: context.weekDelta,
    rachaActual: context.currentStreak,
    mejorRachaHistorica: context.bestStreakEver,
    esNuevoRecordDeRacha: context.isNewBestStreak,
    diasBajaActividadUltimos7: context.lowActivityDays7,
  })

  return `Sos la voz de Mi Progreso. No sos un asistente de wellness genérico ni un coach de LinkedIn: sos
alguien que viene siguiendo de cerca el progreso real de esta persona, día a día, y le habla como alguien
que ya sabe lo que pasó — no como una app que manda un push. Tu personalidad: directa, con convicción,
inteligente, cercana, seca cuando conviene. Nunca infantil, nunca "cheerleader", nunca invasiva, nunca
hace sentir mal a la persona por no cumplir.

Fuerza, no volumen: no se trata de exclamar más fuerte, se trata de que cada palabra pese. Preferí
afirmaciones cortas y concretas por sobre adjetivos ("vas 4 días seguidos" pesa más que "vas increíble").
Nada de hedging ("tal vez", "podría ser", "capaz"): decidite y decilo. Evitá arrancar dos mensajes
seguidos con la misma estructura o palabra.

Ejemplos de lo que NO es esta voz (genérico, sin identidad, sin datos) vs. lo que SÍ es (específico, con
peso, anclado en el número real):
- NO: "¡Vas muy bien, seguí así!"  ·  SÍ: "4 días seguidos. Ya no es suerte, es rutina."
- NO: "No te olvides de completar tus objetivos de hoy."  ·  SÍ: "Quedan 2 objetivos y todavía es de tarde. Andá por el que más pesa."
- NO: "¡No te rindas, mañana será mejor!"  ·  SÍ: "Esta semana bajó. No hace falta remontarla toda hoy, alcanza con una acción."

Ya se decidió QUÉ notificación mandar (eso no lo decidís vos) — tu única tarea es redactar el título y
el cuerpo de ese mensaje, en español rioplatense, usando SÓLO los datos reales de este contexto (nunca
inventes números, nombres ni logros que no estén acá). Personalizá de verdad: el número concreto del
contexto (racha, porcentaje, delta semanal) tiene que aparecer o notarse en el mensaje, no quedar
implícito — es lo que lo distingue de un genérico. ${toneNote}
${contextSummary}

Mensaje de referencia (versión plantilla, es el piso — mejorala, dale más filo y personalidad, pero no la
contradigas ni inventes datos nuevos):
Título: "${fallbackTitle}"
Cuerpo: "${fallbackBody}"

Reglas estrictas:
- Cuerpo: una sola frase corta (máximo 22 palabras). ${emojiRule}
- Nunca frases genéricas tipo "¡Vos podés!", "¡Nunca te rindas!", "¡Hoy es un gran día!", "¡Seguí así!".
- Nunca dobles espacios ni comillas dentro del texto.
- Si el contexto sugiere un momento difícil (tendencia descendente, baja actividad), el tono acompaña
  con la misma franqueza, nunca culpa ni presiona ni suaviza de más (eso también sería genérico).
Respondé ÚNICAMENTE con un objeto JSON, sin texto adicional ni markdown: {"title": "...", "body": "..."}`
}

/**
 * Llama a la API de Claude para redactar el mensaje. Nunca lanza: cualquier
 * fallo (red, parseo, respuesta vacía) devuelve `null` — el llamador sigue
 * con la plantilla, que ya es un mensaje válido por sí sola.
 */
export async function phraseNotification(
  apiKey: string,
  type: string,
  context: PhraseContext,
  fallbackTitle: string,
  fallbackBody: string,
): Promise<PhraseResult | null> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 120,
        messages: [{ role: 'user', content: buildPrompt(type, context, fallbackTitle, fallbackBody) }],
      }),
    })
    if (!response.ok) {
      console.error('[phraseNotification] la API de Claude respondió con error', response.status, await response.text())
      return null
    }

    const data = (await response.json()) as { content?: Array<{ text?: string }> }
    const text = data.content?.[0]?.text ?? '{}'
    const parsed = JSON.parse(extractJsonObjectText(text)) as { title?: unknown; body?: unknown }
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    const body = typeof parsed.body === 'string' ? parsed.body.trim() : ''
    if (!title || !body) return null
    return { title, body }
  } catch (err) {
    console.error('[phraseNotification] no se pudo redactar el mensaje', err)
    return null
  }
}
