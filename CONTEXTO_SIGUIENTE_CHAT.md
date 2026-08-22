Contexto: proyecto "Mi Progreso" (C:\Users\Tobi\Claude\mi-progreso), transformación a SaaS multiusuario comercializable. Esto es un prompt de handoff — si estás retomando esto en otra sesión, leelo entero antes de tocar código.

## Qué es esto y el objetivo de fondo
App de hábitos de Ulises (React + TS + Vite, dev server en puerto 5174, entrada `mi-progreso-dev` en `.claude/launch.json`). Se está convirtiendo en un producto SaaS vendible a terceros — **ese es el criterio para priorizar todo**: cada decisión se evalúa por "¿esto acerca o atrasa poder vender esto a un desconocido?", no por completitud técnica en abstracto. Se trabaja por fases, sin implementar todo de golpe, y sin romper nada que ya funciona.

## Decisión de stack (ya tomada, no revisar)
Backend = Supabase (Postgres + Auth + Row Level Security). Proyecto real: "Uliseslopez02's Project", ref `iwnrmzbdhrqwcbouhyqf`. Credenciales en `.env.local` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

---

## FASE 1 y 2 (Auditoría + Fundaciones): hechas y verificadas de punta a punta
Esquema Postgres real (`profiles`, `user_settings`, `categories`, `goals`, `day_records`, `period_records`, RLS en todas), Auth real con Supabase (`src/auth/`), `src/storage/supabaseRepository.ts` implementa `ProgressRepository` contra Supabase. **Pendiente técnico suelto que sigue sin resolver:** el SMTP compartido de Supabase tiene rate limit muy bajo — hace falta SMTP propio (Resend/SendGrid/Postmark) antes de abrir registro público. No bloquea desarrollo.

## FASE 3a (Onboarding): hecha y verificada
Wizard de 4 pasos (`src/onboarding/OnboardingWizard.tsx`) arma categorías/objetivos reales del usuario nuevo. `createEmptyData()` es el default silencioso; `createInitialData()` sigue existiendo para tests y como opción explícita "empezar con ejemplos".

**Nota operativa de testing que sigue valiendo:** `window.confirm()` nativo bloquea el hilo del renderer para el control por CDP — stubear con `javascript_tool`: `window.confirm = () => true` antes de ejercitar un flujo que lo dispare.

---

## FASE 3 (la que está en curso) — Plataforma completa

Ulises pidió expandir la app a: Hábitos, Rutinas, Planificador semanal, Objetivos/Metas de
largo plazo, Rueda de la vida, Momento Mori, Temporizador de enfoque, Estadísticas mejoradas,
dashboard/nav rediseñados, y arquitectura comercial multiusuario (free/premium, sin cobros
todavía). Plan completo (arquitectura, decisiones, roadmap de los 8 módulos):
`C:\Users\Tobi\.claude\plans\tender-doodling-salamander.md` — leerlo antes de arrancar un
módulo nuevo, tiene el razonamiento de cada decisión de modelo de datos.

**Orden del roadmap:** 1) Hábitos, 2) Objetivos y metas, 3) Planificador semanal, 4) Rutinas,
5) Estadísticas mejoradas, 6) Temporizador de enfoque, 7) Rueda de la vida, 8) Momento Mori.
Dashboard/nav rediseñados y preparación comercial van al final.

### Estado: módulos 1–6 completos. Sigue el módulo 7 (Rueda de la vida).

**Decisión de arquitectura transversal (válida para módulos 1-5, el 6 fue la excepción):**
cada módulo nuevo agrega su propia tabla en Supabase (RLS igual que las tablas existentes) y
su propio slice en `AppData` (`src/domain/types.ts`), pero se sigue guardando todo en una
sola transacción vía la RPC `save_app_data` (se le agrega un bloque insert/delete-diff por
tabla nueva cada vez) — no se armó orquestación de guardado separada por módulo. Esto fue una
decisión pragmática para listas chicas y acotadas (metas, hábitos, tareas de la semana).

**Cada vez que se agrega un módulo con este patrón, son 6 pasos:**
1. Tipo nuevo en `src/domain/types.ts` + campo nuevo en `AppData` + bump de `SCHEMA_VERSION`.
2. Migración de dominio `migrateVxToVy` en `src/domain/migrations.ts` + wirearla en
   `src/state/AppProvider.tsx`.
