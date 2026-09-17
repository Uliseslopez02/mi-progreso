# Mi Progreso — Sistema de notificaciones: handoff para el próximo chat

Prompt de contexto y pendientes del sistema de notificaciones inteligentes. Si
estás retomando esto en otra sesión, **leé esto entero antes de tocar nada**.

---

## 1. Qué es esto

Se diseñó e implementó un sistema de notificaciones inteligente y contextual
(no recordatorios genéricos): un motor de reglas que analiza el progreso real
del usuario (rachas, tendencia semanal, actividad reciente) y decide qué
notificar y con qué prioridad, con una capa opcional de IA que sólo redacta
el tono del mensaje de mayor prioridad del día (nunca decide qué notificar ni
inventa datos). Incluye centro de notificaciones in-app (funciona incluso sin
cuenta) y notificaciones push reales (Web Push/VAPID) para cuando la app está
cerrada.

**No hace falta releer el prompt original** — lo esencial:
- Prioridad: **logro > riesgo de perder racha > objetivo por cerrar >
  motivación/resumen semanal > recordatorio matutino**.
- Anti-spam: tope diario y semanal, deduplicación contra el propio historial
  de notificaciones (sin tabla de estado aparte).
- La IA (Haiku 4.5, mismo modelo que ya usaba la app) tiene **presupuesto
  propio**, separado de la cuota de "Hábitos sugeridos"/"Sugerencias" (3/mes
  en Free) — esto es una feature del producto, no un beneficio Premium.
- Tono: motivador, humano, cercano, nunca infantil ni culpabilizador. Nunca
  frases genéricas tipo "¡Vos podés!".

---

## 2. Estado del repo (al cierre de esta sesión, 2026-09-16)

