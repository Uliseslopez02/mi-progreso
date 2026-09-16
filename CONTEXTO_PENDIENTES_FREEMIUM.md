# Mi Progreso — Freemium: handoff para el próximo chat

Prompt de contexto y pendientes del sistema de límites Free/Pro. Si estás retomando
esto en otra sesión, **leé esto entero + `CONTEXTO_FREEMIUM.md` antes de tocar nada.**

---

## 1. Qué es esto

Se diseñó e implementó el modelo freemium de Mi Progreso:
- **Free** = rastreador completo para una etapa enfocada de la vida (5 objetivos diarios,
  1 semanal, 1 mensual, 3 hábitos, 2 metas activas, 1 proyecto activo, 1 rutina,
  10 notas, 6 categorías, historial 14 días, informe del mes, IA 3×/mes, backup siempre).
- **Premium** ("Premium" es el nombre visible, no "Pro") = todas las áreas sin límite +
  historial 30/90 días/1 año + informes comparativos + IA sin tope.

La estrategia completa (análisis de toda la app, matriz, momentos de conversión, copy de
paywalls, plan técnico, **sección 13 con el detalle de archivos implementados** y
**sección 13.1 con el ajuste de números de la segunda pasada**) está en
**`CONTEXTO_FREEMIUM.md`** — es el documento de referencia, no lo repito acá.

Decisiones ya tomadas (NO volver a discutir):
- Tope de 5 objetivos diarios en el onboarding (copy de producto, no de paywall) —
  es el único límite que NO se tocó en la segunda pasada.
- Sin trial automático en v1.
- Matriz completa implementada (no sólo el límite principal), y ya ajustada una vez
  hacia abajo ("limitá un poco más, con criterio" — ver `CONTEXTO_FREEMIUM.md` 13.1).
  No volver a apretar sin que lo pida explícitamente: ya se hizo un pase de ajuste.
- Nombre visible: "Premium" (se mantiene, no se migra a "Pro").
- Grandfathering: el límite bloquea *agregar de más*, nunca toca lo existente.

---

## 2. Estado del repo (al cierre de esta sesión, 2026-09-16)

- **Todo el trabajo está en la rama `feat/limites-plan-freemium`**, HEAD en commit
  `8b8f65c` ("Segunda pasada: límites Free mas estrictos, con criterio"),
  **pusheada a `origin/feat/limites-plan-freemium`** y en sync. Historia relevante:
  `5694845` (implementación completa) → `fd17640` (handoff v1) → `8b8f65c` (ajuste
  de números a pedido explícito, ver `CONTEXTO_FREEMIUM.md` sección 13.1).
- **PR abierto:** https://github.com/Uliseslopez02/mi-progreso/pull/2 (`feat/limites-plan-freemium`
  → `master`). Todavía sin mergear.
- `master` intacto en remoto. **NO mergear el PR sin haber aplicado la migración 0024
  primero** (ver 3.1) — si se mergea antes, el frontend queda live sin enforcement
  real en el backend (no rompe nada, pero los límites son sólo de UI hasta aplicarla).
- **Ojo con el directorio de trabajo principal** (`C:\Users\Tobi\Claude\mi-progreso`):
  en las últimas sesiones casi siempre tiene **WIP sin commitear de otra sesión
  corriendo en paralelo** (visto: cambios en `/presentacion`, `api/*-insights.ts`,
  etc., sobre `master`). Antes de tocar nada ahí: `git branch --show-current` +
  `git status`. **Para trabajar en esta rama sin arriesgar ese WIP, usar un
  worktree aparte** en vez de `git switch`:
  ```bash
  git fetch origin
  git worktree add ../mi-progreso-freemium-N feat/limites-plan-freemium
  cd ../mi-progreso-freemium-N
  # node_modules no se comparte automáticamente entre worktrees; para no reinstalar:
  # (PowerShell) New-Item -ItemType Junction -Path node_modules -Target "C:\Users\Tobi\Claude\mi-progreso\node_modules"
  ```
  Al terminar: commitear + push desde ahí, y `git worktree remove ../mi-progreso-freemium-N`
  desde el repo principal (sin tocar el working tree de `master`).
- Verde al cierre: `tsc -b`, `vite build`, **323/323 tests** (`npx vitest run`).
  Nota: la suite tiene tests de integración con `userEvent` + timers que son
  **flaky** — si falla 1, re-correr antes de asumir que se rompió algo.
- Queda un archivo suelto **sin commitear** en el repo principal (`master`),
  inofensivo, se puede borrar o ignorar: `0024_plan_limits_PARA_APLICAR.sql` en la
  raíz — es una copia de la migración que se le mandó a Ulises como archivo para
  copiar/pegar en el SQL Editor.

Archivos nuevos: `src/domain/plan.ts`, `src/components/{UpgradeCard,ProBadge,PlanComparison}.tsx`,
`supabase/migrations/0024_plan_limits.sql`, `src/__tests__/{plan.test.ts,upgradeCard.test.tsx}`,
`CONTEXTO_FREEMIUM.md`. Modificados: 11 pantallas + `analytics.ts` + `onboardingCatalog.ts`
+ `OnboardingWizard.tsx` + `PremiumPage.tsx` + `global.css` + tests.

