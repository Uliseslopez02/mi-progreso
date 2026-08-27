export const config = { runtime: 'edge' }

const MODEL = 'claude-haiku-4-5-20251001'

interface RequestBody {
  goalName?: string
  categoryName?: string
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/**
 * Valida el JWT de sesión de Supabase que manda el cliente (header
 * `Authorization: Bearer <token>`), reusando las mismas `VITE_SUPABASE_URL`/
 * `VITE_SUPABASE_ANON_KEY` que ya son públicas (Vercel las expone también a
 * las funciones server-side vía `process.env`, el prefijo `VITE_` sólo
 * decide qué entra al bundle del cliente). Sin esto, cualquiera que
 * descubriera esta URL podría llamarla sin estar logueado y gastar la cuota
 * de `ANTHROPIC_API_KEY`.
 */
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
 * Sugiere hábitos diarios para una meta recién creada, vía la API de Claude.
 * Vive en el servidor (Vercel Edge Function) para que `ANTHROPIC_API_KEY`
 * nunca llegue al bundle del cliente — a diferencia de `VITE_SUPABASE_*`, esta
 * clave no debe ser pública.
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

  const goalName = (body.goalName ?? '').trim().slice(0, 200)
  if (!goalName) {
    return jsonResponse({ error: 'Falta el nombre de la meta' }, 400)
  }
  const categoryName = (body.categoryName ?? '').trim().slice(0, 100)

  const prompt = `Meta del usuario: "${goalName}"${categoryName ? ` (categoría: ${categoryName})` : ''}.
Sugerí entre 3 y 5 hábitos diarios o semanales concretos y accionables que ayuden a lograr esa meta.
Cada hábito: una frase corta (máximo 6 palabras) en español, empezando con un verbo.
Respondé ÚNICAMENTE con un array JSON de strings, sin texto adicional ni markdown.
Ejemplo de formato: ["Entrenar 30 minutos", "Practicar técnica"]`

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

  let suggestions: string[] = []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      suggestions = parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 5)
    }
  } catch {
    suggestions = []
  }

  return jsonResponse({ suggestions }, 200)
}
