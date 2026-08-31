export const config = { runtime: 'edge' }

const MODEL = 'claude-haiku-4-5-20251001'

interface HabitAggregate {
  name: string
  percent: number
  daysPresent: number
  currentStreak: number
  bestStreak: number
  daysSinceLastCompletion: number | null
}

interface WeekdayAggregate {
  weekday: string
  percent: number
}

interface CategoryAggregate {
  name: string
  percent: number
}

interface RequestBody {
  habits?: HabitAggregate[]
  weekdays?: WeekdayAggregate[]
  categories?: CategoryAggregate[]
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Ver la misma función en api/suggest-habits.ts — mismo criterio de auth. */
async function isAuthenticated(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !supabaseUrl || !anonKey) return false

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, authorization: `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Sugerencias proactivas basadas en el historial real de cumplimiento —
 * rachas, días de la semana, categorías. Vive en el servidor (Vercel Edge
 * Function) por el mismo motivo que `suggest-habits.ts`: `ANTHROPIC_API_KEY`
 * nunca llega al bundle del cliente. El cliente sólo manda AGREGADOS
 * (números resumidos, ver `domain/habitInsights.ts`), nunca el historial día
 * por día — ni falta hace para este análisis.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  if (!(await isAuthenticated(request))) {
    return jsonResponse({ error: 'No autenticado.' }, 401)
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return jsonResponse({ error: 'Falta configurar ANTHROPIC_API_KEY en el servidor.' }, 500)
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400)
  }

  const habits = Array.isArray(body.habits) ? body.habits.slice(0, 30) : []
  const weekdays = Array.isArray(body.weekdays) ? body.weekdays.slice(0, 7) : []
  const categories = Array.isArray(body.categories) ? body.categories.slice(0, 20) : []

  // Sin hábitos no hay nada real para analizar — evita gastar cuota de Claude
  // en un caso que siempre va a devolver "no hay suficientes datos".
  if (habits.length === 0) {
    return jsonResponse({ insights: [] }, 200)
  }

  const summary = JSON.stringify({ habits, weekdays, categories })
  const prompt = `Estos son datos agregados (nunca información personal) de cumplimiento de hábitos de
un usuario en los últimos 30 días:
${summary}

Cada hábito trae: percent (% cumplido), daysPresent (días que estuvo vigente), currentStreak/
bestStreak (racha actual/mejor), daysSinceLastCompletion (días desde la última vez que se cumplió;
null = nunca en los últimos 90 días). weekdays trae el % de cumplimiento agrupado por día de la
semana. categories trae el % por categoría.

Actuá como un coach breve y concreto. Con estos datos y SÓLO estos datos (no inventes nada que no
esté acá), generá hasta 3 observaciones o sugerencias cortas y accionables en español, en segunda
persona ("cumplís", "llevás"), sobre patrones reales: un día de la semana con cumplimiento
notablemente mejor o peor que el resto, un hábito con racha rota o daysSinceLastCompletion alto
(abandonado), o una categoría floja. Si los datos no alcanzan para una observación real, no la
inventes — devolvé menos de 3, incluso un array vacío.
Respondé ÚNICAMENTE con un array JSON de strings, sin texto adicional ni markdown.
Ejemplo de formato: ["Cumplís mejor los martes y jueves que el resto de la semana.", "Meditar lleva 12 días sin marcarse — ¿bajamos la frecuencia?"]`

  let response: Response
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch {
    return jsonResponse({ error: 'No se pudo contactar el servicio de sugerencias.' }, 502)
  }

  if (!response.ok) {
    return jsonResponse({ error: 'El servicio de sugerencias no respondió correctamente.' }, 502)
  }

  const data = (await response.json()) as { content?: Array<{ text?: string }> }
  const text = data.content?.[0]?.text ?? '[]'

  let insights: string[] = []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      insights = parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 3)
    }
  } catch {
    insights = []
  }

  return jsonResponse({ insights }, 200)
}