---

## 3. PENDIENTES (en orden)

### 3.1 — Aplicar la migración `0024_plan_limits.sql` en Supabase  ✅ HECHO (aplicada en producción)

**Actualización 2026-09-16:** esta migración ya está aplicada en producción — el método
que funcionó fue `window.monaco.editor.getModels()[0].setValue(sql)` vía
`javascript_tool` con Claude in Chrome (nunca tipear/pegar SQL largo, Monaco lo corrompe).
El resto de esta sección queda como registro de cómo se resolvió, por si hace falta el
mismo método de nuevo (como para la migración `0025`, ver `CONTEXTO_TERCERA_PASADA_TRIAL.md`
sección 3.7 — **hay una migración `0025_free_trial.sql` nueva, todavía pendiente de
aplicar**, no confundir con esta `0024` que ya está lista).

Sin esto, los límites son **sólo frontend** (un request falsificado los saltea).

**Se intentó dos veces en esta sesión y quedó sin terminar — leer esto antes de reintentar:**

- **Intento 1 (manual):** se le mandó a Ulises el archivo con el SQL completo y el
  paso a paso (Dashboard → SQL Editor → pegar → Run → verificar con
  `update profiles set plan=...`). No confirmó si lo llegó a correr.
- **Intento 2 (con Claude in Chrome, esta sesión):** se navegó al proyecto real
  (`https://supabase.com/dashboard/project/iwnrmzbdhrqwcbouhyqf/sql/new`,
  "Uliseslopez02's Project" → `main` **PRODUCTION**), Ulises inició sesión (GitHub
  OAuth) y se confirmó estar en el SQL Editor correcto, vacío. Quedó sin terminar
  por dos motivos técnicos, no por falta de acceso:
  1. El `tabId` de Claude in Chrome se invalidó entre turnos (mensaje "Tab is not in
     Claude's tab group") — hay que volver a abrir la pestaña con `tabs_context_mcp`
     + `navigate` a esa misma URL en la sesión que retome esto.
  2. Pegar un SQL de 400+ líneas tecleándolo carácter por carácter es riesgoso: el
     editor Monaco de Supabase auto-cierra paréntesis/comillas, así que "escribir"
     el texto (en vez de pegarlo) probablemente duplica caracteres y corrompe el
     SQL. Se intentó usar el portapapeles del sistema (`mcp__computer-use__write_clipboard`)
     para pegar con Ctrl+V — **Ulises denegó ese permiso** (no se volvió a insistir).
     Se confirmó que la página expone `window.monaco` (con `window.monaco.editor.getModels()`
     disponible una vez que el editor está montado) — la vía más prometedora para la
     próxima sesión es setear el contenido directo con
     `mcp__claude-in-chrome__javascript_tool`:
     ```js
     const model = window.monaco.editor.getModels()[0]
     model.setValue(`<<SQL completo acá, con backticks escapados>>`)
     ```
     y después ejecutar con Ctrl+Enter (`computer` key action) o el botón "Run" —
     sin depender del portapapeles ni de tipear.

**Alternativas más simples para la próxima sesión, en orden de preferencia:**
1. **Pedirle a Ulises que lo haga él mismo** (más rápido y sin fricción de permisos):
   el archivo `0024_plan_limits_PARA_APLICAR.sql` en la raíz del repo principal (o
   `supabase/migrations/0024_plan_limits.sql` en esta rama) tiene el SQL completo;
   el paso a paso ya se le mandó una vez en el chat anterior.
2. Si Ulises pide ayuda por navegador de nuevo: probar la vía `window.monaco.setValue(...)`
   de arriba en vez de pegar/tipear.
3. Si Ulises está dispuesto a generar un `SUPABASE_ACCESS_TOKEN` (Supabase → Account →
   Access Tokens) y dárselo a la sesión: `supabase link --project-ref iwnrmzbdhrqwcbouhyqf`
   + `supabase db push` aplica la migración por CLI, sin navegador — mucho más
   confiable. No pedir contraseñas de la base ni el `service_role` key por chat.

**Verificación una vez aplicada** (con una cuenta `free`, ver bloque de comentarios al
pie del `.sql`):
- Guardar 6 objetivos diarios de cero → debe fallar con `plan_limit_exceeded:dailyGoals`.
- Guardar el mismo set que ya está en la base (aunque sean 11) → debe pasar.
- `update public.profiles set plan='premium' where id=auth.uid();` → sin límites.
- Volver a `free` después de probar.

**Qué hace:** redefine `save_app_data` (idéntica a la de `0017_notes.sql` + una línea
`perform public.enforce_free_plan_limits(uid, payload)`). Regla: rechaza sólo si
`plan='free'` Y la cantidad entrante supera el límite Y supera lo que ya había en DB.

### 3.2 — Mergear el PR (después de 3.1)

- **PR ya abierto:** https://github.com/Uliseslopez02/mi-progreso/pull/2
- **Cada push/merge a `master` redespliega solo a `mi-progreso-one.vercel.app`.**
  Por eso el orden importa: aplicar 0024 en Supabase ANTES de mergear, así el
  backend y el frontend quedan consistentes desde el primer deploy.
- El frontend NO rompe si 0024 todavía no está aplicada (nunca llama a `enforce_*`
  directo) — mergear antes no es catastrófico, pero deja una ventana donde los
  límites son sólo de UI.

### 3.3 — QA manual con cuenta Free real

Correr `npm run dev` (puerto 5174, entrada `mi-progreso-dev` en `.claude/launch.json`)
o probar en producción tras deploy. Chequear el recorrido:
- Onboarding: no deja pasar de 5 objetivos, con el aviso de producto.
- Editar objetivos: al llegar a 5 diarios / 1 semanal / 1 mensual, botón "Agregar"
  deshabilitado + `UpgradeCard`.
- Hábitos (3) / Metas activas (2) / Proyectos activos (1) / Rutinas (1) / Notas (10) /
  Categorías (6): ídem, cada uno con su límite.
- Historial: botones "30 días" / "90 días" / "1 año" con badge "Premium", click →
  `UpgradeCard`.
- Informe: sin métricas avanzadas + `UpgradeCard`.
- Mapa anual: heatmap recortado a ~8 semanas + badge.
- Planificador: "semana siguiente" tope tras 1 semana adelante.
- `/premium`: 4 pilares + tabla comparativa.
- **Cuenta Premium** (`update profiles set plan='premium'`): todo sin límites, sin badges.
- **Grandfathering**: una cuenta con 11 objetivos diarios (p. ej. la de Ulises o el seed
  de "usar ejemplos") ve y edita los 11, sólo no puede agregar el 12.º.

### 3.4 — Analytics (opcional pero barato)

`src/domain/analytics.ts` ya emite `limit_reached` y `upgrade_cta_clicked` (sólo
`console.debug` en dev). Cuando se sume un proveedor real (PostHog/Amplitude/GA), sólo
se cambia `send()` — sin tocar call sites. Sirve para medir qué límite convierte.

### 3.5 — v2 (documentado en `CONTEXTO_FREEMIUM.md`, NO implementar sin pedirlo)

- **Trial de Premium** 14 días sin tarjeta (columnas `trial_*` ya existen en `0023`;
  el trigger `sync_profile_plan` habría que hacerlo contar `'trial'` como premium).
- **InformesPage**: navegación a meses anteriores (hoy sólo muestra el mes actual; el
  gating actual es sólo de métricas avanzadas). Es feature nueva, no sólo un gate.
- **FocusPage**: card de estadísticas de enfoque avanzadas para Premium.
- Emails transaccionales (bienvenida Premium, fin de trial) — fuera de alcance.

---

## 4. Gotchas / cosas para no romper

- **El seed de ejemplo** (`src/domain/defaults.ts` → `createInitialData`, botón "usar
  ejemplos" del onboarding) tiene **11 objetivos diarios**. No se tocó a propósito
  (rehacer la matemática de pesos que suman 100 rompería tests de %). Un Free que lo
  elige queda grandfathered. El wizard normal ya topea en 5.
- **`renderApp()` en `src/__tests__/app.test.tsx`** ahora acepta `{ plan: 'premium' }`.
  Dos tests que crean objetivos diarios sobre el seed de 11 lo usan. Si agregás tests
  que crean entidades por encima del límite Free, pasales `plan: 'premium'` o asertá la
  `UpgradeCard`.
- **`memoryRepository` / `localStorageRepository`** devuelven siempre `plan: 'free'`.
- **Edge conocido (no bloqueante)**: multi-dispositivo + downgrade de Premium + podar
  por debajo del límite en un dispositivo → el otro (estado viejo) puede recibir un
  rechazo del backend hasta recargar. El `hydrate` al recargar lo resuelve.
- **Números de límites**: viven en `src/domain/plan.ts` (`PLAN_LIMITS`) Y en
  `supabase/migrations/0024_plan_limits.sql` (hardcodeados en `enforce_free_plan_limits`).
  Si cambiás uno, cambiá los dos.
- El `save_app_data` de `0024` es copia textual del de `0017` + 1 línea. Si alguna otra
  rama (agenda-kanban, etc.) también redefine `save_app_data`, hay que reconciliar: la
  versión final tiene que tener el `perform public.enforce_free_plan_limits(...)` +
  todas las entidades nuevas de esa otra rama.

---

## 5. Cómo verificar local

Preferir un worktree (ver sección 2) en vez de `git switch` en el repo principal,
por el WIP de otras sesiones que suele haber ahí:

```bash
git worktree add ../mi-progreso-freemium-N feat/limites-plan-freemium
cd ../mi-progreso-freemium-N
npm install          # o symlink/junction de node_modules, ver sección 2
npx tsc -b           # sin output = ok
npx vitest run       # 323/323 (re-correr si falla 1, son flaky)
npm run build        # verde (el warning de chunk >500kB es preexistente)
npm run dev          # http://localhost:5174
```