3. Acciones nuevas en `src/state/reducer.ts` (`addX`/`updateX`/`removeX`, y `moveX` si aplica).
4. Persistencia: mapping en `src/storage/supabaseRepository.ts` (`load()`) + normalización en
   `src/storage/localStorageRepository.ts` (`migrate()`) + migración SQL nueva en
   `supabase/migrations/000N_algo.sql` (tabla + RLS + reescribir `save_app_data`/
   `clear_app_data` completos — son funciones `create or replace`, hay que pegar el cuerpo
   entero cada vez).
5. UI: página nueva en `src/pages/` + componentes en `src/components/`, pestaña nueva en
   `src/App.tsx`.
6. Test de integración nuevo en `src/__tests__/app.test.tsx` + correr `npx vitest run`,
   `npx tsc -b`, `npx vite build` — no avanzar con nada roto.

**Excepción al patrón (módulo 6, Enfoque) — cuándo NO meterlo en `AppData`/`save_app_data`:**
si un módulo genera historial que crece sin límite superior (muchas filas por día, todos los
días — como sesiones de timer), no lo metas en el blob: reenviar todo el historial en cada
guardado con debounce no escala. En su lugar, `ProgressRepository` gana métodos propios
(`loadX`/`saveX`) independientes de `load/save/clear`, implementados en las tres
implementaciones (`supabaseRepository`, `localStorageRepository` con su propia key,
`memoryRepository`), y la tabla Supabase se escribe con un insert directo del cliente (no vía
RPC) con `user_id uuid not null default auth.uid()` en vez de pasar por una función `security
definer`. `src/state/context.ts` expone `repository` en `AppContextValue` para que una página
con este patrón lo llame directo sin pasar por el reducer. Ver el módulo 6 abajo para el
ejemplo completo. **Antes de decidir esto en un módulo futuro, preguntale a Ulises** (ya se le
preguntó una vez para Enfoque y eligió esta opción explícitamente) en vez de asumir.

**Cómo se aplican las migraciones SQL a producción — método que funciona, usarlo directo:**
NO tipear el SQL carácter por carácter en el SQL Editor de Supabase — el editor tiene
autocompletado con IA que se come texto a mitad de tipeo y brackets que se autocierran mal. El
método que sí funciona:
1. Cargar `mcp__computer-use__write_clipboard` (ToolSearch si está deferred).
2. `mcp__computer-use__request_access` con `clipboardWrite: true` y `apps: ["Bloc de notas"]`
   (una app dummy cualquiera — sin al menos una app en la lista, el grant falla).
3. `write_clipboard` con el SQL completo del archivo de migración, **inmediatamente antes**
   de pegar — no reusar un clipboard escrito hace rato. **Cuidado:** el clipboard del SO es un
   recurso compartido; si el usuario manda un mensaje a mitad de turno (o cualquier otra cosa
   escribe al portapapeles) entre el `write_clipboard` y el `Ctrl+V`, el paste trae contenido
   viejo/ajeno. Si un paste en el SQL Editor trae texto que no es SQL, no asumas que
   `write_clipboard` falló silenciosamente — repetilo justo antes del `Ctrl+V` y volvé a
   verificar con captura antes de correr la query.
4. En un tab **nuevo** de Chrome ya logueado de Ulises (`mcp__claude-in-chrome__*`; abrir uno
   nuevo con `tabs_create_mcp` en vez de reusar un tab con una query sin guardar — reusar un
   tab con "Unsaved edits" dispara un diálogo nativo "Leave site?" que bloquea CDP y no se
   puede cerrar con `tabs_close_mcp` después), esperar a que el editor Monaco termine de
   cargar (a veces hace falta un `wait` + reintentar el click si el primer intento seleccionó
   toda la página en vez de enfocar el editor), click adentro del editor, `Ctrl+A` + `Ctrl+V`,
   confirmar el modal "Potential issue detected" (esperable, son ALTER/CREATE TABLE), Run,
   verificar "Success" y que la tabla nueva aparece en el Table Editor (sidebar).
