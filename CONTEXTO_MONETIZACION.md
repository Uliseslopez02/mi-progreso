# Mi Progreso — Monetización y suscripciones: estado y contexto

Este archivo resume la sesión de trabajo sobre el sistema de comercialización de
Mi Progreso (registro, prueba, planes, pagos, suscripciones). Pensado para que
vos o cualquier sesión futura de Claude puedan retomar sin releer todo el chat.

## 1. Decisión de modelo comercial (ya tomada, no volver a discutir)

Se analizaron 6 modelos (trial con tarjeta, freemium clásico, demo sin
registro, límites por uso, freemium+IA, mensual/anual) y se comparó contra la
competencia real del rubro (Habitica, Streaks, HabitBull, Habitify, Discy,
Coach.me, etc.).

**Modelo elegido — Opción 1, freemium con límite suave de IA:**
- Free: absolutamente todo el tracking (hábitos, objetivos, agenda, proyectos,
  informes, notas) sin límite de tiempo ni de uso. Sin pedir tarjeta nunca.
- Premium: IA sin límite (sugerencias de hábitos + insights de historial —
  las 2 únicas features que hoy cuestan dinero real, llamadas a Claude).
- Free da 3 usos de IA **por mes calendario** (se resetea el día 1), no de por
  vida.
- Precio de referencia (research de mercado, Discy/Habitify cobran
  US$2,49–2,99/mes con el mismo mecanismo): arrancamos en **$3.900/mes** y
  **$42.000/año** (ajustado por vos de $32.000 a $42.000 durante esta sesión).
  100% configurable sin tocar código (ver sección 4).

**Por qué esta y no las otras 2 opciones** (más simple / más agresiva): la
elegida da la mejor relación conversión/fricción para una app que recién
empieza a monetizar. Queda documentado por si en el futuro se quiere migrar a
un trial con tarjeta.

## 2. Arquitectura implementada

**Proveedor de pago: Mercado Pago** (Stripe descartado — no emite cuentas de
comercio a negocios radicados en Argentina).

**Base de datos** (`supabase/migrations/0023_subscriptions.sql`, YA APLICADA
en producción):
- Tabla `subscriptions`: status (`free/trial/active/past_due/canceled/expired`),
  plan_tier, payment_provider, mp_preapproval_id, mp_customer_email,
  current_period_start/end, canceled_at.
- Tabla `ai_usage`: contador de uso de IA por usuario y mes calendario
  (`user_id`, `year_month`, `count`).
- Función `increment_ai_usage()` (security definer): gating real de IA en el
  backend — un usuario NO puede desbloquear IA ilimitada editando el frontend,
  localStorage o el request; el límite se aplica en Postgres.
- Trigger que sincroniza `profiles.plan` (columna vieja, ya existía) a partir
  de `subscriptions.status`, para no romper nada que ya leyera esa columna.

**Edge Functions nuevas** (Vercel, mismo patrón que las 2 que ya existían para
IA):
- `api/checkout.ts` — crea la suscripción en Mercado Pago y devuelve la URL de
  checkout hosteado. **Importante (bug real encontrado y corregido en esta
  sesión):** una suscripción "con plan asociado" (`preapproval_plan_id`) exige
  que el backend ya tenga la tarjeta tokenizada (`card_token_id`) y
  `status:'authorized'` — Mercado Pago NO ofrece ahí un checkout hosteado
  pendiente. Por eso se usa una suscripción **"sin plan asociado"**, con
  `auto_recurring` armado inline a partir de `MP_PRICE_MONTHLY_ARS` /
  `MP_PRICE_YEARLY_ARS` (env vars, montos enteros en ARS) — sí soporta
  `status:'pending'` devolviendo un `init_point` real sin tocar datos de
  tarjeta nosotros.
- `api/mp-webhook.ts` — recibe notificaciones de Mercado Pago, valida la firma
  `x-signature` (HMAC-SHA256 del manifest oficial, con el `data.id` en
  minúsculas — gotcha real de la API), vuelve a consultar el recurso completo
  a la API de MP (nunca confía en el body de la notificación), y actualiza
  `subscriptions` con la service-role key. El plan (mensual/anual) se infiere
  de la `frequency` real que devuelve MP (1 mes vs 12 meses), no de un id de
  plan.
- `api/cancel-subscription.ts` — cancela la suscripción activa del usuario
  autenticado.

**Frontend**:
- `src/pages/PremiumPage.tsx` — pantalla de precios, rediseñada durante esta
  sesión (copy más cercano, beneficios en tarjetas escaneables, toggle
  mensual/anual, precio anual con su equivalente mensual calculado, botón
  "Empezar con Premium"). Vista distinta si ya sos Premium (plan, fecha de
  renovación, botón de cancelar — antes vivía en Ajustes, se movió acá).
- `src/pages/PremiumConfirmationPage.tsx` — pantalla de vuelta del checkout,
  hace polling de `getSubscriptionSummary()` hasta confirmar el pago (la
  confirmación real llega async por webhook).
