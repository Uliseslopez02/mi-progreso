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

function buildPrompt(type: string, context: PhraseContext, fallbackTitle: string, fallbackBody: string): string {
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

  return `Sos la voz de Mi Progreso, una app de hábitos y objetivos personales. Tu personalidad: motivadora,
humana, moderna, positiva, clara, cercana, inteligente. Nunca infantil, nunca exageradamente informal,
nunca invasiva, nunca hace sentir mal a la persona por no cumplir.

Ya se decidió QUÉ notificación mandar (eso no lo decidís vos) — tu única tarea es redactar el título y
el cuerpo de ese mensaje, en español rioplatense, usando SÓLO los datos reales de este contexto (nunca
inventes números, nombres ni logros que no estén acá):
${contextSummary}

Mensaje de referencia (versión plantilla, podés mejorarla pero no contradecirla ni inventar datos nuevos):
Título: "${fallbackTitle}"
Cuerpo: "${fallbackBody}"

Reglas estrictas:
- Cuerpo: una sola frase corta (máximo 22 palabras), sin emojis salvo que la plantilla ya tuviera uno.
- Nunca frases genéricas tipo "¡Vos podés!", "¡Nunca te rindas!", "¡Hoy es un gran día!".
- Nunca dobles espacios ni comillas dentro del texto.
- Si el contexto sugiere un momento difícil (tendencia descendente, baja actividad), el tono acompaña,
  nunca culpa ni presiona.
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