Si `computer-use` no está disponible en absoluto, pedirle a Ulises que pegue el archivo él
mismo (`SendUserFile` con el `.sql`) es más rápido que seguir peleando con el editor.

### Módulos 1-5: ver el detalle completo en la memoria de auto-memory del proyecto
(`project_mi_progreso.md`, cargada automáticamente en cada sesión) — resumen rápido:
- **1) Hábitos:** `Goal.trackingKind: 'goal'|'habit'` + `frequency`, no puntúan el día,
  `HabitsPage.tsx`/`HabitCard.tsx`, rachas en `consistency.ts` (`goalStreaks`).
- **2) Objetivos y metas (`LifeGoal`):** entidad separada de `Goal` a propósito, `progress`
  manual 0-100, `subGoals` checklist, `linkedHabitIds` por referencia. `GoalsPage.tsx` +
  `LifeGoalCard.tsx`.
- **3) Planificador semanal (`PlannerItem`):** primera dependencia nueva (`@dnd-kit`).
  `PlannerBoard.tsx` + `PlannerPage.tsx`. **El gesto de arrastre en sí nunca se pudo verificar
  por automatización** (dnd-kit no responde a eventos sintéticos) — recomendado pedirle a
  Ulises que arrastre una tarjeta a mano una vez si no se hizo todavía.
- **4) Rutinas (`Routine`/`RoutineRun`):** pasos ordenados dentro de una rutina, ejecución por
  día vía `completedStepIds`. `RoutinesPage.tsx` + `RoutineCard.tsx` (CRUD) +
  `RoutineExecutionCard.tsx` (checklist de hoy) + `RoutineFocusMode.tsx` (overlay fullscreen
  paso a paso).
- **5) Estadísticas mejoradas:** **no agregó tabla ni entidad** — puro cómputo sobre datos ya
  persistidos. `habitStreakBreakdown()` en `consistency.ts` (racha activa vs. perdida),
  `src/domain/lifeGoalHealth.ts` nuevo (metas vencidas/estancadas/abandonadas, usando sólo
  campos reales: no hay historial de progreso guardado). `ConsistencyCard.tsx` ganó
  `title`/`emptyMessage` opcionales para reusarlo con hábitos. Todo esto vive en
  `HistoryPage.tsx`.

### Módulo 6 (Temporizador de enfoque / `FocusSession`) — completo y verificado
**Es la excepción al patrón "todo en AppData"** — ver la sección de arriba. Resumen:
- `FocusSession` en `src/domain/types.ts`, **no vive en `AppData`** (sin bump de
  `SCHEMA_VERSION`, sin migración de dominio).
- `ProgressRepository` ganó `loadFocusSessions()`/`saveFocusSession()`, implementados en
  `supabaseRepository.ts` (insert directo a `focus_sessions`, no vía RPC),
  `localStorageRepository.ts` (key separada `mi-progreso:focus-sessions`), y
  `memoryRepository.ts`.
- `src/state/context.ts`: `AppContextValue` ahora expone `repository` (antes sólo
  `state`/`dispatch`).
- Tabla `focus_sessions` (`supabase/migrations/0009_focus_sessions.sql`): primera tabla del
  proyecto escrita con insert directo del cliente, `user_id uuid not null default auth.uid()`.
  `clear_app_data` actualizada para incluirla.
- La sesión **en curso** vive sólo en `localStorage` (`mi-progreso:focus-active`) — recién se
  persiste a Supabase cuando termina (completada o detenida). El timer es 100% timestamp-based
  (`src/domain/focus.ts`: `remainingSeconds()` resta `Date.now()` contra
  `startedAt + plannedMinutes`), nunca un contador — un solo `setInterval` de 1s hace de reloj
  visual y chequeo de fin a la vez.