- **Todo el trabajo está en la rama `feat/notificaciones-ia`**, HEAD en
  commit `949c798` ("Sistema de notificaciones inteligentes: motor de
  reglas, logros, centro in-app y push real"), **pusheada a
  `origin/feat/notificaciones-ia`** y en sync.
- **PR abierto:** https://github.com/Uliseslopez02/mi-progreso/pull/3
  (`feat/notificaciones-ia` → `master`). **CI en verde** (2 checks pasando,
  0 fallando), `mergeable: true`, sin conflictos. Todavía sin mergear.
- `master` intacto en remoto.
- **El trabajo se hizo en un worktree aparte**, no en el directorio
  principal: `C:\Users\Tobi\Claude\mi-progreso-notificaciones` (rama
  `feat/notificaciones-ia`, working tree limpio, nada pendiente de
  commitear ahí). Esto fue a propósito, mismo criterio que la rama de
  freemium: el directorio principal (`C:\Users\Tobi\Claude\mi-progreso`)
  suele tener WIP sin commitear de otras sesiones corriendo en paralelo —
  **antes de tocar nada ahí**: `git branch --show-current` + `git status`.
  Para seguir trabajando en `feat/notificaciones-ia` sin arriesgar ese WIP,
  el worktree ya existe:
  ```bash
  cd C:\Users\Tobi\Claude\mi-progreso-notificaciones
  git status   # debería estar limpio
  ```
  Si por algún motivo hay que recrearlo desde cero en otra sesión:
  ```bash
  git fetch origin
  git worktree add ../mi-progreso-notificaciones-2 feat/notificaciones-ia
  cd ../mi-progreso-notificaciones-2
  npm install   # este worktree NO comparte node_modules con el principal
                # (se intentó un junction y npm lo reemplazó por una copia real)
  ```
- Verde al cierre en ese worktree: `npx tsc -b` (app), `npx tsc -p
  tsconfig.sw.json` (service worker), `npx tsc -p tsconfig.api.json`
  (funciones serverless), `npx eslint .` (sin errores nuevos — los que
  aparecen en `storage/*Repository.ts` ya estaban en `master`, no son de
  esto), `npm run build` (verde, `dist/sw.js` generado con los handlers de
  `push`/`notificationclick` confirmados a mano), **`npx vitest run`:
  334/334 tests** (17 nuevos, para el motor de reglas y los logros).
  Nota: la suite tiene tests de integración con `userEvent` + timers que son
  **flaky bajo contención de CPU** (si corrés muchos procesos pesados en
  paralelo, algunos tests de `app.test.tsx`/`presentacion.test.tsx` timeoutean
  sin que sea un bug real — re-correr la suite sola antes de asumir que algo
  se rompió).

### Archivos nuevos (todos en la rama, ver el PR para el diff completo)

**Motor de reglas y dominio** (funcionan sin ninguna configuración extra):
- `src/domain/notifications.ts` — tipos, contexto de usuario, plantillas de mensaje.
- `src/domain/achievements.ts` — catálogo de logros (extensible).
- `src/domain/notificationEngine.ts` — prioridad, anti-spam, deduplicación.
- `src/domain/notificationAi.ts` — cliente de la redacción con IA (fallback silencioso a plantilla).
- `src/hooks/useNotificationEngine.ts` — orquesta todo, apagado en tests (`import.meta.env.TEST`).
- `src/state/NotificationProvider.tsx` + `src/state/notificationContext.ts`.
- `src/components/NotificationBell.tsx` + `src/components/NotificationPreferencesCard.tsx`.
- `src/__tests__/achievements.test.ts` + `src/__tests__/notificationEngine.test.ts`.
- `api/notification-message.ts` (Edge Function, redacción con IA, cuota propia).
- `supabase/migrations/0025_notifications.sql` — tablas `notifications`, `notification_preferences`, `push_subscriptions`.

**Push real** (necesita la configuración de la sección 3):
- `src/sw.ts` — Service Worker propio (reemplaza el autogenerado).
- `src/domain/push.ts` — suscribir/desuscribir desde el cliente.
- `api/push-subscribe.ts` / `api/push-unsubscribe.ts` (Edge).
- `api/send-notifications.ts` — cron en **Node** (no Edge, por VAPID/crypto), dispara los push reales.
- `api/_lib/phraseNotification.ts` — prompt/parseo de IA compartido entre `notification-message.ts` y `send-notifications.ts`.
- `vercel.json` → cron diario.
- `tsconfig.sw.json`, `tsconfig.api.json` (+ scripts `typecheck:sw`/`typecheck:api`) — el service worker y las funciones de `api/` no entran en el `tsconfig.json` principal (mismo motivo que `PushEvent`/`ServiceWorkerGlobalScope` no conviven con el lib DOM del resto de la app), así que se chequean aparte.

### Archivos modificados (además del `App.tsx`/`SettingsPage.tsx` esperables)
- `src/storage/repository.ts` + las 3 implementaciones (`supabaseRepository.ts`, `localStorageRepository.ts`, `memoryRepository.ts`) — 6 métodos nuevos de notificaciones. El centro de notificaciones funciona en los 3 modos, push sólo con Supabase.
- `src/__tests__/app.test.tsx` — un mock de repositorio le faltaban los métodos nuevos, se agregaron.
- `vite.config.ts` — cambio de estrategia PWA de `generateSW` a `injectManifest` (necesario para poder agregar handlers de push al Service Worker). El comportamiento de caché offline que ya tenía se replicó a mano en `src/sw.ts`, no se perdió nada.
- `.env.example` — documenta todas las variables nuevas.
- `package.json` — nuevas deps: `web-push` (runtime), `@vercel/node` + `@types/web-push` + `workbox-*` (dev, para el service worker).

---

## 3. PENDIENTES (en orden) — necesitan tus credenciales, no se pueden hacer desde el chat sin vos

### 3.1 — Cargar las variables de entorno en Vercel ⚠️ BLOQUEANTE para push real

**Ya generadas en esta sesión** (guardalas, la privada no se puede volver a ver):

```
VAPID_PUBLIC_KEY=BHvn7m0LkMlSIJcSV0YsKitxKq2zla8WzpBLaI-YRGA8DylL4wpz_QQfuPaaSOapXxW30tXIPKBwJGGGs2k2gDw
VAPID_PRIVATE_KEY=SLWPAS3NQoaiIzwBsnjqDd12W9U-uYgAhWvYskxkz-A
VITE_VAPID_PUBLIC_KEY=BHvn7m0LkMlSIJcSV0YsKitxKq2zla8WzpBLaI-YRGA8DylL4wpz_QQfuPaaSOapXxW30tXIPKBwJGGGs2k2gDw
CRON_SECRET=97a536b2e1a3370dadb1d661c04e6ef24ace16caf1c97edae7e9661d773bedc1
```

Falta sólo:
```
VAPID_SUBJECT=mailto:<tu-mail-de-contacto>
```

Pasos: Vercel Dashboard → proyecto **mi-progreso** → **Settings → Environment
Variables** → cargar las 5 (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`, `VITE_VAPID_PUBLIC_KEY`, `CRON_SECRET`) marcando
**Production**, **Preview** y **Development** — mismo criterio que se usó
para `ANTHROPIC_API_KEY` (ver `CONTEXTO_IA.md` si hace falta el paso a
paso exacto).

`SUPABASE_SERVICE_ROLE_KEY` **ya existe** en Vercel (la usa
`api/mp-webhook.ts`) — `api/send-notifications.ts` la reutiliza, no hace
falta cargar nada nuevo para eso.

### 3.2 — Aplicar la migración `0025_notifications.sql` en Supabase ⚠️ BLOQUEANTE

El archivo completo está en `supabase/migrations/0025_notifications.sql` (en
la rama `feat/notificaciones-ia`, o en el worktree
`C:\Users\Tobi\Claude\mi-progreso-notificaciones`). Crea 3 tablas
(`notification_preferences`, `notifications`, `push_subscriptions`), todas
con RLS "owner rw", y actualiza `clear_app_data()` para que las borre
también.

Opciones para aplicarla (mismo menú que la migración `0024` de freemium, ver
`CONTEXTO_PENDIENTES_FREEMIUM.md` sección 3.1 para el detalle de cada una):
1. **Pedirle al usuario que la corra él mismo** en el SQL Editor de
   Supabase (Dashboard del proyecto real `iwnrmzbdhrqwcbouhyqf` →
   "Uliseslopez02's Project" → `main` **PRODUCTION**) — más simple y sin
   fricción de permisos de navegador.
2. Si se ayuda por navegador (Claude in Chrome): usar
   `window.monaco.editor.getModels()[0].setValue(...)` para setear el SQL
   completo de una, en vez de tipear o depender del portapapeles (ver el
   gotcha detallado en `CONTEXTO_PENDIENTES_FREEMIUM.md` — Monaco autocierra
   paréntesis/comillas, tipear carácter por carácter corrompe el SQL).
3. Con `SUPABASE_ACCESS_TOKEN`: `supabase link --project-ref
   iwnrmzbdhrqwcbouhyqf` + `supabase db push`.

**Verificación una vez aplicada:**
```sql
select * from public.notification_preferences limit 1;
select * from public.notifications limit 1;
select * from public.push_subscriptions limit 1;
```
Las 3 deberían existir vacías (0 filas), sin error de "relation does not exist".

### 3.3 — Mergear el PR #3 (después de 3.1 y 3.2, o al menos después de 3.2)

- **PR:** https://github.com/Uliseslopez02/mi-progreso/pull/3
- CI en verde, mergeable, sin conflictos — no requiere ningún ajuste de
  código antes de mergear.
- El motor de reglas y el centro de notificaciones in-app **funcionan sin
  la migración aplicada**? — **NO**: las tablas nuevas no existen hasta
  aplicar `0025`, así que mergear antes de 3.2 rompería el centro de
  notificaciones (errores al leer/escribir `notifications`). Aplicar
  primero la migración (3.2), después mergear.
- Cada push/merge a `master` redespliega solo a `mi-progreso-one.vercel.app`
  (mismo comportamiento que con freemium).

### 3.4 — QA manual con cuenta real (después de 3.1, 3.2, 3.3 + redeploy)

1. Loguearse → Ajustes → nueva sección "Notificaciones": togglear
   categorías, horario sin notificaciones.
2. Activar "Notificaciones push" → debería pedir el permiso del navegador →
   aceptar → sin errores en consola.
3. Completar objetivos hasta cumplir alguna condición de logro (ej. primer
   objetivo completado, o llegar a una racha de 3 días) → recargar la app →
   la campana del header debería mostrar un badge y la notificación en el
   panel, con acción de navegación al tocarla.
4. Para probar el push real sin esperar al cron de las 21:00 ART: se puede
   invocar `api/send-notifications.ts` a mano con el header correcto:
   ```bash
   curl -X POST https://mi-progreso-one.vercel.app/api/send-notifications \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```
   (reemplazar `<CRON_SECRET>` por el valor cargado en Vercel). Debería
   devolver `{"eligible": N, "processed": N}` y, si esa cuenta tiene
   push activado y algún candidato válido, debería llegar una notificación
   del sistema operativo aunque la pestaña esté cerrada.
5. Verificar que **no** llega nada si "Notificaciones activadas" está
   apagado, ni durante el horario de silencio configurado.

---

## 4. Gotchas / cosas para no romper

- **No tocar `api/habit-insights.ts` ni `api/suggest-habits.ts`** por esto —
  tienen su propia cuota de IA (`increment_ai_usage`, 3/mes Free), separada
  a propósito de la de notificaciones. Si alguna sesión paralela ya los
  estaba tocando (había WIP sin commitear en el directorio principal al
  empezar esta tarea, ver `git status` de `master`), no tiene relación con
  esto.
- **`import.meta.env.TEST`** apaga la evaluación automática del motor de
  notificaciones en tests (ver `useNotificationEngine.ts`) — si se agrega un
  test de integración nuevo para el centro de notificaciones, va a necesitar
  mockear el repositorio manualmente en vez de depender del motor real,
  porque en modo test el motor no corre solo.
- **`api/` no está en ningún tsconfig por defecto** — el proyecto nunca
  type-checkeaba las Edge Functions antes de esta tarea. Se agregó
  `tsconfig.api.json` (+ `npm run typecheck:api`) como red de seguridad
  nueva, pero **no está enganchado a `npm run build`** (a propósito, para no
  cambiar el contrato existente del build sin que lo pidan) — correrlo a
  mano si se toca algo de `api/`.
- **`src/sw.ts` tampoco entra en el `tsconfig.json` principal** (está
  excluido explícitamente) — usa `npx tsc -p tsconfig.sw.json` /
  `npm run typecheck:sw`.
- **El cron asume huso horario Argentina (UTC-3)** hardcodeado
  (`ASSUMED_TZ_OFFSET_HOURS` en `api/send-notifications.ts`) porque hoy no
  hay timezone guardado por cuenta en `Settings`. Documentado en el propio
  archivo. Si la app suma usuarios fuera de esa zona, la mejora natural es
  agregar un campo de timezone a `Settings` y usarlo acá.
- **Un solo push por corrida del cron por usuario** (el candidato de mayor
  prioridad) — el resto de los candidatos igual se insertan en
  `notifications` y aparecen en el centro in-app la próxima vez que abra la
  app, a propósito para no mandar una ráfaga de pushes seguidos el mismo día.
- **`node_modules` de este worktree es independiente** del directorio
  principal (no comparte junction — `npm install` lo reemplazó por una copia
  real la primera vez). Si se borra el worktree y se recrea, hay que volver
  a correr `npm install` ahí (no asumir que un junction alcanza).

---

## 5. Referencias

- Auditoría completa de la arquitectura previa (qué ya existía, qué faltaba)
  y las decisiones de diseño: quedaron en el chat de esta sesión, no se
  volcaron a un archivo separado — si hace falta recuperarlas, están al
  principio de la conversación donde se armó este sistema.
- `CONTEXTO_IA.md` — cómo están hechas las 2 funciones de IA existentes
  (patrón de auth, gating, manejo de errores) que este sistema reutiliza y
  respeta.
- `CONTEXTO_PENDIENTES_FREEMIUM.md` — mismo tipo de pendiente (aplicar una
  migración a mano), con el detalle del gotcha de Monaco/portapapeles si
  hace falta aplicar `0025` por navegador.
- **Tarea aparte, ya delegada** (chip de sugerencia en la sesión, no
  bloqueante para esto): `clear_app_data()` no borra `focus_sessions` desde
  hace varias migraciones — encontrado de pasada mientras se armaba
  `0025_notifications.sql`, sin relación con notificaciones.
