# Contexto y pendientes — `/presentacion` (fidelidad a la app)

Handoff actualizado para seguir en otro chat (contexto de esta sesión al 87%).
Proyecto: `mi-progreso` (`C:\Users\Tobi\Claude\mi-progreso`), repo
`github.com/Uliseslopez02/mi-progreso`, deploy automático a
`https://mi-progreso-one.vercel.app` con cada push a `master`.

---

## 0. Regla de oro (pedido explícito de Ulises — no relajar esto)

**La app real es la ÚNICA fuente de verdad.** No inventar, no simplificar, no
diseñar una versión "mejor". Todo lo que `/presentacion` muestre tiene que
coincidir EXACTAMENTE con cómo funciona Mi Progreso hoy.

- La extensión de Chrome sigue sin estar conectada (verificar con
  `list_connected_browsers` antes de asumir lo contrario). Fuente de verdad =
  **código fuente** (`src/domain/*`, `src/pages/*`, `src/components/*`).
- Método: **reusar los componentes reales de la app** dentro de las secciones
  de `/presentacion`, no recrearlos a mano. Ya se hace en las 19 secciones (ver
  §2).
- Cómo funcionan racha / puntos / promedios: memoria del proyecto
  `memory/racha-puntos-promedios.md` y `memory/landing-pages.md` (ambas
  actualizadas, léelas primero — tienen el resumen más reciente).

---

## 1. Estado actual (verificado 2026-09-15)

- `master` LOCAL = `origin/master` = **`74e3397`** (`Fix: el input de objetivos
  cuantitativos era invisible (blanco sobre blanco)`) — desplegado.
- Working tree del repo principal tiene 2 archivos modificados **que no son de
  esta tarea** (`api/habit-insights.ts`, `api/suggest-habits.ts` — otra sesión
  en paralelo trabajando en límites de IA). **No tocar, no commitear.**
- No hay worktrees temporales activos ahora mismo (`git worktree list` sólo
  muestra el repo principal). Si necesitás aislar trabajo nuevo, creá uno:
  ```
  git worktree add -b feat/presentacion-<algo> <ruta-en-Temp> origin/master
  # luego en PowerShell:
  New-Item -ItemType Junction -Path "<ruta>\node_modules" -Target "C:\Users\Tobi\Claude\mi-progreso\node_modules"
  ```
  (el churn de sesiones paralelas sobre este repo es alto — commitear rápido y
  pushear a `master` en cuanto algo esté verificado, no dejarlo colgado en una
  rama por mucho tiempo).

---

## 2. `/presentacion` — 19 secciones, todas con componentes/lógica reales

Orden actual en `PresentacionPage.tsx`: Hero → Problema → Solución →
**Dashboard** (Hoy) → **Hábitos** → **Mapa anual** → **Sistema de %** →
**Progreso** (Esta semana + Historial) → **Calendario** → **Informes** →
**Agenda** (Día) → **Planificador semanal** → **Enfoque** → **Proyectos** →
**Metas** → **Rutinas** → **Notas** → **Momento Mori** → Recorrido → "Y
también" → CTA final.

Cada una en negrita reusa el componente real de la app (`GoalList`, `WeekCard`,
`HabitCard`, `HabitYearHeatmap`, `MonthCalendar`, `DayTimeline`,
`PlannerBoard`+`PlannerItemDetail`, `LifeGoalCard`+`EditGoalModal`,
`RoutineCard`/`RoutineExecutionCard`, temporizador real de Enfoque) y la misma
lógica de `domain/*` (`computeDayStats`, `computeStreak`, `goalStreaks`,
`weekSummary`, `aggregate`, `monthlyReport`, `computeLifeGoalProgress`,
`habitYearMap`, etc.). Momento Mori y Notas son las únicas con estado
**local a la sección** (no en `PresentacionState`) porque en la app real
tampoco interactúan con nada más — es la modelización correcta, no un atajo.

**Bug real encontrado y corregido en el camino** (no era de `/presentacion`,
es del componente compartido `GoalList`, así que afectaba también a la app
autenticada): `.goal__input` (el `<input type="number">` de un objetivo de
cantidad, ej. "Tomar 2L de agua") no tenía CSS propio → quedaba con fondo
blanco nativo del navegador y texto claro del tema por encima → **blanco sobre
blanco, invisible**. Fix en `src/styles/global.css` (commit `74e3397`): fondo
oscuro, borde, texto legible, igual criterio visual que `.input`/`.select`.

Si Ulises todavía reporta que lo ve blanco: es la **PWA cacheando la versión
vieja** en su navegador (service worker con `registerType: 'autoUpdate'`
puede tardar una recarga extra en soltar assets viejos). Pasos ya sugeridos:
`Ctrl+Shift+R` → cerrar la pestaña del todo y reabrir → probar en incógnito.
Si en incógnito TAMBIÉN se ve mal, ahí sí sería un bug real nuevo, no caché —
investigar de cero (empezar por `getComputedStyle` del input en la consola,
mismo método que se usó para diagnosticar el original).

---

## 3. Lo que queda A PROPÓSITO sin recrear (documentado en "Y también")

1. **Revisión mensual** (`MonthlyReviewPage`) — wizard guiado de 4 pasos
   (stats → preguntas → resumen → listo) con `ProgressPath` y
   `MONTHLY_REVIEW_PROMPTS`. No se recreó porque un wizard con pasos no encaja
   naturalmente como contenido de scroll continuo. **Es factible si se quiere
   igual** — sería la próxima sección lógica a construir, siguiendo el mismo
   patrón (estado local a la sección con `step`, reusar `ProgressPath` real,
   `monthlyReport`/`monthlyConclusions` ya están usados en `InformesSection`
   así que la lógica de stats ya está probada).
2. **Sugerencias e insights con IA** — no se puede llamar la API real
   (`api/suggest-habits.ts`, `api/habit-insights.ts`) desde una página pública
   sin cuenta sin exponer la key o inventar una respuesta falsa. Correctamente
   fuera de alcance; sólo narrada.

Si Ulises pide "segui" de nuevo sin más detalle, el paso natural es la
Revisión mensual (punto 1). Preguntarle si la quiere antes de invertir tiempo,
porque es la única que falta y tiene bastante esfuerzo relativo al valor.

---

## 4. Comandos de verificación (repetir después de cualquier cambio)

```bash
cd <worktree-o-repo>
node_modules/.bin/tsc -b
node_modules/.bin/vitest run src/__tests__/presentacion.test.tsx src/__tests__/app.test.tsx
node_modules/.bin/vite build
node_modules/.bin/vite --port <libre> --strictPort   # /presentacion no pide login
```

Luego, para llevar a producción: commit → `git push origin master` (o
fast-forward/merge si se trabajó en una rama basada en `origin/master`) →
esperar el deploy de Vercel (~30-60s) → verificar con `curl`/browser tool que
el chunk `PresentacionPage-*.js` nuevo está deployado, y tener en cuenta el
caché de la PWA al verificar visualmente en un navegador ya usado antes.

---

## 5. Archivos clave

Igual que en el handoff anterior — no cambió el mapa de archivos, sólo se
agregaron más `src/presentacion/sections/*.tsx` (uno por sección de la lista
de §2) y sus entradas en `PresentacionPage.tsx` / `PresentacionState.tsx`
(que ahora tiene `goals`, `days`, `lifeGoals`, `plannerItems`, `projectTasks`
+ todas las acciones correspondientes). Ver `src/presentacion/demoData.ts`
para los datos fabricados (objetivos con pesos que suman 100, hábitos, 45 días
de historial coherente, metas, agenda de toda la semana, rutina, sesión de
enfoque).
