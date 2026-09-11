# CONTEXTO — Integración de IA de Mi Progreso (handoff para otro chat)

> Estado (actualizado 2026-09-11): **el fix de código (§4.B) ya se aplicó y está
> en producción** (commit `a42db12`, pusheado — `master` local = `origin/master`,
> deploy automático a `https://mi-progreso-one.vercel.app`). `npm run build` y
> `npm test` (313 tests) pasan. Verificado de nuevo: el bundle (`dist/`) no
> contiene "ANTHROPIC" ni "sk-ant"; los endpoints en producción devuelven
> `401 {"error":"No autenticado."}` limpio para requests sin sesión (sin fugas).
>
> **Lo único que falta es 100% de configuración (§4.A), no de código:** confirmar
> si `ANTHROPIC_API_KEY` ya está cargada en Vercel. No se pudo verificar desde
> acá (no hay `.vercel` linkeado ni credenciales) — hay que preguntarle al
> usuario o probarlo con una cuenta logueada real (ver §5).
>
> **Hallazgo nuevo (no es un bug, es una decisión de producto que ya tomó el
> usuario):** el commit `3f4171d` ("Objetivos: Metas primero, saca Sugerencias
> de Hábitos") sacó `<HabitInsightsCard />` de `HabitsPage.tsx`. La Función 2
> (insights de hábitos) quedó **huérfana**: `api/habit-insights.ts`,
> `src/domain/habitInsights.ts` y `src/components/HabitInsightsCard.tsx` siguen
> existiendo y funcionando, pero ya no se renderizan en ningún lado de la app.
> No se tocó nada de esto — es una decisión de UX del usuario, no algo para
> revertir sin que lo pida. Sólo queda como dato para la auditoría: si se deja
> así, `HabitInsightsCard.tsx` es código muerto (candidato a limpieza o a
> reconectar en otra pantalla, a decisión del usuario).
>
> Este archivo tiene todo lo necesario para retomar la tarea en otro chat sin
> volver a investigar. Creado 2026-09-10.

---

## 0. Objetivo de la tarea

El usuario reporta que en producción aparece este mensaje **directo al usuario**:

> "Falta configurar ANTHROPIC_API_KEY en el servidor."

Pantalla donde salió: **Objetivos → crear una meta → modal "Hábitos sugeridos"**.

Lo que se pide:
1. Auditar TODA la IA del proyecto (no sólo esa pantalla). ✅ hecho — ver §2.
2. Arreglar la **causa real** (configurar la API key), no ocultar el error.
3. Manejo de errores profesional: nunca mostrar mensajes técnicos, stack traces,
   nombres de variables de entorno. Mensaje amigable sólo como *fallback*.
4. Seguridad: `ANTHROPIC_API_KEY` sólo server-side, nunca en el cliente, logs,
   respuestas de API ni Git.
5. Probar las funciones de IA end-to-end.
6. NO romper la arquitectura existente. NO inventar API keys. NO hardcodear.

---

## 1. Stack y arquitectura (ya verificado)

- **Frontend:** React 18 + TypeScript + Vite 8. SPA. PWA con `vite-plugin-pwa`.
- **Backend:** **Vercel** (`vercel.json` en la raíz). Las funciones viven en
  `api/*.ts` y son **Vercel Edge Functions** (`export const config = { runtime: 'edge' }`).
- **DB / auth:** Supabase (proyecto `iwnrmzbdhrqwcbouhyqf`). Migraciones en
  `supabase/migrations/`.
- **Repo:** `https://github.com/Uliseslopez02/mi-progreso.git` (rama de trabajo
  actual según git log: commits de `/presentacion`).
- **Llamada a Claude:** `fetch` directo a `https://api.anthropic.com/v1/messages`
  (raw HTTP, sin SDK). Headers: `x-api-key`, `anthropic-version: 2023-06-01`.
  **Mantener este approach** — no meter `@anthropic-ai/sdk`, el usuario pidió no
  cambiar tecnologías.
- **Modelo usado:** `claude-haiku-4-5-20251001` (constante `MODEL` en ambos
  endpoints). Es un ID válido y vigente. **No cambiarlo** (el usuario pidió no
  cambiar modelos "porque sí"). `max_tokens: 300` en ambos.

### Variables de entorno
- `.env.local` (gitignored) hoy sólo tiene `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY`.
- `.env.example` **ya documenta** `ANTHROPIC_API_KEY=` (sin prefijo `VITE_`, a
  propósito, con comentario explicando que nunca debe llegar al bundle).
- `.gitignore`: ignora `.env` y `.env.*` excepto `!.env.example`. Correcto.
- Los endpoints leen `process.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  también server-side (Vercel expone TODAS las env vars a las functions; el
  prefijo `VITE_` sólo decide qué entra al bundle del cliente). Eso ya funciona
  → implica que esas dos vars SÍ están configuradas en Vercel.

---

## 2. AUDITORÍA — Funciones de IA encontradas (son exactamente 2)

Confirmado también por `CONTEXTO_FREEMIUM.md` línea 155/183: *"IA (sugerencias de
hábitos + insights de historial)"*. No hay ninguna otra. "Objetivos inteligentes"
(`0004_smart_goals.sql`) NO es IA — son metas cuantitativas/temporales.

### FUNCIÓN 1 — "Hábitos sugeridos" (suggest-habits)

| | |
|---|---|
| **Qué hace** | Al crear una meta, sugiere 3-5 hábitos diarios/semanales concretos para lograrla, con frecuencia (veces/semana) por hábito. El usuario elige cuáles crear. |
| **Endpoint** | `api/suggest-habits.ts` (Vercel Edge Function, `POST /api/suggest-habits`) |
| **Cliente** | `src/domain/habitSuggestions.ts` → `suggestHabits(goalName, categoryName)` |
| **UI** | `src/components/HabitSuggestionModal.tsx`, abierto desde `src/pages/GoalsPage.tsx` (`suggestingFor` state, ~línea 271) |
| **Modelo** | `claude-haiku-4-5-20251001`, `max_tokens: 300`, pide array JSON `[{text, timesPerWeek}]` |
| **Auth/gating** | `isAuthenticated()` (valida JWT Supabase) + `checkAiUsageAllowed()` (RPC `increment_ai_usage`, Free = 3/mes, Premium ilimitado) |
| **¿Funciona hoy?** | ❌ NO. Devuelve `500 { error: "Falta configurar ANTHROPIC_API_KEY en el servidor." }` en `api/suggest-habits.ts:96-99` porque la env var no está seteada en Vercel. |

### FUNCIÓN 2 — "Sugerencias" / insights de hábitos (habit-insights)

| | |
|---|---|
| **Qué hace** | Coach proactivo: analiza agregados de cumplimiento de los últimos 30 días (rachas, % por día de semana, % por categoría, días desde última vez) y devuelve hasta 3 observaciones accionables. Nunca cambia nada solo. |
| **Endpoint** | `api/habit-insights.ts` (Vercel Edge Function, `POST /api/habit-insights`) |
| **Cliente** | `src/domain/habitInsights.ts` → `buildHabitInsightsPayload()` + `fetchHabitInsights()` |
| **UI** | `src/components/HabitInsightsCard.tsx`, renderizado en `src/pages/HabitsPage.tsx:151`. Se pide bajo botón explícito ("Ver sugerencias"/"Actualizar"), se cachea por día en `localStorage` (`mi-progreso:habit-insights:<fecha>`). |
| **Modelo** | `claude-haiku-4-5-20251001`, `max_tokens: 300`, pide array JSON de strings |
| **Auth/gating** | Igual que Función 1. Además: si `habits.length === 0` devuelve `{ insights: [] }` sin gastar cuota. |
| **¿Funciona hoy?** | ❌ NO. Mismo problema: `api/habit-insights.ts:95-98`. |

### Datos que se mandan a la IA (privacidad — ya OK)
- suggest-habits: sólo `goalName` + `categoryName` (recortados a 200/100 chars).
- habit-insights: sólo **agregados numéricos** (nunca historial día por día ni
  datos personales). Construidos en `buildHabitInsightsPayload()` reusando
  `consistency.ts`.

---

## 3. CAUSA RAÍZ

**`ANTHROPIC_API_KEY` no está configurada como variable de entorno en Vercel.**

Prueba: el mensaje que ve el usuario sólo se devuelve en la línea 96-99 de
`suggest-habits.ts`, **después** de que `isAuthenticated()` y
`checkAiUsageAllowed()` pasaron OK. O sea: auth funciona, el RPC de cuota
funciona, y lo único que falta es la clave de Anthropic.

No hay `ANTHROPIC_API_KEY` hardcodeada en ningún lado (verificado con grep en
todo el repo). Nunca estuvo en git history (verificado con `git rev-list --all` +
grep). El bundle `dist/` no contiene "anthropic" ni "sk-ant" (verificado). Así
que **seguridad hoy = OK**; el único problema real es que la clave no existe en
el servidor.

---

## 4. LO QUE HAY QUE HACER

### 4.A — Configuración (la hace EL USUARIO, no el asistente)

Instrucciones exactas a darle:

1. **Obtener una API key de Anthropic:** https://console.anthropic.com/ →
   Settings → API Keys → "Create Key". Copiar el valor `sk-ant-...` (se ve una
   sola vez).
2. **Configurarla en Vercel:**
   - Vercel Dashboard → proyecto **mi-progreso** → **Settings → Environment
     Variables**.
   - Name: `ANTHROPIC_API_KEY`
   - Value: la clave `sk-ant-...`
   - Environments: marcar **Production**, **Preview** y **Development**.
   - Save.
3. **Redeploy:** Deployments → último deploy → "⋯" → **Redeploy** (o push a la
   rama). Las env vars nuevas sólo aplican a deploys posteriores.
4. **Para probar en local** (opcional): agregar `ANTHROPIC_API_KEY=sk-ant-...` a
   `.env.local` (ya está gitignored) y correr con **`vercel dev`** (NO `npm run
   dev` — Vite solo no ejecuta las functions de `api/`). Si no tiene Vercel CLI:
   `npm i -g vercel` y `vercel link`.

> ⚠️ El asistente NO debe inventar/generar la clave ni pegarla en el código.

### 4.B — Código: manejo de errores profesional (lo hace el asistente)

**Problema:** hoy el string crudo del servidor llega hasta la pantalla:
- `api/suggest-habits.ts:98` y `api/habit-insights.ts:97` devuelven el nombre de
  la env var.
- `src/domain/habitSuggestions.ts:36` y `src/domain/habitInsights.ts:96` hacen
  `body?.error ?? '...'` → reenvían texto del servidor tal cual.
- `HabitSuggestionModal.tsx:102` y `HabitInsightsCard.tsx:75` lo pintan en
  `<p className="empty">{errorMessage}</p>`.

**Fix propuesto (plan acordado, NO aplicado):**

#### Servidor — `api/suggest-habits.ts` y `api/habit-insights.ts`

1. Agregar constante arriba (después de `const MODEL`):
   ```ts
   /**
    * Único mensaje que ve la persona usuaria ante cualquier fallo del servicio
    * de IA (clave sin configurar, timeout, error de la API de Claude, respuesta
    * ilegible). Nunca incluye detalles técnicos, nombres de variables ni stack
    * traces — esos van sólo a console.error para el operador.
    */
   const AI_UNAVAILABLE_MESSAGE =
     'No pudimos generar las sugerencias en este momento. Probá de nuevo en unos segundos.'
   ```
2. Reemplazar el branch de la key faltante:
   ```ts
   const apiKey = process.env.ANTHROPIC_API_KEY
   if (!apiKey) {
     console.error('[suggest-habits] ANTHROPIC_API_KEY no está configurada en el entorno del servidor')
     return jsonResponse({ error: AI_UNAVAILABLE_MESSAGE, code: 'ai_unavailable' }, 503)
   }
   ```
   (en habit-insights, prefijo `[habit-insights]`).
3. En el `catch` del `fetch` a la API de Claude y en el `if (!response.ok)`:
   loguear el detalle real con `console.error` (incluído `response.status` y
   `await response.text()`), y devolver
   `{ error: AI_UNAVAILABLE_MESSAGE, code: 'ai_unavailable' }` con `503`.
4. (Opcional) `console.error` también en el `catch` del `JSON.parse` de la
   respuesta.
5. **NO tocar:** el `401 { error: 'No autenticado.' }` ni el
   `403 { code: 'ai_limit_reached' }` — son legítimos y no técnicos.

#### Cliente — `src/domain/habitSuggestions.ts` y `src/domain/habitInsights.ts`

1. Constante local:
   ```ts
   const GENERIC_SUGGESTIONS_ERROR =
     'No pudimos generar las sugerencias en este momento. Probá de nuevo en unos segundos.'
   ```
2. En `if (!res.ok)`: sólo dejar pasar el texto del servidor para
   `code === 'ai_limit_reached'` (que igual lo renderiza `AiUpsellCard`, no el
   string). Para cualquier otro caso, devolver `GENERIC_SUGGESTIONS_ERROR` y
   pasar `code: body?.code` igual.
   ```ts
   if (!res.ok) {
     const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
     if (body?.code === 'ai_limit_reached') {
       return { ok: false, error: body.error ?? GENERIC_SUGGESTIONS_ERROR, code: body.code }
     }
     return { ok: false, error: GENERIC_SUGGESTIONS_ERROR, code: body?.code }
   }
   ```
3. Alinear el mensaje del `catch` final con `GENERIC_SUGGESTIONS_ERROR`.
4. `habitInsights.ts` igual (mismo texto o "las sugerencias").

#### UI — opcional, menor
- `HabitInsightsCard.tsx` y `HabitSuggestionModal.tsx` ya separan el caso
  `ai_limit_reached` (→ `AiUpsellCard`) del resto (→ `<p className="empty">`).
  Con el fix de arriba el `<p>` ya muestra copy amigable. No hace falta tocar,
  salvo que se quiera mejorar el texto/spinner.

### 4.C — NO hace falta tocar
- Seguridad de la key: ya está bien (sin prefijo VITE, sólo server, gitignored,
  nunca commiteada, no en el bundle). Sólo **verificar de nuevo** tras los
  cambios que ningún `console.log`/respuesta filtre el valor (los `console.error`
  propuestos sólo dicen "no está configurada", nunca imprimen la clave).
- `isAuthenticated()` / `checkAiUsageAllowed()`: correctas.
- El gating freemium (`0023`, `0024`): correcto.

---

## 5. PRUEBAS a correr al terminar

Precondición: `ANTHROPIC_API_KEY` configurada en Vercel + redeploy (o `vercel dev`
en local con `.env.local`).

1. `npm run build` — compila sin errores de TS.
2. `npm test` — la suite de Vitest sigue verde.
3. **Función 1:** login → Objetivos → crear meta ("volver a jugar al futbol") →
   se abre "Hábitos sugeridos" → aparece "Pensando sugerencias…" → llegan 3-5
   hábitos reales con checkbox y veces/semana → "Agregar hábitos" los crea y
   (si el check está) actualiza el % de la meta.
4. **Función 2:** con al menos 1 hábito y algo de historial → Hábitos → card
   "Sugerencias" → "Ver sugerencias" → llegan hasta 3 observaciones; se cachean
   (recargar no vuelve a llamar).
5. **Sin API key** (revertir env var y probar, o mockear): la UI muestra
   "No pudimos generar las sugerencias en este momento…", **nunca**
   "ANTHROPIC_API_KEY". Revisar Network tab: el body de la respuesta 503 no
   contiene el nombre de la variable ni stack trace.
6. DevTools → Sources / Network: el bundle del cliente no contiene "sk-ant" ni
   "ANTHROPIC_API_KEY" (buscar en los `assets/*.js`).
7. Límite Free: gastar 3 usos → el 4º muestra `AiUpsellCard` ("Conocer Premium"),
   no un error.
8. Consola del navegador sin errores rojos durante los flujos.

---

## 6. Checklist de entrega (lo que el usuario quiere de vuelta)

- [ ] **Config aplicada por el usuario: `ANTHROPIC_API_KEY` en Vercel + redeploy.**
      ← ÚNICO pendiente real. Preguntarle directamente si ya lo hizo.
- [x] `api/suggest-habits.ts` — error handling arreglado (§4.B). Commit `a42db12`.
- [x] `api/habit-insights.ts` — error handling arreglado (§4.B). Commit `a42db12`.
- [x] `src/domain/habitSuggestions.ts` — no reenvía texto crudo del server. Commit `a42db12`.
- [x] `src/domain/habitInsights.ts` — idem. Commit `a42db12`.
- [x] `npm run build` + `npm test` OK (verificado 2026-09-11: build limpio, 313/313 tests).
- [~] Pruebas §5 — hechas parcialmente el 2026-09-11 con la sesión real del
      usuario (vía Claude in Chrome, ya logueado): se creó una meta de prueba
      ("Probar IA de hábitos") en `/objetivos` → se abrió el modal "Hábitos
      sugeridos" → la llamada real a `POST /api/suggest-habits` devolvió
      **403 `ai_limit_reached`**, y la UI mostró el upsell correcto ("Ya usaste
      tus 3 sugerencias de IA este mes. Con Premium, la IA te acompaña sin
      límites." + botón "Conocer Premium") — **cero rastro del error técnico
      de `ANTHROPIC_API_KEY`**. Meta de prueba borrada después.
      **Lo que esto confirma:** auth ✅, gating de cuota ✅, el fix de error
      handling (§4.B) ✅ funcionando en producción.
      **Lo que esto NO confirma:** si `ANTHROPIC_API_KEY` ya está cargada en
      Vercel — el chequeo de la key ocurre DESPUÉS de `checkAiUsageAllowed()`
      en el código, así que un 403 por cuota agotada nunca llega a probarla.
      Esta cuenta (Free) ya gastó sus 3 usos del mes — probablemente varios se
      quemaron en intentos previos que fallaban por la key faltante (el
      contador se incrementa aunque después falle la llamada a Claude: mirar
      si vale la pena arreglar eso aparte). Para terminar de confirmar la
      key hace falta una de estas (decisión del usuario, no la tomé sola):
        a) Pasar esta cuenta a `premium` en Supabase (tabla `subscriptions` o
           `profiles.plan`) temporalmente y repetir la prueba, revirtiendo
           después.
        b) Borrar la fila de `ai_usage` del mes actual para este usuario
           (SQL Editor de Supabase: `delete from ai_usage where user_id =
           '<uid>' and year_month = to_char(now(),'YYYY-MM');`) y repetir.
        c) Esperar al 1° de octubre (reset automático de cuota).
      `curl` anónimo a los dos endpoints en prod devuelve
      `401 {"error":"No autenticado."}` limpio (sin fugas) — lo único
      verificable sin sesión.
- [x] Verificado: la key no está en bundle (`dist/`) / git history / hardcodeada.
      Pendiente el único chequeo que requiere acceso real: que no aparezca en
      logs de Vercel (Runtime Logs) — ahí sólo deberían verse los
      `console.error('[suggest-habits] ANTHROPIC_API_KEY no está...')` sin el
      valor, nunca la key en sí.
- [ ] Resumen final al usuario: funciones encontradas, qué estaba roto, causa,
      qué se modificó, qué configurar manualmente, cómo comprobar.
- [ ] Decisión pendiente (no bloqueante): ¿qué hacer con `HabitInsightsCard`
      huérfana? (ver nota arriba). Sólo actuar si el usuario lo pide.

---

## 7. Archivos clave (rutas)

```
api/suggest-habits.ts          endpoint Función 1  ← FIX
api/habit-insights.ts          endpoint Función 2  ← FIX
src/domain/habitSuggestions.ts cliente Función 1   ← FIX
src/domain/habitInsights.ts    cliente Función 2   ← FIX
src/components/HabitSuggestionModal.tsx  UI modal "Hábitos sugeridos"
src/components/HabitInsightsCard.tsx     UI card "Sugerencias"
src/components/AiUpsellCard.tsx          UI upsell cuando se agota la cuota
src/pages/GoalsPage.tsx                  abre el modal al crear meta
src/pages/HabitsPage.tsx:151             monta HabitInsightsCard
.env.example                            documenta ANTHROPIC_API_KEY (OK)
supabase/migrations/0023_subscriptions.sql  RPC increment_ai_usage (gating IA)
vercel.json                             confirma hosting = Vercel
```

Model migration ref (si alguna vez se toca el modelo): skill `claude-api`,
Haiku 4.5 = `claude-haiku-4-5` (el ID con fecha `-20251001` también es válido).