- `src/components/AiUpsellCard.tsx` — paywall de valor (nunca "no tenés
  acceso") que reemplaza el error cuando `api/suggest-habits.ts` /
  `api/habit-insights.ts` devuelven `code:'ai_limit_reached'`.
- `src/pages/SettingsPage.tsx` — entrada dedicada y visible arriba de Ajustes
  ("Pasar a Premium →" / "Premium ✨"), tarjeta con estilo propio
  (`.premium-entry` en `global.css`).
- `src/domain/analytics.ts` — eventos del funnel (`paywall_viewed`,
  `premium_page_viewed`, `checkout_started/redirected/failed`,
  `premium_confirmed`, `subscription_canceled`). Sin proveedor real todavía,
  sólo `console.debug` en dev — listo para enchufar PostHog/Amplitude/GA el
  día que se sume uno, sin tocar los call sites.
- `src/domain/premiumPricing.ts` — funciones puras (`yearlySavingsPercent`,
  `monthlyEquivalentLabel`) para no hardcodear el % de ahorro ni el
  equivalente mensual. **Bug real encontrado y corregido:** el separador de
  miles argentino ("32.000") se interpretaba como decimal en `Number()`.

**Variables de entorno en Vercel** (ya cargadas por vos):
`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_PRICE_MONTHLY_ARS`,
`MP_PRICE_YEARLY_ARS`, `SUPABASE_SERVICE_ROLE_KEY`,
`VITE_PREMIUM_MONTHLY_PRICE_LABEL`, `VITE_PREMIUM_YEARLY_PRICE_LABEL`.
(`MP_PLAN_ID_MONTHLY`/`MP_PLAN_ID_YEARLY` quedaron cargadas pero **ya no se
usan** — se puede dejar así o borrarlas, no rompe nada.)

## 3. Pasos manuales ya completados por vos

1. App "miprogreso" creada en Mercado Pago Developers (integración
   Suscripciones).
2. Webhook configurado apuntando a
   `https://mi-progreso-one.vercel.app/api/mp-webhook`, evento "Planes y
   suscripciones", con Clave secreta generada.
3. Las 7 variables de entorno cargadas en Vercel (ver arriba).
4. Migración `0023_subscriptions.sql` aplicada en Supabase (SQL Editor,
   "Success").
5. Código pusheado a producción (3 commits en `master`: sistema completo,
   rediseño de la pantalla Premium, fix del bug de checkout).
6. Ajustaste el precio anual a $42.000 (de los $32.000 originales) — recordá
   que son 2 lugares (`MP_PRICE_YEARLY_ARS` + `VITE_PREMIUM_YEARLY_PRICE_LABEL`)
   y dijiste que ya actualizaste los 2.

## 4. Dónde estamos ahora mismo (pendiente de confirmar)

Se probó el botón "Empezar con Premium" en producción 3 veces:
1. Primer intento: `card_token_id is required` → causa raíz identificada y
   corregida (ver sección 2, cambio de "plan asociado" a "sin plan asociado").
2. Segundo intento: `Plan inválido o precio sin configurar.` → las env vars
   `MP_PRICE_*_ARS` no estaban cargadas todavía en ese momento.
3. Recién cargaste esas variables (con $42.000 en vez de $32.000) y dijiste
   "listo todo" — **todavía no confirmaste el resultado del último intento**.

**Próximo paso**: correr el flujo completo una vez más desde
`mi-progreso-one.vercel.app/premium` con tu cuenta real, tocar "Empezar con
Premium", y confirmar si redirige bien a Mercado Pago (o pegar el mensaje de
error exacto si vuelve a fallar). Si redirige bien, el siguiente hito es
completar un pago real de prueba (con un monto que vos decidas, incluso
después cancelarlo) para confirmar que el webhook marca la cuenta como
Premium de punta a punta.

## 5. Cosas para tener presente

- **Hay otra sesión de Claude trabajando en paralelo** en la rama
  `feat/agenda-kanban-email-ux` (email de confirmación, drag&drop de
  Proyectos, limpieza de Agenda) — con cambios sin commitear en `src/main.tsx`
  y una carpeta nueva `src/presentacion/`. Antes de commitear cualquier cosa
  nueva, correr `git branch --show-current` y si no es `master`, guardar ese
  WIP con `git stash push -u`, cambiar a `master`, commitear/pushear ahí, y
  restaurar la rama + `git stash pop` al final. Ya pasó 3 veces en esta sesión
  que el working directory apareció parado en esa rama sin que nadie lo
  pidiera explícitamente.
- El Access Token de Mercado Pago y el `service_role` key de Supabase quedaron
  visibles en texto plano en capturas de esta conversación (errores de
  paste). Sigue pendiente que los rotes si no lo hiciste ya — no es urgente
  pero es buena práctica.
- El script `scripts/crear-planes-mp.ps1` (creación de los 2
  `preapproval_plan` que ya no se usan) puede borrarse si querés prolijidad,
  no hace nada dañino si se queda.

## 6. Explícitamente fuera de alcance en esta sesión (documentado, no
implementado)

Del pedido original de 28 secciones, quedaron sólo como estrategia/diseño,
sin código:
- Emails transaccionales (bienvenida, fin de prueba, pago rechazado, etc.).
- Panel de administración con MRR/ARR/churn.
- Cupones, multi-moneda, múltiples proveedores de pago, afiliados.

Nada de esto está bloqueado — el diseño (columna `payment_provider`, analytics
ya emitiendo eventos) está pensado para poder sumarlos después sin
reescribir lo que ya existe.