- `ProgressRing.tsx` ganó un prop opcional `label` para reusarlo como countdown (mismo patrón
  de generalización que `ConsistencyCard`'s `title`/`emptyMessage`).
- UI: `src/pages/FocusPage.tsx` — tipo (Enfoque/Descanso), presets de duración (5/15/25/45/60
  min) + custom, vínculo opcional a una tarea pendiente de hoy (`PlannerItem`), countdown con
  anillo, stats de hoy (minutos reales, no planeados — se calculan de `completedAt -
  startedAt`), historial reciente. Pestaña "Enfoque" entre Rutinas e Historial.
- 154/154 tests, `tsc -b` y `vite build` limpios. Verificado en vivo: migración aplicada a
  producción, sesión de 5 min iniciada y detenida desde el navegador real, countdown bajando
  en tiempo real confirmado con capturas espaciadas, recarga de página trae la sesión
  persistida desde Supabase (round-trip real). Fila de prueba borrada de producción.

### Próximo paso: módulo 7 — Rueda de la vida
Del plan original: `LifeWheelSnapshot` (fecha, puntaje 1-10 por área fija, notas). Radar chart
a mano en SVG, mismo patrón que `src/components/LineChart.tsx` (sin librerías de gráficos).
Snapshots en el tiempo (comparar "¿mejoré en Salud desde el mes pasado?"). El resumen ("tu área
más floja es X") se genera con reglas simples sobre los puntajes reales — nada de texto
inventado, mismo criterio que se usó en `lifeGoalHealth.ts` del módulo 5. Todavía no se diseñó
el tipo de dato ni se escribió nada de este módulo — probablemente sí entra en el patrón
estándar de `AppData`/`save_app_data` (los snapshots son pocos, uno cada tanto, no crecen sin
límite como las sesiones de Enfoque), pero confirmar el volumen esperado con Ulises si hay
dudas antes de asumirlo.

## Qué falta después de la Rueda de la vida
8) Momento Mori (reusa una entidad `Reflection` compartida con la reflexión diaria que quedó
pendiente de la Fase 3c vieja; fecha de nacimiento/expectativa de vida van en `Settings`;
cálculo de tiempo vivido es matemática de fechas pura). Después: dashboard (`TodayPage`
evolucionado) y navegación con React Router (todavía no instalado — confirmado con Ulises
pero no usado hasta ahora porque no hizo falta; se necesita cuando "Mi vida" tenga
subsecciones con URL propia), arquitectura `plan: 'free'|'premium'` en `profiles` sin cobros.

**Pendiente técnico suelto de antes que sigue sin resolver:** SMTP propio en Supabase (bloquea
abrir registro público, no bloquea seguir desarrollando).

## Notas operativas que siguen valiendo
- Suite de tests: `npx vitest run` desde `C:\Users\Tobi\Claude\mi-progreso`. Build: `npx tsc -b && npx vite build`. **154/154 tests, build limpio** al cierre del módulo 6 (2026-08-21).
- Diseño visual: dark theme único (sin light mode), tokens CSS en `src/styles/global.css` (`--accent`, `--surface`, `--band-*`, etc.), clases reusables (`.card`, `.btn`/`.btn--primary`/`.btn--ghost`, `.field`/`.input`/`.select`, `.chip-list`/`.category-chip`, `.pill`/`.pill--*` para badges de scope/prioridad/estado, `.subgoal-list`/`.subgoal` para listas tipo checklist). No inventar lenguaje visual nuevo sin necesidad — reusar lo que ya existe.
- Verificación en navegador: usar `mcp__claude-in-chrome__*` (el Chrome real de Ulises, ya logueado con una cuenta de prueba) contra `http://localhost:5174` (`preview_start` con `name: "mi-progreso-dev"`), no el navegador sandboxed sin sesión (`mcp__Claude_Browser__*` no tiene la sesión de Supabase logueada). Limpiar siempre los datos de prueba que se crean (eliminar hábito/meta/tarea/rutina/sesión de test) antes de cerrar — para tablas sin UI de borrado (como `focus_sessions`), limpiar con un `delete` directo en el SQL Editor.
- El Artifact viejo (https://claude.ai/code/artifact/7dfb2332-40bb-485b-8610-b8e45e5aa22a) sigue corriendo el login hardcodeado pre-Supabase — desactualizado, no es la versión vigente.
- Planes de fases anteriores (si hace falta el detalle SQL/diseño original): Fase 2
  `C:\Users\Tobi\.claude\plans\witty-splashing-finch.md`, Fase 3a (onboarding)
  `C:\Users\Tobi\.claude\plans\merry-gliding-thacker.md`, Fase 3 nueva (plataforma completa)
  `C:\Users\Tobi\.claude\plans\tender-doodling-salamander.md`.
