export const config = { runtime: 'edge' }

/**
 * Endpoint de diagnóstico TEMPORAL — para investigar por qué POST /preapproval
 * devuelve "User bad request" sin más detalle. Llama a /users/me de Mercado
 * Pago con el mismo MP_ACCESS_TOKEN configurado en el servidor y devuelve
 * solo metadata no sensible de la cuenta (nunca el token). Borrar este
 * archivo apenas se resuelva el diagnóstico.
 */
export default async function handler(): Promise<Response> {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'MP_ACCESS_TOKEN no configurada' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  const res = await fetch('https://api.mercadopago.com/users/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => null)

  return new Response(
    JSON.stringify({
      status: res.status,
      id: data?.id,
      nickname: data?.nickname,
      site_id: data?.site_id,
      country_id: data?.country_id,
      is_test_user: data?.is_test_user,
      live_mode: data?.live_mode,
      status_field: data?.status,
      collector_id: data?.collector?.id,
      tags: data?.tags,
      registration_identifiers: data?.registration_identifiers,
      error: data?.error,
      message: data?.message,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}
