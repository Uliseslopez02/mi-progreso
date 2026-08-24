Contexto: proyecto "Mi Progreso" (`C:\Users\Tobi\Claude\mi-progreso`), transformación a SaaS
multiusuario comercializable. Esto es un prompt de handoff — si estás retomando esto en otra
sesión, leelo entero antes de tocar código. **Reemplaza la versión anterior de este archivo**
(estaba desactualizada: dada por "próximo paso: módulo 7" cuando los módulos 7 y 8 ya estaban
hechos).

## Qué es esto y el objetivo de fondo

App de hábitos/objetivos/vida de Ulises (React + TS + Vite, Supabase con RLS multiusuario, dev
server en puerto 5174, entrada `mi-progreso-dev` en `.claude/launch.json`). Se está convirtiendo
en un producto SaaS vendible a terceros — **ese es el criterio para priorizar todo**: cada
decisión se evalúa por "¿esto acerca o atrasa poder vender esto a un desconocido?", no por
completitud técnica en abstracto.

**Ojo operativo importante:** en los últimos días hubo **más de una sesión de Claude trabajando
sobre este mismo repo al mismo tiempo**, con commits entrelazados. No asumas que sos la única
sesión activa — antes de arrancar, corré `git log --oneline -10` y `git status` para confirmar
el estado real, no confíes ciegamente en este documento si parece desactualizado respecto a lo
que ves en el código.

## Estado del repo al cierre de esta sesión (commit `97dac1b`, pusheado a `origin/master`)

```
97dac1b Add plan: free|premium account architecture (no billing yet)
f5c24c5 Add expired/invalid reset-link screen and fix low-contrast focus/text
a9c446e Add /producto: interactive public showcase of Mi Progreso
511005b Give the access flow its own identity: progress path, warmer copy, progressive signup
086c212 Redesign auth flow and fix infinite loading screen
82fa165 Fix signup email confirmation redirecting to wrong origin
0b34fdd Initial commit: Mi Progreso SaaS
```

178/178 tests, `tsc -b` y `vite build` verdes al cierre. Working tree limpio (todo commiteado y
pusheado).

## Los 8 módulos del roadmap de producto: TODOS completos y en producción

Hábitos, Objetivos y metas (LifeGoal), Planificador semanal, Rutinas, Estadísticas mejoradas,
Temporizador de enfoque, Rueda de la vida, Momento Mori — los 8 existen como páginas reales
(`src/pages/*Page.tsx`), con pestaña en `App.tsx`, persistidos en Supabase con RLS, y con tests
de integración en `src/__tests__/app.test.tsx`. **No queda ningún módulo de producto por
construir del roadmap original.** El detalle de cada uno (decisiones de modelo de datos, qué se
verificó) está en la memoria de auto-memory del proyecto (`project_mi_progreso.md` y
`phase3b_smart_goals_progress.md`, cargadas automáticamente) — no hace falta repetirlo acá.

## Qué se hizo en esta sesión (además de lo que hizo la sesión paralela)

1. **`/producto` — demo pública interactiva** (commit `a9c446e`): landing sin cuenta, pensada
   como pieza comercial, con los 9 "módulos" que Ulises pidió (Hábitos, Ritual del día,
   Objetivos, Rueda de la vida, Estadísticas, Momento Mori, Enfoque, Sueños, Progreso general)
   compuestos en un bento grid, todos leyendo del mismo historial fabricado (~21 días) a través
   de las funciones reales de `domain/*` — no números sueltos por módulo. Identidad visual:
   lenguaje de bio.rimuapp.com (Manrope ultraliviano, halos, glass) reinterpretado con los
   tokens reales de Mi Progreso (verde `--accent`, no la paleta de Rimu). Vive en
   `src/showcase/`, ruta montada por `main.tsx` vía chequeo de `pathname` (sin React Router),
   con `React.lazy` para no pesarle a la app autenticada. `vercel.json` nuevo con rewrite SPA
   (necesario para que `/producto` no dé 404 en producción — **no verificado en el deploy real
   de Vercel todavía**, sólo en dev local). Login (`AuthGate.tsx`) ganó un link "Ver qué podés
   hacer →" y lee `?signup=1` para arrancar en modo registro.
2. **`plan: 'free' | 'premium'`** (commit `97dac1b`): arquitectura comercial mínima pedida en el
   prompt original de Fase 3 ("preparada para venderlo... free/premium, sin cobros todavía").
   Columna nueva `profiles.plan` (migración `supabase/migrations/0012_user_plan.sql`, **escrita
   pero NO aplicada a la base real todavía** — ver pendientes), método
   `ProgressRepository.getUserPlan()` (select real contra Supabase; `'free'` fijo en
   local/memoria), cargado una vez en `AppProvider` y expuesto vía `useAppData().plan`, mostrado
   como pill en Ajustes → Cuenta. **A propósito no incluye límites/gating**: no hay números de
   negocio definidos (cuántos hábitos/metas/rutinas entran en el plan free), así que no se
   inventaron — es sólo la arquitectura de lectura, sin restringir nada todavía.

