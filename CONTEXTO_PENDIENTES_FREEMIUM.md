# Mi Progreso — Freemium: handoff para el próximo chat

Prompt de contexto y pendientes del sistema de límites Free/Pro. Si estás retomando
esto en otra sesión, **leé esto entero + `CONTEXTO_FREEMIUM.md` antes de tocar nada.**

---

## 1. Qué es esto

Se diseñó e implementó el modelo freemium de Mi Progreso:
- **Free** = rastreador completo para una etapa enfocada de la vida (5 objetivos diarios,
  5 hábitos, 3 metas, 2 proyectos, 2 rutinas, historial 30 días, informe del mes,
  IA 3×/mes, backup siempre).
- **Premium** ("Premium" es el nombre visible, no "Pro") = todas las áreas sin límite +
  historial 90 días/1 año + informes comparativos + IA sin tope.

La estrategia completa (análisis de toda la app, matriz, momentos de conversión, copy de
paywalls, plan técnico y **sección 13 con el detalle de archivos implementados**) está en
**`CONTEXTO_FREEMIUM.md`** — es el documento de referencia, no lo repito acá.

Decisiones ya tomadas (NO volver a discutir):
- Tope de 5 objetivos en el onboarding (copy de producto, no de paywall).
- Sin trial automático en v1.
- Matriz completa implementada (no sólo el límite principal).
- Nombre visible: "Premium" (se mantiene, no se migra a "Pro").
- Grandfathering: el límite bloquea *agregar de más*, nunca toca lo existente.

---

## 2. Estado del repo (al cierre de esta sesión)

- **Todo el trabajo está en la rama `feat/limites-plan-freemium`**, commit `5694845`
  ("Sistema de límites del plan Free (freemium)"), **pusheada a
  `origin/feat/limites-plan-freemium`** y en sync.
- `master` quedó intacto en `origin/master` (`1383499`). **NO se mergeó ni se pusheó a
  master** — Ulises frenó el push a master a propósito (redespliega solo a producción).
- Ojo: hay varias ramas activas en paralelo (`feat/email-confirmacion-mi-progreso`,
  `feat/agenda-kanban-email-ux`, `feat/planner-compacto`, worktree de `/presentacion`).
  Antes de cualquier `git` correr `git branch --show-current` y `git status`.
- Verde al cierre: `tsc -b`, `vite build`, **322/322 tests** (`npx vitest run`).
  Nota: la suite tiene tests de integración con `userEvent` + timers que son
  **flaky** — si falla 1, re-correr antes de asumir que se rompió algo.

Archivos nuevos en el commit: `src/domain/plan.ts`, `src/components/{UpgradeCard,ProBadge,PlanComparison}.tsx`,
`supabase/migrations/0024_plan_limits.sql`, `src/__tests__/{plan.test.ts,upgradeCard.test.tsx}`,
`CONTEXTO_FREEMIUM.md`. Modificados: 11 pantallas + `analytics.ts` + `onboardingCatalog.ts`
+ `OnboardingWizard.tsx` + `PremiumPage.tsx` + `global.css` + 2 tests.

---

## 3. PENDIENTES (en orden)

### 3.1 — Aplicar la migración `0024_plan_limits.sql` en Supabase  ⚠️ BLOQUEANTE

Sin esto, los límites son **sólo frontend** (un request falsificado los saltea).

1. Supabase → SQL Editor → pegar y correr `supabase/migrations/0024_plan_limits.sql`
   entero. Debe decir "Success".
2. Verificación (con una cuenta `free`, ver bloque de comentarios al pie del `.sql`):
   - Guardar 6 objetivos diarios de cero → debe fallar con `plan_limit_exceeded:dailyGoals`.
   - Guardar el mismo set que ya está en la base (aunque sean 11) → debe pasar.
   - `update public.profiles set plan='premium' where id=auth.uid();` → sin límites.
   - Volver a `free` después de probar.
3. Qué hace: redefine `save_app_data` (idéntica a la de `0017_notes.sql` + una línea
   `perform public.enforce_free_plan_limits(uid, payload)`). Regla: rechaza sólo si
   `plan='free'` Y la cantidad entrante supera el límite Y supera lo que ya había en DB.

### 3.2 — Decidir estrategia de merge / deploy

- PR listo para abrir:
  **https://github.com/Uliseslopez02/mi-progreso/pull/new/feat/limites-plan-freemium**
  (esta sesión no pudo crear el PR por un bloqueo de permisos; abrirlo desde la web o
  `gh pr create --base master`).
- **Cada push a `master` redespliega solo a `mi-progreso-one.vercel.app`.** Opciones:
  a) Aplicar 0024 primero → mergear a master → deploy (backend + frontend juntos). ✅ recomendado
  b) Mergear ya → frontend live sin enforcement backend hasta aplicar 0024 (estado
     intermedio seguro: `save_app_data` sigue siendo la de 0017, no tira error, sólo
     no valida).
- El frontend NO rompe si 0024 no está aplicada (nunca llama a `enforce_*` directo).

### 3.3 — QA manual con cuenta Free real

Correr `npm run dev` (puerto 5174, entrada `mi-progreso-dev` en `.claude/launch.json`)
o probar en producción tras deploy. Chequear el recorrido:
- Onboarding: no deja pasar de 5 objetivos, con el aviso de producto.
- Editar objetivos: al llegar a 5, botón "Agregar" deshabilitado + `UpgradeCard`.
- Hábitos / Metas / Proyectos / Rutinas / Notas / Categorías: idem su límite.
- Historial: botones "90 días" / "1 año" con badge "Premium", click → `UpgradeCard`.
- Informe: sin métricas avanzadas + `UpgradeCard`.
- Mapa anual: heatmap recortado + badge.
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

```bash
git switch feat/limites-plan-freemium
npm install          # si hace falta
npx tsc -b           # sin output = ok
npx vitest run       # 322/322 (re-correr si falla 1, son flaky)
npm run build        # verde (el warning de chunk >500kB es preexistente)
npm run dev          # http://localhost:5174
```
