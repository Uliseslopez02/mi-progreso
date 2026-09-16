export const config = { runtime: 'edge' }

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

interface RequestBody {
  endpoint?: string
}

/** Borra una suscripción Web Push propia. Mismo criterio de auth que push-subscribe.ts. */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !supabaseUrl || !anonKey) {
    return jsonResponse({ error: 'No autenticado.' }, 401)
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400)
  }

  const endpoint = (body.endpoint ?? '').trim()
  if (!endpoint) return jsonResponse({ error: 'Falta el endpoint' }, 400)

  const res = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
    headers: { apikey: anonKey, authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    console.error('[push-unsubscribe] no se pudo borrar la suscripción', res.status, await res.text())
    return jsonResponse({ error: 'No se pudo cancelar la suscripción.' }, 502)
  }

  return jsonResponse({ ok: true }, 200)
}