## Qué hizo la sesión paralela (commits `82fa165`…`f5c24c5`)

Rediseño completo del flujo de acceso: `SignUpWizard.tsx` (registro progresivo en 4 pasos en vez
de un form largo), `FirstTimeIntro.tsx` (intro corta antes del onboarding para cuentas nuevas),
`welcomeMessages.ts` (copy rotativo primera vez/recurrente), `EnterTransition.tsx` +
`ProgressPath.tsx` (motivo visual de nodos conectados, reusado como loader/tracker de pasos),
recuperación de contraseña con pantalla de email enmascarado + reenvío con cooldown, pantalla de
link de reseteo vencido/inválido, contraste corregido. Esto **cubre en gran parte** el ítem
"Onboarding extendido" del roadmap transversal original.

## Qué falta del roadmap original (`tender-doodling-salamander.md`, sección "Transversal")

1. **Navegación con React Router** — NO empezado. Sigue siendo `useState<Tab>` en `App.tsx` (sin
   URL propia por sección). Se había confirmado con Ulises que se sumaría "cuando 'Mi vida'
   tenga subsecciones con URL propia" — evaluar si sigue haciendo falta o si ya no es prioridad
   ahora que Rueda de la vida y Momento Mori son pestañas planas, no subsecciones anidadas.
2. **Límites reales para `plan: free`** — la arquitectura de lectura ya existe (ver arriba), pero
   **faltan los números de negocio**: ¿cuántos hábitos/metas/rutinas/objetivos entran gratis?
   ¿qué se bloquea al llegar al límite? Esto es una decisión de Ulises, no técnica — preguntarle
   antes de inventar cualquier cifra.
3. **Migración `0012_user_plan.sql` sin aplicar a producción** — escrita y testeada localmente,
   pero la columna `plan` no existe todavía en el Supabase real (`iwnrmzbdhrqwcbouhyqf`). Hasta
   que se aplique, `getUserPlan()` contra la cuenta real puede fallar (cae a `'free'` en
   silencio vía el catch de `AppProvider`, así que no rompe nada, pero tampoco refleja un plan
   premium real si alguna vez se asigna uno a mano). Aplicar con el método ya probado (portapapeles
   + Chrome logueado, ver notas operativas abajo) cuando Ulises dé el ok.
4. **`/producto` sin verificar en el deploy real de Vercel** — funciona en dev local
   (`localhost:5174/producto`), pero no se confirmó que el `vercel.json` nuevo resuelva bien el
   rewrite SPA contra el proyecto real desplegado. Verificar después del próximo deploy.
5. **SMTP propio en Supabase** — pendiente desde Fase 2, sigue bloqueando abrir registro público
   masivo (rate limit muy bajo del SMTP compartido). No bloquea seguir desarrollando.
6. **"Reflexión diaria" como feature propia** — el tipo `Reflection` existe y Momento Mori lo usa,
   pero nunca se construyó una reflexión diaria independiente (fuera de Momento Mori) que el
   plan original de Fase 3 mencionaba de pasada. Confirmar con Ulises si todavía la quiere o si
   quedó reemplazada por Momento Mori.
7. **Dashboard "rediseñado"** — en la práctica `TodayPage.tsx` ya es bastante completo (anillo,
   objetivos de hoy, "tu día", prioridad principal, rachas activas, accesos rápidos, objetivos
   de semana/mes). Probablemente este ítem ya está cubierto en espíritu aunque nunca se declaró
   "cerrado" explícitamente — no asumir que hace falta un rediseño desde cero sin confirmar qué
   le falta concretamente.

## Notas operativas que siguen valiendo

- Migraciones a producción: método de portapapeles (`mcp__computer-use__write_clipboard` +
  pegar en el SQL Editor de Supabase vía Chrome ya logueado) — ver el detalle completo en
  `project_mi_progreso.md` (memoria). No tipear el SQL a mano, el autocompletado de Monaco lo
  rompe.
- Verificación en navegador logueado: usar `mcp__claude-in-chrome__*` contra
  `http://localhost:5174` con la cuenta de prueba de Ulises — el navegador sandboxed
  (`mcp__Claude_Browser__*`) no tiene sesión de Supabase, así que páginas detrás de `AuthGate`
  no se pueden ver ahí (síntoma: se puede navegar y ver el login, pero no lo que hay después).
  `/producto` es la excepción — es pública, sí se puede verificar ahí.
- Suite de tests: `npx vitest run`. Build: `npx tsc -b && npx vite build`. No avanzar con nada
  roto — 178/178 y build limpio es el estado de referencia a esta fecha.
- Trabajando en paralelo con otra sesión: revisar `git log`/`git status` antes de asumir qué
  archivos están "libres" para editar, especialmente `App.tsx`, `AuthGate.tsx` y todo
  `src/auth/`/`src/onboarding/` (zona más activa últimamente).
